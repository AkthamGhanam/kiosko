import type { Metadata, Viewport } from "next";
// Fuentes empaquetadas con npm: el kiosko no depende de internet para verse bien
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/fraunces";
import "./globals.css";
import { TIENDA } from "@/lib/config";

export const metadata: Metadata = {
  title: `${TIENDA.nombre} · Kiosko con ANA`,
  description: "Kiosko de autoservicio con ANA, asistente virtual 3D",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#faf5ec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
