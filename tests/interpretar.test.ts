import { describe, expect, it } from "vitest";
import { detectarIntencion, interpretarPedido } from "@/lib/interpretar";
import { buscarProducto } from "@/lib/buscar";
import { CATALOGO } from "@/prisma/catalogo";

const productos = CATALOGO.map((p, i) => ({ id: i + 1, slug: p.slug, nombre: p.nombre, alias: p.alias.join(",") }));
const slugDe = (q: string) => {
  const r = buscarProducto(q, productos);
  return r.tipo === "exacto" ? r.producto.slug : r.tipo;
};

describe("interpretar pedidos", () => {
  it("entiende el pedido del guion de la demo", () => {
    expect(interpretarPedido("Hola Ana, quiero pedir 120 gr de avena, 100 de dandy, 50 de paprika y otros 100 de maní salado")).toEqual([
      { texto: "avena", gramos: 120 },
      { texto: "dandy", gramos: 100 },
      { texto: "paprika", gramos: 50 },
      { texto: "mani salado", gramos: 100 },
    ]);
  });

  it("asume gramos cuando solo hay un número", () => {
    expect(interpretarPedido("100 de dandy")).toEqual([{ texto: "dandy", gramos: 100 }]);
  });

  it("entiende kilos, medio kilo, cuarto y números en palabras", () => {
    expect(interpretarPedido("un kilo de avena y medio kilo de comino")).toEqual([
      { texto: "avena", gramos: 1000 },
      { texto: "comino", gramos: 500 },
    ]);
    expect(interpretarPedido("1,5 kg de mani tostado")).toEqual([{ texto: "mani tostado", gramos: 1500 }]);
    expect(interpretarPedido("un cuarto de canela")).toEqual([{ texto: "canela", gramos: 250 }]);
    expect(interpretarPedido("ciento cincuenta gramos de merey")).toEqual([{ texto: "merey", gramos: 150 }]);
    expect(interpretarPedido("200gr de pasas")).toEqual([{ texto: "pasas", gramos: 200 }]);
    expect(interpretarPedido("kilo y medio de avena")).toEqual([{ texto: "avena", gramos: 1500 }]);
    expect(interpretarPedido("1 kilo y medio de avena")).toEqual([{ texto: "avena", gramos: 1500 }]);
  });

  it("detecta intenciones", () => {
    expect(detectarIntencion("Perfecto", true)).toBe("confirmar");
    expect(detectarIntencion("Confirmo", true)).toBe("confirmar");
    expect(detectarIntencion("Perfecto", false)).toBe("otro");
    expect(detectarIntencion("no, espera", true)).toBe("otro");
    expect(detectarIntencion("quita el comino", true)).toBe("quitar");
    expect(detectarIntencion("cuánto cuesta la canela", false)).toBe("precio");
    expect(detectarIntencion("Hola Ana", false)).toBe("saludo");
    expect(detectarIntencion("dame 100 de pasas", true)).toBe("pedido");
  });
});

describe("búsqueda difusa", () => {
  it("reconoce alias y errores comunes", () => {
    expect(slugDe("dandy")).toBe("mani-dandy");
    expect(slugDe("paprica")).toBe("paprika");
    expect(slugDe("many salado")).toBe("mani-salado");
    expect(slugDe("mani salado")).toBe("mani-salado");
    expect(slugDe("avena")).toBe("avena");
    expect(slugDe("pimienta")).toBe("pimienta-negra");
    expect(slugDe("oregano")).toBe("oregano");
    expect(slugDe("achiote")).toBe("onoto");
    expect(slugDe("almendra")).toBe("almendras");
  });

  it("pide aclarar cuando es ambiguo", () => {
    const r = buscarProducto("mani", productos);
    expect(r.tipo).toBe("ambiguo");
  });

  it("no inventa productos", () => {
    const r = buscarProducto("caviar", productos);
    expect(r.tipo).toBe("ninguno");
  });
});

describe("entiende a quien no pronuncia la r", () => {
  it("encuentra productos dichos sin r o con l", () => {
    expect(slugDe("papika")).toBe("paprika");
    expect(slugDe("oégano")).toBe("oregano");
    expect(slugDe("olegano")).toBe("oregano");
    expect(slugDe("meley")).toBe("merey");
    expect(slugDe("almendlas")).toBe("almendras");
    expect(slugDe("pimienta nega")).toBe("pimienta-negra");
  });

  it("entiende cantidades y confirmaciones sin r", () => {
    expect(interpretarPedido("tescientos glamos de comino")).toEqual([{ texto: "comino", gramos: 300 }]);
    expect(detectarIntencion("pefecto", true)).toBe("confirmar");
    expect(detectarIntencion("confimo", true)).toBe("confirmar");
    expect(detectarIntencion("clalo que sí", true)).toBe("confirmar");
  });
});

describe("recetas", () => {
  it("reconoce el plato aunque lo digan distinto", async () => {
    const { detectarReceta } = await import("@/lib/recetas");
    expect(detectarReceta("quiero hacer hallacas")?.plato).toBe("hallacas");
    expect(detectarReceta("voy a prepalar allacas")?.plato).toBe("hallacas");
    expect(detectarReceta("un pabeyon criollo")?.plato).toBe("carne mechada");
    expect(detectarReceta("pan de jamón para navidad")?.plato).toBe("pan de jamón");
    expect(detectarReceta("100 de avena")).toBeNull();
  });

  it("solo sugiere productos que existen en el catálogo", async () => {
    const { RECETAS } = await import("@/lib/recetas");
    const slugs = new Set(CATALOGO.map((p) => p.slug));
    for (const r of RECETAS) for (const i of r.items) expect(slugs.has(i.slug), `${r.plato}: ${i.slug}`).toBe(true);
  });
});
