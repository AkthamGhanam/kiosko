// Bus de eventos en memoria para avisar al panel /admin (SSE) que cambió el inventario.
import { EventEmitter } from "node:events";

const g = globalThis as unknown as { busInventario?: EventEmitter };
export const busInventario = g.busInventario ?? new EventEmitter();
busInventario.setMaxListeners(100);
g.busInventario = busInventario;

export function avisarCambioInventario(motivo: string) {
  busInventario.emit("cambio", { motivo, en: Date.now() });
}
