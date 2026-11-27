import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { responder } from "@/lib/agente";
import { AnaBody } from "@/lib/esquemas";
import { CATALOGO } from "@/prisma/catalogo";

const db = new PrismaClient();
const GUION = "Hola Ana, quiero pedir 120 gr de avena, 100 de dandy, 50 de paprika y otros 100 de maní salado";

async function sembrar() {
  await db.movimientoInventario.deleteMany();
  await db.itemPedido.deleteMany();
  await db.pedido.deleteMany();
  await db.producto.deleteMany();
  for (const p of CATALOGO) {
    await db.producto.create({
      data: { slug: p.slug, nombre: p.nombre, alias: p.alias.join(","), categoria: p.categoria, precioKg: Math.round(p.precioKgUsd * 100), stockGramos: p.stockGramos, imagen: "" },
    });
  }
}
const productos = () => db.producto.findMany({ where: { activo: true } });
const stock = async (slug: string) => (await db.producto.findUniqueOrThrow({ where: { slug } })).stockGramos;
const cuerpo = (x: Partial<AnaBody>) => AnaBody.parse({ mensaje: "hola", ...x });

beforeEach(async () => {
  await sembrar();
  vi.stubEnv("GROQ_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ANA sin IA (intérprete local)", () => {
  it("recorre el guion de la demo de punta a punta", async () => {
    const r1 = await responder(cuerpo({ mensaje: GUION, canal: "voz" }), await productos());
    expect(r1.proveedor).toBe("local");
    expect(r1.respuesta).toBe("Perfecto, tu pedido está listo. ¿Me lo confirmas?");
    expect(r1.carrito).toHaveLength(4);
    expect(r1.esperandoConfirmacion).toBe(true);

    const r2 = await responder(cuerpo({ mensaje: "Perfecto", carrito: r1.carrito, esperandoConfirmacion: true, canal: "voz" }), await productos());
    expect(r2.factura?.lineas).toHaveLength(4);
    // 120 g x 3.20 + 100 g x 9.50 + 50 g x 14.00 + 100 g x 7.80 = 0.38 + 0.95 + 0.70 + 0.78
    expect(r2.factura?.totalCents).toBe(281);
    expect(r2.respuesta).toContain("El total es $2.81");
    expect(r2.respuesta).toContain("Banesco");
    expect(r2.respuesta).toContain("0414-4141368");
    expect(r2.respuesta).toContain("82.218.399");
    expect(r2.respuesta).toContain("pasa con la cajera");
    expect(r2.carrito).toEqual([]);
    expect(await stock("avena")).toBe(8000 - 120);
    expect(await stock("mani-dandy")).toBe(5000 - 100);
    expect(await stock("paprika")).toBe(2500 - 50);
    expect(await stock("mani-salado")).toBe(6000 - 100);
  });

  it("no confirma si ANA todavía no pidió confirmación", async () => {
    const p = await productos();
    const avena = p.find((x) => x.slug === "avena")!;
    const r = await responder(cuerpo({ mensaje: "confirmo", carrito: [{ productoId: avena.id, gramos: 100 }], esperandoConfirmacion: false }), p);
    expect(r.factura).toBeUndefined();
    expect(await db.pedido.count()).toBe(0);
  });

  it("explica la falta de stock y ofrece alternativas", async () => {
    const r = await responder(cuerpo({ mensaje: "quiero 900 gramos de nuez moscada" }), await productos());
    expect(r.carrito).toEqual([]);
    expect(r.respuesta).toMatch(/solo me quedan 600 g/);
    expect(r.respuesta).toMatch(/te puedo ofrecer/);
  });

  it("dice que no existe un producto inventado", async () => {
    const r = await responder(cuerpo({ mensaje: "dame 100 de caviar" }), await productos());
    expect(r.carrito).toEqual([]);
    expect(r.respuesta).toMatch(/No tengo "caviar"/);
  });

  it("quita productos del carrito", async () => {
    const r1 = await responder(cuerpo({ mensaje: "100 de comino y 50 de canela" }), await productos());
    const r2 = await responder(cuerpo({ mensaje: "quita el comino", carrito: r1.carrito, esperandoConfirmacion: true }), await productos());
    expect(r2.carrito).toHaveLength(1);
    expect(r2.respuesta).toMatch(/Quité comino/);
  });
});

describe("ANA con IA (proveedor simulado)", () => {
  function llmFalso(respuestas: unknown[]) {
    const fetchFalso = vi.fn(async () => {
      const m = respuestas.shift();
      return new Response(JSON.stringify({ choices: [{ message: m }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchFalso);
    return fetchFalso;
  }
  const llamada = (name: string, args: unknown) => ({ id: `c-${name}`, type: "function", function: { name, arguments: JSON.stringify(args) } });

  it("usa las herramientas y los precios salen del servidor", async () => {
    vi.stubEnv("GROQ_API_KEY", "prueba");
    const f = llmFalso([
      { content: null, tool_calls: [llamada("agregar_al_carrito", { items: [{ producto: "paprica", gramos: 50 }, { producto: "many salado", gramos: 100 }] })] },
      { content: "Perfecto, tu pedido está listo. ¿Me lo confirmas?" },
    ]);
    const r = await responder(cuerpo({ mensaje: "50 de paprica y 100 de many salado" }), await productos());
    expect(r.proveedor).toBe("groq");
    expect(r.carrito).toHaveLength(2);
    expect(r.esperandoConfirmacion).toBe(true);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("bloquea que el modelo confirme en el mismo turno en que agrega", async () => {
    vi.stubEnv("GROQ_API_KEY", "prueba");
    llmFalso([
      { content: null, tool_calls: [llamada("agregar_al_carrito", { items: [{ producto: "avena", gramos: 100 }] }), llamada("confirmar_pedido", {})] },
      { content: "¿Me lo confirmas?" },
    ]);
    const r = await responder(cuerpo({ mensaje: "100 de avena" }), await productos());
    expect(r.factura).toBeUndefined();
    expect(await db.pedido.count()).toBe(0);
  });

  it("si la IA falla, responde el intérprete local", async () => {
    vi.stubEnv("GROQ_API_KEY", "prueba");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("caído", { status: 503 })));
    const r = await responder(cuerpo({ mensaje: GUION }), await productos());
    expect(r.proveedor).toBe("local");
    expect(r.carrito).toHaveLength(4);
  });

  it("rechaza argumentos inválidos del modelo sin romperse", async () => {
    vi.stubEnv("GROQ_API_KEY", "prueba");
    llmFalso([
      { content: null, tool_calls: [llamada("agregar_al_carrito", { items: [{ producto: "avena", gramos: -5 }] })] },
      { content: "¿Cuántos gramos quieres?" },
    ]);
    const r = await responder(cuerpo({ mensaje: "avena" }), await productos());
    expect(r.carrito).toEqual([]);
    expect(r.respuesta).toBe("¿Cuántos gramos quieres?");
  });
});
