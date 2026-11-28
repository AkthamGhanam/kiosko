// Batería de frases reales: cómo habla la gente en el kiosko (muletillas, palabras alargadas,
// sin "r", diminutivos, números en palabras, errores del micrófono). Cada frase nueva que ANA
// no entienda se agrega aquí (ver /admin → "Lo que ANA no entendió") y se arregla hasta que pase.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { responder } from "@/lib/agente";
import { AnaBody } from "@/lib/esquemas";
import { CATALOGO } from "@/prisma/catalogo";

const db = new PrismaClient();
let productos: Awaited<ReturnType<typeof db.producto.findMany>> = [];

beforeAll(async () => {
  vi.stubEnv("GROQ_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  await db.movimientoInventario.deleteMany();
  await db.itemPedido.deleteMany();
  await db.pedido.deleteMany();
  await db.consultaFallida.deleteMany();
  await db.producto.deleteMany();
  for (const p of CATALOGO) {
    await db.producto.create({
      data: { slug: p.slug, nombre: p.nombre, alias: p.alias.join(","), categoria: p.categoria, precioKg: Math.round(p.precioKgUsd * 100), stockGramos: p.stockGramos, imagen: "" },
    });
  }
  productos = await db.producto.findMany({ where: { activo: true } });
});

const slugDe = (id: number) => productos.find((p) => p.id === id)?.slug;
async function pedir(mensaje: string) {
  return responder(AnaBody.parse({ mensaje, canal: "voz" }), productos);
}

/** [frase, carrito esperado como "slug:gramos" separados por espacio] */
const PEDIDOS: [string, string][] = [
  // muletillas y palabras alargadas
  ["dame 100 deee pasas", "pasas:100"],
  ["dame 100 de... eh... pasas", "pasas:100"],
  ["eeeh quiero 200 de merey", "merey:200"],
  ["este... ponme 100 de comino", "comino:100"],
  ["mmm dame cieeen gramos de canela", "canela:100"],
  ["quiero 100 de pasaaas y 200 de almendraaas", "pasas:100 almendras:200"],
  ["dame 300 dee avena", "avena:300"],
  ["o sea, 100 de orégano, bueno, y 100 de ajo en polvo", "oregano:100 ajo-polvo:100"],
  // sin r o cambiando r por l
  ["dame 100 de papika", "paprika:100"],
  ["cien glamos de oégano", "oregano:100"],
  ["quielo 200 de meley", "merey:200"],
  ["tescientos gamos de almendlas", "almendras:300"],
  ["dame 100 de pimienta nega", "pimienta-negra:100"],
  ["ponme 200 de ajonjolí", "ajonjoli:200"],
  ["cien de mani salao", "mani-salado:100"],
  ["quiero 150 de clavo de olol", "clavo:150"],
  ["dame 100 de cumóo... comino", "comino:100"],
  // formas de pedir venezolanas
  ["regálame 200 de maní salado", "mani-salado:200"],
  ["échame 100 de canela por favor", "canela:100"],
  ["me das 250 de avena", "avena:250"],
  ["pásame 100 de nuez moscada", "nuez-moscada:100"],
  ["quisiera 200 gramos de linaza", "linaza:200"],
  ["Ana, me vende 100 de onoto?", "onoto:100"],
  ["véndeme medio kilo de merey", "merey:500"],
  // cantidades
  ["un kilo de avena", "avena:1000"],
  ["medio kilo de maní tostado", "mani-tostado:500"],
  ["un cuarto de almendras", "almendras:250"],
  ["un cuartico de pasas", "pasas:250"],
  ["medio kilito de maní dandy", "mani-dandy:500"],
  ["kilo y medio de avena", "avena:1500"],
  ["doscientos cincuenta de merey", "merey:250"],
  ["ciento cincuenta gramos de nueces", "nueces:150"],
  ["250gr de linaza", "linaza:250"],
  ["1/2 kilo de avena", "avena:500"],
  ["dos kilos de maní salado", "mani-salado:2000"],
  ["cien gramitos de curry", "curry:100"],
  // el mínimo de 100 g
  ["dame 50 de paprika", "paprika:100"],
  ["20 gramos de clavo", "clavo:100"],
  // varios productos y alias
  ["120 gr de avena, 100 de dandy y otros 100 de maní salado", "avena:120 mani-dandy:100 mani-salado:100"],
  ["un kilo de maní salado y medio de merey", "mani-salado:1000 merey:500"],
  ["200 de achiote", "onoto:200"],
  ["100 de chocomani", "chocolate-mani:100"],
  ["Hola Ana. Quiero 100 gramos de canela. Y 100 de clavo.", "canela:100 clavo:100"],
  // coloquial y vulgar venezolano
  ["chamo dame 100 de pasas", "pasas:100"],
  ["pana ponme 200 de esa vaina de merey", "merey:200"],
  ["coño dame 100 de comino", "comino:100"],
  ["coño marico dame 100 de pasas", "pasas:100"],
  ["épale, regálame un cuarto de maní salado porfa", "mani-salado:250"],
  ["mi pana échame un cuarto de merey", "merey:250"],
  ["mija ponme medio de avena", "avena:500"],
  ["dame un poquito de canela", "canela:100"],
  ["chamo regálame una pizca de clavo", "clavo:100"],
  // así llega del micrófono: con mayúscula y punto final
  ["Dame 100 de pasas.", "pasas:100"],
];

describe("pedidos dichos como habla la gente", () => {
  for (const [frase, esperado] of PEDIDOS) {
    it(frase, async () => {
      const r = await pedir(frase);
      const obtenido = r.carrito.map((i) => `${slugDe(i.productoId)}:${i.gramos}`).sort().join(" ");
      expect(obtenido, `respuesta: ${r.respuesta}`).toBe(esperado.split(" ").sort().join(" "));
    });
  }
});

/** [frase, plato que debe recomendar] */
const RECETAS: [string, string][] = [
  ["¿Qué condimentos necesito para la hallaca?", "hallacas"],
  ["que le echo a las ayacas", "hallacas"],
  ["voy a hacer hallacas este fin de semana", "hallacas"],
  ["quielo hacel hayacas pala navidad", "hallacas"],
  ["qué me recomiendas pal pollo", "pollo al horno"],
  ["voy a hornear un pollo", "pollo al horno"],
  ["qué le pongo a la calne", "carne asada"],
  ["voy a hacer una parrilla", "carne asada"],
  ["qué lleva el pabellón", "carne mechada"],
  ["necesito condimentos para un pescado frito", "pescado"],
  ["qué le echo a las caraotas", "caraotas negras"],
  ["voy a hacer un sancocho", "sopa"],
  ["quiero hacer una pasta", "pasta"],
  ["voy a hacer pan de jamón", "pan de jamón"],
  ["qué necesito para la torta negra", "torta negra"],
  ["voy a hacer arroz con leche", "arroz con leche"],
  ["tengo una fiesta el sábado, qué llevo para picar", "pasapalos"],
  ["qué llevo para ver el juego", "pasapalos"],
  ["quiero hacer un desayuno saludable", "granola casera"],
  ["ana dime que me llevo para hacerme unas buenas hallacas", "hallacas"],
  ["marico qué me recomiendas pa una parrilla", "carne asada"],
  // frases reales de /admin ("Lo que ANA no entendió")
  ["Ayacas.", "hallacas"],
  ["¿Qué puedo hacer para tener una llaca?", "hallacas"],
  ["Dame para hacer una buena yaca.", "hallacas"],
  ["Quiero hacerme un café. ¿Qué debo llevar?", "café"],
  ["voy a ver el juego qué llevo", "pasapalos"],
];

describe("asistente de ventas: recomienda por plato", () => {
  for (const [frase, plato] of RECETAS) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.respuesta).toContain(`Para ${plato}:`);
      // respuestas cortas: se dicen en voz alta y el cliente quiere ir rápido
      expect(r.respuesta.split(" ").length).toBeLessThanOrEqual(22);
      expect(r.sugerencia.length).toBeGreaterThan(0);
      // la regla del mínimo también aplica a lo que recomienda
      for (const s of r.sugerencia) expect(s.gramos).toBeGreaterThanOrEqual(100);
    });
  }
});

/** [frase, texto que debe aparecer en la respuesta] */
const CONSEJOS: [string, RegExp][] = [
  ["para qué sirve la linaza", /Linaza se usa/],
  ["cómo se usa el onoto", /Onoto se usa/],
  ["como uso la paplika", /Paprika se usa/],
  ["con qué se come el merey", /Merey se usa/],
  ["cuál es más picante", /pimienta negra/],
  ["algo que no pique", /Sin picante/],
  ["qué me recomiendas", /Qué vas a cocinar/],
  ["ayúdame, no sé qué llevar", /Qué vas a cocinar/],
  ["hola ana, dame un consejo", /Qué vas a cocinar/],
  ["tienes algo para la tos", /médico/],
  ["cuánto cuesta la canela", /Canela molida está a/],
  ["a cómo está el kilo de merey", /Merey está a/],
];

describe("consejos y preguntas", () => {
  for (const [frase, rx] of CONSEJOS) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.respuesta).toMatch(rx);
    });
  }
});

/** Charla, cumplidos, insultos y temas fuera de la tienda: una línea y de vuelta al pedido. */
const CHARLA: [string, RegExp][] = [
  ["cómo estás", /(hecha para ayudarte|Lista para atenderte)/],
  ["¿Cómo estás?", /(hecha para ayudarte|Lista para atenderte)/],
  ["¿Qué tal?", /(hecha para ayudarte|Lista para atenderte)/],
  ["hola ana como estas", /(hecha para ayudarte|Lista para atenderte)/],
  ["qué más ana, todo bien?", /(hecha para ayudarte|Lista para atenderte)/],
  ["quién eres", /Soy ANA/],
  ["eres un robot?", /Soy ANA/],
  ["gracias mi amor", /(A la orden|Con gusto)/],
  ["glacias", /(A la orden|Con gusto)/],
  ["chao", /vuelve pronto/],
  ["eres una estúpida", /(Disculpa|Perdón)/],
  ["verga no me entiendes", /(Disculpa|Perdón)/],
  ["cuéntame un chiste", /vender especias/],
  ["quién ganó el juego", /solo vendo especias/],
  ["estás bella", /Gracias/],
  ["qué vaina tan mala", /(Disculpa|Perdón)/],
  ["esta máquina no sirve", /(Disculpa|Perdón)/],
];

describe("charla, coloquial y vulgar", () => {
  for (const [frase, rx] of CHARLA) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.respuesta).toMatch(rx);
      expect(r.carrito).toEqual([]);
      expect(r.abrirMenu).toBe(false);
    });
  }
});

describe("ANA habla poco y va al grano", () => {
  for (const frase of ["dame 100 de pasas", "para qué sirve la linaza", "qué me recomiendas", "asdf qwerty", "hola ana", "cuál es más picante"]) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.respuesta.split(" ").length, r.respuesta).toBeLessThanOrEqual(18);
    });
  }
});

describe("lo que no entiende abre el menú", () => {
  for (const frase of ["asdf qwerty", "el perro de mi vecina", "blablabla"]) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.abrirMenu).toBe(true);
    });
  }
});

/** Frases reales de /admin que dependen de lo que ya lleva: el pedido tiene 800 g de maní con chocolate. */
const CON_PEDIDO: [string, RegExp, string][] = [
  ["Al pedido de maní chocolate, agrégale 1 kg.", /1,8 kg/, "chocolate-mani:1800"],
  ["Agregarle 1 kg más.", /1,8 kg/, "chocolate-mani:1800"],
  ["No, no me lo confirmes porque es 1,8 kg.", /1,8 kg/, "chocolate-mani:1800"],
  ["déjalo en 500", /500 g/, "chocolate-mani:500"],
  ["¿Cuántos productos tengo hasta ahora?", /Llevas 800 g de maní con chocolate/, "chocolate-mani:800"],
  ["Hasta ahora que llevan al cabrito.", /Llevas 800 g/, "chocolate-mani:800"],
  ["Es lo más parecido a maní de chocolate.", /gramos de maní con chocolate/, "chocolate-mani:800"],
  ["No.", /no lo confirmo/, "chocolate-mani:800"],
  ["Dame 50.", /De qué producto/, "chocolate-mani:800"],
  ["Dame, me han dicho que ahora te-- un kilo.", /De qué producto quieres 1 kg/, "chocolate-mani:800"],
  ["Guilo.", /De qué producto quieres 1 kg/, "chocolate-mani:800"],
];

describe("frases con un pedido en curso", () => {
  for (const [frase, rx, esperado] of CON_PEDIDO) {
    it(frase, async () => {
      const choco = productos.find((p) => p.slug === "chocolate-mani")!;
      const r = await responder(AnaBody.parse({ mensaje: frase, canal: "voz", carrito: [{ productoId: choco.id, gramos: 800 }] }), productos);
      expect(r.respuesta).toMatch(rx);
      expect(r.carrito.map((i) => `${slugDe(i.productoId)}:${i.gramos}`).join(" ")).toBe(esperado);
    });
  }
});

describe("cantidad suelta después de que ANA pregunta cuántos gramos", () => {
  it("Guilo. -> 1 kg de comino", async () => {
    const r = await responder(
      AnaBody.parse({ mensaje: "Guilo.", canal: "voz", historial: [{ rol: "ana", texto: "¿Cuántos gramos de comino molido te pongo?" }] }),
      productos,
    );
    expect(r.carrito.map((i) => `${slugDe(i.productoId)}:${i.gramos}`).join(" ")).toBe("comino:1000");
  });
});

describe("pedir de todo", () => {
  for (const frase of ["Dame 100 g de cada producto que tengas a la venta.", "Dame 100 g de todo lo que tengas en el menú."]) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.carrito.length).toBe(productos.filter((p) => p.stockGramos >= 100).length);
      expect(r.carrito.every((i) => i.gramos === 100)).toBe(true);
      expect(r.abrirMenu).toBe(false);
    });
  }
});

describe("un no solo no abre el menú", () => {
  it("No. tras una receta", async () => {
    const r = await pedir("No.");
    expect(r.abrirMenu).toBe(false);
    expect(r.respuesta).toMatch(/Qué te pongo/);
  });
});

/** "Dame X y todo lo de la receta": agrega la receta completa y también los productos, sin preguntar. */
const HALLACA = ["onoto:100", "comino:100", "ajo-polvo:100", "pimienta-negra:100", "pasas:150", "almendras:100"];
const PEDIDO_Y_RECETA: [string, string[], RegExp][] = [
  ["Dame maní salado y todo lo que necesito para hacer hallacas.", [...HALLACA, "mani-salado:100"], /hallacas.*maní salado.*confirmo/],
  ["ponme 200 de merey y lo de la hallaca", [...HALLACA, "merey:200"], /hallacas.*merey/],
  ["dame todo lo que necesito para las hallacas", HALLACA, /Te puse lo de hallacas/],
  ["Ponme los condimentos para hacerme una buena hallaca.", HALLACA, /Te puse lo de hallacas/],
  // maní a secas: agrega la receta y pregunta cuál maní
  ["dame maní y todo lo que necesito para hacer hallacas", HALLACA, /hallacas.*Cuál quieres/],
];

describe("producto y receta en la misma frase", () => {
  for (const [frase, esperado, rx] of PEDIDO_Y_RECETA) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.carrito.map((i) => `${slugDe(i.productoId)}:${i.gramos}`).sort()).toEqual([...esperado].sort());
      expect(r.respuesta).toMatch(rx);
      expect(r.sugerencia).toEqual([]);
    });
  }
});
