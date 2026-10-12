"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog/types";

type ProductCardProps = {
  product: CatalogProduct;
  imageSizes?: string;
};

export default function ProductCard({
  product,
  imageSizes = "(max-width: 640px) 50vw, (max-width: 900px) 50vw, 25vw",
}: ProductCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [alternateRequested, setAlternateRequested] = useState(false);
  const [alternateLoaded, setAlternateLoaded] = useState(false);
  const [alternateFailed, setAlternateFailed] = useState(false);
  const [primaryFailed, setPrimaryFailed] = useState(false);
  const cover = product.cover || product.images.find((image) => image.url)?.url || "";
  const alternate = product.images.find((image) => image.url && image.url !== cover)?.url;
  const hasAlternate = Boolean(alternate && !alternateFailed);
  const priceLabel = product.price != null && product.price > 0
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(product.price)
    : null;

  return (
    <article className={`catalog-product-card${hasAlternate ? " has-alternate" : ""}${hasAlternate && alternateLoaded ? " alternate-ready" : ""}`}>
      <div className="catalog-product-media">
        <Link
          className="catalog-product-image-link"
          href={`/products/${product.slug}`}
          aria-label={`Ver ${product.name}`}
          onMouseEnter={() => {
            if (hasAlternate) setAlternateRequested(true);
          }}
          onFocus={() => {
            if (hasAlternate) setAlternateRequested(true);
          }}
        >
          {cover && !primaryFailed ? (
            <>
              <Image
                className="catalog-product-image catalog-product-image--primary"
                src={cover}
                alt=""
                loading="lazy"
                fill
                quality={90}
                sizes={imageSizes}
                onError={() => setPrimaryFailed(true)}
              />
              {hasAlternate && alternate && (
                <Image
                  className="catalog-product-image catalog-product-image--alternate"
                  src={alternate}
                  alt=""
                  loading={alternateRequested ? "eager" : "lazy"}
                  fill
                  quality={90}
                  sizes={imageSizes}
                  onLoad={() => setAlternateLoaded(true)}
                  onError={() => {
                    setAlternateFailed(true);
                    setAlternateLoaded(false);
                  }}
                />
              )}
            </>
          ) : (
            <div className="catalog-placeholder" aria-hidden="true" />
          )}
        </Link>
      </div>

      <div className="catalog-product-info">
        <div className="catalog-product-heading">
          <h3>
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          <button
            className={`catalog-product-favorite${isFavorite ? " is-active" : ""}`}
            type="button"
            aria-label={isFavorite ? `Quitar ${product.name} de favoritos` : `Añadir ${product.name} a favoritos`}
            aria-pressed={isFavorite}
            onClick={() => setIsFavorite((favorite) => !favorite)}
          >
            <Heart size={20} strokeWidth={1.5} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        {priceLabel && <p className="catalog-product-price">{priceLabel}</p>}
        {!!product.colors?.length && (
          <div className="catalog-product-colors" role="group" aria-label={`Colores disponibles para ${product.name}`}>
            {product.colors.map((color, index) => (
              <span
                className={`catalog-product-color${index === 0 ? " catalog-product-color--selected" : ""}`}
                key={color.name}
                role="img"
                aria-label={color.name}
                title={color.name}
                style={{ backgroundColor: color.hexColor ?? "#f0ede8" }}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
