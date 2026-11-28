// Charla y lenguaje coloquial: lo que la gente le dice a ANA que no es un pedido.
// Respuestas de una línea que siempre vuelven al pedido. Tolera la r perdida o cambiada
// por l: se prueba la frase tal cual y con las l convertidas en r ("glacias" -> "gracias").
import { normalizar } from "./texto";

type Regla = { rx: RegExp; respuestas: string[] };

const elegir = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];

// Groserías y apodos venezolanos que muchas veces son solo muletillas ("coño, dame 100 de pasas").
export const GROSERIAS = /\b(cono|verga|marico|marica|maric[oa]n|mielda|mierda|nojoda|no joda|joder|carajo|puta|puto|pendej[oa]|guev[oa]n|webon|huevon|cul[oa])\b/;

const REGLAS: Regla[] = [
  // insultos dirigidos a ANA: calma y de vuelta al pedido
  {
    rx: /\b(eres|tu eres|sos|que)\s+(una?\s+)?(estupida|bruta|gafa|tonta|idiota|inutil|mala|basura|pendeja|ladilla|fastidiosa|lenta)\b|\b(estupida|bruta|gafa|idiota|inutil|pendeja|maldita|imbecil)\b|\bno sirves\b|\bno me entiendes\b|\bno entiendes nada\b|\b(que|esta) (vaina|cosa|maquina|broma) (tan |esta |es )?(mala|malo|fea|lenta|horrible)\b|\bno funciona\b|\bno sirve\b|\besto no sirve\b/,
    respuestas: ["Disculpa, vamos de nuevo. Dime producto y gramos, o tócalo en el menú.", "Perdón, inténtalo otra vez: producto y gramos."],
  },
  {
    rx: /\b(como estas|como esta|como andas|como te va|que tal|que mas|todo bien|como amaneciste|como vas)\b/,
    respuestas: ["Estoy hecha para ayudarte con tu pedido. ¿Qué te pongo?", "¡Lista para atenderte! ¿Qué te pongo?"],
  },
  {
    rx: /\b(quien eres|que eres|como te llamas|eres un robot|eres una robot|eres real|eres humana|eres una persona|eres de verdad|eres inteligencia)\b/,
    respuestas: ["Soy ANA, la asistente de la tienda. ¿Qué te pongo?"],
  },
  {
    rx: /\b(gracias|gacias|grasias|chevere|fino|excelente|buenisimo)\b/,
    respuestas: ["¡A la orden! ¿Algo más?", "¡Con gusto! ¿Algo más?"],
  },
  {
    rx: /\b(chao|adios|hasta luego|nos vemos|me voy|bye|hasta pronto)\b/,
    respuestas: ["¡Chao, vuelve pronto!"],
  },
  {
    rx: /\b(bella|bonita|linda|hermosa|guapa|preciosa|mamacita|sexy)\b|\bte (amo|quiero)\b|\bcasate conmigo\b|\bquieres ser mi novia\b/,
    respuestas: ["¡Gracias! ¿Qué te pongo?"],
  },
  {
    rx: /\b(chiste|cuentame algo|cantame|canta|bailame|baila|juguemos|aburrido|aburrida)\b/,
    respuestas: ["Lo mío es vender especias. ¿Qué te pongo?"],
  },
  {
    rx: /\b(quien gano|el juego de|beisbol|futbol|politica|presidente|clima|va a llover|que hora es|dolar|noticias|caracas|magallanes|leones)\b/,
    respuestas: ["De eso no sé, yo solo vendo especias. ¿Qué te pongo?"],
  },
];

/** Respuesta para charla, cumplidos, insultos o temas fuera de la tienda. null si no aplica. */
export function responderCharla(texto: string): string | null {
  const n = normalizar(texto);
  const conR = n.replace(/l/g, "r");
  for (const r of REGLAS) if (r.rx.test(n) || r.rx.test(conR)) return elegir(r.respuestas);
  return null;
}
