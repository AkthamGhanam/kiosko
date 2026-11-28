import { NextResponse } from "next/server";
import { z } from "zod";
import { configVoz, sintetizar } from "@/lib/vozServidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ texto: z.string().trim().min(1).max(1200) });

export async function POST(req: Request) {
  if (configVoz().tts !== "elevenlabs") return NextResponse.json({ error: "Sin ElevenLabs" }, { status: 503 });
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Texto inválido" }, { status: 400 });
  try {
    return NextResponse.json(await sintetizar(body.data.texto));
  } catch (e) {
    console.error("[TTS]", e);
    return NextResponse.json({ error: "No se pudo generar la voz" }, { status: 502 });
  }
}
