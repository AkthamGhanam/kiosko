import { prisma } from "./db";
import { numeroOrden } from "./pedidos";

export async function obtenerResumen() {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const [productos, pedidos, movimientos, hoy] = await Promise.all([
    prisma.producto.findMany({ orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
    prisma.pedido.findMany({ orderBy: { id: "desc" }, take: 20, include: { items: true } }),
    prisma.movimientoInventario.findMany({ orderBy: { id: "desc" }, take: 30, include: { producto: { select: { nombre: true } } } }),
    prisma.pedido.aggregate({ where: { creadoEn: { gte: inicioDia } }, _sum: { totalCents: true }, _count: true }),
  ]);
  return {
    productos,
    pedidos: pedidos.map((p) => ({ ...p, numero: numeroOrden(p.id) })),
    movimientos: movimientos.map((m) => ({ ...m, producto: m.producto.nombre })),
    hoy: { pedidos: hoy._count, ventasCents: hoy._sum.totalCents ?? 0 },
  };
}

export type Resumen = Awaited<ReturnType<typeof obtenerResumen>>;
