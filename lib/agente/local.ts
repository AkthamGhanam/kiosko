// ANA sin IA: intérprete local de reglas. Es el respaldo cuando no hay claves o la IA falla.
import { detectarIntencion, interpretarPedido, productoMencionado, aceptaSugerencia, cantidadSuelta, esAgregado, esCambio, esNegativa, pideDeTodo } from "../interpretar";
import { buscarProducto } from "../buscar";
import { formatoDinero, formatoGramos } from "../dinero";
import { MIN_GRAMOS } from "../config";
import { detectarReceta, quiereCocinar } from "../recetas";
import { INFO, pideConsejo, preguntaPicante, preguntaSalud, preguntaUso } from "../consejos";
import { fonetica, normalizar } from "../texto";
import { responderCharla } from "../charla";
import {
  agregar_al_carrito,
  agregar_sugerencia,
  cambiar_cantidad,
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

const VERBOS_PEDIR = /\b(dame|deme|ponme|pongame|echame|regalame|vendeme|pasame|agregame|agrega|anade|quiero|quisiera|necesito|me das|me pones|tambien|ademas|y|ana|por favor|porfa|un poco de|algo de)\b/g;

/**
 * Frase con productos y un plato: "dame maní y todo lo que necesito para hacer hallacas",
 * "ponme 200 de merey y lo de la hallaca". Agrega la receta completa y también los productos.
 */
function pedidoConReceta(ctx: Contexto, mensaje: string): string | null {
  const receta = detectarReceta(mensaje);
  if (!receta) return null;
  const partes = normalizar(mensaje).split(/,|\.(?:\s|$)|\by\b|\btambien\b|\bademas\b|\bmas\b/).map((s) => s.trim()).filter(Boolean);
  const deReceta = partes.filter((s) => detectarReceta(s));
  const otras = partes.filter((s) => !detectarReceta(s)).map((s) => s.replace(VERBOS_PEDIR, " ").replace(/\s+/g, " ").trim()).filter((s) => s.length > 2);
  const pideTodo = deReceta.some((s) => /\b(todo|toda|lo que|lo necesario|lo de|los condimentos|las especias|los ingredientes)\b/.test(s));
  if (!otras.length && !pideTodo) return null; // "quiero hacer hallacas": sigue como sugerencia
  // ¿lo demás es un producto? (si no, "todo para hallacas el sábado" sigue normal)
  const pedidos: { producto: string; gramos: number }[] = [];
  const dudas: string[] = [];
  for (const o of otras) {
    const lineas = interpretarPedido(o);
    if (lineas.length) {
      pedidos.push(...lineas.map((l) => ({ producto: l.texto, gramos: l.gramos })));
      continue;
    }
    const r = buscarProducto(o, ctx.productos);
    if (r.tipo === "exacto") pedidos.push({ producto: r.producto.nombre, gramos: MIN_GRAMOS });
    else if (r.tipo === "ambiguo") {
      dudas.push(`${lista(r.opciones.map((p) => minus(p.nombre)), "o")}`);
      abrirMenu(ctx, r.opciones[0]?.categoria);
    }
  }
  if (!pedidos.length && !dudas.length && !pideTodo) return null;

  const s = sugerir_para_receta(ctx, { plato: receta.plato });
  const deLaReceta = s.encontrada ? agregar_sugerencia(ctx).agregados : [];
  const r = pedidos.length ? agregar_al_carrito(ctx, { items: pedidos }) : null;
  const frases: string[] = [];
  // lo que ya venía en la receta no se repite al decirlo
  const agregados = [...new Set(r?.agregados.map((a) => a.producto) ?? [])].filter((n) => !deLaReceta.includes(n)).map(minus);
  // se dice corto (se habla en voz alta); el detalle se ve en el carrito
  const queReceta = deLaReceta.length > 3 ? `${deLaReceta.length} productos` : lista(deLaReceta.map(minus));
  if (deLaReceta.length) frases.push(`Te puse lo de ${receta.plato} (${queReceta})${agregados.length ? ` y ${lista(agregados)}` : ""}.`);
  else if (agregados.length) frases.push(`Te puse ${lista(agregados)}.`);
  if (r?.problemas.length) frases.push(explicarProblemas(r.problemas));
  if (dudas.length) frases.push(`Tengo ${dudas.join("; ")}. ¿Cuál quieres?`);
  else frases.push("¿Te lo confirmo?");
  return frases.join(" ");
}

/** Aplica una cantidad dicha sin producto al producto nombrado, o al último del pedido. */
function ajustarCantidad(ctx: Contexto, mensaje: string, gramos: number): string {
  const nombrado = productoEnTexto(ctx, mensaje);
  const ultimo = ctx.carrito.length ? ctx.productos.find((p) => p.id === ctx.carrito[ctx.carrito.length - 1].productoId) : undefined;
  const enPedido = nombrado && ctx.carrito.some((i) => i.productoId === nombrado.id) ? nombrado : undefined;
  const destino = nombrado ?? (esAgregado(mensaje) || esCambio(mensaje) ? ultimo : undefined);
  if (!destino) {
    abrirMenu(ctx);
    return `¿De qué producto quieres ${formatoGramos(Math.max(gramos, MIN_GRAMOS))}? Tócalo en el menú.`;
  }
  const yaLleva = ctx.carrito.find((i) => i.productoId === destino.id)?.gramos ?? 0;
  if (yaLleva && esCambio(mensaje) && !esAgregado(mensaje)) {
    const r = cambiar_cantidad(ctx, { producto: destino.nombre, gramos });
    if (r.cambiado) return `Listo, ${minus(destino.nombre)} en ${formatoGramos(gramos)}. ¿Te lo confirmo?`;
    if (r.problema === "minimo") return `Lo mínimo son ${MIN_GRAMOS} gramos. ¿Lo dejo en ${MIN_GRAMOS} o lo quito?`;
    return `De ${minus(destino.nombre)} solo me quedan ${(r as { disponibles?: string }).disponibles}.`;
  }
  if (yaLleva || esAgregado(mensaje) || enPedido || nombrado) {
    const r = agregar_al_carrito(ctx, { items: [{ producto: destino.nombre, gramos }] });
    if (!r.agregados.length) return explicarProblemas(r.problemas) || "No pude agregarlo.";
    const total = ctx.carrito.find((i) => i.productoId === destino.id)?.gramos ?? gramos;
    return `Listo, ${minus(destino.nombre)} ahora en ${formatoGramos(total)}. ¿Te lo confirmo?`;
  }
  abrirMenu(ctx);
  return `¿De qué producto quieres ${formatoGramos(Math.max(gramos, MIN_GRAMOS))}? Tócalo en el menú.`;
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
  if (interpretarPedido(conProducto).length) return conProducto;
  const g = cantidadSuelta(mensaje); // "kilo", "guilo"
  return g ? `${g} gramos de ${p.nombre}` : mensaje;
}

export async function responderLocal(ctx: Contexto, mensajeOriginal: string, historial: { rol: string; texto: string }[] = []): Promise<string> {
  const mensaje = completarConContexto(ctx, mensajeOriginal, historial);
  // 1. ¿acepta la sugerencia de una receta?
  if (ctx.sugerencia.length && aceptaSugerencia(mensaje)) {
    const r = agregar_sugerencia(ctx);
    return r.agregados.length ? `Listo, agregados. ¿Te lo confirmo?` : "Ya no me queda de esos productos.";
  }

  // "no" solo: rechaza la sugerencia o la confirmación, sin abrir el menú
  if (esNegativa(mensaje)) {
    const ultimaAna = [...historial].reverse().find((m) => m.rol === "ana")?.texto ?? "";
    const habia = ctx.sugerencia.length > 0;
    ctx.sugerencia = [];
    if (habia || !ctx.carrito.length) return "Está bien. ¿Qué te pongo?";
    if (/algo m[aá]s/i.test(ultimaAna)) return "Listo. ¿Te lo confirmo?";
    return "Está bien, no lo confirmo. ¿Qué cambio?";
  }

  // "dame 100 g de cada producto", "de todo lo del menú"
  if (pideDeTodo(mensaje)) {
    const g = Math.max(cantidadSuelta(mensaje) ?? MIN_GRAMOS, MIN_GRAMOS);
    const hay = ctx.productos.filter((p) => p.stockGramos - (ctx.carrito.find((i) => i.productoId === p.id)?.gramos ?? 0) >= g);
    const r = agregar_al_carrito(ctx, { items: hay.map((p) => ({ producto: p.nombre, gramos: g })) });
    ctx.abrirMenu = false;
    ctx.sugerencia = [];
    return r.agregados.length ? `Te puse ${formatoGramos(g)} de ${r.agregados.length} productos. ¿Te lo confirmo?` : "No me queda suficiente de ninguno.";
  }

  // "dame maní y todo lo que necesito para hacer hallacas": producto + receta en la misma frase
  const combinado = pedidoConReceta(ctx, mensaje);
  if (combinado) return combinado;

  const intencion = detectarIntencion(mensaje, ctx.esperandoConfirmacion && ctx.carrito.length > 0);

  // cantidad sin producto: "agrégale 1 kg más", "es 1,8 kg", "al pedido de maní chocolate agrégale 1 kg"
  if (intencion !== "pedido" && intencion !== "quitar" && intencion !== "cancelar" && intencion !== "precio" && intencion !== "confirmar") {
    const g = cantidadSuelta(mensaje);
    if (g) {
      ctx.sugerencia = [];
      return ajustarCantidad(ctx, mensaje, g);
    }
  }

  // 2. asistente de ventas: "quiero hacer hallacas"
  if (intencion !== "pedido" && intencion !== "quitar" && intencion !== "cancelar") {
    const receta = detectarReceta(mensaje);
    // "maní de chocolate" es un producto, no el plato "chocolate caliente"
    if (receta && !(productoEnTexto(ctx, mensaje) && !quiereCocinar(mensaje))) {
      const r = sugerir_para_receta(ctx, { plato: receta.plato });
      if (r.encontrada && r.sugerencia?.length) {
        // en voz alta se dicen hasta 4; el resto se ve en la tarjeta
        const nombres = r.sugerencia.map((s) => minus(s.producto));
        const dichos = nombres.length > 4 ? `${nombres.slice(0, 4).join(", ")} y ${nombres.length - 4} más` : lista(nombres);
        return `Para ${receta.plato}: ${dichos}. ¿Te los agrego?`;
      }
    }
  }
  // 3. charla: "¿cómo estás?", "¿quién eres?", "gracias", insultos o temas fuera de la tienda
  if (intencion === "otro" || intencion === "saludo") {
    const charla = responderCharla(mensaje);
    if (charla) {
      ctx.sugerencia = [];
      return charla;
    }
  }

  // 4. consejos: "¿para qué sirve la linaza?", "¿cuál pica más?", "¿qué me recomiendas?"
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
      // producto nombrado dentro de una frase: "es lo más parecido a maní de chocolate"
      const enTexto = productoEnTexto(ctx, mensaje);
      if (enTexto) return `¿Cuántos gramos de ${minus(enTexto.nombre)} te pongo?`;
      if (ctx.esperandoConfirmacion && ctx.carrito.length) {
        abrirMenu(ctx);
        return "No te entendí. ¿Te confirmo el pedido?";
      }
      abrirMenu(ctx);
      return "No te entendí. Tócalo en el menú o dime producto y gramos.";
    }
  }
}
