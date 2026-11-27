import { obtenerResumen } from "@/lib/admin";
import { PanelAdmin } from "@/components/admin/PanelAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventario · Minimarket Especias" };

export default async function Admin() {
  const inicial = await obtenerResumen();
  return <PanelAdmin inicial={JSON.parse(JSON.stringify(inicial))} />;
}
