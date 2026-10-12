import StorefrontLayout from "@/components/StorefrontLayout";
import Link from "next/link";

export default function NotFound() {
  return (
    <StorefrontLayout>
      <section className="content-page">
        <span className="eyebrow">404 · PÁGINA NO ENCONTRADA</span>
        <h1>Esa página no está disponible.</h1>
        <Link className="dark-button" href="/">
          VOLVER AL INICIO
        </Link>
      </section>
    </StorefrontLayout>
  );
}
