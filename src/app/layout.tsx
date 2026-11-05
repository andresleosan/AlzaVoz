import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppModeProvider } from "@/context/AppModeContext";

export const viewport: Viewport = {
  themeColor: "#06B6D4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://alzavoz.pages.dev"),
  title: "AlzaVoz & Alza Bot | Medellín Protegida",
  description: "Herramienta cívica de protección ciudadana, auxilio SOS en vivo y denuncia confidencial para Medellín.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/assets/brand/apple-touch-icon.svg",
  },
  openGraph: {
    title: "AlzaVoz & Alza Bot | Medellín Protegida",
    description: "Protección jurídica en retenes, auxilio 123 con geolocalización, escudo violeta y sonómetro comunitario.",
    url: "https://alzavoz.pages.dev",
    siteName: "AlzaVoz",
    locale: "es_CO",
    type: "website",
    images: [
      {
        url: "/assets/alzabot/bot-standard-scene.jpg",
        width: 1200,
        height: 630,
        alt: "Alza Bot - Sistema Inteligente de Protección Ciudadana de Medellín",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AlzaVoz & Alza Bot",
    description: "Herramienta ciudadana de auxilio SOS y defensa legal para Medellín.",
    images: ["/assets/alzabot/bot-standard-scene.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es" className="dark h-full bg-[#0B0F19]">
      <body className="h-full flex flex-col bg-[#0B0F19] text-[#F9FAFB] antialiased selection:bg-cyan-500/30">
        <AppModeProvider>
          <div className="flex-1 w-full max-w-md mx-auto flex flex-col relative overflow-x-hidden">
            {children}
          </div>
        </AppModeProvider>
      </body>
    </html>
  );
}
