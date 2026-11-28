"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { fijar, useKiosko } from "@/lib/cliente/store";
import { comenzar, prepararVoz } from "@/lib/cliente/orquestador";
import type { ProductoCliente } from "@/lib/cliente/tipos";
import { Cabecera } from "./Marca";
import { Carrito } from "./Carrito";
import { BarraEntrada } from "./BarraEntrada";
import { Burbujas } from "./Burbujas";
import { IndicadorEstado } from "./IndicadorEstado";
import { Factura } from "./Factura";
import { PantallaCarga } from "./PantallaCarga";
import { Controles } from "./Controles";
import { MenuProductos } from "./MenuProductos";
import { TarjetaSugerencia } from "./TarjetaSugerencia";

// La escena 3D solo existe en el navegador
const Escena = dynamic(() => import("./ana/Escena"), { ssr: false });

/**
 * Kiosko pensado para hablar: ANA al centro, subtítulos y micrófono abajo.
 * No hay campo de texto (nadie escribe en un kiosko); con ?teclado=1 aparece para pruebas.
 */
export function Kiosko({ productos }: { productos: ProductoCliente[] }) {
  const [iniciado, setIniciado] = useState(false);
  const [teclado, setTeclado] = useState(false);
  const fase = useKiosko((e) => e.fase);
  const listo = useKiosko((e) => e.avatarListo);
  const proveedor = useKiosko((e) => e.proveedor);

  useEffect(() => {
    fijar({ productos });
  }, [productos]);

  useEffect(() => {
    setTeclado(new URLSearchParams(window.location.search).has("teclado"));
    void prepararVoz();
  }, []);

  const empezar = () => {
    if (iniciado) return;
    setIniciado(true);
    void comenzar();
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-crema">
      {/* Escenario de ANA: pantalla completa, ella al centro */}
      <section className="fondo-escena absolute inset-0">
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
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[22%] select-none text-center font-display text-[18vmin] font-semibold leading-none text-tinta/[0.04]">
          Especias
        </div>
        <Escena />
      </section>

      {/* velo suave abajo para que subtítulos y botones se lean sobre ANA */}
      {iniciado && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[30%] bg-gradient-to-t from-crema via-crema/75 to-transparent" />}

      {/* Conversación y controles, encima de la escena */}
      {iniciado && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 mx-auto flex max-w-2xl flex-col"
        >
          <div className="flex flex-col items-center gap-3 px-4 pb-3">
            <Burbujas />
            <IndicadorEstado />
            <TarjetaSugerencia />
          </div>
          <Carrito ocultarVacio />
          <div className="pointer-events-auto">
            {teclado && <BarraEntrada />}
            <Controles />
          </div>
        </motion.div>
      )}

      <MenuProductos />

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
