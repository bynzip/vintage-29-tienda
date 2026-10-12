import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vintage 29",
    template: "%s · Vintage 29",
  },
  description:
    "Descubre prendas de mujer Vintage 29: jeans, tops y vestidos.",
  openGraph: {
    title: "Vintage 29",
    description: "Prendas para todos tus momentos.",
    type: "website",
    locale: "es_PE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
