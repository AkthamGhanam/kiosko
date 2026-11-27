import { NextResponse } from "next/server";
import { AnaBody } from "@/lib/esquemas";
import { listarProductos } from "@/lib/pedidos";
import { responder } from "@/lib/agente";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = AnaBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 });
  const productos = await listarProductos();
  const r = await responder(body.data, productos);
  return NextResponse.json(r);
}
