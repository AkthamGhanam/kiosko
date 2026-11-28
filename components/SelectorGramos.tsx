"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProductoCliente } from "@/lib/cliente/tipos";
import { formatoDinero, formatoGramos, subtotalCents } from "@/lib/dinero";
import { agregarTactil } from "@/lib/cliente/orquestador";
import { useKiosko } from "@/lib/cliente/store";
import { MIN_GRAMOS } from "@/lib/config";

const RAPIDOS = [100, 250, 500, 750, 1000];

export function SelectorGramos({ producto, onCerrar }: { producto: ProductoCliente | null; onCerrar: () => void }) {
  const [gramos, setGramos] = useState(100);
  const yaEnCarrito = useKiosko((e) => (producto ? e.carrito.find((i) => i.productoId === producto.id)?.gramos ?? 0 : 0));
  useEffect(() => {
    if (producto) setGramos(100);
  }, [producto]);

  const disponible = producto ? producto.stockGramos - yaEnCarrito : 0;
  const excede = gramos > disponible;

  return (
    <AnimatePresence>
      {producto && (
        <motion.div className="fixed inset-0 z-40 flex items-end justify-center bg-tinta/40 backdrop-blur-sm landscape:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCerrar}>
          <motion.div
            role="dialog"
            aria-label={`Elegir gramos de ${producto.nombre}`}
            className="w-full max-w-xl rounded-t-[2rem] bg-crema p-6 pb-8 shadow-2xl landscape:rounded-[2rem]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={producto.imagen} alt="" className="h-24 w-24 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-paprika">{producto.categoria}</p>
                <h2 className="font-display text-2xl font-semibold leading-tight">{producto.nombre}</h2>
                <p className="text-sm text-tinta-2">
                  {formatoDinero(producto.precioKg)} el kilo · disponible {formatoGramos(Math.max(0, disponible))}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <BotonRedondo onClick={() => setGramos((g) => Math.max(MIN_GRAMOS, g - 50))} etiqueta="Menos">−</BotonRedondo>
              <div className="text-center">
                <motion.div key={gramos} initial={{ scale: 0.85, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }} className="tabular font-display text-5xl font-semibold">
                  {formatoGramos(gramos)}
                </motion.div>
                <div className="tabular mt-1 text-lg font-semibold text-paprika">{formatoDinero(subtotalCents(gramos, producto.precioKg))}</div>
              </div>
              <BotonRedondo onClick={() => setGramos((g) => g + 50)} etiqueta="Más">+</BotonRedondo>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-2">
              {RAPIDOS.map((r) => (
                <button key={r} onClick={() => setGramos(r)} className={`rounded-2xl py-3 text-sm font-bold transition active:scale-95 ${gramos === r ? "bg-tinta text-crema" : "bg-white ring-1 ring-arena"}`}>
                  {formatoGramos(r)}
                </button>
              ))}
            </div>

            {excede && <p className="mt-4 text-center text-sm font-medium text-paprika">Solo quedan {formatoGramos(Math.max(0, disponible))} de este producto.</p>}

            <div className="mt-6 flex gap-3">
              <button onClick={onCerrar} className="flex-1 rounded-2xl bg-white py-4 font-semibold ring-1 ring-arena active:scale-[0.98]">
                Cancelar
              </button>
              <button
                disabled={excede}
                onClick={() => {
                  agregarTactil(producto, gramos);
                  onCerrar();
                }}
                className="flex-[2] rounded-2xl bg-paprika py-4 text-lg font-bold text-white shadow-lg shadow-paprika/30 transition active:scale-[0.98] disabled:opacity-40"
              >
                Agregar al pedido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BotonRedondo({ children, onClick, etiqueta }: { children: React.ReactNode; onClick: () => void; etiqueta: string }) {
  return (
    <motion.button whileTap={{ scale: 0.88 }} onClick={onClick} aria-label={etiqueta} className="grid h-16 w-16 place-items-center rounded-full bg-white text-3xl font-light shadow ring-1 ring-arena">
      {children}
    </motion.button>
  );
}
