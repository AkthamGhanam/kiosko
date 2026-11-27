import { NextResponse } from "next/server";
import { ConfirmarPedidoBody } from "@/lib/esquemas";
import { confirmarPedido, numeroOrden } from "@/lib/pedidos";
import { prisma } from "@/lib/db";
import { frasePago } from "@/lib/config";
import { formatoDinero } from "@/lib/dinero";

export const dynamic = "force-dynamic";

/** Confirma un pedido tocado en pantalla (botón Confirmar). */
export async function POST(req: Request) {
  const body = ConfirmarPedidoBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Pedido inválido", detalle: body.error.flatten() }, { status: 400 });
  const r = await confirmarPedido(body.data.items, body.data.canal);
  if (!r.ok) return NextResponse.json(r, { status: 409 });
  return NextResponse.json({ ...r, frase: frasePago(formatoDinero(r.factura.totalCents)) });
}

/** Últimos pedidos para el panel /admin. */
export async function GET() {
  const pedidos = await prisma.pedido.findMany({
    orderBy: { id: "desc" },
    take: 30,
    include: { items: true },
  });
  return NextResponse.json({ pedidos: pedidos.map((p) => ({ ...p, numero: numeroOrden(p.id) })) });
}
