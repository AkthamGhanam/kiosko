// Genera public/productos/<slug>.svg: un tazón con el producto, en su color.
// Ilustraciones propias (sin licencias de terceros). Ejecuta: npx tsx scripts/ilustraciones.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { CATALOGO } from "../prisma/catalogo";

function rng(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

function aclarar(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * f));
  return `rgb(${c.join(",")})`;
}
function oscurecer(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - f)));
  return `rgb(${c.join(",")})`;
}

mkdirSync("public/productos", { recursive: true });

CATALOGO.forEach((p, idx) => {
  const r = rng(idx * 97 + 13);
  const color = p.color;
  const piezas: string[] = [];
  const esGrano = p.categoria === "Maní y frutos secos" || p.categoria === "Dulces y frutas secas";
  const n = esGrano ? 26 : 70;
  for (let i = 0; i < n; i++) {
    // puntos dentro de la cúpula del montículo
    const a = r() * Math.PI;
    const rad = Math.sqrt(r());
    const x = 100 + Math.cos(a) * 62 * rad * (r() > 0.5 ? 1 : -1);
    const y = 112 - Math.sin(a) * 46 * rad;
    const tono = r() > 0.5 ? aclarar(color, 0.25 * r()) : oscurecer(color, 0.25 * r());
    if (esGrano) {
      const rx = 7 + r() * 4;
      const ry = 4.5 + r() * 2;
      const rot = Math.round(r() * 180);
      piezas.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${tono}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"/>`);
    } else {
      piezas.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1 + r() * 1.8).toFixed(1)}" fill="${tono}" opacity="0.85"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${p.nombre}">
  <defs>
    <linearGradient id="m" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${aclarar(color, 0.18)}"/>
      <stop offset="1" stop-color="${oscurecer(color, 0.12)}"/>
    </linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbf7f0"/>
      <stop offset="1" stop-color="#e9dfcf"/>
    </linearGradient>
  </defs>
  <ellipse cx="100" cy="176" rx="70" ry="9" fill="#000" opacity="0.08"/>
  <path d="M34 118 Q100 70 166 118 Z" fill="url(#m)"/>
  <path d="M34 112 C 40 30, 160 30, 166 112 Z" fill="url(#m)"/>
  ${piezas.join("\n  ")}
  <path d="M24 112 H176 C 172 150, 140 172, 100 172 C 60 172, 28 150, 24 112 Z" fill="url(#t)"/>
  <path d="M24 112 H176" stroke="#d8cbb6" stroke-width="3" stroke-linecap="round"/>
  <path d="M40 128 C 52 150, 72 160, 96 162" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="0.7"/>
</svg>
`;
  writeFileSync(`public/productos/${p.slug}.svg`, svg);
});
console.log(`${CATALOGO.length} ilustraciones generadas`);
