// Cerebro de ANA: intenta con los LLM configurados (Groq -> Gemini) y si no hay
// claves o fallan, responde el intérprete local. El resultado siempre lo valida el servidor.
import type { Producto } from "@prisma/client";
import { completar, proveedoresActivos, type MensajeLLM } from "../llm";
import { TIENDA, frasePago } from "../config";
import { formatoDinero } from "../dinero";
import { detectarIntencion } from "../interpretar";
import { DEFINICIONES, confirmar_pedido, ejecutarHerramienta, ver_carrito, type Contexto } from "./herramientas";
import { responderLocal } from "./local";
import type { AnaBody } from "../esquemas";
import type { Factura, LineaRechazada } from "../pedidos";

export type RespuestaAgente = {
  respuesta: string;
  carrito: { productoId: number; gramos: number }[];
  esperandoConfirmacion: boolean;
  factura?: Factura;
  rechazadas?: LineaRechazada[];
  proveedor: string;
};

export function promptSistema(ctx: Contexto) {
  const c = ver_carrito(ctx);
  const catalogo = ctx.productos
    .map((p) => `${p.nombre}${p.alias ? ` (${p.alias.split(",").slice(0, 3).join(", ")})` : ""}`)
    .join("; ");
  return `Eres ANA, la asistente virtual del kiosko de ${TIENDA.nombre}, una tienda de condimentos, maní y frutos secos que vende al peso.

Personalidad: cálida, breve y clara. Español venezolano neutro, trato de "tú". Responde en 1 o 2 frases cortas, porque tus palabras se leen en voz alta. Sin emojis, sin listas, sin markdown.

Reglas:
- Nunca inventes productos, precios ni existencias. Para saber qué hay o cuánto cuesta, usa buscar_productos.
- Para pedir, usa agregar_al_carrito con los gramos de cada producto. Un número solo son gramos.
- Después de agregar, si todo salió bien di exactamente: "Perfecto, tu pedido está listo. ¿Me lo confirmas?".
- Si una herramienta reporta un problema (no existe, ambiguo o sin stock), explícalo y ofrece las opciones o alternativas que devolvió.
- No digas totales ni precios que no vengan de una herramienta. El total se ve en pantalla.
- Llama a confirmar_pedido solo cuando el cliente confirme un pedido que ya le mostraste. No digas los datos de pago: el sistema los agrega.
- Si piden algo fuera de la tienda, redirige con amabilidad al pedido.

Catálogo: ${catalogo}.
Carrito actual: ${c.vacio ? "vacío" : c.lineas.map((l) => `${l.gramos} de ${l.producto}`).join(", ") + `; total ${c.total}`}.
${ctx.confirmacionPermitida ? "Ya le pediste confirmación al cliente." : ""}`;
}

async function conLLM(ctx: Contexto, body: AnaBody): Promise<{ texto: string; proveedor: string } | null> {
  const proveedores = proveedoresActivos();
  for (const p of proveedores) {
    const respaldo = { carrito: [...ctx.carrito], esperando: ctx.esperandoConfirmacion };
    try {
      const mensajes: MensajeLLM[] = [
        { role: "system", content: promptSistema(ctx) },
        ...body.historial.slice(-8).map((m) => ({ role: m.rol === "cliente" ? ("user" as const) : ("assistant" as const), content: m.texto })),
        { role: "user", content: body.mensaje },
      ];
      for (let paso = 0; paso < 5; paso++) {
        const r = await completar(p, mensajes, DEFINICIONES);
        if (!r.tool_calls) return { texto: (r.content ?? "").trim(), proveedor: p.id };
        mensajes.push({ role: "assistant", content: r.content ?? null, tool_calls: r.tool_calls });
        for (const call of r.tool_calls) {
          const out = await ejecutarHerramienta(ctx, call.function.name, call.function.arguments);
          mensajes.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out) });
        }
        // el pedido ya quedó registrado: no se reintenta con otro proveedor
        if (ctx.factura) return { texto: "", proveedor: p.id };
      }
      return { texto: "", proveedor: p.id };
    } catch (e) {
      if (ctx.factura) return { texto: "", proveedor: p.id };
      console.warn(`[ANA] ${p.id} falló, probando el siguiente:`, (e as Error).message);
      ctx.carrito = respaldo.carrito;
      ctx.esperandoConfirmacion = respaldo.esperando;
    }
  }
  return null;
}

export async function responder(body: AnaBody, productos: Producto[]): Promise<RespuestaAgente> {
  const ctx: Contexto = {
    productos,
    carrito: body.carrito.filter((i) => productos.some((p) => p.id === i.productoId)),
    esperandoConfirmacion: body.esperandoConfirmacion,
    confirmacionPermitida: body.esperandoConfirmacion && body.carrito.length > 0,
    canal: body.canal,
  };

  let texto = "";
  let proveedor = "local";

  // Atajo determinista: un "sí / confirmo / perfecto" a un pedido pendiente se cierra
  // sin pasar por la IA (más rápido y sin riesgo de que el modelo lo malinterprete).
  if (ctx.confirmacionPermitida && detectarIntencion(body.mensaje, true) === "confirmar") {
    await confirmar_pedido(ctx);
    proveedor = proveedoresActivos()[0]?.id ?? "local";
  } else {
    const ia = await conLLM(ctx, body);
    if (ia) {
      texto = ia.texto;
      proveedor = ia.proveedor;
    } else {
      texto = await responderLocal(ctx, body.mensaje);
    }
  }

  if (ctx.factura) {
    const sin = ctx.rechazadas?.length ? `No me alcanzó el inventario para ${ctx.rechazadas.map((r) => r.nombre.toLowerCase()).join(" y ")}, así que lo dejé fuera. ` : "";
    texto = sin + frasePago(formatoDinero(ctx.factura.totalCents));
  } else if (!texto) {
    texto = ctx.carrito.length ? "Perfecto, tu pedido está listo. ¿Me lo confirmas?" : "¿Qué te gustaría llevar?";
  }

  return {
    respuesta: texto,
    carrito: ctx.carrito,
    esperandoConfirmacion: ctx.esperandoConfirmacion && ctx.carrito.length > 0,
    factura: ctx.factura,
    rechazadas: ctx.rechazadas,
    proveedor,
  };
}
