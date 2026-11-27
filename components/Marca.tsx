import { TIENDA } from "@/lib/config";

/** Isotipo propio de la tienda: hoja + grano, en SVG (sin assets externos). */
export function Isotipo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="31" fill="#c2462b" />
      <path d="M20 40c0-11 8-20 22-22-1 13-9 23-20 23-1 0-2 0-2-1z" fill="#faf5ec" />
      <path d="M22 41c5-6 10-11 17-16" stroke="#c2462b" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <ellipse cx="41" cy="42" rx="6" ry="4.2" fill="#e0a526" transform="rotate(-25 41 42)" />
    </svg>
  );
}

export function Cabecera({ derecha }: { derecha?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-3 px-5 py-3 landscape:px-6">
      <Isotipo className="h-11 w-11 shrink-0" />
      <div className="min-w-0 leading-tight">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight text-tinta">{TIENDA.nombre}</h1>
        <p className="truncate text-xs text-tinta-2">{TIENDA.lema}</p>
      </div>
      <div className="ml-auto flex items-center gap-2">{derecha}</div>
    </header>
  );
}
