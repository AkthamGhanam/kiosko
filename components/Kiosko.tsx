"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { fijar, useKiosko } from "@/lib/cliente/store";
import { comenzar } from "@/lib/cliente/orquestador";
import type { ProductoCliente } from "@/lib/cliente/tipos";
import { Cabecera } from "./Marca";
import { Catalogo } from "./Catalogo";
import { Carrito } from "./Carrito";
import { BarraEntrada } from "./BarraEntrada";
import { Burbujas } from "./Burbujas";
import { IndicadorEstado } from "./IndicadorEstado";
import { Factura } from "./Factura";
import { PantallaCarga } from "./PantallaCarga";

// La escena 3D solo existe en el navegador
const Escena = dynamic(() => import("./ana/Escena"), { ssr: false });

export function Kiosko({ productos }: { productos: ProductoCliente[] }) {
  const [iniciado, setIniciado] = useState(false);
  const fase = useKiosko((e) => e.fase);
  const listo = useKiosko((e) => e.avatarListo);
  const proveedor = useKiosko((e) => e.proveedor);

  useEffect(() => {
    fijar({ productos });
  }, [productos]);

  const empezar = () => {
    if (iniciado) return;
    setIniciado(true);
    void comenzar();
  };

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-crema landscape:flex-row">
      {/* Escenario de ANA */}
      <section
        className={`fondo-escena relative shrink-0 overflow-hidden transition-[height,width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] landscape:h-full ${iniciado ? "h-[44%] landscape:w-[46%]" : "h-full landscape:w-full"}`}
      >
        <div className="absolute inset-x-0 top-0 z-10">
          <Cabecera
            derecha={
              proveedor && (
                <span className="rounded-full bg-white/70 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-widest text-tinta-2 ring-1 ring-arena">
                  {proveedor === "local" ? "Modo local" : `IA · ${proveedor}`}
                </span>
              )
            }
          />
        </div>
        {/* marca de agua de la tienda detrás de ANA */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[8%] select-none text-center font-display text-[18vmin] font-semibold leading-none text-tinta/[0.04]">
          Especias
        </div>
        <Escena />
        <div className={`absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 p-4 ${iniciado ? "portrait:top-16 portrait:justify-end portrait:pl-[40%]" : ""}`}>
          <Burbujas />
          <IndicadorEstado />
        </div>
      </section>

      {/* Panel de pedido */}
      <section className="relative flex min-h-0 flex-1 flex-col rounded-t-[2rem] bg-crema-2/60 pt-4 shadow-[0_-12px_40px_-20px_rgba(42,29,21,0.35)] landscape:rounded-none landscape:pt-6">
        <div className="flex items-baseline justify-between px-5 pb-2">
          <h2 className="font-display text-2xl font-semibold">¿Qué vas a llevar?</h2>
          <span className="text-xs text-tinta-2">Precios por kilo · se cobra al gramo</span>
        </div>
        <Catalogo />
        <Carrito />
        <BarraEntrada />
      </section>

      <AnimatePresence>{fase === "factura" && <Factura />}</AnimatePresence>

      <AnimatePresence>
        {!iniciado && (
          <motion.button
            key="inicio"
            onClick={empezar}
            className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-gradient-to-t from-tinta/75 via-transparent to-transparent pb-[10vh]"
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            aria-label="Toca para empezar"
          >
            <PantallaCarga listo={listo} />
          </motion.button>
        )}
      </AnimatePresence>
    </main>
  );
}
