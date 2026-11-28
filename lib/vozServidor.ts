// Voz del lado del servidor: ElevenLabs para hablar y transcribir, Groq Whisper como
// respaldo para transcribir. Las claves nunca llegan al navegador.
import { textoParaVoz } from "./vozTexto";

const EL = "https://api.elevenlabs.io/v1";
const env = (k: string, d = "") => process.env[k]?.trim() || d;

export function configVoz() {
  const eleven = Boolean(env("ELEVENLABS_API_KEY"));
  const groq = Boolean(env("GROQ_API_KEY"));
  return {
    tts: eleven ? ("elevenlabs" as const) : ("navegador" as const),
    stt: eleven && env("ELEVENLABS_STT", "1") !== "0" ? ("elevenlabs" as const) : groq ? ("groq" as const) : ("navegador" as const),
  };
}

export type Alineacion = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };

/** Devuelve el audio (mp3 en base64) y el tiempo de cada letra para mover la boca. */
export async function sintetizar(texto: string): Promise<{ audio: string; alineacion: Alineacion | null }> {
  const voz = env("ELEVENLABS_VOICE_ID", "9Ux14cxOYULytGFBVsW4");
  const res = await fetch(`${EL}/text-to-speech/${encodeURIComponent(voz)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": env("ELEVENLABS_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      text: textoParaVoz(texto).slice(0, 800),
      model_id: env("ELEVENLABS_MODEL", "eleven_flash_v2_5"),
      language_code: "es",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: Number(env("ELEVENLABS_VELOCIDAD", "1.15")) },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { audio_base64: string; alignment?: Alineacion | null; normalized_alignment?: Alineacion | null };
  return { audio: j.audio_base64, alineacion: j.alignment ?? j.normalized_alignment ?? null };
}

/** Quita marcas de ruido ("(música)", "[risas]") y descarta transcripciones vacías. */
export function limpiarTranscripcion(t: string) {
  const limpio = t.replace(/[\[(][^\])]*[\])]/g, " ").replace(/\s+/g, " ").trim();
  return /[a-záéíóúñ]{2,}/i.test(limpio) ? limpio : "";
}

/** Pasa la voz del cliente a texto. `vocabulario` ayuda a reconocer nombres de productos. */
export async function transcribir(audio: Blob, vocabulario: string[]): Promise<{ texto: string; proveedor: string }> {
  const cfg = configVoz();
  const errores: string[] = [];
  if (cfg.stt === "elevenlabs") {
    try {
      const f = new FormData();
      f.append("model_id", env("ELEVENLABS_STT_MODEL", "scribe_v1"));
      f.append("language_code", "es");
      f.append("tag_audio_events", "false");
      f.append("file", audio, "voz.webm");
      const res = await fetch(`${EL}/speech-to-text`, { method: "POST", headers: { "xi-api-key": env("ELEVENLABS_API_KEY") }, body: f, signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const j = (await res.json()) as { text?: string };
      return { texto: limpiarTranscripcion(j.text ?? ""), proveedor: "elevenlabs" };
    } catch (e) {
      errores.push(String(e));
    }
  }
  if (env("GROQ_API_KEY")) {
    const f = new FormData();
    f.append("model", env("GROQ_STT_MODEL", "whisper-large-v3-turbo"));
    f.append("language", "es");
    f.append("response_format", "json");
    f.append("temperature", "0");
    // el prompt orienta a Whisper hacia el vocabulario de la tienda
    f.append("prompt", `Pedido en una tienda venezolana de especias, en gramos. Productos: ${vocabulario.join(", ")}.`.slice(0, 850));
    f.append("file", audio, "voz.webm");
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("GROQ_API_KEY")}` },
      body: f,
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const j = (await res.json()) as { text?: string };
      return { texto: limpiarTranscripcion(j.text ?? ""), proveedor: "groq" };
    }
    errores.push(`Groq STT ${res.status}`);
  }
  throw new Error(errores.join(" | ") || "Sin proveedor de transcripción");
}
