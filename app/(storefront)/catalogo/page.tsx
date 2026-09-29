import CatalogGrid from "@/components/catalog/CatalogGrid";

export const metadata = {
  title: "Catálogo",
};

export default function Page() {
  return (
    <section className="collection-page page-gutter">
      <header className="collection-header">
        <span className="eyebrow">VINTAGE 29</span>
        <h1>Catálogo</h1>
        <p>Prendas destacadas de la colección.</p>
      </header>
      <CatalogGrid />
    </section>
  );
}
