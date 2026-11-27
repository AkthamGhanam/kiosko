// Herramientas que ANA puede usar. El LLM solo decide QUÉ herramienta llamar;
// los precios, totales y el stock los calcula siempre este código desde la base de datos.
import { z } from "zod";
import type { Producto } from "@prisma/client";
import { buscarProducto, puntuar } from "../buscar";
import { cotizarCon, confirmarPedido, type Factura, type LineaRechazada } from "../pedidos";
import { formatoDinero, formatoGramos } from "../dinero";
import { MAX_GRAMOS_LINEA, type Canal, type ItemCarrito } from "../esquemas";

export type Contexto = {
  productos: Producto[];
  carrito: ItemCarrito[];
  esperandoConfirmacion: boolean;
  /** true solo si ANA ya había pedido confirmación ANTES de este mensaje del cliente */
  confirmacionPermitida: boolean;
  canal: Canal;
  factura?: Factura;
  rechazadas?: LineaRechazada[];
};

const ficha = (p: Producto) => ({
  nombre: p.nombre,
  precio_por_kg: formatoDinero(p.precioKg),
  disponible: p.stockGramos >= 50 ? formatoGramos(p.stockGramos) : "agotado",
});

export const ArgsBuscar = z.object({ consulta: z.string().min(1).max(100) });
export const ArgsAgregar = z.object({
  items: z
    .array(
      z.object({
        producto: z.string().min(1).max(100),
        gramos: z.coerce.number().int().min(1).max(MAX_GRAMOS_LINEA),
      }),
    )
    .min(1)
    .max(20),
});
export const ArgsQuitar = z.object({ producto: z.string().min(1).max(100) });
export const ArgsCambiar = z.object({ producto: z.string().min(1).max(100), gramos: z.coerce.number().int().min(1).max(MAX_GRAMOS_LINEA) });

export function buscar_productos(ctx: Contexto, args: z.infer<typeof ArgsBuscar>) {
  const r = puntuar(args.consulta, ctx.productos)
    .filter((x) => x.puntaje >= 0.5)
    .slice(0, 5)
    .map((x) => ficha(x.producto));
  return r.length ? { resultados: r } : { resultados: [], nota: "No hay productos parecidos en el catálogo." };
}

/** Alternativas con stock en la misma categoría. */
function alternativas(ctx: Contexto, p: Producto, gramos: number) {
  return ctx.productos
    .filter((x) => x.id !== p.id && x.categoria === p.categoria && x.stockGramos >= gramos)
    .slice(0, 3)
    .map((x) => x.nombre);
}

export function agregar_al_carrito(ctx: Contexto, args: z.infer<typeof ArgsAgregar>) {
  const agregados: { producto: string; gramos: string }[] = [];
  const problemas: Record<string, unknown>[] = [];
  for (const it of args.items) {
    const r = buscarProducto(it.producto, ctx.productos);
    if (r.tipo === "ninguno") {
      problemas.push({ pedido: it.producto, problema: "no_existe", sugerencias: r.sugerencias.map((p) => p.nombre) });
      continue;
    }
    if (r.tipo === "ambiguo") {
      problemas.push({ pedido: it.producto, problema: "ambiguo", opciones: r.opciones.map((p) => p.nombre), gramos: it.gramos });
      continue;
    }
    const p = r.producto;
    const yaPedido = ctx.carrito.find((i) => i.productoId === p.id)?.gramos ?? 0;
    if (p.stockGramos < yaPedido + it.gramos) {
      const libre = Math.max(0, p.stockGramos - yaPedido);
      problemas.push({
        pedido: p.nombre,
        problema: "sin_stock",
        disponibles: formatoGramos(libre),
        alternativas: alternativas(ctx, p, it.gramos),
      });
      continue;
    }
    ctx.carrito = yaPedido
      ? ctx.carrito.map((i) => (i.productoId === p.id ? { ...i, gramos: i.gramos + it.gramos } : i))
      : [...ctx.carrito, { productoId: p.id, gramos: it.gramos }];
    agregados.push({ producto: p.nombre, gramos: formatoGramos(it.gramos) });
  }
  if (ctx.carrito.length) ctx.esperandoConfirmacion = true;
  return { agregados, problemas, carrito: ver_carrito(ctx) };
}

export function quitar_del_carrito(ctx: Contexto, args: z.infer<typeof ArgsQuitar>) {
  const enCarrito = ctx.productos.filter((p) => ctx.carrito.some((i) => i.productoId === p.id));
  const r = buscarProducto(args.producto, enCarrito);
  if (r.tipo !== "exacto") return { quitado: null, nota: "Ese producto no está en el carrito.", carrito: ver_carrito(ctx) };
  ctx.carrito = ctx.carrito.filter((i) => i.productoId !== r.producto.id);
  ctx.esperandoConfirmacion = ctx.carrito.length > 0;
  return { quitado: r.producto.nombre, carrito: ver_carrito(ctx) };
}

export function cambiar_cantidad(ctx: Contexto, args: z.infer<typeof ArgsCambiar>) {
  const enCarrito = ctx.productos.filter((p) => ctx.carrito.some((i) => i.productoId === p.id));
  const r = buscarProducto(args.producto, enCarrito);
  if (r.tipo !== "exacto") return { cambiado: null, nota: "Ese producto no está en el carrito." };
  if (r.producto.stockGramos < args.gramos) return { cambiado: null, problema: "sin_stock", disponibles: formatoGramos(r.producto.stockGramos) };
  ctx.carrito = ctx.carrito.map((i) => (i.productoId === r.producto.id ? { ...i, gramos: args.gramos } : i));
  ctx.esperandoConfirmacion = true;
  return { cambiado: r.producto.nombre, carrito: ver_carrito(ctx) };
}

export function vaciar_carrito(ctx: Contexto) {
  ctx.carrito = [];
  ctx.esperandoConfirmacion = false;
  return { carrito: ver_carrito(ctx) };
}

export function ver_carrito(ctx: Contexto) {
  const c = cotizarCon(ctx.carrito, ctx.productos);
  return {
    lineas: c.lineas.map((l) => ({ producto: l.nombre, gramos: formatoGramos(l.gramos), subtotal: formatoDinero(l.subtotalCents) })),
    total: formatoDinero(c.totalCents),
    vacio: c.lineas.length === 0,
  };
}

export async function confirmar_pedido(ctx: Contexto) {
  if (!ctx.carrito.length) return { ok: false, motivo: "El carrito está vacío." };
  if (!ctx.confirmacionPermitida) return { ok: false, motivo: "Primero muestra el pedido al cliente y pídele que lo confirme." };
  const r = await confirmarPedido(ctx.carrito, ctx.canal);
  ctx.rechazadas = r.rechazadas;
  if (!r.ok) return { ok: false, motivo: "No hay stock suficiente para ninguna línea.", rechazadas: r.rechazadas };
  ctx.factura = r.factura;
  ctx.carrito = [];
  ctx.esperandoConfirmacion = false;
  return { ok: true, orden: r.factura.numero, total: formatoDinero(r.factura.totalCents), rechazadas: r.rechazadas.map((x) => x.nombre) };
}

/** Definiciones en formato OpenAI (Groq y Gemini aceptan el mismo formato). */
export const DEFINICIONES = [
  {
    type: "function" as const,
    function: {
      name: "buscar_productos",
      description: "Busca productos del catálogo por nombre o alias. Devuelve precio por kg y disponibilidad. Úsala si el cliente pregunta qué hay o cuánto cuesta algo.",
      parameters: { type: "object", properties: { consulta: { type: "string" } }, required: ["consulta"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "agregar_al_carrito",
      description: "Agrega uno o varios productos con sus gramos. Si el cliente dice solo un número ('100 de dandy') son gramos; 'medio kilo' = 500, 'un cuarto' = 250. Pasa el nombre tal como lo dijo el cliente.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: { type: "object", properties: { producto: { type: "string" }, gramos: { type: "integer" } }, required: ["producto", "gramos"] },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "quitar_del_carrito",
      description: "Quita un producto del carrito.",
      parameters: { type: "object", properties: { producto: { type: "string" } }, required: ["producto"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cambiar_cantidad",
      description: "Cambia los gramos de un producto que ya está en el carrito.",
      parameters: { type: "object", properties: { producto: { type: "string" }, gramos: { type: "integer" } }, required: ["producto", "gramos"] },
    },
  },
  {
    type: "function" as const,
    function: { name: "ver_carrito", description: "Muestra el carrito con subtotales y total.", parameters: { type: "object", properties: {} } },
  },
  {
    type: "function" as const,
    function: { name: "vaciar_carrito", description: "Vacía el carrito si el cliente quiere empezar de nuevo o cancelar.", parameters: { type: "object", properties: {} } },
  },
  {
    type: "function" as const,
    function: {
      name: "confirmar_pedido",
      description: "Cierra y registra el pedido. SOLO después de que el cliente confirme explícitamente ('sí', 'confirmo', 'perfecto') el pedido que ya le mostraste.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function ejecutarHerramienta(ctx: Contexto, nombre: string, argsJson: string): Promise<unknown> {
  let args: unknown = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return { error: "Argumentos JSON inválidos" };
  }
  const validar = <T,>(s: z.ZodType<T>) => {
    const r = s.safeParse(args);
    return r.success ? r.data : null;
  };
  switch (nombre) {
    case "buscar_productos": {
      const a = validar(ArgsBuscar);
      return a ? buscar_productos(ctx, a) : { error: "Falta 'consulta'" };
    }
    case "agregar_al_carrito": {
      const a = validar(ArgsAgregar);
      return a ? agregar_al_carrito(ctx, a) : { error: "Formato: {items:[{producto, gramos}]} con gramos enteros entre 1 y 20000" };
    }
    case "quitar_del_carrito": {
      const a = validar(ArgsQuitar);
      return a ? quitar_del_carrito(ctx, a) : { error: "Falta 'producto'" };
    }
    case "cambiar_cantidad": {
      const a = validar(ArgsCambiar);
      return a ? cambiar_cantidad(ctx, a) : { error: "Faltan 'producto' y 'gramos'" };
    }
    case "ver_carrito":
      return ver_carrito(ctx);
    case "vaciar_carrito":
      return vaciar_carrito(ctx);
    case "confirmar_pedido":
      return confirmar_pedido(ctx);
    default:
      return { error: `Herramienta desconocida: ${nombre}` };
  }
}
