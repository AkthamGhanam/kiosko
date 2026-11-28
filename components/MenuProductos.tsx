"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import { cerrarMenu } from "@/lib/cliente/orquestador";
import { Catalogo } from "./Catalogo";
import { Carrito } from "./Carrito";
import { BotonMicrofono } from "./Controles";

/** Menú táctil: sube desde abajo (vertical) o entra por la derecha (horizontal).
 * Lo abre el cliente con "Ver menú" o ANA cuando no entiende. */
export function MenuProductos() {
  const abierto = useKiosko((e) => e.menuAbierto);
  return (
    <AnimatePresence>
      {abierto && (
        <>
          <motion.div
            key="velo"
            className="fixed inset-0 z-30 bg-tinta/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cerrarMenu}
          />
          <motion.section
            key="menu"
            role="dialog"
            aria-label="Menú de productos"
            className="fixed inset-x-0 bottom-0 z-40 flex h-[70%] flex-col rounded-t-[2rem] bg-crema shadow-[0_-20px_60px_-20px_rgba(42,29,21,0.45)] landscape:inset-y-0 landscape:left-auto landscape:right-0 landscape:h-full landscape:w-[52%] landscape:rounded-l-[2rem] landscape:rounded-tr-none"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
          >
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-arena landscape:hidden" />
            <div className="flex items-center gap-3 px-5 pb-2 pt-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-2xl font-semibold">Menú</h2>
                <p className="text-xs text-tinta-2">Toca un producto · precios por kilo, se cobra al gramo</p>
              </div>
              <BotonMicrofono pequeno />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={cerrarMenu}
                aria-label="Cerrar menú"
                className="grid h-12 w-12 place-items-center rounded-full bg-white text-tinta shadow-sm ring-1 ring-arena"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </motion.button>
            </div>
            <Catalogo />
            <Carrito />
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
