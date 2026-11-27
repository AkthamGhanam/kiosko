import { Kiosko } from "@/components/Kiosko";
import { listarProductos } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const productos = await listarProductos();
  return (
    <Kiosko
      productos={productos.map((p) => ({
        id: p.id,
        slug: p.slug,
        nombre: p.nombre,
        categoria: p.categoria,
        precioKg: p.precioKg,
        stockGramos: p.stockGramos,
        imagen: p.imagen,
      }))}
    />
  );
}
