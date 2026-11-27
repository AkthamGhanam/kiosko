import { NextResponse } from "next/server";
import { listarProductos } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export async function GET() {
  const productos = await listarProductos();
  return NextResponse.json({ productos });
}
