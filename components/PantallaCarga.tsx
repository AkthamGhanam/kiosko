"use client";
import { motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import { TIENDA } from "@/lib/config";

/** Mientras carga el modelo: barra de progreso. Al terminar: "Toca para empezar". */
export function PantallaCarga({ listo }: { listo: boolean }) {
  const progreso = useKiosko((e) => e.progresoCarga);
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5 px-6 text-center text-crema">
      <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-semibold drop-shadow">
        {TIENDA.nombre}
      </motion.h2>
      {listo ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: [1, 1.04, 1] }}
          transition={{ scale: { repeat: Infinity, duration: 1.8 } }}
          className="rounded-full bg-paprika px-10 py-5 text-xl font-bold shadow-2xl shadow-paprika/40"
        >
          Toca para empezar
        </motion.div>
      ) : (
        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
            <motion.div className="h-full rounded-full bg-oro" animate={{ width: `${Math.max(6, progreso * 100)}%` }} transition={{ ease: "easeOut" }} />
          </div>
          <p className="mt-3 text-sm text-crema/85">Preparando a ANA… {Math.round(progreso * 100)}%</p>
        </div>
      )}
      <p className="text-sm text-crema/75">Pide por voz, escribiendo o tocando los productos.</p>
    </div>
  );
}
