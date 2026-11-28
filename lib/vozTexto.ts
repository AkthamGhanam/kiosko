// Cómo se lee en voz alta lo que escribe ANA (lo usan el navegador y ElevenLabs).
export function textoParaVoz(t: string) {
  return t
    .replace(/\$(\d+)\.(\d{2})/g, (_, d, c) => (c === "00" ? `${d} dólares` : `${d} dólares con ${parseInt(c, 10)} centavos`))
    .replace(/(\d+)\s?g\b/g, "$1 gramos")
    .replace(/(\d+)\s?kg\b/g, "$1 kilos")
    .replace(/0414-?(\d{3})(\d{2})(\d{2})/g, "cero cuatro catorce, $1, $2, $3")
    .replace(/\(0134\)/g, "")
    .replace(/[*_#]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
