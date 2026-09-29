import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Vintage 29",
    template: "%s · Vintage 29",
  },
  description:
    "Tienda online de ropa de mujer. Jeans, tops y vestidos con pago en línea y envío a todo el Perú.",
  metadataBase: new URL("https://vintage29.pe"),
  openGraph: {
    title: "Vintage 29",
    description: "Descubre tu próximo look favorito.",
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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
