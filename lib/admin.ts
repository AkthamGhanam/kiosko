import { prisma } from "./db";
import { numeroOrden } from "./pedidos";

export async function obtenerResumen() {
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const [productos, pedidos, movimientos, hoy, noEntendidas] = await Promise.all([
    prisma.producto.findMany({ orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
    prisma.pedido.findMany({ orderBy: { id: "desc" }, take: 20, include: { items: true } }),
    prisma.movimientoInventario.findMany({ orderBy: { id: "desc" }, take: 30, include: { producto: { select: { nombre: true } } } }),
    prisma.pedido.aggregate({ where: { creadoEn: { gte: inicioDia } }, _sum: { totalCents: true }, _count: true }),
    prisma.consultaFallida.findMany({ orderBy: { id: "desc" }, take: 30 }),
  ]);
  return {
    productos,
    pedidos: pedidos.map((p) => ({ ...p, numero: numeroOrden(p.id) })),
    movimientos: movimientos.map((m) => ({ ...m, producto: m.producto.nombre })),
    hoy: { pedidos: hoy._count, ventasCents: hoy._sum.totalCents ?? 0 },
    noEntendidas,
  };
}

export type Resumen = Awaited<ReturnType<typeof obtenerResumen>>;

/** Guarda una frase que ANA no entendió, para revisarla y agregarla a las pruebas. Nunca rompe la respuesta. */
export async function registrarNoEntendida(texto: string, respuesta: string, motivo: string, canal: string) {
  try {
    await prisma.consultaFallida.create({ data: { texto: texto.slice(0, 500), respuesta: respuesta.slice(0, 500), motivo, canal } });
  } catch (e) {
    console.warn("[ANA] no se pudo guardar la frase no entendida", e);
  }
}
