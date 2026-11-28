"use client";
// Estado global mínimo del kiosko (sin dependencias): useSyncExternalStore.
import { useSyncExternalStore } from "react";
import type { AnimAna, EstadoAna, FacturaCliente, Fase, Mensaje, ProductoCliente } from "./tipos";

export type EstadoKiosko = {
  fase: Fase;
  estadoAna: EstadoAna;
  animAna: AnimAna;
  avatarListo: boolean;
  progresoCarga: number;
  mensajes: Mensaje[];
  carrito: { productoId: number; gramos: number }[];
  esperandoConfirmacion: boolean;
  factura: FacturaCliente | null;
  productos: ProductoCliente[];
  /** id del último producto agregado (para animarlo) */
  ultimoAgregado: number | null;
  textoParcial: string; // lo que el micrófono va entendiendo
  carritoAbierto: boolean;
  vozDisponible: boolean;
  microfonoDisponible: boolean;
  proveedor: string;
  menuAbierto: boolean;
  categoriaMenu: string | null;
  sugerencia: { productoId: number; gramos: number }[];
  /** 0..1, volumen del micrófono mientras escucha */
  nivelMic: number;
};

const inicial: EstadoKiosko = {
  fase: "pedido",
  estadoAna: "reposo",
  animAna: "fuera",
  avatarListo: false,
  progresoCarga: 0,
  mensajes: [],
  carrito: [],
  esperandoConfirmacion: false,
  factura: null,
  productos: [],
  ultimoAgregado: null,
  textoParcial: "",
  carritoAbierto: false,
  vozDisponible: true,
  microfonoDisponible: false,
  proveedor: "",
  menuAbierto: false,
  categoriaMenu: null,
  sugerencia: [],
  nivelMic: 0,
};

let estado = inicial;
const oyentes = new Set<() => void>();

export function obtener() {
  return estado;
}

export function fijar(parcial: Partial<EstadoKiosko> | ((e: EstadoKiosko) => Partial<EstadoKiosko>)) {
  const cambio = typeof parcial === "function" ? parcial(estado) : parcial;
  estado = { ...estado, ...cambio };
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void) {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

export function useKiosko<T>(selector: (e: EstadoKiosko) => T): T {
  return useSyncExternalStore(suscribir, () => selector(estado), () => selector(inicial));
}

let idMensaje = 1;
export function agregarMensaje(rol: Mensaje["rol"], texto: string) {
  fijar((e) => ({ mensajes: [...e.mensajes, { id: idMensaje++, rol, texto }].slice(-12) }));
}
