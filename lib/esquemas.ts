import { z } from "zod";

export const MAX_GRAMOS_LINEA = 20000;

export const ItemCarrito = z.object({
  productoId: z.number().int().positive(),
  gramos: z.number().int().min(1).max(MAX_GRAMOS_LINEA),
});
export type ItemCarrito = z.infer<typeof ItemCarrito>;

export const Carrito = z.array(ItemCarrito).max(50);

export const Canal = z.enum(["voz", "texto", "tactil"]);
export type Canal = z.infer<typeof Canal>;

export const ConfirmarPedidoBody = z.object({
  items: Carrito.min(1),
  canal: Canal.default("tactil"),
});

export const ReponerBody = z.object({
  productoId: z.number().int().positive(),
  gramos: z.number().int().min(1).max(1_000_000),
  nota: z.string().max(200).optional(),
});

export const MensajeChat = z.object({
  rol: z.enum(["cliente", "ana"]),
  texto: z.string().max(2000),
});

export const AnaBody = z.object({
  mensaje: z.string().min(1).max(1000),
  historial: z.array(MensajeChat).max(30).default([]),
  carrito: Carrito.default([]),
  /** true si ANA ya pidió confirmación y espera un "sí" */
  esperandoConfirmacion: z.boolean().default(false),
  /** productos que ANA sugirió (por una receta) y espera que el cliente acepte */
  sugerencia: Carrito.default([]),
  canal: Canal.default("texto"),
});
export type AnaBody = z.infer<typeof AnaBody>;
