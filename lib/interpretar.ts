// Parser local de pedidos en español: funciona sin IA y también sirve de red de seguridad.
// "120 gr de avena, 100 de dandy y otros 100 de maní salado" ->
//   [{texto:"avena", gramos:120}, {texto:"dandy", gramos:100}, {texto:"mani salado", gramos:100}]
import { normalizar, quitarMuletillas } from "./texto";

export type LineaInterpretada = { texto: string; gramos: number };

const UNIDADES: Record<string, number> = {
  g: 1, gr: 1, grs: 1, gramo: 1, gramos: 1, grm: 1, glamo: 1, glamos: 1, gamo: 1, gamos: 1, gl: 1,
  k: 1000, kg: 1000, kgs: 1000, kilo: 1000, kilos: 1000, kilogramo: 1000, kilogramos: 1000,
};

const NUMEROS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  veinte: 20, veinticinco: 25, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  tes: 3, cuato: 4, cuatlo: 4, teinta: 30, tleinta: 30, cuaenta: 40, cualenta: 40, cincuena: 50,
  cien: 100, ciento: 100, tescientos: 300, tecientos: 300, trecientos: 300, tlescientos: 300, cuatocientos: 400, cuatlocientos: 400, ochocienos: 800, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400,
  cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900, mil: 1000,
};

const CONECTORES = new Set(["y", "e", "otros", "otro", "otras", "otra", "tambien", "ademas", "mas", "de", "del", "a", "ponme", "dame", "con"]);

type Token = { t: string; i: number };

function tokenizar(texto: string): string[] {
  return quitarMuletillas(texto)
    .replace(/(\d),(\d)/g, "$1.$2") // 1,5 kilos
    .replace(/(\d)(kg|kgs|kilos?|grs?|gramos?|glamos?|gamos?|g)\b/g, "$1 $2") // 120gr -> 120 gr
    .replace(/[,;]/g, " , ")
    .replace(/\.(\s|$)/g, " , ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Intenta leer una cantidad desde la posición i. Devuelve gramos y cuántos tokens consumió. */
function leerCantidad(tk: string[], i: number): { gramos: number; usados: number } | null {
  let j = i;
  let valor: number | null = null;
  let esFraccionKilo = false;

  if ((tk[j] === "kilo" || tk[j] === "kg") && tk[j + 1] === "y" && (tk[j + 2] === "medio" || tk[j + 2] === "media")) {
    return { gramos: 1500, usados: 3 }; // "kilo y medio"
  }
  if (/^\d+(\.\d+)?$/.test(tk[j])) {
    valor = parseFloat(tk[j]);
    j++;
  } else if (tk[j] === "medio" || tk[j] === "media") {
    valor = 500; esFraccionKilo = true; j++;
  } else if ((tk[j] === "un" || tk[j] === "1") && tk[j + 1] === "cuarto") {
    valor = 250; esFraccionKilo = true; j += 2;
  } else if (tk[j] === "cuarto") {
    valor = 250; esFraccionKilo = true; j++;
  } else if (tk[j] in NUMEROS) {
    // secuencias tipo "ciento cincuenta", "setenta y cinco"
    let suma = 0;
    let k = j;
    while (k < tk.length && (tk[k] in NUMEROS || (tk[k] === "y" && tk[k + 1] in NUMEROS && suma > 0 && suma % 10 === 0 && suma < 100))) {
      if (tk[k] !== "y") suma += NUMEROS[tk[k]];
      k++;
    }
    // "un" solo, seguido de algo que no es unidad, no es cantidad ("un poco")
    if ((tk[j] === "un" || tk[j] === "una") && !(tk[k] in UNIDADES)) return null;
    valor = suma;
    j = k;
  }
  if (valor === null || valor <= 0) return null;

  if (esFraccionKilo) {
    if (tk[j] === "de" && tk[j + 1] in UNIDADES) j += 2;
    else if (tk[j] in UNIDADES) j++;
    return { gramos: valor, usados: j - i };
  }

  let gramos = valor;
  if (tk[j] in UNIDADES) {
    gramos = valor * UNIDADES[tk[j]];
    j++;
    if (UNIDADES[tk[j - 1]] === 1000 && tk[j] === "y" && (tk[j + 1] === "medio" || tk[j + 1] === "media")) {
      gramos += 500;
      j += 2;
    }
  }
  // Sin unidad se asume gramos ("100 de dandy")
  return { gramos: Math.round(gramos), usados: j - i };
}

export function interpretarPedido(texto: string): LineaInterpretada[] {
  const tk = tokenizar(texto);
  const cantidades: { pos: number; fin: number; gramos: number }[] = [];
  for (let i = 0; i < tk.length; i++) {
    const c = leerCantidad(tk, i);
    if (c) {
      cantidades.push({ pos: i, fin: i + c.usados, gramos: c.gramos });
      i += c.usados - 1;
    }
  }
  const lineas: LineaInterpretada[] = [];
  cantidades.forEach((c, n) => {
    const hasta = n + 1 < cantidades.length ? cantidades[n + 1].pos : tk.length;
    let frase: Token[] = tk.slice(c.fin, hasta).map((t, k) => ({ t, i: c.fin + k }));
    // corta en la primera coma
    const coma = frase.findIndex((x) => x.t === ",");
    if (coma >= 0) frase = frase.slice(0, coma);
    // quita conectores al inicio y al final
    while (frase.length && CONECTORES.has(frase[0].t)) frase.shift();
    while (frase.length && CONECTORES.has(frase[frase.length - 1].t)) frase.pop();
    const textoProducto = frase.map((x) => x.t).join(" ").trim();
    if (textoProducto) lineas.push({ texto: textoProducto, gramos: c.gramos });
  });
  return lineas;
}

export type Intencion = "confirmar" | "cancelar" | "quitar" | "precio" | "catalogo" | "carrito" | "saludo" | "pedido" | "otro";

const RX = {
  // [rl]? tolera a quien no pronuncia la r: "pefecto", "pelfecto", "confimo", "colecto"
  confirmar: /\b(si|sip|co[nm]?fi[rl]?mo|co[nm]?fi[rl]?ma[rl]?|co[nm]?fi[rl]?mado|pe[rl]?fecto|dale|listo|co[rl]*ecto|de acue[rl]?do|ok|okey|okay|esta bien|asi esta bien|eso es todo|segu[rl]?o|cla[rl]?o|p[rl]?ocede|aja)\b/,
  negar: /\b(no|todavia no|espera|aun no)\b/,
  cancelar: /\b(cancela[rl]?|cancelalo|bo[rl]+a todo|bo[rl]?a todo|vacia[rl]?|empeza[rl]? de nuevo|olvidalo)\b/,
  quitar: /\b(quita[rl]?|quitame|elimina[rl]?|saca[rl]?|[rl]?eti[rl]?a|sin el|sin la)\b/,
  precio: /\b(cuanto (cuesta|cuestan|vale|valen|sale|salen|esta|estan)|p[rl]?ecio|a como (esta|estan|sale|salen|es)?|que p[rl]?ecio)\b/,
  catalogo: /\b(que (tienen|tienes|venden|vendes|hay)|catalogo|productos|menu|lista)\b/,
  carrito: /\b(mi pedido|el pedido|ca[rl]+ito|ca[rl]?ito|cuanto (es|va|llevo)|total)\b/,
  saludo: /\b(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|epa)\b/,
};

export function detectarIntencion(texto: string, esperandoConfirmacion: boolean): Intencion {
  const n = normalizar(texto);
  const lineas = interpretarPedido(texto);
  if (RX.cancelar.test(n)) return "cancelar";
  if (RX.quitar.test(n)) return "quitar";
  if (lineas.length) return "pedido";
  if (esperandoConfirmacion && RX.confirmar.test(n) && !RX.negar.test(n.replace(/\bno se\b/, ""))) return "confirmar";
  if (RX.precio.test(n)) return "precio";
  if (RX.carrito.test(n)) return "carrito";
  if (RX.catalogo.test(n)) return "catalogo";
  if (RX.saludo.test(n)) return "saludo";
  return "otro";
}

/** Texto del producto mencionado tras "quita el comino" o "cuánto cuesta la canela". */
export function productoMencionado(texto: string): string {
  return normalizar(texto)
    .replace(RX.quitar, " ")
    .replace(RX.precio, " ")
    .replace(/\b(hola|ana|por favor|porfa|el kilo|kilo|de|del|la|el|los|las|me|mi|pedido|carrito|esta|estan|sale|salen|tienes|tiene|hay)\b/g, " ")
    .replace(/[,?.!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "sí", "dale", "agrégalos", "ponme todo"... para aceptar una sugerencia de ANA. */
export function aceptaSugerencia(texto: string): boolean {
  const n = normalizar(texto);
  if (/\b(no|nada|despues|luego)\b/.test(n) && !/\bno se\b/.test(n)) return false;
  return RX.confirmar.test(n) || /\b(ag[rl]?egal[oa]s?|agregame|ponmel[oa]s|todo|tod[oa]s|esos|esas|me l[oa]s llevo|vale)\b/.test(n);
}
