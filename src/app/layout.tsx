import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Álbum Mundial FIFA 2026",
  description:
    "App familia Genolet para administrar stickers, repetidas, faltantes y sobres del álbum Panini FIFA World Cup 2026.",
  applicationName: "Álbum Mundial 2026",
  openGraph: {
    title: "Álbum Mundial FIFA 2026",
    description:
      "Administra stickers, repetidas, faltantes y sobres del álbum familia Genolet.",
    url: "https://album-mundial-2026-tau.vercel.app",
    siteName: "Álbum Mundial FIFA 2026",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Ícono Álbum Mundial FIFA 2026",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Álbum Mundial FIFA 2026",
    description:
      "Administra stickers, repetidas, faltantes y sobres del álbum familia Genolet.",
    images: ["/icon-512.png"],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}