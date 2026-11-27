// Lógica de pedidos e inventario. Precios, totales y stock salen SIEMPRE de la base de datos.
import type { PrismaClient, Producto } from "@prisma/client";
import { prisma } from "./db";
import { subtotalCents, totalCents } from "./dinero";
import { avisarCambioInventario } from "./eventos";
import type { Canal, ItemCarrito } from "./esquemas";

export type LineaCotizada = {
  productoId: number;
  slug: string;
  nombre: string;
  imagen: string;
  gramos: number;
  precioKg: number;
  subtotalCents: number;
  stockGramos: number;
  alcanza: boolean;
};

export type Cotizacion = {
  lineas: LineaCotizada[];
  totalCents: number;
  /** ids que no existen o están inactivos */
  desconocidos: number[];
};

/** Junta líneas repetidas del mismo producto sumando gramos. */
export function unificar(items: ItemCarrito[]): ItemCarrito[] {
  const m = new Map<number, number>();
  for (const it of items) m.set(it.productoId, (m.get(it.productoId) ?? 0) + it.gramos);
  return [...m.entries()].map(([productoId, gramos]) => ({ productoId, gramos }));
}

export function cotizarCon(items: ItemCarrito[], productos: Producto[]): Cotizacion {
  const porId = new Map(productos.map((p) => [p.id, p]));
  const lineas: LineaCotizada[] = [];
  const desconocidos: number[] = [];
  for (const it of unificar(items)) {
    const p = porId.get(it.productoId);
    if (!p || !p.activo) {
      desconocidos.push(it.productoId);
      continue;
    }
    lineas.push({
      productoId: p.id,
      slug: p.slug,
      nombre: p.nombre,
      imagen: p.imagen,
      gramos: it.gramos,
      precioKg: p.precioKg,
      subtotalCents: subtotalCents(it.gramos, p.precioKg),
      stockGramos: p.stockGramos,
      alcanza: p.stockGramos >= it.gramos,
    });
  }
  return { lineas, totalCents: totalCents(lineas), desconocidos };
}

export async function cotizar(items: ItemCarrito[], db: PrismaClient = prisma): Promise<Cotizacion> {
  const ids = [...new Set(items.map((i) => i.productoId))];
  const productos = ids.length ? await db.producto.findMany({ where: { id: { in: ids } } }) : [];
  return cotizarCon(items, productos);
}

export type LineaRechazada = { productoId: number; nombre: string; pedidos: number; disponibles: number; motivo: "stock" | "no_existe" };

export type Factura = {
  pedidoId: number;
  numero: string;
  fecha: string; // ISO
  canal: Canal;
  lineas: { nombre: string; gramos: number; precioKg: number; subtotalCents: number }[];
  totalCents: number;
};

export type ResultadoConfirmacion =
  | { ok: true; factura: Factura; rechazadas: LineaRechazada[] }
  | { ok: false; rechazadas: LineaRechazada[] };

export const numeroOrden = (id: number) => `A-${String(id).padStart(4, "0")}`;

/**
 * Confirma el pedido en UNA transacción:
 * cada línea descuenta stock con un UPDATE condicional (stock >= gramos), así dos
 * kioskos a la vez nunca dejan el stock negativo. La línea que no alcanza se rechaza
 * y el resto sigue. Si no queda ninguna línea, no se crea el pedido.
 */
export async function confirmarPedido(items: ItemCarrito[], canal: Canal, db: PrismaClient = prisma): Promise<ResultadoConfirmacion> {
  const unificados = unificar(items);
  const resultado = await db.$transaction(async (tx) => {
    const rechazadas: LineaRechazada[] = [];
    const aceptadas: { p: Producto; gramos: number; stockResultante: number }[] = [];

    for (const it of unificados) {
      const p = await tx.producto.findUnique({ where: { id: it.productoId } });
      if (!p || !p.activo) {
        rechazadas.push({ productoId: it.productoId, nombre: p?.nombre ?? "Producto", pedidos: it.gramos, disponibles: 0, motivo: "no_existe" });
        continue;
      }
      const upd = await tx.producto.updateMany({
        where: { id: p.id, stockGramos: { gte: it.gramos } },
        data: { stockGramos: { decrement: it.gramos } },
      });
      if (upd.count === 0) {
        const actual = await tx.producto.findUnique({ where: { id: p.id } });
        rechazadas.push({ productoId: p.id, nombre: p.nombre, pedidos: it.gramos, disponibles: actual?.stockGramos ?? 0, motivo: "stock" });
        continue;
      }
      aceptadas.push({ p, gramos: it.gramos, stockResultante: p.stockGramos - it.gramos });
    }

    if (!aceptadas.length) return { ok: false as const, rechazadas };

    const lineas = aceptadas.map(({ p, gramos }) => ({
      productoId: p.id,
      nombreProducto: p.nombre,
      gramos,
      precioKg: p.precioKg,
      subtotalCents: subtotalCents(gramos, p.precioKg),
    }));
    const pedido = await tx.pedido.create({
      data: { canal, totalCents: totalCents(lineas), items: { create: lineas } },
    });
    for (const a of aceptadas) {
      // stock real tras el descuento (leído dentro de la misma transacción)
      const actual = await tx.producto.findUniqueOrThrow({ where: { id: a.p.id } });
      await tx.movimientoInventario.create({
        data: { productoId: a.p.id, tipo: "venta", gramos: -a.gramos, stockResultante: actual.stockGramos, pedidoId: pedido.id },
      });
    }
    const factura: Factura = {
      pedidoId: pedido.id,
      numero: numeroOrden(pedido.id),
      fecha: pedido.creadoEn.toISOString(),
      canal,
      lineas: lineas.map((l) => ({ nombre: l.nombreProducto, gramos: l.gramos, precioKg: l.precioKg, subtotalCents: l.subtotalCents })),
      totalCents: pedido.totalCents,
    };
    return { ok: true as const, factura, rechazadas };
  });
  if (resultado.ok) avisarCambioInventario(`pedido ${resultado.factura.numero}`);
  return resultado;
}

export async function reponerStock(productoId: number, gramos: number, nota: string | undefined, db: PrismaClient = prisma) {
  const p = await db.$transaction(async (tx) => {
    const p = await tx.producto.update({ where: { id: productoId }, data: { stockGramos: { increment: gramos } } });
    await tx.movimientoInventario.create({
      data: { productoId, tipo: "reposicion", gramos, stockResultante: p.stockGramos, nota: nota ?? "Reposición desde /admin" },
    });
    return p;
  });
  avisarCambioInventario(`reposición ${p.slug}`);
  return p;
}

export async function listarProductos(db: PrismaClient = prisma) {
  return db.producto.findMany({ where: { activo: true }, orderBy: [{ categoria: "asc" }, { nombre: "asc" }] });
}
