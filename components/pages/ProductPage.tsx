import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/types";
import ProductScrollShowcase from "@/components/catalog/ProductScrollShowcase";
import ProductCarousel from "@/components/catalog/ProductCarousel";

export default function ProductPage({
  product,
  relatedProducts,
}: {
  product: CatalogProduct;
  relatedProducts: CatalogProduct[];
}) {
  const genderLabels = { female: "Mujer", male: "Hombre", unisex: "Unisex" };
  const details = [
    product.category ? ["Categoría", product.category] : null,
    product.gender ? ["Público", genderLabels[product.gender]] : null,
    product.fit ? ["Ajuste", product.fit] : null,
    product.material ? ["Material", product.material] : null,
    product.countryOfOrigin ? ["País de origen", product.countryOfOrigin] : null,
    product.careInstructions ? ["Cuidados", product.careInstructions] : null,
    product.description ? ["Descripción", product.description] : null,
  ].filter((detail): detail is [string, string] => detail !== null);

  return (
    <section className="product-detail-page">
      <ProductScrollShowcase key={product.slug} product={product} />

      <section className="product-specifications page-gutter" id="product-details" aria-labelledby="product-details-title">
        <div className="product-specifications-heading">
          <span className="eyebrow">VINTAGE 29 · DETALLES</span>
          <h2 id="product-details-title">Sobre esta prenda<span className="coral-dot">.</span></h2>
        </div>
        {details.length > 0 ? (
          <dl className="product-specifications-list">
            {details.map(([label, value]) => (
              <div className="product-specification-row" key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="product-specifications-empty">No hay más detalles disponibles para esta prenda.</p>
        )}
        <Link className="product-back-link" href="/#productos">
          <ArrowLeft size={15} /> VOLVER A PRODUCTOS
        </Link>
      </section>

      {relatedProducts.length > 0 && (
        <section className="related-products-section" aria-labelledby="related-products-title">
          <div className="page-gutter">
            <div className="section-heading related-products-heading">
              <div>
                <span className="eyebrow">DESCUBRE MÁS PRENDAS</span>
                <h2 id="related-products-title">
                  Te puede interesar<span className="coral-dot">.</span>
                </h2>
              </div>
            </div>
          </div>
          <ProductCarousel products={relatedProducts} />
        </section>
      )}
    </section>
  );
}
