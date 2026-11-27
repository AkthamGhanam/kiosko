export type ProductoCliente = {
  id: number;
  slug: string;
  nombre: string;
  categoria: string;
  precioKg: number; // centavos
  stockGramos: number;
  imagen: string;
};

export type FacturaCliente = {
  pedidoId: number;
  numero: string;
  fecha: string;
  canal: string;
  lineas: { nombre: string; gramos: number; precioKg: number; subtotalCents: number }[];
  totalCents: number;
};

export type Mensaje = { id: number; rol: "cliente" | "ana"; texto: string };

/** Lo que hace el cuerpo de ANA en la escena 3D. */
export type AnimAna = "fuera" | "entrar" | "reposo" | "saludar" | "salir";
/** Lo que se muestra como estado de la conversación. */
export type EstadoAna = "reposo" | "escuchando" | "pensando" | "hablando";
export type Fase = "pedido" | "factura";

export type RespuestaAna = {
  respuesta: string;
  carrito: { productoId: number; gramos: number }[];
  esperandoConfirmacion: boolean;
  factura?: FacturaCliente;
  rechazadas?: { nombre: string; pedidos: number; disponibles: number }[];
  proveedor: string;
};
