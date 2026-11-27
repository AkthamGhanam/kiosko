// Server-Sent Events: el panel /admin recibe "cambio" cada vez que se vende o repone.
import { busInventario } from "@/lib/eventos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const enc = new TextEncoder();
  let limpiar = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const enviar = (evento: string, data: unknown) => {
        try {
          controller.enqueue(enc.encode(`event: ${evento}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          limpiar();
        }
      };
      const onCambio = (d: unknown) => enviar("cambio", d);
      busInventario.on("cambio", onCambio);
      const latido = setInterval(() => enviar("latido", { en: Date.now() }), 15000);
      enviar("hola", { en: Date.now() });
      limpiar = () => {
        clearInterval(latido);
        busInventario.off("cambio", onCambio);
      };
      req.signal.addEventListener("abort", () => {
        limpiar();
        try { controller.close(); } catch {}
      });
    },
    cancel() {
      limpiar();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
