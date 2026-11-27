"use client";
// Orquesta la experiencia: conversación, carrito, voz, animaciones de ANA y factura.
import { agregarMensaje, fijar, obtener } from "./store";
import { VozNavegador, escuchar, microfonoSoportado, type MotorVoz } from "./voz";
import type { FacturaCliente, ProductoCliente, RespuestaAna } from "./tipos";
import { TIENDA, frasePago } from "../config";
import { formatoDinero, formatoGramos } from "../dinero";

let voz: MotorVoz | null = null;
let ultimoCanal: "voz" | "texto" | "tactil" = "tactil";
let detenerEscucha: (() => void) | null = null;
let turno = 0; // invalida respuestas viejas al reiniciar

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function motor() {
  if (!voz) voz = new VozNavegador();
  return voz;
}

export async function decir(texto: string) {
  agregarMensaje("ana", texto);
  fijar({ estadoAna: "hablando" });
  try {
    if (obtener().vozDisponible) await motor().hablar(texto);
    else await esperar(Math.min(4000, 900 + texto.length * 35));
  } finally {
    fijar((e) => (e.estadoAna === "hablando" ? { estadoAna: "reposo" } : {}));
  }
}

const SALUDO = `¡Hola! Soy ANA, bienvenido a ${TIENDA.nombre}. Dime qué quieres llevar y cuántos gramos, o toca los productos en pantalla.`;

/** Primer toque del cliente: desbloquea audio y micrófono, y ANA saluda. */
export async function comenzar() {
  fijar({ microfonoDisponible: microfonoSoportado() });
  motor(); // crea el motor dentro del gesto del usuario (requisito de los navegadores)
  if (obtener().animAna === "fuera") {
    fijar({ animAna: "entrar" });
    await esperar(1400);
  }
  saludar();
  await decir(SALUDO);
}

/** El saludo con la mano dura lo mismo aunque la voz falle o sea muy corta. */
function saludar() {
  fijar({ animAna: "saludar" });
  setTimeout(() => fijar((e) => (e.animAna === "saludar" ? { animAna: "reposo" } : {})), 2600);
}

export async function enviarMensaje(texto: string, canal: "voz" | "texto") {
  const t = texto.trim();
  if (!t) return;
  ultimoCanal = canal;
  motor().callar();
  agregarMensaje("cliente", t);
  fijar({ estadoAna: "pensando", textoParcial: "" });
  const miTurno = ++turno;
  const e = obtener();
  let r: RespuestaAna;
  try {
    const res = await fetch("/api/ana", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mensaje: t,
        canal,
        carrito: e.carrito,
        esperandoConfirmacion: e.esperandoConfirmacion,
        historial: e.mensajes.slice(-10).map((m) => ({ rol: m.rol, texto: m.texto })),
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    r = await res.json();
  } catch {
    if (miTurno !== turno) return;
    fijar({ estadoAna: "reposo" });
    await decir("Disculpa, tuve un problema de conexión. ¿Me lo repites o lo tocas en pantalla?");
    return;
  }
  if (miTurno !== turno) return;
  const antes = new Set(e.carrito.map((i) => `${i.productoId}:${i.gramos}`));
  const nuevo = r.carrito.find((i) => !antes.has(`${i.productoId}:${i.gramos}`));
  fijar({
    carrito: r.carrito,
    esperandoConfirmacion: r.esperandoConfirmacion,
    ultimoAgregado: nuevo?.productoId ?? null,
    proveedor: r.proveedor,
    // si ANA armó el pedido por voz/texto, se despliega el detalle para que el cliente lo revise
    carritoAbierto: nuevo && r.carrito.length > 1 ? true : obtener().carritoAbierto,
  });
  if (r.factura) {
    await cerrarConFactura(r.factura, r.respuesta);
    return;
  }
  await decir(r.respuesta);
  // si el cliente habló por voz, ANA vuelve a escuchar sola cuando hace una pregunta
  if (ultimoCanal === "voz" && obtener().microfonoDisponible && /\?\s*$/.test(r.respuesta) && miTurno === turno) {
    iniciarEscucha();
  }
}

// ---------- táctil ----------
export function agregarTactil(p: ProductoCliente, gramos: number) {
  ultimoCanal = "tactil";
  fijar((e) => {
    const existe = e.carrito.find((i) => i.productoId === p.id);
    const carrito = existe
      ? e.carrito.map((i) => (i.productoId === p.id ? { ...i, gramos: i.gramos + gramos } : i))
      : [...e.carrito, { productoId: p.id, gramos }];
    return { carrito, esperandoConfirmacion: true, ultimoAgregado: p.id };
  });
  if (obtener().estadoAna !== "hablando") {
    void decir(`Listo, agregué ${formatoGramos(gramos)} de ${p.nombre.toLowerCase()}. ¿Algo más?`);
  }
}

export function cambiarGramos(productoId: number, gramos: number) {
  fijar((e) => ({
    carrito: gramos <= 0 ? e.carrito.filter((i) => i.productoId !== productoId) : e.carrito.map((i) => (i.productoId === productoId ? { ...i, gramos } : i)),
  }));
  if (!obtener().carrito.length) fijar({ esperandoConfirmacion: false });
}

export async function confirmarTactil() {
  const e = obtener();
  if (!e.carrito.length || e.estadoAna === "pensando") return;
  motor().callar();
  fijar({ estadoAna: "pensando" });
  const miTurno = ++turno;
  const res = await fetch("/api/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: e.carrito, canal: ultimoCanal }),
  }).catch(() => null);
  if (miTurno !== turno) return;
  const data = res ? await res.json().catch(() => null) : null;
  if (!res || !data) {
    fijar({ estadoAna: "reposo" });
    await decir("Disculpa, no pude registrar el pedido. Intenta de nuevo.");
    return;
  }
  if (!data.ok) {
    const sin = (data.rechazadas ?? []).map((x: { nombre: string; disponibles: number }) => `${x.nombre} (quedan ${formatoGramos(x.disponibles)})`).join(", ");
    fijar({ estadoAna: "reposo" });
    await decir(`No me alcanza el inventario para ${sin}. Ajusta las cantidades y lo intentamos otra vez.`);
    await refrescarProductos();
    return;
  }
  let frase = data.frase as string;
  if (data.rechazadas?.length) {
    const sin = data.rechazadas.map((x: { nombre: string }) => x.nombre).join(", ");
    frase = `No me alcanzó el inventario para ${sin}, así que lo dejé fuera. ${frase}`;
  }
  await cerrarConFactura(data.factura, frase);
}

// ---------- cierre ----------
async function cerrarConFactura(factura: FacturaCliente, frase: string) {
  const miTurno = turno;
  fijar({ factura, esperandoConfirmacion: false, estadoAna: "reposo", carritoAbierto: false });
  void refrescarProductos();
  await decir(frase || frasePago(formatoDinero(factura.totalCents)));
  if (miTurno !== turno) return;
  fijar({ animAna: "salir" });
  await esperar(1900);
  if (miTurno !== turno) return;
  fijar({ fase: "factura", animAna: "fuera" });
}

export async function nuevoPedido() {
  turno++;
  motor().callar();
  detenerEscucha?.();
  fijar({ fase: "pedido", factura: null, carrito: [], esperandoConfirmacion: false, mensajes: [], ultimoAgregado: null, estadoAna: "reposo", animAna: "entrar" });
  await esperar(1500);
  saludar();
  await decir("¡Hola de nuevo! ¿Qué te preparo esta vez?");
}

export async function refrescarProductos() {
  const res = await fetch("/api/productos", { cache: "no-store" }).catch(() => null);
  if (!res?.ok) return;
  const { productos } = await res.json();
  fijar({ productos });
}

// ---------- micrófono ----------
export function iniciarEscucha() {
  if (obtener().estadoAna === "escuchando") {
    detenerEscucha?.();
    return;
  }
  motor().callar();
  fijar({ estadoAna: "escuchando", textoParcial: "" });
  detenerEscucha = escuchar({
    onParcial: (t) => fijar({ textoParcial: t }),
    onFinal: (t) => void enviarMensaje(t, "voz"),
    onFin: () => {
      detenerEscucha = null;
      fijar((e) => (e.estadoAna === "escuchando" ? { estadoAna: "reposo", textoParcial: "" } : {}));
    },
    onError: (err) => {
      if (err === "not-allowed" || err === "service-not-allowed" || err === "no_soportado") {
        fijar({ microfonoDisponible: false });
        agregarMensaje("ana", "No tengo acceso al micrófono. Puedes escribirme o tocar los productos.");
      }
    },
  });
}
