"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";

/** Subtítulos: lo último que dijo el cliente y lo último que dijo ANA. */
export function Burbujas() {
  const mensajes = useKiosko((e) => e.mensajes);
  const ultimos = mensajes.slice(-2);
  return (
    <div className="pointer-events-none flex w-full flex-col gap-2">
      <AnimatePresence initial={false} mode="popLayout">
        {ultimos.map((m) => (
          <motion.div
            key={m.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={
              m.rol === "ana"
                ? "max-w-[88%] self-start rounded-3xl rounded-bl-md bg-white/92 px-4 py-3 text-[0.95rem] leading-snug text-tinta shadow-xl shadow-tinta/10 ring-1 ring-arena backdrop-blur"
                : "max-w-[80%] self-end rounded-3xl rounded-br-md bg-tinta px-4 py-3 text-[0.95rem] leading-snug text-crema shadow-xl shadow-tinta/20"
            }
          >
            {m.rol === "ana" && <span className="mb-0.5 block text-[0.7rem] font-bold uppercase tracking-widest text-paprika">ANA</span>}
            {m.texto}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
