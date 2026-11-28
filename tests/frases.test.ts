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
];

describe("asistente de ventas: recomienda por plato", () => {
  for (const [frase, plato] of RECETAS) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.respuesta).toContain(`Para ${plato}`);
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
  ["algo que no pique", /no pique/],
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

describe("lo que no entiende abre el menú", () => {
  for (const frase of ["asdf qwerty", "el perro de mi vecina", "blablabla"]) {
    it(frase, async () => {
      const r = await pedir(frase);
      expect(r.abrirMenu).toBe(true);
    });
  }
});
