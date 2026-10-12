"use client";

import { useState } from "react";
import Image from "next/image";
import type { CatalogProduct } from "@/lib/catalog/types";
import ProgressiveImage from "@/components/catalog/ProgressiveImage";

export default function ProductGallery({ product }: { product: CatalogProduct }) {
  const images = product.images.filter((image) => image.url);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images.length) {
    return (
      <div className="detail-gallery detail-gallery-placeholder" role="img" aria-label={`Imagen no disponible: ${product.name}`}>
        <span>IMAGEN NO DISPONIBLE</span>
      </div>
    );
  }

  const active = images[activeIndex] ?? images[0];
  return (
    <div className="product-gallery-wrap">
      <div className="detail-thumbnails" aria-label="Galería del producto">
        {images.map((image, index) => (
          <button
            className={`detail-thumbnail${activeIndex === index ? " is-active" : ""}`}
            key={image.url}
            type="button"
            aria-label={`Ver imagen ${index + 1}`}
            aria-pressed={activeIndex === index}
            onClick={() => setActiveIndex(index)}
          >
            <Image src={image.url} alt="" fill quality={58} sizes="58px" />
          </button>
        ))}
      </div>
      <div className="detail-gallery product-gallery-main">
        <ProgressiveImage
          key={active.url}
          src={active.url}
          alt={active.alt || product.name}
          sizes="(max-width: 640px) 100vw, min(68vw, 1000px)"
          quality={78}
          eager
        />
        <span className="detail-image-count">
          {String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
