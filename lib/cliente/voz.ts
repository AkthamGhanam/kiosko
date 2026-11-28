"use client";
// Voz de ANA: hablar y escuchar.
// Interfaz `MotorVoz` para poder cambiar Web Speech por una TTS de mejor calidad
// (ElevenLabs, Azure, Piper...) sin tocar el resto: basta con otra implementación
// que reproduzca audio y llame a iniciarBocaAudio(analizador).
import { detenerBoca, iniciarBocaAlineada, iniciarBocaAudio, iniciarBocaTexto, resincronizarBoca, type Alineacion } from "./boca";
import { textoParaVoz } from "../vozTexto";

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

export { textoParaVoz };

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
        u.rate = 1.15;
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

// ---------- audio compartido ----------
let ctxAudio: AudioContext | null = null;
/** Crear (o reanudar) dentro de un toque del cliente: los navegadores lo exigen. */
export function audioCtx(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  if (!ctxAudio) ctxAudio = new AudioContext();
  if (ctxAudio.state === "suspended") void ctxAudio.resume();
  return ctxAudio;
}

function base64ABuffer(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

/** Voz de ElevenLabs (vía /api/tts). Si falla, habla el navegador para no quedarse muda. */
export class VozElevenLabs implements MotorVoz {
  private respaldo = new VozNavegador();
  private fuente: AudioBufferSourceNode | null = null;
  private turno = 0;
  private cache = new Map<string, { audio: string; alineacion: Alineacion | null }>();

  constructor() {
    audioCtx();
  }

  private async pedir(texto: string) {
    const enCache = this.cache.get(texto);
    if (enCache) return enCache;
    const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto }) });
    if (!res.ok) throw new Error(`tts ${res.status}`);
    const j = await res.json();
    if (this.cache.size > 30) this.cache.clear();
    this.cache.set(texto, j);
    return j as { audio: string; alineacion: Alineacion | null };
  }

  /** Genera de antemano frases fijas (saludo) para que salgan sin espera. */
  precargar(texto: string) {
    void this.pedir(texto).catch(() => {});
  }

  async hablar(texto: string): Promise<void> {
    this.callar();
    const miTurno = ++this.turno;
    const ctx = audioCtx();
    let datos: { audio: string; alineacion: Alineacion | null };
    let buf: AudioBuffer;
    try {
      if (!ctx) throw new Error("sin AudioContext");
      datos = await this.pedir(texto);
      buf = await ctx.decodeAudioData(base64ABuffer(datos.audio));
    } catch (e) {
      console.warn("[ANA] ElevenLabs no respondió, uso la voz del navegador", e);
      if (miTurno !== this.turno) return;
      return this.respaldo.hablar(texto);
    }
    if (miTurno !== this.turno || !ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const an = ctx.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    an.connect(ctx.destination);
    this.fuente = src;
    const inicio = ctx.currentTime + 0.03;
    if (datos.alineacion?.characters?.length) iniciarBocaAlineada(datos.alineacion, () => ctx.currentTime - inicio, an);
    else iniciarBocaAudio(an);
    return new Promise((resolve) => {
      src.onended = () => {
        if (this.fuente === src) {
          this.fuente = null;
          detenerBoca();
        }
        resolve();
      };
      src.start(inicio);
    });
  }

  callar() {
    this.turno++;
    this.respaldo.callar();
    if (this.fuente) {
      const f = this.fuente;
      this.fuente = null;
      try {
        f.stop();
      } catch {
        /* ya terminó */
      }
    }
    detenerBoca();
  }
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

// ---------- escuchar con grabación (ElevenLabs Scribe / Groq Whisper) ----------
export function grabacionSoportada() {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && "MediaRecorder" in window;
}

let flujoMic: MediaStream | null = null;
async function microfono() {
  if (flujoMic && flujoMic.getAudioTracks().some((t) => t.readyState === "live")) return flujoMic;
  flujoMic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  return flujoMic;
}

/**
 * Graba hasta que el cliente deja de hablar (detección de silencio) y manda el audio
 * a /api/stt. `onNivel` recibe 0..1 para animar la onda.
 */
export function escucharGrabando(opts: {
  onNivel: (n: number) => void;
  onHablando: () => void;
  onProcesando: () => void;
  onFinal: (t: string) => void;
  onFin: () => void;
  onError: (e: string) => void;
}) {
  let cancelado = false;
  let parar: () => void = () => {
    cancelado = true;
  };
  (async () => {
    let flujo: MediaStream;
    try {
      flujo = await microfono();
    } catch (e) {
      opts.onError((e as DOMException)?.name === "NotAllowedError" ? "not-allowed" : "no_soportado");
      opts.onFin();
      return;
    }
    if (cancelado) return opts.onFin();
    const ctx = audioCtx();
    const tipo = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(flujo, tipo ? { mimeType: tipo } : undefined);
    const trozos: Blob[] = [];
    let habló = false;
    let ultimaVoz = performance.now();
    const t0 = performance.now();
    let raf = 0;
    let an: AnalyserNode | null = null;
    let nodo: MediaStreamAudioSourceNode | null = null;
    if (ctx) {
      nodo = ctx.createMediaStreamSource(flujo);
      an = ctx.createAnalyser();
      an.fftSize = 1024;
      nodo.connect(an);
    }
    const buf = new Uint8Array(new ArrayBuffer(1024));
    // Ruido del entorno: se mide al empezar y se sigue ajustando mientras nadie habla,
    // así en una tienda con música o gente conversando no se queda grabando para siempre.
    let ruido = 0.01;
    let vozMs = 0; // tiempo acumulado por encima del umbral (descarta golpes y ruidos cortos)
    let ultimo = performance.now();
    const vigilar = () => {
      const ahora = performance.now();
      const dt = ahora - ultimo;
      ultimo = ahora;
      if (an) {
        an.getByteTimeDomainData(buf);
        let s = 0;
        for (let i = 0; i < buf.length; i++) {
          const x = (buf[i] - 128) / 128;
          s += x * x;
        }
        const rms = Math.sqrt(s / buf.length);
        const umbral = Math.max(0.018, ruido * 2.2);
        opts.onNivel(Math.min(1, rms * 8));
        if (rms > umbral) {
          vozMs += dt;
          if (vozMs > 250) {
            if (!habló) opts.onHablando();
            habló = true;
            ultimaVoz = ahora;
          }
        } else {
          vozMs = Math.max(0, vozMs - dt * 0.5);
          // promedio lento del fondo (solo con silencio relativo)
          ruido = ahora - t0 < 500 ? Math.max(ruido, rms) : ruido * 0.98 + rms * 0.02;
          if (habló && rms > umbral * 0.7) ultimaVoz = ahora; // final de palabra suave
        }
      } else if (ahora - t0 > 300) {
        habló = true; // sin analizador: se graba un tramo fijo
      }
      const silencio = ahora - ultimaVoz;
      if ((habló && silencio > 800) || ahora - t0 > 12000 || (!habló && ahora - t0 > 7000)) return terminar();
      raf = requestAnimationFrame(vigilar);
    };
    const terminar = () => {
      cancelAnimationFrame(raf);
      if (rec.state !== "inactive") rec.stop();
    };
    parar = terminar;
    rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);
    rec.onstop = async () => {
      nodo?.disconnect();
      opts.onNivel(0);
      if (cancelado || !habló || !trozos.length) return opts.onFin();
      opts.onProcesando();
      try {
        const f = new FormData();
        f.append("audio", new Blob(trozos, { type: rec.mimeType || "audio/webm" }), "voz.webm");
        const res = await fetch("/api/stt", { method: "POST", body: f });
        const j = res.ok ? await res.json() : null;
        if (j?.texto) opts.onFinal(j.texto);
        else if (!res.ok) opts.onError("stt");
      } catch {
        opts.onError("stt");
      }
      opts.onFin();
    };
    rec.start(250);
    raf = requestAnimationFrame(vigilar);
  })();
  return () => parar();
}
