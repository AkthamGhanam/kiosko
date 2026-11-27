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
  const cont = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } } };
  const fila = { hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0 } };

  return (
    <motion.div
      className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-tinta/30 p-4 backdrop-blur-md"
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
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-white shadow-2xl"
        aria-label={`Factura ${f.numero}`}
      >
        <div className="flex items-center gap-3 bg-tinta px-6 py-5 text-crema">
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

        <div className="px-6 py-5">
          <p className="tabular text-sm text-tinta-2">
            {fecha.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {fecha.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })}
          </p>

          <table className="mt-4 w-full text-sm">
            <thead>
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
                  <td className="py-2.5 font-semibold">{l.nombre}</td>
                  <td className="tabular py-2.5 text-right">{formatoGramos(l.gramos)}</td>
                  <td className="tabular py-2.5 text-right text-tinta-2">{formatoDinero(l.precioKg)}</td>
                  <td className="tabular py-2.5 text-right font-semibold">{formatoDinero(l.subtotalCents)}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + f.lineas.length * 0.06 }} className="mt-4 flex items-end justify-between">
            <span className="text-sm font-semibold uppercase tracking-widest text-tinta-2">Total</span>
            <span className="tabular font-display text-4xl font-semibold text-paprika">{formatoDinero(f.totalCents)}</span>
          </motion.div>

          <div className="mt-5 rounded-2xl bg-crema p-4 ring-1 ring-arena">
            <p className="text-xs font-bold uppercase tracking-widest text-hoja">Pago móvil</p>
            <dl className="tabular mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
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
            className="mt-6 w-full rounded-2xl bg-paprika py-4 text-lg font-bold text-white shadow-lg shadow-paprika/30"
          >
            Nuevo pedido
          </motion.button>
        </div>
        {/* borde dentado de ticket */}
        <div className="h-3 w-full" style={{ background: "radial-gradient(circle at 8px -2px, transparent 7px, white 8px) 0 0 / 16px 12px repeat-x" }} />
      </motion.article>
    </motion.div>
  );
}
