"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";

/** Píldora con el estado de ANA: escuchando (onda), pensando (puntos), hablando (barras suaves). */
export function IndicadorEstado() {
  const estado = useKiosko((e) => e.estadoAna);
  const parcial = useKiosko((e) => e.textoParcial);
  const etiquetas = { escuchando: "Te escucho…", pensando: "Pensando…", hablando: "ANA está hablando", reposo: "" } as const;
  return (
    <AnimatePresence>
      {estado !== "reposo" && (
        <motion.div
          key={estado}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="pointer-events-none flex max-w-[90%] items-center gap-3 rounded-full bg-white/85 px-4 py-2 text-sm font-medium text-tinta shadow-lg shadow-tinta/10 ring-1 ring-arena backdrop-blur"
          role="status"
          aria-live="polite"
        >
          {estado === "escuchando" && (
            <span className="flex h-5 items-center gap-[3px]">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className="h-5 w-1 origin-center animate-onda rounded-full bg-paprika" style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </span>
          )}
          {estado === "pensando" && (
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-punto rounded-full bg-canela" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          )}
          {estado === "hablando" && (
            <span className="flex h-4 items-center gap-[3px]">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-4 w-1 origin-center animate-onda rounded-full bg-hoja" style={{ animationDelay: `${i * 0.2}s`, animationDuration: "0.7s" }} />
              ))}
            </span>
          )}
          <span className="truncate">{estado === "escuchando" && parcial ? `“${parcial}”` : etiquetas[estado]}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
