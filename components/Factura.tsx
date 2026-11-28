"use client";
import { motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import { nuevoPedido } from "@/lib/cliente/orquestador";
import { TIENDA } from "@/lib/config";
import { formatoDinero, formatoGramos } from "@/lib/dinero";
import { Isotipo } from "./Marca";

export function Factura() {
  const f = useKiosko((e) => e.factura);
  if (!f) return null;
  const fecha = new Date(f.fecha);
  const p = TIENDA.pagoMovil;
  const muchas = f.lineas.length > 6;
  const pad = muchas ? "py-1.5" : "py-2.5";
  // con muchas líneas la animación no debe tardar: escalón más corto
  const cont = { hidden: {}, show: { transition: { staggerChildren: muchas ? 0.03 : 0.06, delayChildren: 0.35 } } };
  const fila = { hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0 } };

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center bg-tinta/30 p-3 backdrop-blur-md sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.article
        initial={{ y: 120, opacity: 0, rotateX: 18, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, rotateX: 0, scale: 1 }}
        exit={{ y: -80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 22 }}
        style={{ transformPerspective: 1200 }}
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        aria-label={`Factura ${f.numero}`}
      >
        <div className="flex shrink-0 items-center gap-3 bg-tinta px-6 py-4 text-crema">
          <Isotipo className="h-12 w-12" />
          <div className="leading-tight">
            <p className="font-display text-xl font-semibold">{TIENDA.nombre}</p>
            <p className="text-xs text-crema/70">Comprobante de pedido</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[0.65rem] uppercase tracking-widest text-crema/60">Orden</p>
            <p className="tabular font-display text-3xl font-semibold text-oro">{f.numero}</p>
          </div>
        </div>

        {/* Solo la lista de productos hace scroll: cabecera, total, pago y botón siempre a la vista */}
        <div className="flex min-h-0 flex-1 flex-col px-6 pt-4">
          <p className="tabular shrink-0 text-sm text-tinta-2">
            {fecha.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {fecha.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
          </p>

          <div className="relative mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain" data-testid="factura-lineas">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-arena text-left text-[0.65rem] uppercase tracking-widest text-tinta-2">
                <th className="pb-2 font-semibold">Producto</th>
                <th className="pb-2 text-right font-semibold">Gramos</th>
                <th className="pb-2 text-right font-semibold">Precio/kg</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <motion.tbody variants={cont} initial="hidden" animate="show">
              {f.lineas.map((l, i) => (
                <motion.tr key={i} variants={fila} className="border-b border-dashed border-arena/80">
                  <td className={`${pad} font-semibold`}>{l.nombre}</td>
                  <td className={`tabular ${pad} text-right`}>{formatoGramos(l.gramos)}</td>
                  <td className={`tabular ${pad} text-right text-tinta-2`}>{formatoDinero(l.precioKg)}</td>
                  <td className={`tabular ${pad} text-right font-semibold`}>{formatoDinero(l.subtotalCents)}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
          </div>
          {f.lineas.length > 6 && <p className="shrink-0 pt-1 text-center text-[0.7rem] text-tinta-2">{f.lineas.length} productos · desliza para ver todos</p>}
        </div>

        <div className="shrink-0 px-6 pb-5">

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + Math.min(f.lineas.length, 10) * 0.05 }} className="mt-3 flex border-t border-arena pt-3 items-end justify-between">
            <span className="text-sm font-semibold uppercase tracking-widest text-tinta-2">Total</span>
            <span className="tabular font-display text-4xl font-semibold text-paprika">{formatoDinero(f.totalCents)}</span>
          </motion.div>

          <div className={`${muchas ? "mt-3 p-3" : "mt-5 p-4"} rounded-2xl bg-crema ring-1 ring-arena`}>
            <p className="text-xs font-bold uppercase tracking-widest text-hoja">Pago móvil</p>
            <dl className={`tabular mt-2 grid gap-x-4 gap-y-1 text-sm ${muchas ? "grid-cols-[auto_1fr_auto_1fr]" : "grid-cols-[auto_1fr]"}`}>
              <dt className="text-tinta-2">Banco</dt>
              <dd className="font-semibold">{p.banco}</dd>
              <dt className="text-tinta-2">Teléfono</dt>
              <dd className="font-semibold">{p.telefono}</dd>
              <dt className="text-tinta-2">Cédula</dt>
              <dd className="font-semibold">{p.cedula}</dd>
              <dt className="text-tinta-2">Monto</dt>
              <dd className="font-semibold">{formatoDinero(f.totalCents)}</dd>
            </dl>
            <p className="mt-3 text-xs text-tinta-2">¿Prefieres tarjeta? Pasa con la cajera y muestra tu número de orden.</p>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void nuevoPedido()}
            className={`${muchas ? "mt-4" : "mt-6"} w-full rounded-2xl bg-paprika py-4 text-lg font-bold text-white shadow-lg shadow-paprika/30`}
          >
            Nuevo pedido
          </motion.button>
        </div>
        {/* borde dentado de ticket */}
        <div className="h-3 w-full shrink-0" style={{ background: "radial-gradient(circle at 8px -2px, transparent 7px, white 8px) 0 0 / 16px 12px repeat-x" }} />
      </motion.article>
    </motion.div>
  );
}
