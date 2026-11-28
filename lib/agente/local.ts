// ANA sin IA: intérprete local de reglas. Es el respaldo cuando no hay claves o la IA falla.
import { detectarIntencion, interpretarPedido, productoMencionado, aceptaSugerencia } from "../interpretar";
import { buscarProducto } from "../buscar";
import { formatoDinero } from "../dinero";
import { MIN_GRAMOS } from "../config";
import { detectarReceta } from "../recetas";
import { INFO, pideConsejo, preguntaPicante, preguntaSalud, preguntaUso } from "../consejos";
import { fonetica } from "../texto";
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


/** Producto nombrado en una pregunta ("¿para qué sirve la linaza?"), por nombre o alias, tolerando la r. */
function productoEnTexto(ctx: Contexto, texto: string) {
  const f = ` ${fonetica(texto)} `;
  let mejor: { p: Contexto["productos"][number]; largo: number } | null = null;
  for (const p of ctx.productos) {
    for (const nombre of [p.nombre, ...p.alias.split(",")].map((x) => fonetica(x.trim())).filter((x) => x.length > 2)) {
      if ((f.includes(` ${nombre} `) || f.includes(` ${nombre}s `)) && (!mejor || nombre.length > mejor.largo)) mejor = { p, largo: nombre.length };
    }
  }
  return mejor?.p ?? null;
}

/** Preguntas de vendedora: para qué sirve un producto, cuál pica, o un consejo sin plato concreto. */
function responderConsejo(ctx: Contexto, mensaje: string): string | null {
  if (preguntaSalud(mensaje)) {
    return "Eso es mejor consultarlo con un médico. ¿Qué vas a cocinar?";
  }
  if (preguntaPicante(mensaje)) {
    const pican = ctx.productos.filter((p) => (INFO[p.slug]?.picante ?? 0) > 0).sort((a, b) => (INFO[b.slug].picante ?? 0) - (INFO[a.slug].picante ?? 0));
    const suaves = ctx.productos.filter((p) => INFO[p.slug]?.picante === 0).slice(0, 3);
    return `Pica más ${lista(pican.slice(0, 2).map((p) => minus(p.nombre)))}. Sin picante: ${lista(suaves.slice(0, 2).map((p) => minus(p.nombre)))}. ¿Cuál quieres?`;
  }
  const p = productoEnTexto(ctx, mensaje);
  if (p && (preguntaUso(mensaje) || pideConsejo(mensaje))) {
    const info = INFO[p.slug];
    if (info) return `${p.nombre} se usa ${info.uso}. ¿Cuántos gramos te pongo?`;
  }
  if (pideConsejo(mensaje) || preguntaUso(mensaje)) {
    return "¿Qué vas a cocinar? Te digo qué llevar.";
  }
  return null;
}

function abrirMenu(ctx: Contexto, categoria?: string) {
  ctx.abrirMenu = true;
  ctx.categoriaMenu = categoria;
}

/**
 * Memoria corta: si ANA acaba de hablar de un producto ("¿Cuántos gramos de comino te pongo?")
 * y el cliente responde solo con la cantidad ("doscientos"), se entiende que es de ese producto.
 */
function completarConContexto(ctx: Contexto, mensaje: string, historial: { rol: string; texto: string }[]) {
  if (interpretarPedido(mensaje).length) return mensaje;
  const ultimaAna = [...historial].reverse().find((m) => m.rol === "ana");
  if (!ultimaAna || !/cu[aá]ntos gramos/i.test(ultimaAna.texto)) return mensaje;
  const p = productoEnTexto(ctx, ultimaAna.texto);
  if (!p) return mensaje;
  const conProducto = `${mensaje} de ${p.nombre}`;
  return interpretarPedido(conProducto).length ? conProducto : mensaje;
}

export async function responderLocal(ctx: Contexto, mensajeOriginal: string, historial: { rol: string; texto: string }[] = []): Promise<string> {
  const mensaje = completarConContexto(ctx, mensajeOriginal, historial);
  // 1. ¿acepta la sugerencia de una receta?
  if (ctx.sugerencia.length && aceptaSugerencia(mensaje)) {
    const r = agregar_sugerencia(ctx);
    return r.agregados.length ? `Listo, agregados. ¿Te lo confirmo?` : "Ya no me queda de esos productos.";
  }

  const intencion = detectarIntencion(mensaje, ctx.esperandoConfirmacion && ctx.carrito.length > 0);

  // 2. asistente de ventas: "quiero hacer hallacas"
  if (intencion !== "pedido" && intencion !== "quitar" && intencion !== "cancelar") {
    const receta = detectarReceta(mensaje);
    if (receta) {
      const r = sugerir_para_receta(ctx, { plato: receta.plato });
      if (r.encontrada && r.sugerencia?.length) {
        return `Para ${receta.plato}: ${lista(r.sugerencia.map((s) => minus(s.producto)))}. ¿Te los agrego?`;
      }
    }
  }
  // 3. consejos: "¿para qué sirve la linaza?", "¿cuál pica más?", "¿qué me recomiendas?"
  if (intencion === "otro" || intencion === "saludo" || intencion === "catalogo" || intencion === "precio") {
    const consejo = intencion === "precio" && !preguntaUso(mensaje) ? null : responderConsejo(ctx, mensaje);
    if (consejo) {
      ctx.sugerencia = [];
      return consejo;
    }
  }
  ctx.sugerencia = [];

  switch (intencion) {
    case "pedido": {
      const lineas = interpretarPedido(mensaje);
      const r = agregar_al_carrito(ctx, { items: lineas.map((l) => ({ producto: l.texto, gramos: l.gramos })) });
      const problemas = explicarProblemas(r.problemas);
      const minimo = r.ajustados?.length ? `Te puse ${MIN_GRAMOS} gramos de ${lista(r.ajustados.map(minus))}, es el mínimo. ` : "";
      if (!r.agregados.length) return problemas || "No entendí qué producto quieres. Te abrí el menú para que lo toques.";
      if (!problemas) return minimo ? `${minimo}¿Te lo confirmo?` : "Listo. ¿Te lo confirmo?";
      return `Agregué ${lista(r.agregados.map((a) => minus(a.producto)))}. ${minimo}${problemas}`;
    }
    case "confirmar": {
      const r = await confirmar_pedido(ctx);
      if (!r.ok) return `No pude cerrar el pedido: ${r.motivo}`;
      return ""; // la frase de pago la arma el servidor con los datos reales
    }
    case "cancelar":
      vaciar_carrito(ctx);
      return "Listo, pedido vacío. ¿Qué te pongo?";
    case "quitar": {
      const r = quitar_del_carrito(ctx, { producto: productoMencionado(mensaje) || mensaje });
      if (!r.quitado) return "Ese producto no está en tu pedido.";
      return r.carrito.vacio ? `Quité ${minus(r.quitado)}. Pedido vacío.` : `Quité ${minus(r.quitado)}. ¿Te lo confirmo?`;
    }
    case "precio": {
      const q = productoMencionado(mensaje);
      const r = buscarProducto(q, ctx.productos);
      if (r.tipo === "exacto") {
        const p = r.producto;
        return p.stockGramos >= MIN_GRAMOS ? `${p.nombre} está a ${formatoDinero(p.precioKg)} el kilo. ¿Cuántos gramos te pongo?` : `${p.nombre} se nos agotó por hoy.`;
      }
      if (r.tipo === "ambiguo") {
        abrirMenu(ctx, r.opciones[0]?.categoria);
        return `El kilo está así: ${lista(r.opciones.map((p) => `${minus(p.nombre)} a ${formatoDinero(p.precioKg)}`))}. ¿Cuál prefieres?`;
      }
      abrirMenu(ctx);
      return "No lo tengo. Mira el menú.";
    }
    case "carrito": {
      const c = ver_carrito(ctx);
      return c.vacio ? "Aún no llevas nada. ¿Qué te pongo?" : `Llevas ${lista(c.lineas.map((l) => `${l.gramos} de ${minus(l.producto)}`))}. Son ${c.total}. ¿Te lo confirmo?`;
    }
    case "catalogo":
      abrirMenu(ctx);
      return "Aquí tienes el menú. ¿Qué te provoca?";
    case "saludo":
      return "¡Hola! ¿Qué te pongo?";
    default: {
      // ¿nombró un producto sin decir cuánto? "quiero maní salado"
      const q = productoMencionado(mensaje).replace(/\b(quiero|dame|ponme|deme|quisiera|me das|necesito|un poco|poquito)\b/g, " ").trim();
      if (q) {
        const r = buscarProducto(q, ctx.productos);
        if (r.tipo === "exacto") return `¿Cuántos gramos de ${minus(r.producto.nombre)} te pongo?`;
        if (r.tipo === "ambiguo") {
          abrirMenu(ctx, r.opciones[0]?.categoria);
          return `Tengo ${lista(r.opciones.map((p) => minus(p.nombre)), "o")}. ¿Cuál quieres y cuántos gramos?`;
        }
      }
      if (ctx.esperandoConfirmacion && ctx.carrito.length) {
        abrirMenu(ctx);
        return "No te entendí. ¿Te confirmo el pedido?";
      }
      abrirMenu(ctx);
      return "No te entendí. Tócalo en el menú o dime producto y gramos.";
    }
  }
}
