import { NextResponse } from "next/server";
import { ReponerBody } from "@/lib/esquemas";
import { reponerStock } from "@/lib/pedidos";

export async function POST(req: Request) {
  const body = ReponerBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const p = await reponerStock(body.data.productoId, body.data.gramos, body.data.nota);
    return NextResponse.json({ producto: p });
  } catch {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }
}
