// Lo que ANA sabe de cada producto para aconsejar como una vendedora:
// para qué se usa, un truco y qué tanto pica. Solo cocina, nunca consejos de salud.
import { fonetica, normalizar } from "./texto";

export type InfoProducto = { uso: string; truco?: string; picante?: 0 | 1 | 2 | 3 };

export const INFO: Record<string, InfoProducto> = {
  avena: { uso: "para desayunos, batidos, granola y galletas", truco: "Remojada en leche la noche anterior queda cremosa." },
  "mani-dandy": { uso: "para picar: es el maní cubierto crujiente", truco: "Es el favorito para las fiestas y los partidos." },
  paprika: { uso: "para dar color y sabor ahumado a pollo, carnes, papas y huevos", truco: "Agrégala al final del sofrito para que no se queme.", picante: 0 },
  "mani-salado": { uso: "para picar o acompañar una bebida fría" },
  "mani-tostado": { uso: "para picar, para salsas de maní o para hacer dulces caseros" },
  "mani-confitado": { uso: "para picar algo dulce, ideal para los niños" },
  comino: { uso: "para guisos, caraotas, carne mechada y hallacas", truco: "Es fuerte: con una pizca basta.", picante: 0 },
  oregano: { uso: "para salsas, pasta, pizza, sopas y adobos", truco: "Frótalo entre las manos antes de echarlo para que suelte el aroma.", picante: 0 },
  "pimienta-negra": { uso: "para casi todo: carnes, pollo, sopas y ensaladas", truco: "Échala al final para que conserve su aroma.", picante: 2 },
  onoto: { uso: "para dar color dorado a la hallaca, el arroz, los guisos y las sopas", truco: "Sofríelo en aceite a fuego bajo y cuélalo: así pinta sin amargar.", picante: 0 },
  curry: { uso: "para pollo al curry, arroz y salsas", truco: "Sofríelo un minuto en aceite para que suelte el aroma.", picante: 1 },
  "ajo-polvo": { uso: "para adobar carnes, pollo y pescado, y para salsas", truco: "Rinde mucho y no se quema como el ajo fresco.", picante: 0 },
  canela: { uso: "para arroz con leche, chocolate caliente, tortas y café", picante: 0 },
  "nuez-moscada": { uso: "para el ponche crema, la salsa bechamel y los postres", truco: "Con muy poquito alcanza, es intensa.", picante: 0 },
  merey: { uso: "para picar, para ensaladas o para el pollo salteado" },
  almendras: { uso: "para la hallaca, ensaladas, granola y para picar" },
  pasas: { uso: "para la hallaca, el pan de jamón, la torta negra y el arroz con leche", truco: "Remójalas antes para que queden jugosas." },
  nueces: { uso: "para la torta negra, ensaladas y postres" },
  linaza: { uso: "para batidos, avena, panes y granola", truco: "Molida se aprovecha mejor; agrégala al batido." },
  ajonjoli: { uso: "para espolvorear panes, ensaladas, pollo y arroz", truco: "Tuéstalo en sartén seco un minuto." },
  clavo: { uso: "para el asado negro, el dulce de lechosa, el chocolate y el ponche", truco: "Dos o tres clavitos bastan.", picante: 1 },
  "chocolate-mani": { uso: "para picar algo dulce o para regalar" },
};

/** "¿qué me recomiendas?", "dame un consejo", "ayúdame", "¿qué le pongo?"... (tolera la r perdida) */
const RX_CONSEJO =
  /\b(recomienda[s]?|recomiendame|recomendas|recomendacion|consejo|aconseja[s]?|aconsejame|ayuda|ayudame|ayudar|sugie[rl]e[s]?|sugerencia|que le (pongo|echo|agrego|hecho)|que (pongo|echo|uso|necesito|lleva|llevo|compro)|no se que (llevar|comprar|cocinar|hacer))\b/;
const RX_USO = /\b(pa[rl]?a que si[rl]?ve|como (se )?usa|como (lo |la )?uso|que es (el |la )?|con que (se )?(come|usa|combina)|pa[rl]?a que es|que hago con)\b/;
const RX_PICANTE = /\b(pica[n]?|picante|picosa?|mas fue[rl]?te|suave|no pique)\b/;
const RX_SALUD = /\b(tos|g[rl]ipe|dolo[rl]|enfe[rl]medad|diabetes|tension|p[rl]esion|medicina|cu[rl]a[rl]?|adelgaza[rl]?|bajar de peso|embaraz)/;

export const pideConsejo = (t: string) => RX_CONSEJO.test(normalizar(t));
export const preguntaUso = (t: string) => RX_USO.test(normalizar(t));
export const preguntaPicante = (t: string) => RX_PICANTE.test(normalizar(t));
export const preguntaSalud = (t: string) => RX_SALUD.test(fonetica(t)) || RX_SALUD.test(normalizar(t));
