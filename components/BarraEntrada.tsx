"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import { enviarMensaje } from "@/lib/cliente/orquestador";

/** Caja de texto solo para pruebas (?teclado=1). En el kiosko se pide por voz o tocando. */
export function BarraEntrada() {
  const [texto, setTexto] = useState("");
  const mic = useKiosko((e) => e.microfonoDisponible);

  const enviar = () => {
    if (!texto.trim()) return;
    void enviarMensaje(texto, "texto");
    setTexto("");
  };

  return (
    <form
      className="flex items-center gap-3 px-4 pb-3"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={mic ? "Habla o escribe: 100 g de maní salado…" : "Escribe tu pedido: 100 g de maní salado…"}
        className="h-14 min-w-0 flex-1 rounded-full bg-white px-5 text-base shadow-sm outline-none ring-1 ring-arena placeholder:text-tinta-2/60 focus:ring-2 focus:ring-paprika"
        enterKeyHint="send"
        aria-label="Escribe tu pedido"
      />
      <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!texto.trim()} aria-label="Enviar" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-tinta text-crema disabled:opacity-30">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </motion.button>
    </form>
  );
}
