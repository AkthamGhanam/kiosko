import { NextResponse } from "next/server";
import { z } from "zod";
import { Carrito } from "@/lib/esquemas";
import { cotizar } from "@/lib/pedidos";

export async function POST(req: Request) {
  const body = z.object({ items: Carrito }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Carrito inválido" }, { status: 400 });
  return NextResponse.json(await cotizar(body.data.items));
}
