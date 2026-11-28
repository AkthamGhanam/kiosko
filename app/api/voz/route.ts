import { NextResponse } from "next/server";
import { configVoz } from "@/lib/vozServidor";

export const dynamic = "force-dynamic";

/** Qué voz usa el kiosko: ElevenLabs/Groq si hay claves, o la del navegador. */
export function GET() {
  return NextResponse.json(configVoz());
}
