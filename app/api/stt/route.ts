import { NextResponse } from "next/server";
import { listarProductos } from "@/lib/pedidos";
import { configVoz, transcribir } from "@/lib/vozServidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  if (configVoz().stt === "navegador") return NextResponse.json({ error: "Sin transcripción en el servidor" }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size < 1000 || audio.size > MAX_BYTES) return NextResponse.json({ error: "Audio inválido" }, { status: 400 });
  try {
    const nombres = (await listarProductos()).map((p) => p.nombre);
    return NextResponse.json(await transcribir(audio, nombres));
  } catch (e) {
    console.error("[STT]", e);
    return NextResponse.json({ error: "No se pudo transcribir" }, { status: 502 });
  }
}
