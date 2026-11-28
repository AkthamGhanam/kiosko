// Datos de la tienda. Se pueden cambiar por variables de entorno sin tocar código.
export const TIENDA = {
  nombre: process.env.NEXT_PUBLIC_TIENDA_NOMBRE ?? "Minimarket Especias",
  lema: process.env.NEXT_PUBLIC_TIENDA_LEMA ?? "Condimentos, maní y frutos secos al peso",
  moneda: process.env.NEXT_PUBLIC_MONEDA ?? "USD",
  pagoMovil: {
    banco: process.env.NEXT_PUBLIC_PAGO_BANCO ?? "Banesco (0134)",
    telefono: process.env.NEXT_PUBLIC_PAGO_TELEFONO ?? "0414-4141368",
    cedula: process.env.NEXT_PUBLIC_PAGO_CEDULA ?? "82.218.399",
  },
} as const;

/** Lo mínimo que se vende de cada producto (gramos). */
export const MIN_GRAMOS = Number(process.env.NEXT_PUBLIC_MIN_GRAMOS ?? 100) || 100;

/** Frase con los datos de pago tal como ANA los dice (y tal como salen en la factura). */
export function frasePago(totalTexto: string) {
  const p = TIENDA.pagoMovil;
  return `Perfecto. El total es ${totalTexto}. Puedes pagar por pago móvil a estos datos: banco ${p.banco}, teléfono ${p.telefono}, cédula ${p.cedula}. O si prefieres tarjeta, pasa con la cajera.`;
}
