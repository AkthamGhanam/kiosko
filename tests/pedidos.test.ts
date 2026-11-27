import { beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { confirmarPedido, cotizar, reponerStock, unificar } from "@/lib/pedidos";
import { subtotalCents, totalCents } from "@/lib/dinero";

const db = new PrismaClient();

async function crear(slug: string, precioKg: number, stockGramos: number) {
  return db.producto.create({
    data: { slug, nombre: slug, categoria: "Especias", precioKg, stockGramos, imagen: "" },
  });
}

beforeEach(async () => {
  await db.movimientoInventario.deleteMany();
  await db.itemPedido.deleteMany();
  await db.pedido.deleteMany();
  await db.producto.deleteMany();
});

describe("cálculo por gramos", () => {
  it("cobra proporcional al kilo", () => {
    expect(subtotalCents(1000, 950)).toBe(950);
    expect(subtotalCents(100, 950)).toBe(95);
    expect(subtotalCents(120, 320)).toBe(38); // 38.4 -> 38
    expect(subtotalCents(50, 1400)).toBe(70);
    expect(subtotalCents(125, 1250)).toBe(156); // 156.25 -> 156
  });

  it("rechaza gramos o precios inválidos", () => {
    expect(() => subtotalCents(0, 100)).toThrow();
    expect(() => subtotalCents(1.5, 100)).toThrow();
    expect(() => subtotalCents(10, -1)).toThrow();
  });

  it("suma el total de líneas", () => {
    expect(totalCents([{ subtotalCents: 38 }, { subtotalCents: 95 }, { subtotalCents: 70 }])).toBe(203);
  });

  it("une líneas repetidas del mismo producto", () => {
    expect(unificar([{ productoId: 1, gramos: 100 }, { productoId: 2, gramos: 50 }, { productoId: 1, gramos: 20 }])).toEqual([
      { productoId: 1, gramos: 120 },
      { productoId: 2, gramos: 50 },
    ]);
  });

  it("cotiza desde la base de datos e ignora precios del cliente", async () => {
    const avena = await crear("avena", 320, 8000);
    const c = await cotizar([{ productoId: avena.id, gramos: 120 }, { productoId: 9999, gramos: 10 }], db);
    expect(c.lineas).toHaveLength(1);
    expect(c.lineas[0].subtotalCents).toBe(38);
    expect(c.totalCents).toBe(38);
    expect(c.desconocidos).toEqual([9999]);
  });
});

describe("confirmar pedido e inventario", () => {
  it("descuenta el stock exacto y registra movimientos", async () => {
    const avena = await crear("avena", 320, 8000);
    const dandy = await crear("mani-dandy", 950, 5000);
    const r = await confirmarPedido(
      [{ productoId: avena.id, gramos: 120 }, { productoId: dandy.id, gramos: 100 }],
      "voz",
      db,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.factura.totalCents).toBe(38 + 95);
    expect(r.factura.numero).toMatch(/^A-\d{4}$/);
    expect(r.rechazadas).toEqual([]);

    expect((await db.producto.findUniqueOrThrow({ where: { id: avena.id } })).stockGramos).toBe(7880);
    expect((await db.producto.findUniqueOrThrow({ where: { id: dandy.id } })).stockGramos).toBe(4900);

    const movs = await db.movimientoInventario.findMany({ orderBy: { id: "asc" } });
    expect(movs.map((m) => [m.tipo, m.gramos, m.stockResultante])).toEqual([
      ["venta", -120, 7880],
      ["venta", -100, 4900],
    ]);
    const items = await db.itemPedido.findMany({ where: { pedidoId: r.factura.pedidoId } });
    expect(items).toHaveLength(2);
  });

  it("rechaza la línea sin stock suficiente y deja pasar las demás", async () => {
    const nuez = await crear("nuez-moscada", 3500, 40);
    const comino = await crear("comino", 1250, 2000);
    const r = await confirmarPedido(
      [{ productoId: nuez.id, gramos: 50 }, { productoId: comino.id, gramos: 100 }],
      "texto",
      db,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.rechazadas).toEqual([{ productoId: nuez.id, nombre: "nuez-moscada", pedidos: 50, disponibles: 40, motivo: "stock" }]);
    expect(r.factura.lineas).toHaveLength(1);
    expect(r.factura.totalCents).toBe(125);
    expect((await db.producto.findUniqueOrThrow({ where: { id: nuez.id } })).stockGramos).toBe(40);
    expect((await db.producto.findUniqueOrThrow({ where: { id: comino.id } })).stockGramos).toBe(1900);
  });

  it("no crea pedido si ninguna línea alcanza", async () => {
    const clavo = await crear("clavo", 3000, 10);
    const r = await confirmarPedido([{ productoId: clavo.id, gramos: 50 }], "tactil", db);
    expect(r.ok).toBe(false);
    expect(await db.pedido.count()).toBe(0);
    expect(await db.movimientoInventario.count()).toBe(0);
  });

  it("permite vender exactamente todo el stock, nunca de más", async () => {
    const p = await crear("pasas", 900, 300);
    const r1 = await confirmarPedido([{ productoId: p.id, gramos: 300 }], "tactil", db);
    expect(r1.ok).toBe(true);
    const r2 = await confirmarPedido([{ productoId: p.id, gramos: 1 }], "tactil", db);
    expect(r2.ok).toBe(false);
    expect((await db.producto.findUniqueOrThrow({ where: { id: p.id } })).stockGramos).toBe(0);
  });

  it("dos pedidos simultáneos no dejan el stock negativo", async () => {
    const p = await crear("merey", 2400, 150);
    const res = await Promise.allSettled([
      confirmarPedido([{ productoId: p.id, gramos: 100 }], "tactil", db),
      confirmarPedido([{ productoId: p.id, gramos: 100 }], "tactil", db),
    ]);
    const exitos = res.filter((r) => r.status === "fulfilled" && r.value.ok).length;
    expect(exitos).toBe(1);
    expect((await db.producto.findUniqueOrThrow({ where: { id: p.id } })).stockGramos).toBe(50);
  });

  it("repone stock y lo registra", async () => {
    const p = await crear("canela", 1800, 100);
    const actualizado = await reponerStock(p.id, 900, undefined, db);
    expect(actualizado.stockGramos).toBe(1000);
    const mov = await db.movimientoInventario.findFirstOrThrow();
    expect([mov.tipo, mov.gramos, mov.stockResultante]).toEqual(["reposicion", 900, 1000]);
  });
});
