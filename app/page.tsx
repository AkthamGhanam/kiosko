import { preload } from "react-dom";
import { Kiosko } from "@/components/Kiosko";
import { listarProductos } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  // el modelo 3D empieza a descargarse junto con el HTML
  preload(process.env.NEXT_PUBLIC_AVATAR_URL ?? "/models/ana.vrm", { as: "fetch", crossOrigin: "anonymous" });
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
