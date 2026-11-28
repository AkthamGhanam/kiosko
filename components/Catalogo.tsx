"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import type { ProductoCliente } from "@/lib/cliente/tipos";
import { formatoDinero, formatoGramos } from "@/lib/dinero";
import { SelectorGramos } from "./SelectorGramos";

const TODAS = "Todo";

export function Catalogo() {
  const productos = useKiosko((e) => e.productos);
  const carrito = useKiosko((e) => e.carrito);
  const pedida = useKiosko((e) => e.categoriaMenu);
  const [cat, setCat] = useState(TODAS);
  const [elegido, setElegido] = useState<ProductoCliente | null>(null);

  // ANA abre el menú en la categoría de lo que el cliente nombró ("maní" → Maní)
  useEffect(() => {
    setCat(pedida ?? TODAS);
  }, [pedida]);

  const categorias = useMemo(() => [TODAS, ...new Set(productos.map((p) => p.categoria))], [productos]);
  const visibles = cat === TODAS ? productos : productos.filter((p) => p.categoria === cat);
  const enCarrito = new Map(carrito.map((i) => [i.productoId, i.gramos]));

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="sin-scroll flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
        {categorias.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors active:scale-95 ${cat === c ? "text-crema" : "bg-white text-tinta-2 ring-1 ring-arena"}`}
          >
            {cat === c && <motion.span layoutId="chip" className="absolute inset-0 rounded-full bg-tinta" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">{c}</span>
          </button>
        ))}
      </div>

      <div className="sin-scroll grid min-h-0 flex-1 auto-rows-max grid-cols-3 gap-3 overflow-y-auto px-4 pb-4 landscape:grid-cols-3 landscape:xl:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {visibles.map((p) => {
            const agotado = p.stockGramos < 50;
            const poco = !agotado && p.stockGramos < 500;
            const g = enCarrito.get(p.id);
            return (
              <motion.button
                layout
                key={p.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                disabled={agotado}
                onClick={() => setElegido(p)}
                className={`group relative flex flex-col items-center rounded-3xl bg-white p-3 text-center shadow-sm ring-1 transition-shadow hover:shadow-md disabled:opacity-45 ${g ? "ring-2 ring-paprika" : "ring-arena"}`}
                aria-label={`${p.nombre}, ${formatoDinero(p.precioKg)} el kilo`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imagen} alt="" className="aspect-square w-full max-w-28 transition-transform duration-300 group-active:scale-90" draggable={false} />
                <span className="mt-1 line-clamp-2 text-sm font-semibold leading-tight text-tinta">{p.nombre}</span>
                <span className="mt-0.5 text-xs text-tinta-2">
                  <b className="tabular font-bold text-paprika">{formatoDinero(p.precioKg)}</b> / kg
                </span>
                {agotado && <span className="absolute left-2 top-2 rounded-full bg-tinta px-2 py-0.5 text-[0.65rem] font-bold uppercase text-crema">Agotado</span>}
                {poco && <span className="absolute left-2 top-2 rounded-full bg-oro/20 px-2 py-0.5 text-[0.65rem] font-bold text-canela">Quedan {formatoGramos(p.stockGramos)}</span>}
                <AnimatePresence>
                  {g && (
                    <motion.span
                      key={g}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="tabular absolute right-2 top-2 rounded-full bg-paprika px-2 py-0.5 text-[0.65rem] font-bold text-white"
                    >
                      {formatoGramos(g)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <SelectorGramos producto={elegido} onCerrar={() => setElegido(null)} />
    </section>
  );
}
