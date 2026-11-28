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

/** Lo que ANA dice al cerrar. Los datos de pago no se dicen: se muestran en la factura. */
export function frasePago(totalTexto: string) {
  return `Listo, el total es ${totalTexto}. Los datos de pago te salen en la factura.`;
}
