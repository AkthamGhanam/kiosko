// ANA sin IA: intérprete local de reglas. Es el respaldo cuando no hay claves o la IA falla.
import { detectarIntencion, interpretarPedido, productoMencionado, aceptaSugerencia } from "../interpretar";
import { buscarProducto } from "../buscar";
import { formatoDinero } from "../dinero";
import { detectarReceta } from "../recetas";
import {
  agregar_al_carrito,
  agregar_sugerencia,
  confirmar_pedido,
  quitar_del_carrito,
  sugerir_para_receta,
  vaciar_carrito,
  ver_carrito,
  type Contexto,
} from "./herramientas";

const lista = (xs: string[], y = "y") => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${y} ${xs[xs.length - 1]}`);
const minus = (s: string) => s.toLowerCase();

function explicarProblemas(problemas: Record<string, unknown>[]): string {
  const frases: string[] = [];
  for (const p of problemas) {
    if (p.problema === "no_existe") {
      const sug = (p.sugerencias as string[]) ?? [];
      frases.push(sug.length ? `No tengo "${p.pedido}". ¿Quizás ${lista(sug.map(minus), "o")}?` : `No tengo "${p.pedido}"; te abrí el menú para que veas lo que hay.`);
    } else if (p.problema === "ambiguo") {
      frases.push(`Tengo varios: ${lista((p.opciones as string[]).map(minus), "o")}. ¿Cuál quieres?`);
    } else if (p.problema === "sin_stock") {
      const alt = (p.alternativas as string[]) ?? [];
      frases.push(`De ${minus(String(p.pedido))} solo me quedan ${p.disponibles}` + (alt.length ? `; te puedo ofrecer ${lista(alt.map(minus))}.` : "."));
    }
  }
  return frases.join(" ");
}

function abrirMenu(ctx: Contexto, categoria?: string) {
  ctx.abrirMenu = true;
  ctx.categoriaMenu = categoria;
}

export async function responderLocal(ctx: Contexto, mensaje: string): Promise<string> {
  // 1. ¿acepta la sugerencia de una receta?
  if (ctx.sugerencia.length && aceptaSugerencia(mensaje)) {
    const r = agregar_sugerencia(ctx);
    return r.agregados.length ? `Listo, te los agregué. El total va en ${r.carrito?.total}. ¿Te confirmo el pedido o quieres algo más?` : "Uy, ya no me queda stock de esos productos.";
  }

  const intencion = detectarIntencion(mensaje, ctx.esperandoConfirmacion && ctx.carrito.length > 0);

  // 2. asistente de ventas: "quiero hacer hallacas"
  if (intencion !== "pedido" && intencion !== "quitar" && intencion !== "cancelar") {
    const receta = detectarReceta(mensaje);
    if (receta) {
      const r = sugerir_para_receta(ctx, { plato: receta.plato });
      if (r.encontrada && r.sugerencia?.length) {
        return `¡Qué sabroso! Para ${receta.plato} te recomiendo ${lista(r.sugerencia.map((s) => minus(s.producto)))}. ${receta.consejo} ¿Te los agrego?`;
      }
    }
  }
  ctx.sugerencia = [];

  switch (intencion) {
    case "pedido": {
      const lineas = interpretarPedido(mensaje);
      const r = agregar_al_carrito(ctx, { items: lineas.map((l) => ({ producto: l.texto, gramos: l.gramos })) });
      const problemas = explicarProblemas(r.problemas);
      if (!r.agregados.length) return problemas || "No entendí qué producto quieres. Te abrí el menú para que lo toques.";
      if (!problemas) return "Perfecto, tu pedido está listo. ¿Me lo confirmas?";
      return `Agregué ${lista(r.agregados.map((a) => `${a.gramos} de ${minus(a.producto)}`))}. ${problemas} ¿Confirmo el resto?`;
    }
    case "confirmar": {
      const r = await confirmar_pedido(ctx);
      if (!r.ok) return `No pude cerrar el pedido: ${r.motivo}`;
      return ""; // la frase de pago la arma el servidor con los datos reales
    }
    case "cancelar":
      vaciar_carrito(ctx);
      return "Listo, vacié tu pedido. ¿Qué te gustaría llevar?";
    case "quitar": {
      const r = quitar_del_carrito(ctx, { producto: productoMencionado(mensaje) || mensaje });
      if (!r.quitado) return "Ese producto no está en tu pedido.";
      return r.carrito.vacio ? `Quité ${minus(r.quitado)}. Tu pedido quedó vacío.` : `Quité ${minus(r.quitado)}. Tu total ahora es ${r.carrito.total}. ¿Te lo confirmo?`;
    }
    case "precio": {
      const q = productoMencionado(mensaje);
      const r = buscarProducto(q, ctx.productos);
      if (r.tipo === "exacto") {
        const p = r.producto;
        return p.stockGramos >= 50 ? `${p.nombre} está a ${formatoDinero(p.precioKg)} el kilo. ¿Cuántos gramos te pongo?` : `${p.nombre} se nos agotó por hoy.`;
      }
      if (r.tipo === "ambiguo") {
        abrirMenu(ctx, r.opciones[0]?.categoria);
        return `El kilo está así: ${lista(r.opciones.map((p) => `${minus(p.nombre)} a ${formatoDinero(p.precioKg)}`))}. ¿Cuál prefieres?`;
      }
      abrirMenu(ctx);
      return "Ese producto no lo tengo. Te abrí el menú para que veas todo lo que hay.";
    }
    case "carrito": {
      const c = ver_carrito(ctx);
      return c.vacio ? "Tu pedido está vacío por ahora. ¿Qué te pongo?" : `Llevas ${lista(c.lineas.map((l) => `${l.gramos} de ${minus(l.producto)}`))}. El total es ${c.total}. ¿Te lo confirmo?`;
    }
    case "catalogo":
      abrirMenu(ctx);
      return "Te abrí el menú. Tengo maní de varios tipos, merey, almendras, especias y granos. ¿Qué te provoca?";
    case "saludo":
      return "¡Hola! Dime qué quieres y cuántos gramos, o cuéntame qué vas a cocinar y te ayudo.";
    default: {
      // ¿nombró un producto sin decir cuánto? "quiero maní salado"
      const q = productoMencionado(mensaje).replace(/\b(quiero|dame|ponme|deme|quisiera|me das|necesito|un poco|poquito)\b/g, " ").trim();
      if (q) {
        const r = buscarProducto(q, ctx.productos);
        if (r.tipo === "exacto") return `¿Cuántos gramos de ${minus(r.producto.nombre)} te pongo? Por ejemplo, 100 o 250 gramos.`;
        if (r.tipo === "ambiguo") {
          abrirMenu(ctx, r.opciones[0]?.categoria);
          return `Tengo ${lista(r.opciones.map((p) => minus(p.nombre)), "o")}. ¿Cuál quieres y cuántos gramos?`;
        }
      }
      if (ctx.esperandoConfirmacion && ctx.carrito.length) {
        abrirMenu(ctx);
        return "No te entendí bien. ¿Te confirmo el pedido o quieres agregar algo del menú?";
      }
      abrirMenu(ctx);
      return "Disculpa, no te entendí bien. Te abrí el menú para que lo toques, o dime el producto y los gramos.";
    }
  }
}
