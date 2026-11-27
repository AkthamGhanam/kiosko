"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import { enviarMensaje, iniciarEscucha } from "@/lib/cliente/orquestador";

/** Micrófono grande + caja de texto: siempre hay forma de pedir si la voz falla. */
export function BarraEntrada() {
  const [texto, setTexto] = useState("");
  const estado = useKiosko((e) => e.estadoAna);
  const mic = useKiosko((e) => e.microfonoDisponible);
  const escuchando = estado === "escuchando";

  const enviar = () => {
    if (!texto.trim()) return;
    void enviarMensaje(texto, "texto");
    setTexto("");
  };

  return (
    <form
      className="flex items-center gap-3 px-4 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      {mic && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={iniciarEscucha}
          aria-label={escuchando ? "Dejar de escuchar" : "Hablar con ANA"}
          className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full text-white shadow-lg ${escuchando ? "bg-paprika shadow-paprika/40" : "bg-hoja shadow-hoja/30"}`}
        >
          {escuchando && <motion.span className="absolute inset-0 rounded-full bg-paprika" animate={{ scale: [1, 1.6], opacity: [0.5, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />}
          <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </motion.button>
      )}
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
