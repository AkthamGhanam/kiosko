"use client";
// Conductor de la boca de ANA. La escena 3D lee `boca.visemas` en cada fotograma
// (sin re-renderizar React) y los suaviza.
//
// Dos fuentes posibles:
//  1. Texto (Web Speech API): el navegador no expone el audio de speechSynthesis,
//     así que se avanza por el texto a la velocidad estimada de habla y se
//     resincroniza con cada evento `boundary` (palabra) cuando el navegador lo emite.
//  2. Audio (TTS que devuelve audio): amplitud real con AnalyserNode de Web Audio.
//  3. Audio + alineación (ElevenLabs with-timestamps): la forma de la boca sale de la
//     letra que suena en ese instante y la apertura, de la amplitud real.

export type Visemas = { aa: number; ih: number; ou: number; ee: number; oh: number };

export const boca = {
  visemas: { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 } as Visemas,
  hablando: false,
};

const VOCAL: Record<string, keyof Visemas> = { a: "aa", á: "aa", e: "ee", é: "ee", i: "ih", í: "ih", o: "oh", ó: "oh", u: "ou", ú: "ou", y: "ih" };
const CERRADAS = new Set(["m", "b", "p"]);

let raf = 0;
let fuente: "texto" | "audio" | "alineada" | null = null;

// --- fuente texto ---
let texto = "";
let base = 0; // índice de carácter en el que se resincronizó
let tBase = 0;
let charsPorMs = 0.0145;

function limpiar() {
  boca.visemas = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
}

function pasoTexto() {
  const pos = base + (performance.now() - tBase) * charsPorMs;
  const i = Math.floor(pos);
  const v: Visemas = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  if (i < texto.length) {
    const c = texto[i].toLowerCase();
    const frac = pos - i;
    // abre y cierra dentro de cada letra para que se vea articulado
    const env = Math.sin(Math.min(1, frac * 1.15) * Math.PI);
    if (VOCAL[c]) v[VOCAL[c]] = 0.55 + 0.4 * env;
    else if (CERRADAS.has(c)) v.aa = 0;
    else if (/[a-zñ]/.test(c)) v.aa = 0.18 * env;
  }
  boca.visemas = v;
  raf = requestAnimationFrame(pasoTexto);
}

export function iniciarBocaTexto(t: string, velocidad = 1) {
  detenerBoca();
  fuente = "texto";
  texto = t;
  base = 0;
  tBase = performance.now();
  charsPorMs = 0.0145 * velocidad;
  boca.hablando = true;
  raf = requestAnimationFrame(pasoTexto);
}

/** Llamar desde utterance.onboundary para corregir la deriva. */
export function resincronizarBoca(indice: number) {
  if (fuente !== "texto") return;
  base = indice;
  tBase = performance.now();
}

// --- fuente audio ---
let analizador: AnalyserNode | null = null;
let datos: Uint8Array<ArrayBuffer> | null = null;

function pasoAudio() {
  if (!analizador || !datos) return;
  analizador.getByteTimeDomainData(datos);
  let suma = 0;
  for (let k = 0; k < datos.length; k++) {
    const x = (datos[k] - 128) / 128;
    suma += x * x;
  }
  const rms = Math.sqrt(suma / datos.length);
  const nivel = Math.min(1, rms * 6);
  // la amplitud abre la boca; un poco de "oh" para que no se vea mecánico
  boca.visemas = { aa: nivel, ih: 0, ou: 0, ee: nivel * 0.15, oh: nivel * 0.3 };
  raf = requestAnimationFrame(pasoAudio);
}

export function iniciarBocaAudio(nodo: AnalyserNode) {
  detenerBoca();
  fuente = "audio";
  analizador = nodo;
  datos = new Uint8Array(new ArrayBuffer(nodo.fftSize));
  boca.hablando = true;
  raf = requestAnimationFrame(pasoAudio);
}

// --- fuente audio + alineación por carácter ---
export type Alineacion = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };
let alin: Alineacion | null = null;
let reloj: () => number = () => 0;
let cursor = 0;

function nivelAudio() {
  if (!analizador || !datos) return 1;
  analizador.getByteTimeDomainData(datos);
  let suma = 0;
  for (let k = 0; k < datos.length; k++) {
    const x = (datos[k] - 128) / 128;
    suma += x * x;
  }
  return Math.min(1, Math.sqrt(suma / datos.length) * 7);
}

function pasoAlineado() {
  if (!alin) return;
  const t = reloj();
  const { characters: c, character_start_times_seconds: ini, character_end_times_seconds: fin } = alin;
  while (cursor < c.length - 1 && fin[cursor] < t) cursor++;
  const v: Visemas = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
  const nivel = nivelAudio();
  if (cursor < c.length && t >= ini[cursor] - 0.02 && t <= fin[cursor] + 0.02) {
    const ch = c[cursor].toLowerCase();
    const dur = Math.max(0.03, fin[cursor] - ini[cursor]);
    const env = Math.sin(Math.min(1, Math.max(0, (t - ini[cursor]) / dur)) * Math.PI);
    const abre = 0.35 + 0.65 * Math.max(nivel, 0.4);
    if (VOCAL[ch]) v[VOCAL[ch]] = (0.5 + 0.45 * env) * abre;
    else if (!CERRADAS.has(ch) && /[a-zñ]/.test(ch)) v.aa = 0.2 * env * abre;
  }
  boca.visemas = v;
  raf = requestAnimationFrame(pasoAlineado);
}

/** `ahora` devuelve los segundos de audio reproducidos. */
export function iniciarBocaAlineada(a: Alineacion, ahora: () => number, nodo?: AnalyserNode) {
  detenerBoca();
  fuente = "alineada";
  alin = a;
  reloj = ahora;
  cursor = 0;
  if (nodo) {
    analizador = nodo;
    datos = new Uint8Array(new ArrayBuffer(nodo.fftSize));
  }
  boca.hablando = true;
  raf = requestAnimationFrame(pasoAlineado);
}

export function detenerBoca() {
  cancelAnimationFrame(raf);
  fuente = null;
  analizador = null;
  alin = null;
  boca.hablando = false;
  limpiar();
}
