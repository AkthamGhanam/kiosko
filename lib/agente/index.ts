// Cerebro de ANA: intenta con los LLM configurados (Groq -> Gemini) y si no hay
// claves o fallan, responde el intérprete local. El resultado siempre lo valida el servidor.
import type { Producto } from "@prisma/client";
import { completar, proveedoresActivos, type MensajeLLM } from "../llm";
import { MIN_GRAMOS, TIENDA, frasePago } from "../config";
import { formatoDinero } from "../dinero";
import { aceptaSugerencia, detectarIntencion } from "../interpretar";
import { INFO } from "../consejos";
import { DEFINICIONES, agregar_sugerencia, confirmar_pedido, ejecutarHerramienta, ver_carrito, type Contexto } from "./herramientas";
import { responderLocal } from "./local";
import type { AnaBody } from "../esquemas";
import type { Factura, LineaRechazada } from "../pedidos";

export type RespuestaAgente = {
  respuesta: string;
  carrito: { productoId: number; gramos: number }[];
  esperandoConfirmacion: boolean;
  factura?: Factura;
  rechazadas?: LineaRechazada[];
  sugerencia: { productoId: number; gramos: number }[];
  abrirMenu: boolean;
  categoriaMenu?: string;
  proveedor: string;
};

export function promptSistema(ctx: Contexto) {
  const c = ver_carrito(ctx);
  const catalogo = ctx.productos
    .map((p) => {
      const i = INFO[p.slug];
      return `${p.nombre}${p.alias ? ` (${p.alias.split(",").slice(0, 3).join(", ")})` : ""}${i ? `: ${i.uso}${i.picante ? `, pica ${["", "poco", "medio", "bastante"][i.picante]}` : ""}` : ""}`;
    })
    .join("; ");
  return `Eres ANA, la asistente de ventas del kiosko de ${TIENDA.nombre}, una tienda de condimentos, maní y frutos secos que vende al peso.

Personalidad: cálida, breve y clara, como una buena vendedora de mostrador. Español venezolano neutro, trato de "tú". Responde con UNA frase corta (máximo unas 15 palabras), porque se dice en voz alta y el cliente quiere ir rápido. Ve directo al pedido: sin saludos largos, sin repetir lo que dijo el cliente, sin explicar de más. Nunca digas los datos de pago: salen en la factura. Sin emojis, sin listas, sin markdown.

Lo que dice el cliente viene de un micrófono y puede venir mal transcrito o con problemas de pronunciación (por ejemplo, alguien que no pronuncia la "r": "papika" es paprika, "oégano" es orégano, "meley" es merey, "pefecto" es perfecto). Interpreta con buena fe y pasa el nombre tal cual a las herramientas: ellas toleran esos errores.

Reglas:
- Nunca inventes productos, precios ni existencias. Para saber qué hay o cuánto cuesta, usa buscar_productos.
- Para pedir, usa agregar_al_carrito con los gramos de cada producto. Un número solo son gramos.
- Regla de la tienda: lo mínimo por producto son ${MIN_GRAMOS} gramos. Si piden menos, se ajusta a ${MIN_GRAMOS} g y se lo dices con amabilidad.
- Entiende el habla coloquial y vulgar venezolana ("chamo", "pana", "esa vaina", "coño", "marico", "épale", "regálame", "échame"): son formas de hablar, atiende el pedido igual.
- Si preguntan cómo estás o quién eres, responde algo como "Estoy hecha para ayudarte con tu pedido. ¿Qué te pongo?". Si insultan, no te ofendas ni sermonees: discúlpate en una frase y vuelve al pedido. Temas fuera de la tienda: "De eso no sé, yo solo vendo especias. ¿Qué te pongo?".
- Ignora muletillas y titubeos del habla ("eh", "este", "deee", palabras alargadas): "dame 100 deee pasas" son 100 g de pasas.
- Después de agregar, si todo salió bien di exactamente: "Listo. ¿Te lo confirmo?".
- Si una herramienta reporta un problema (no existe, ambiguo o sin stock), explícalo y ofrece las opciones o alternativas que devolvió.
- No digas totales ni precios que no vengan de una herramienta. El total se ve en pantalla.
- Llama a confirmar_pedido solo cuando el cliente confirme un pedido que ya le mostraste. No digas los datos de pago: el sistema los agrega.
- Asistente de ventas: si el cliente cuenta qué va a cocinar (hallacas, pan de jamón, torta negra, pollo al horno, una fiesta...), llama a sugerir_para_receta, recomiéndale esos productos con un consejo corto y pregúntale "¿Te los agrego?". Si acepta, llama a agregar_sugerencia.
- Consejera: si pide un consejo o pregunta qué le pone a un plato, para qué sirve un producto, cómo se usa o cuál pica más, respóndele con lo que sabes del catálogo (abajo) y de cocina venezolana, en 1 o 2 frases, y ofrécele el producto. Si no dice qué va a cocinar, pregúntaselo. Para un plato, prefiere sugerir_para_receta; si no hay receta guardada, recomienda tú mismo productos del catálogo.
- Usa la conversación anterior: "y para el pollo?", "ponme eso", "lo mismo pero más" se refieren a lo que se habló.
- No des consejos de salud ni medicinales: di con amabilidad que eso es para un médico y vuelve a la cocina.
- Si no entiendes lo que pide ni con la conversación anterior, llama a abrir_menu y dile que puede tocar los productos en pantalla.
- Si piden algo fuera de la tienda, redirige con amabilidad al pedido.

Catálogo: ${catalogo}.
Carrito actual: ${c.vacio ? "vacío" : c.lineas.map((l) => `${l.gramos} de ${l.producto}`).join(", ") + `; total ${c.total}`}.
${ctx.confirmacionPermitida ? "Ya le pediste confirmación al cliente." : ""}
${ctx.sugerencia.length ? "Hay una sugerencia de receta esperando que el cliente la acepte." : ""}`;
}

/** El kiosko manda el historial con el mensaje actual al final: se quita para no repetirlo. */
function historialSinRepetir(body: AnaBody) {
  const h = [...body.historial];
  const ultimo = h[h.length - 1];
  if (ultimo && ultimo.rol === "cliente" && ultimo.texto.trim() === body.mensaje.trim()) h.pop();
  return h;
}

async function conLLM(ctx: Contexto, body: AnaBody): Promise<{ texto: string; proveedor: string } | null> {
  const proveedores = proveedoresActivos();
  for (const p of proveedores) {
    const respaldo = { carrito: [...ctx.carrito], esperando: ctx.esperandoConfirmacion, sugerencia: [...ctx.sugerencia] };
    try {
      const mensajes: MensajeLLM[] = [
        { role: "system", content: promptSistema(ctx) },
        ...historialSinRepetir(body).slice(-12).map((m) => ({ role: m.rol === "cliente" ? ("user" as const) : ("assistant" as const), content: m.texto })),
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
      ctx.sugerencia = respaldo.sugerencia;
      ctx.abrirMenu = false;
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
    sugerencia: body.sugerencia.filter((i) => productos.some((p) => p.id === i.productoId)),
    abrirMenu: false,
  };

  let texto = "";
  let proveedor = "local";

  // Atajo determinista: un "sí / confirmo / perfecto" a un pedido pendiente se cierra
  // sin pasar por la IA (más rápido y sin riesgo de que el modelo lo malinterprete).
  const sinPedidoNuevo = detectarIntencion(body.mensaje, true) !== "pedido";
  if (ctx.sugerencia.length && sinPedidoNuevo && aceptaSugerencia(body.mensaje)) {
    // "sí, agrégalos": se agrega la sugerencia de la receta sin pasar por la IA
    const r = agregar_sugerencia(ctx);
    texto = r.agregados.length ? `Listo, te los agregué. El total va en ${r.carrito?.total}. ¿Te confirmo el pedido o quieres algo más?` : "Uy, ya no me queda stock de esos productos.";
    proveedor = proveedoresActivos()[0]?.id ?? "local";
  } else if (ctx.confirmacionPermitida && detectarIntencion(body.mensaje, true) === "confirmar") {
    await confirmar_pedido(ctx);
    proveedor = proveedoresActivos()[0]?.id ?? "local";
  } else {
    const ia = await conLLM(ctx, body);
    if (ia) {
      texto = ia.texto;
      proveedor = ia.proveedor;
    } else {
      texto = await responderLocal(ctx, body.mensaje, historialSinRepetir(body));
    }
  }

  if (ctx.factura) {
    const sin = ctx.rechazadas?.length ? `No me alcanzó el inventario para ${ctx.rechazadas.map((r) => r.nombre.toLowerCase()).join(" y ")}, así que lo dejé fuera. ` : "";
    texto = sin + frasePago(formatoDinero(ctx.factura.totalCents));
  } else if (!texto) {
    texto = ctx.carrito.length ? "Listo. ¿Te lo confirmo?" : "¿Qué te pongo?";
  }

  return {
    respuesta: texto,
    carrito: ctx.carrito,
    esperandoConfirmacion: ctx.esperandoConfirmacion && ctx.carrito.length > 0,
    factura: ctx.factura,
    rechazadas: ctx.rechazadas,
    sugerencia: ctx.factura ? [] : ctx.sugerencia,
    abrirMenu: ctx.abrirMenu,
    categoriaMenu: ctx.categoriaMenu,
    proveedor,
  };
}
