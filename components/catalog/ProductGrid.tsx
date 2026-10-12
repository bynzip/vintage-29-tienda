import ProductCard from "@/components/ProductCard";
import type { CatalogProduct } from "@/lib/catalog/types";

export default function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
