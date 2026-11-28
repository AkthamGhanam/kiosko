"use client";
// Panel de inventario en tiempo real: escucha /api/inventario/stream (SSE) y refresca al instante.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Resumen } from "@/lib/admin";
import { formatoDinero, formatoGramos } from "@/lib/dinero";
import { Cabecera } from "../Marca";

type Datos = Resumen;

export function PanelAdmin({ inicial }: { inicial: Datos }) {
  const [d, setD] = useState<Datos>(inicial);
  const [conectado, setConectado] = useState(false);
  const [cambiados, setCambiados] = useState<Set<number>>(new Set());
  const previo = useRef(new Map(inicial.productos.map((p) => [p.id, p.stockGramos])));

  const recargar = useCallback(async () => {
    const res = await fetch("/api/admin/resumen", { cache: "no-store" });
    if (!res.ok) return;
    const nuevo: Datos = await res.json();
    const distintos = new Set(nuevo.productos.filter((p) => previo.current.get(p.id) !== p.stockGramos).map((p) => p.id));
    previo.current = new Map(nuevo.productos.map((p) => [p.id, p.stockGramos]));
    setD(nuevo);
    if (distintos.size) {
      setCambiados(distintos);
      setTimeout(() => setCambiados(new Set()), 2200);
    }
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/inventario/stream");
    es.addEventListener("hola", () => setConectado(true));
    es.addEventListener("cambio", () => void recargar());
    es.onerror = () => setConectado(false);
    // respaldo por si el SSE se cae (proxies, varios servidores)
    const t = setInterval(() => void recargar(), 15000);
    return () => {
      es.close();
      clearInterval(t);
    };
  }, [recargar]);

  async function reponer(productoId: number, gramos: number) {
    await fetch("/api/inventario/reponer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productoId, gramos }) });
    await recargar();
  }

  const bajos = d.productos.filter((p) => p.stockGramos < 500).length;

  return (
    <main className="min-h-screen bg-crema pb-16 select-text">
      <Cabecera
        derecha={
          <span className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${conectado ? "bg-hoja/10 text-hoja ring-hoja/30" : "bg-white text-tinta-2 ring-arena"}`}>
            <span className={`h-2 w-2 rounded-full ${conectado ? "animate-pulse bg-hoja" : "bg-tinta-2/40"}`} />
            {conectado ? "En vivo" : "Reconectando…"}
          </span>
        }
      />
      <div className="mx-auto max-w-6xl px-5">
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-semibold">Inventario</h2>
          <a href="/" className="rounded-full bg-tinta px-4 py-2 text-sm font-semibold text-crema">Ir al kiosko</a>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Dato titulo="Pedidos hoy" valor={String(d.hoy.pedidos)} />
          <Dato titulo="Ventas hoy" valor={formatoDinero(d.hoy.ventasCents)} />
          <Dato titulo="Productos" valor={String(d.productos.length)} />
          <Dato titulo="Stock bajo" valor={String(bajos)} alerta={bajos > 0} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-arena">
            <table className="w-full text-sm">
              <thead className="bg-crema-2/60 text-left text-[0.65rem] uppercase tracking-widest text-tinta-2">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Precio/kg</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3 text-right">Reponer</th>
                </tr>
              </thead>
              <tbody>
                {d.productos.map((p) => {
                  const nivel = Math.min(1, p.stockGramos / 5000);
                  return (
                    <motion.tr
                      key={p.id}
                      animate={{ backgroundColor: cambiados.has(p.id) ? "#fde8d8" : "#ffffff" }}
                      transition={{ duration: 0.6 }}
                      className="border-t border-arena/60"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.imagen} alt="" className="h-9 w-9" />
                          <div>
                            <p className="font-semibold">{p.nombre}</p>
                            <p className="text-xs text-tinta-2">{p.categoria}</p>
                          </div>
                        </div>
                      </td>
                      <td className="tabular px-4 py-2.5 text-right">{formatoDinero(p.precioKg)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-crema-2">
                            <motion.div className={`h-full rounded-full ${p.stockGramos < 500 ? "bg-paprika" : "bg-hoja"}`} animate={{ width: `${nivel * 100}%` }} />
                          </div>
                          <motion.span key={p.stockGramos} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`tabular font-semibold ${p.stockGramos < 500 ? "text-paprika" : ""}`}>
                            {formatoGramos(p.stockGramos)}
                          </motion.span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          {[500, 1000].map((g) => (
                            <button key={g} onClick={() => void reponer(p.id, g)} className="rounded-full bg-crema-2 px-2.5 py-1 text-xs font-semibold hover:bg-arena active:scale-95">
                              +{formatoGramos(g)}
                            </button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-arena">
              <h3 className="font-display text-xl font-semibold">Últimos pedidos</h3>
              <ul className="mt-3 divide-y divide-arena/60">
                <AnimatePresence initial={false}>
                  {d.pedidos.length === 0 && <li className="py-3 text-sm text-tinta-2">Aún no hay pedidos.</li>}
                  {d.pedidos.map((p) => (
                    <motion.li key={p.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="py-3">
                      <div className="flex items-baseline justify-between">
                        <span className="tabular font-display text-lg font-semibold text-paprika">{p.numero}</span>
                        <span className="tabular font-bold">{formatoDinero(p.totalCents)}</span>
                      </div>
                      <p className="text-xs text-tinta-2">
                        {new Date(p.creadoEn).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })} · {p.canal} ·{" "}
                        {p.items.map((i) => `${formatoGramos(i.gramos)} ${i.nombreProducto}`).join(", ")}
                      </p>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-arena">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-xl font-semibold">Lo que ANA no entendió</h3>
                {d.noEntendidas.length > 0 && <BotonCopiar texto={d.noEntendidas.map((c) => `${c.texto} -> ${c.respuesta}`).join("\n")} />}
              </div>
              <p className="mt-1 text-xs text-tinta-2">Cada frase se agrega a las pruebas (tests/frases.test.ts) para que ANA la entienda la próxima vez.</p>
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm">
                {d.noEntendidas.length === 0 && <li className="text-tinta-2">Nada por ahora.</li>}
                {d.noEntendidas.map((c) => (
                  <li key={c.id} className="rounded-2xl bg-crema-2/60 px-3 py-2">
                    <p className="font-semibold">“{c.texto}”</p>
                    <p className="text-xs text-tinta-2">
                      {c.motivo === "ambiguo" ? "Varias opciones" : "No entendió"} · {new Date(c.creadoEn).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-arena">
              <h3 className="font-display text-xl font-semibold">Movimientos</h3>
              <ul className="mt-3 max-h-96 space-y-1.5 overflow-y-auto text-sm">
                {d.movimientos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      <b className={m.gramos < 0 ? "text-paprika" : "text-hoja"}>{m.gramos > 0 ? "+" : "−"}{formatoGramos(Math.abs(m.gramos))}</b> {m.producto}
                    </span>
                    <span className="tabular shrink-0 text-xs text-tinta-2">queda {formatoGramos(m.stockResultante)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function Dato({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-arena">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-tinta-2">{titulo}</p>
      <p className={`tabular mt-1 font-display text-3xl font-semibold ${alerta ? "text-paprika" : ""}`}>{valor}</p>
    </div>
  );
}

/** Copia la lista de frases no entendidas para pegarla en el chat y convertirla en pruebas. */
function BotonCopiar({ texto }: { texto: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard?.writeText(texto).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        });
      }}
      className="shrink-0 rounded-full bg-crema-2 px-3 py-1 text-xs font-semibold ring-1 ring-arena"
    >
      {ok ? "Copiado" : "Copiar lista"}
    </button>
  );
}
