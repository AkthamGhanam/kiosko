import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { TIENDA } from "@/lib/config";

const texto = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--fuente-texto", display: "swap" });
const titulo = Fraunces({ subsets: ["latin"], variable: "--fuente-titulo", display: "swap", weight: ["500", "600", "700"] });

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
    <html lang="es" className={`${texto.variable} ${titulo.variable}`}>
      <head>
        <link rel="preload" href={process.env.NEXT_PUBLIC_AVATAR_URL ?? "/models/ana.vrm"} as="fetch" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
