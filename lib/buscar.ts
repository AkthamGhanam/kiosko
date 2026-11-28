// Búsqueda difusa de productos por nombre y alias ("many" = maní, "paprica" = paprika).
// Es pura: recibe la lista de productos, así se puede probar sin base de datos.
import { quitarMuletillas, similitudFlexible } from "./texto";

export type ProductoBuscable = {
  id: number;
  slug: string;
  nombre: string;
  alias: string; // separados por coma
};

export type Coincidencia<P extends ProductoBuscable> = { producto: P; puntaje: number };

export type ResultadoBusqueda<P extends ProductoBuscable> =
  | { tipo: "exacto"; producto: P; puntaje: number }
  | { tipo: "ambiguo"; opciones: P[] }
  | { tipo: "ninguno"; sugerencias: P[] };

const RELLENO = new Set(["de", "del", "la", "el", "los", "las", "un", "una", "unos", "otros", "otro", "otra", "y", "con", "por", "favor", "gramos", "gr", "g"]);

function tokens(s: string): string[] {
  return quitarMuletillas(s)
    .split(" ")
    .filter((t) => t && !RELLENO.has(t) && !/^\d/.test(t));
}

function simToken(a: string, b: string): number {
  // "mani" frente a "many": se toleran errores pequeños
  const s = similitudFlexible(a, b);
  if (a.length >= 4 && b.startsWith(a)) return Math.max(s, 0.9); // prefijo: "papri" -> "paprika"
  return s >= 0.7 ? s : 0;
}

function puntajeContra(q: string[], candidato: string): number {
  const c = tokens(candidato);
  if (!q.length || !c.length) return 0;
  if (q.join(" ") === c.join(" ")) return 1;
  const cobertura_q = q.reduce((s, t) => s + Math.max(...c.map((x) => simToken(t, x))), 0) / q.length;
  const cobertura_c = c.reduce((s, t) => s + Math.max(...q.map((x) => simToken(x, t))), 0) / c.length;
  return 0.7 * cobertura_q + 0.3 * cobertura_c;
}

export function puntuar<P extends ProductoBuscable>(consulta: string, productos: P[]): Coincidencia<P>[] {
  const q = tokens(consulta);
  return productos
    .map((producto) => {
      const candidatos = [producto.nombre, producto.slug.replace(/-/g, " "), ...producto.alias.split(",")];
      const puntaje = Math.max(...candidatos.map((c) => puntajeContra(q, c)));
      return { producto, puntaje };
    })
    .sort((a, b) => b.puntaje - a.puntaje);
}

export const UMBRAL = 0.72;

export function buscarProducto<P extends ProductoBuscable>(consulta: string, productos: P[]): ResultadoBusqueda<P> {
  const r = puntuar(consulta, productos);
  const top = r[0];
  if (!top || top.puntaje < UMBRAL) {
    return { tipo: "ninguno", sugerencias: r.filter((x) => x.puntaje > 0.3).slice(0, 3).map((x) => x.producto) };
  }
  const empatados = r.filter((x) => x.puntaje >= top.puntaje - 0.03);
  if (empatados.length > 1 && top.puntaje < 1) {
    return { tipo: "ambiguo", opciones: empatados.slice(0, 4).map((x) => x.producto) };
  }
  return { tipo: "exacto", producto: top.producto, puntaje: top.puntaje };
}
