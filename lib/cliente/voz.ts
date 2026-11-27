"use client";
// Voz de ANA: hablar y escuchar.
// Interfaz `MotorVoz` para poder cambiar Web Speech por una TTS de mejor calidad
// (ElevenLabs, Azure, Piper...) sin tocar el resto: basta con otra implementación
// que reproduzca audio y llame a iniciarBocaAudio(analizador).
import { detenerBoca, iniciarBocaAudio, iniciarBocaTexto, resincronizarBoca } from "./boca";

export interface MotorVoz {
  hablar(texto: string): Promise<void>;
  callar(): void;
}

const NOMBRES_FEMENINOS = /paola|paulina|monica|mónica|helena|elvira|dalia|sabina|laura|lucia|lucía|marisol|camila|elena|salome|salomé|ximena|female|mujer|google español/i;
const NOMBRES_MASCULINOS = /jorge|diego|pablo|raul|raúl|alvaro|álvaro|carlos|juan|enrique|male\b|hombre/i;

function puntuarVoz(v: SpeechSynthesisVoice): number {
  const lang = v.lang.toLowerCase().replace("_", "-");
  if (!lang.startsWith("es")) return -1;
  let p = 1;
  if (lang === "es-ve") p += 6;
  else if (["es-us", "es-mx", "es-co", "es-419"].includes(lang)) p += 4;
  else if (lang === "es-es") p += 2;
  if (NOMBRES_FEMENINOS.test(v.name)) p += 5;
  if (NOMBRES_MASCULINOS.test(v.name)) p -= 6;
  if (/natural|neural|online|premium|enhanced/i.test(v.name)) p += 3;
  return p;
}

function elegirVoz(): SpeechSynthesisVoice | null {
  const voces = speechSynthesis.getVoices();
  const orden = voces.map((v) => [puntuarVoz(v), v] as const).filter(([p]) => p >= 0).sort((a, b) => b[0] - a[0]);
  return orden[0]?.[1] ?? null;
}

/** Quita lo que suena raro leído en voz alta. */
export function textoParaVoz(t: string) {
  return t
    .replace(/\$(\d+)\.(\d{2})/g, (_, d, c) => (c === "00" ? `${d} dólares` : `${d} dólares con ${parseInt(c, 10)} centavos`))
    .replace(/(\d+)\s?g\b/g, "$1 gramos")
    .replace(/(\d+)\s?kg\b/g, "$1 kilos")
    .replace(/0414-?(\d{3})(\d{2})(\d{2})/g, "cero cuatro catorce, $1, $2, $3")
    .replace(/[*_#]/g, "");
}

export class VozNavegador implements MotorVoz {
  private voz: SpeechSynthesisVoice | null = null;
  constructor() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    this.voz = elegirVoz();
    speechSynthesis.onvoiceschanged = () => (this.voz = elegirVoz());
  }

  hablar(texto: string): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
    speechSynthesis.cancel();
    const limpio = textoParaVoz(texto);
    // Chrome corta frases largas: se hablan por oraciones
    const partes = limpio.match(/[^.!?¿¡]+[.!?]*|[¿¡][^?!]+[?!]/g)?.map((s) => s.trim()).filter(Boolean) ?? [limpio];
    return new Promise((resolve) => {
      let i = 0;
      const siguiente = () => {
        if (i >= partes.length) {
          detenerBoca();
          resolve();
          return;
        }
        const parte = partes[i++];
        const u = new SpeechSynthesisUtterance(parte);
        u.lang = this.voz?.lang ?? "es-VE";
        if (this.voz) u.voice = this.voz;
        u.rate = 1.04;
        u.pitch = 1.08;
        u.onstart = () => iniciarBocaTexto(parte, u.rate);
        u.onboundary = (e) => resincronizarBoca(e.charIndex);
        u.onend = () => {
          detenerBoca();
          setTimeout(siguiente, 60);
        };
        u.onerror = () => {
          detenerBoca();
          siguiente();
        };
        speechSynthesis.speak(u);
      };
      siguiente();
      // seguro: si el navegador nunca dispara onend, no nos quedamos colgados
      setTimeout(() => resolve(), 1500 + limpio.length * 110);
    });
  }

  callar() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
    detenerBoca();
  }
}

/** Para una TTS que devuelve audio (mp3/wav): lip sync por amplitud real. */
export async function reproducirAudioConLipSync(audio: Blob): Promise<void> {
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(await audio.arrayBuffer());
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const an = ctx.createAnalyser();
  an.fftSize = 1024;
  src.connect(an);
  an.connect(ctx.destination);
  iniciarBocaAudio(an);
  return new Promise((resolve) => {
    src.onended = () => {
      detenerBoca();
      ctx.close();
      resolve();
    };
    src.start();
  });
}

// ---------- escuchar ----------
type Reconocedor = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function microfonoSoportado() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function escuchar(opts: { onParcial: (t: string) => void; onFinal: (t: string) => void; onFin: () => void; onError: (e: string) => void }) {
  const w = window as unknown as Record<string, new () => Reconocedor>;
  const Clase = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Clase) {
    opts.onError("no_soportado");
    opts.onFin();
    return () => {};
  }
  const r = new Clase();
  r.lang = "es-VE";
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  let final = "";
  r.onresult = (e) => {
    let parcial = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) final += res[0].transcript;
      else parcial += res[0].transcript;
    }
    opts.onParcial((final + " " + parcial).trim());
  };
  r.onerror = (e) => opts.onError(e.error);
  r.onend = () => {
    if (final.trim()) opts.onFinal(final.trim());
    opts.onFin();
  };
  r.start();
  return () => r.stop();
}
