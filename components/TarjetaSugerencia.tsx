"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import { aceptarSugerencia, rechazarSugerencia } from "@/lib/cliente/orquestador";
import { formatoDinero, formatoGramos, subtotalCents } from "@/lib/dinero";

/** Lo que ANA recomienda para la receta del cliente, listo para agregar con un toque. */
export function TarjetaSugerencia() {
  const sugerencia = useKiosko((e) => e.sugerencia);
  const productos = useKiosko((e) => e.productos);
  const lineas = sugerencia.flatMap((s) => {
    const p = productos.find((x) => x.id === s.productoId);
    return p ? [{ ...s, p }] : [];
  });
  const total = lineas.reduce((t, l) => t + subtotalCents(l.gramos, l.p.precioKg), 0);
  return (
    <AnimatePresence>
      {lineas.length > 0 && (
        <motion.div
          key="sugerencia"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="pointer-events-auto w-full rounded-3xl bg-white/95 p-3 shadow-2xl shadow-tinta/15 ring-1 ring-arena backdrop-blur"
        >
          <p className="px-1 pb-2 text-[0.7rem] font-bold uppercase tracking-widest text-paprika">ANA te recomienda</p>
          <div className="sin-scroll flex gap-2 overflow-x-auto pb-2">
            {lineas.map((l) => (
              <div key={l.productoId} className="flex w-20 shrink-0 flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.p.imagen} alt="" className="h-14 w-14" />
                <span className="line-clamp-2 text-[0.7rem] font-semibold leading-tight">{l.p.nombre}</span>
                <span className="tabular text-[0.65rem] text-tinta-2">{formatoGramos(l.gramos)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={rechazarSugerencia} className="rounded-2xl px-4 py-3 text-sm font-semibold text-tinta-2 ring-1 ring-arena">
              No, gracias
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={aceptarSugerencia} className="flex flex-1 items-center justify-between rounded-2xl bg-paprika px-4 py-3 text-base font-bold text-white">
              <span>Agregar todo</span>
              <span className="tabular">{formatoDinero(total)}</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
