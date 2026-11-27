"use client";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { fijar, useKiosko } from "@/lib/cliente/store";
import { cambiarGramos, confirmarTactil } from "@/lib/cliente/orquestador";
import { formatoDinero, formatoGramos, subtotalCents } from "@/lib/dinero";

export function Carrito() {
  const carrito = useKiosko((e) => e.carrito);
  const productos = useKiosko((e) => e.productos);
  const ultimo = useKiosko((e) => e.ultimoAgregado);
  const esperando = useKiosko((e) => e.esperandoConfirmacion);
  const ocupado = useKiosko((e) => e.estadoAna === "pensando");
  const abierto = useKiosko((e) => e.carritoAbierto);
  const setAbierto = (v: boolean | ((a: boolean) => boolean)) => fijar((e) => ({ carritoAbierto: typeof v === "function" ? v(e.carritoAbierto) : v }));
  const pulso = useAnimationControls();

  const lineas = useMemo(() => {
    const porId = new Map(productos.map((p) => [p.id, p]));
    return carrito.flatMap((i) => {
      const p = porId.get(i.productoId);
      return p ? [{ ...i, p, subtotal: subtotalCents(i.gramos, p.precioKg) }] : [];
    });
  }, [carrito, productos]);
  const total = lineas.reduce((s, l) => s + l.subtotal, 0);

  useEffect(() => {
    if (carrito.length) void pulso.start({ scale: [1, 1.06, 1], transition: { duration: 0.4 } });
    if (!carrito.length) setAbierto(false);
  }, [carrito, pulso]);

  return (
    <div className="relative px-4 pb-3">
      {/* detalle expandible */}
      <AnimatePresence>
        {abierto && lineas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className="mb-2 overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-arena"
          >
            <ul className="sin-scroll max-h-[38vh] divide-y divide-arena/70 overflow-y-auto">
              {lineas.map((l) => (
                <li key={l.productoId} className="flex items-center gap-3 px-4 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.p.imagen} alt="" className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{l.p.nombre}</p>
                    <p className="tabular text-xs text-tinta-2">{formatoDinero(l.p.precioKg)}/kg</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mini onClick={() => cambiarGramos(l.productoId, l.gramos - 50)}>−</Mini>
                    <span className="tabular w-16 text-center text-sm font-bold">{formatoGramos(l.gramos)}</span>
                    <Mini onClick={() => cambiarGramos(l.productoId, Math.min(l.p.stockGramos, l.gramos + 50))}>+</Mini>
                  </div>
                  <span className="tabular w-16 text-right font-bold">{formatoDinero(l.subtotal)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div animate={pulso} className="flex items-center gap-3 rounded-3xl bg-tinta p-2 pl-3 text-crema shadow-2xl shadow-tinta/30">
        <button onClick={() => setAbierto((a) => !a)} disabled={!lineas.length} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="sin-scroll flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1">
            {lineas.length === 0 && <span className="px-1 text-sm text-crema/70">Tu pedido aparecerá aquí</span>}
            <AnimatePresence initial={false}>
              {lineas.map((l) => (
                <motion.span
                  layout
                  key={l.productoId}
                  initial={{ opacity: 0, scale: 0.4, y: -30 }}
                  animate={{ opacity: 1, scale: 1, y: 0, backgroundColor: l.productoId === ultimo ? ["#c2462b", "#ffffff1f"] : "#ffffff1f" }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 420, damping: 26, backgroundColor: { duration: 1.4 } }}
                  className="flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-semibold"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.p.imagen} alt="" className="h-6 w-6 rounded-full bg-crema" />
                  <span className="tabular">{formatoGramos(l.gramos)}</span>
                  <span className="max-w-24 truncate font-normal text-crema/80">{l.p.nombre}</span>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
          {lineas.length > 0 && (
            <div className="shrink-0 text-right leading-tight">
              <div className="text-[0.65rem] uppercase tracking-widest text-crema/60">Total</div>
              <motion.div key={total} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tabular text-xl font-bold">
                {formatoDinero(total)}
              </motion.div>
            </div>
          )}
        </button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={!lineas.length || ocupado}
          onClick={() => void confirmarTactil()}
          className={`shrink-0 rounded-2xl px-5 py-4 text-base font-bold transition-colors disabled:opacity-40 ${esperando ? "bg-paprika text-white" : "bg-crema text-tinta"}`}
        >
          Confirmar
        </motion.button>
      </motion.div>
    </div>
  );
}

function Mini({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="grid h-8 w-8 place-items-center rounded-full bg-crema-2 text-lg font-semibold active:scale-90">
      {children}
    </button>
  );
}
