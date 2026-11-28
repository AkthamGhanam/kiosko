"use client";
import { motion } from "framer-motion";
import { useKiosko } from "@/lib/cliente/store";
import { abrirMenu, iniciarEscucha } from "@/lib/cliente/orquestador";

/** Botón de micrófono. El anillo crece con la voz del cliente. */
export function BotonMicrofono({ pequeno = false }: { pequeno?: boolean }) {
  const estado = useKiosko((e) => e.estadoAna);
  const mic = useKiosko((e) => e.microfonoDisponible);
  const nivel = useKiosko((e) => e.nivelMic);
  if (!mic) return null;
  const escuchando = estado === "escuchando";
  const tam = pequeno ? "h-12 w-12" : "h-24 w-24";
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={iniciarEscucha}
      aria-label={escuchando ? "Dejar de escuchar" : "Hablar con ANA"}
      className={`relative grid ${tam} shrink-0 place-items-center rounded-full text-white shadow-xl ${escuchando ? "bg-paprika shadow-paprika/40" : "bg-hoja shadow-hoja/30"}`}
    >
      {escuchando && (
        <>
          <motion.span className="absolute inset-0 rounded-full bg-paprika" animate={{ scale: [1, 1.5], opacity: [0.45, 0] }} transition={{ duration: 1.3, repeat: Infinity }} />
          <span className="absolute inset-0 rounded-full bg-paprika/40 transition-transform duration-75" style={{ transform: `scale(${1 + nivel * 0.45})` }} />
        </>
      )}
      <svg viewBox="0 0 24 24" className={`relative ${pequeno ? "h-5 w-5" : "h-10 w-10"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </motion.button>
  );
}

/** Barra inferior del kiosko: menú a un lado, micrófono grande al centro. Sin teclado. */
export function Controles() {
  const mic = useKiosko((e) => e.microfonoDisponible);
  const estado = useKiosko((e) => e.estadoAna);
  const pista = estado === "escuchando" ? "Te escucho…" : estado === "pensando" ? "Un momento…" : "Toca para hablar";
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 pb-5">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => abrirMenu()}
        className={`flex items-center gap-2 justify-self-start rounded-full bg-white px-5 py-4 text-base font-bold text-tinta shadow-lg shadow-tinta/10 ring-1 ring-arena ${mic ? "" : "col-span-3 justify-self-center px-10 text-lg"}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
        </svg>
        Ver menú
      </motion.button>
      {mic && (
        <div className="flex flex-col items-center gap-1.5">
          <BotonMicrofono />
          <span className="text-xs font-semibold text-tinta-2">{pista}</span>
        </div>
      )}
      {mic && <span />}
    </div>
  );
}
