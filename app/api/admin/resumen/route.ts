import { NextResponse } from "next/server";
import { obtenerResumen } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await obtenerResumen());
}
