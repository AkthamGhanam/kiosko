// ANA sin IA: intérprete local de reglas. Es el respaldo cuando no hay claves o la IA falla.
import { detectarIntencion, interpretarPedido, productoMencionado } from "../interpretar";
import { buscarProducto } from "../buscar";
import { formatoDinero } from "../dinero";
import { agregar_al_carrito, confirmar_pedido, quitar_del_carrito, vaciar_carrito, ver_carrito, type Contexto } from "./herramientas";

const lista = (xs: string[], y = "y") => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${y} ${xs[xs.length - 1]}`);
const minus = (s: string) => s.toLowerCase();

function explicarProblemas(problemas: Record<string, unknown>[]): string {
  const frases: string[] = [];
  for (const p of problemas) {
    if (p.problema === "no_existe") {
      const sug = (p.sugerencias as string[]) ?? [];
      frases.push(sug.length ? `No tengo "${p.pedido}". ¿Quizás ${lista(sug.map(minus), "o")}?` : `No tengo "${p.pedido}" en la tienda.`);
    } else if (p.problema === "ambiguo") {
      frases.push(`Tengo varios: ${lista((p.opciones as string[]).map(minus), "o")}. ¿Cuál quieres?`);
    } else if (p.problema === "sin_stock") {
      const alt = (p.alternativas as string[]) ?? [];
      frases.push(
        `De ${minus(String(p.pedido))} solo me quedan ${p.disponibles}` + (alt.length ? `; te puedo ofrecer ${lista(alt.map(minus))}.` : "."),
      );
    }
  }
  return frases.join(" ");
}

export async function responderLocal(ctx: Contexto, mensaje: string): Promise<string> {
  const intencion = detectarIntencion(mensaje, ctx.esperandoConfirmacion && ctx.carrito.length > 0);

  switch (intencion) {
    case "pedido": {
      const lineas = interpretarPedido(mensaje);
      const r = agregar_al_carrito(ctx, { items: lineas.map((l) => ({ producto: l.texto, gramos: l.gramos })) });
      const problemas = explicarProblemas(r.problemas);
      if (!r.agregados.length) return problemas || "No entendí qué producto quieres. ¿Me lo repites?";
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
      if (r.tipo === "ambiguo") return `El kilo está así: ${lista(r.opciones.map((p) => `${minus(p.nombre)} a ${formatoDinero(p.precioKg)}`))}. ¿Cuál prefieres?`;
      return "Ese producto no lo tengo. Puedes ver todo en el catálogo de la pantalla.";
    }
    case "carrito": {
      const c = ver_carrito(ctx);
      return c.vacio ? "Tu pedido está vacío por ahora. ¿Qué te pongo?" : `Llevas ${lista(c.lineas.map((l) => `${l.gramos} de ${minus(l.producto)}`))}. El total es ${c.total}. ¿Te lo confirmo?`;
    }
    case "catalogo":
      return "Tengo maní de varios tipos, merey, almendras, especias como paprika, comino y orégano, avena y más. Toca el catálogo o dime qué buscas.";
    case "saludo":
      return "¡Hola! Dime qué quieres y cuántos gramos, por ejemplo: 100 gramos de maní salado.";
    default:
      if (ctx.esperandoConfirmacion && ctx.carrito.length) return "¿Te confirmo el pedido o quieres cambiar algo?";
      return "No te entendí bien. Dime el producto y los gramos, por ejemplo: 200 gramos de merey.";
  }
}
