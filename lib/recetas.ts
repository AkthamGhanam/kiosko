// Conocimiento de ventas: qué llevar para cada plato. Solo se sugieren productos
// del catálogo (por slug) y en cantidades típicas para una preparación casera.
// Para agregar un plato basta con sumar una entrada.
import { fonetica, normalizar } from "./texto";

export type Receta = {
  plato: string;
  claves: string[]; // cómo lo puede decir el cliente
  items: { slug: string; gramos: number; para: string }[];
  consejo: string; // una frase corta de vendedora
};

export const RECETAS: Receta[] = [
  {
    plato: "hallacas",
    claves: ["hallaca", "hallacas", "ayaca", "ayacas", "hayaca", "hayacas"],
    items: [
      { slug: "onoto", gramos: 50, para: "el color de la masa y el guiso" },
      { slug: "comino", gramos: 25, para: "el guiso" },
      { slug: "ajo-polvo", gramos: 50, para: "el guiso" },
      { slug: "pimienta-negra", gramos: 25, para: "el guiso" },
      { slug: "pasas", gramos: 150, para: "el adorno" },
      { slug: "almendras", gramos: 100, para: "el adorno" },
    ],
    consejo: "El onoto es el secreto del color dorado de la masa.",
  },
  {
    plato: "pan de jamón",
    claves: ["pan de jamon", "panes de jamon"],
    items: [
      { slug: "pasas", gramos: 200, para: "el relleno" },
      { slug: "almendras", gramos: 50, para: "decorar" },
    ],
    consejo: "Remoja las pasas un rato antes para que queden jugosas.",
  },
  {
    plato: "torta negra",
    claves: ["torta negra", "bizcocho negro", "torta de navidad"],
    items: [
      { slug: "pasas", gramos: 250, para: "la mezcla" },
      { slug: "nueces", gramos: 100, para: "la mezcla" },
      { slug: "canela", gramos: 25, para: "el aroma" },
      { slug: "nuez-moscada", gramos: 10, para: "el aroma" },
      { slug: "clavo", gramos: 10, para: "el aroma" },
    ],
    consejo: "Mientras más días reposen las frutas, más sabrosa queda.",
  },
  {
    plato: "chocolate caliente",
    claves: ["chocolate caliente", "chocolate"],
    items: [
      { slug: "canela", gramos: 25, para: "el aroma" },
      { slug: "clavo", gramos: 10, para: "un toque especiado" },
      { slug: "nuez-moscada", gramos: 10, para: "espolvorear" },
    ],
    consejo: "Una rama de canela hirviendo con la leche hace la diferencia.",
  },
  {
    plato: "arroz con leche",
    claves: ["arroz con leche"],
    items: [
      { slug: "canela", gramos: 25, para: "cocinar y espolvorear" },
      { slug: "clavo", gramos: 10, para: "el aroma" },
      { slug: "pasas", gramos: 100, para: "acompañar" },
    ],
    consejo: "Agrega las pasas al final para que no se deshagan.",
  },
  {
    plato: "ponche crema",
    claves: ["ponche crema", "ponche"],
    items: [
      { slug: "nuez-moscada", gramos: 10, para: "el toque final" },
      { slug: "canela", gramos: 15, para: "decorar" },
    ],
    consejo: "La nuez moscada recién rallada es la que más perfuma.",
  },
  {
    plato: "pollo al horno",
    claves: ["pollo al horno", "pollo horneado", "pollo asado", "pollo"],
    items: [
      { slug: "paprika", gramos: 50, para: "el color y el sabor" },
      { slug: "ajo-polvo", gramos: 50, para: "el adobo" },
      { slug: "oregano", gramos: 25, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 25, para: "el adobo" },
    ],
    consejo: "Adóbalo desde la noche anterior y queda mucho más sabroso.",
  },
  {
    plato: "carne mechada",
    claves: ["carne mechada", "pabellon", "pabellon criollo", "mechada"],
    items: [
      { slug: "comino", gramos: 25, para: "el guiso" },
      { slug: "ajo-polvo", gramos: 50, para: "el guiso" },
      { slug: "onoto", gramos: 25, para: "el color" },
      { slug: "oregano", gramos: 15, para: "el guiso" },
      { slug: "pimienta-negra", gramos: 25, para: "el guiso" },
    ],
    consejo: "Un poquito de comino basta: es fuerte.",
  },
  {
    plato: "asado negro",
    claves: ["asado negro", "asado"],
    items: [
      { slug: "pimienta-negra", gramos: 25, para: "el adobo" },
      { slug: "ajo-polvo", gramos: 50, para: "el adobo" },
      { slug: "clavo", gramos: 10, para: "el toque dulce especiado" },
    ],
    consejo: "Dos o tres clavitos le dan ese sabor de casa.",
  },
  {
    plato: "curry",
    claves: ["curry", "pollo al curry", "comida india"],
    items: [
      { slug: "curry", gramos: 50, para: "la salsa" },
      { slug: "comino", gramos: 25, para: "la salsa" },
      { slug: "ajo-polvo", gramos: 25, para: "la base" },
    ],
    consejo: "Sofríe el curry un minuto en aceite para que suelte el aroma.",
  },
  {
    plato: "granola casera",
    claves: ["granola", "desayuno", "desayuno saludable", "bowl"],
    items: [
      { slug: "avena", gramos: 500, para: "la base" },
      { slug: "almendras", gramos: 100, para: "lo crujiente" },
      { slug: "pasas", gramos: 100, para: "lo dulce" },
      { slug: "linaza", gramos: 100, para: "la fibra" },
      { slug: "ajonjoli", gramos: 50, para: "lo tostado" },
    ],
    consejo: "Tuéstala en el horno con un poco de miel y queda espectacular.",
  },
  {
    plato: "pasapalos",
    claves: ["pasapalos", "fiesta", "reunion", "picar", "para picar", "cumpleanos", "partido", "juego"],
    items: [
      { slug: "mani-salado", gramos: 500, para: "picar" },
      { slug: "merey", gramos: 250, para: "picar" },
      { slug: "mani-confitado", gramos: 250, para: "lo dulce" },
      { slug: "chocolate-mani", gramos: 250, para: "lo dulce" },
    ],
    consejo: "Para unas 10 personas, con esto alcanza bien.",
  },
];

const RX_COCINAR = /\b(hace[rl]?|p[rl]?epa[rl]a[rl]?|cocina[rl]?|voy a|vamos a|quie[rl]o|receta|que (le )?(pongo|echo|lleva|necesito)|pa[rl]a (unas?|el|la|los|las))\b/;

/** Busca un plato en lo que dijo el cliente. Tolera pronunciación ("allacas", "pabeyon"). */
export function detectarReceta(texto: string): Receta | null {
  const f = ` ${fonetica(texto)} `;
  let mejor: { r: Receta; largo: number } | null = null;
  for (const r of RECETAS) {
    for (const c of r.claves) {
      const fc = fonetica(c);
      if (f.includes(` ${fc} `) || f.includes(` ${fc}s `)) {
        if (!mejor || fc.length > mejor.largo) mejor = { r, largo: fc.length };
      }
    }
  }
  return mejor?.r ?? null;
}

export function quiereCocinar(texto: string) {
  return RX_COCINAR.test(normalizar(texto));
}
