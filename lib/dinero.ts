// Toda la aritmética de dinero es en centavos enteros.
import { TIENDA } from "./config";

/** Subtotal en centavos de `gramos` a `precioKgCents` por kilo, redondeado al centavo. */
export function subtotalCents(gramos: number, precioKgCents: number): number {
  if (!Number.isInteger(gramos) || gramos <= 0) throw new Error("Gramos inválidos");
  if (!Number.isInteger(precioKgCents) || precioKgCents < 0) throw new Error("Precio inválido");
  return Math.round((gramos * precioKgCents) / 1000);
}

export function totalCents(lineas: { subtotalCents: number }[]): number {
  return lineas.reduce((s, l) => s + l.subtotalCents, 0);
}

export function formatoDinero(cents: number): string {
  const n = cents / 100;
  if (TIENDA.moneda === "USD") return `$${n.toFixed(2)}`;
  return new Intl.NumberFormat("es-VE", { style: "currency", currency: TIENDA.moneda }).format(n);
}

/** Para la voz: "4 dólares con 35 centavos". */
export function dineroHablado(cents: number): string {
  if (TIENDA.moneda !== "USD") return formatoDinero(cents);
  const d = Math.floor(cents / 100);
  const c = cents % 100;
  const dol = `${d} ${d === 1 ? "dólar" : "dólares"}`;
  return c ? `${dol} con ${c} ${c === 1 ? "centavo" : "centavos"}` : dol;
}

export function formatoGramos(g: number): string {
  if (g >= 1000) return `${(g / 1000).toLocaleString("es-VE", { maximumFractionDigits: 3 })} kg`;
  return `${g} g`;
}
