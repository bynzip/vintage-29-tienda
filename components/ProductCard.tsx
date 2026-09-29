"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import {
  productImage,
  withWidth,
  type CatalogProduct,
} from "@/lib/api/catalog";
import { useStorefront } from "@/components/StorefrontLayout";

const CARD_WIDTH = 720;

export default function ProductCard({ product }: { product: CatalogProduct }) {
  const { favorites, toggleFavorite, addToBag } = useStorefront();
  const favorite = favorites.includes(product.slug);
  const cover = productImage(product);

  const alternate = useMemo(() => {
    const others = product.images.filter((image) => image.url !== cover);
    if (!others.length) return null;
    return others[Math.floor(Math.random() * others.length)].url;
  }, [product.slug]);

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <Link
          className="product-image-link"
          href={`/products/${product.slug}`}
          aria-label={`Ver ${product.name}`}
        >
          {cover ? (
            <img
              className="catalog-cover"
              src={withWidth(cover, CARD_WIDTH)}
              alt={product.name}
              loading="lazy"
            />
          ) : (
            <div className="catalog-cover catalog-placeholder" />
          )}
        </Link>
        {alternate && (
          <img
            className="catalog-alt"
            src={withWidth(alternate, CARD_WIDTH)}
            alt=""
            loading="lazy"
          />
        )}
        <button
          className={`favorite-button${favorite ? " is-favorite" : ""}`}
          aria-label={`${favorite ? "Quitar" : "Añadir"} ${product.name} ${favorite ? "de" : "a"} favoritos`}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(product.slug)}
        >
          <Heart
            size={19}
            strokeWidth={1.6}
            fill={favorite ? "currentColor" : "none"}
          />
        </button>
        <button className="quick-add" onClick={() => addToBag(product)}>
          AÑADIR RÁPIDO <span>+</span>
        </button>
      </div>
      <div className="product-info">
        <div>
          <h3>
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          <p>{product.images.length} fotos</p>
        </div>
      </div>
    </article>
  );
}
