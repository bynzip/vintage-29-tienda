"use client";

import { useState } from "react";
import Image from "next/image";
import { getImagePreviewUrl } from "@/lib/catalog/images";

type ProgressiveImageProps = {
  src: string;
  alt?: string;
  sizes: string;
  eager?: boolean;
  quality?: number;
  previewWidth?: number;
  previewQuality?: number;
  onReady?: () => void;
};

/**
 * Imagen con carga progresiva (LQIP): muestra al instante una versión diminuta
 * y difuminada, y la reemplaza por la definitiva cuando termina de cargar.
 */
export default function ProgressiveImage({
  src,
  alt = "",
  sizes,
  eager = false,
  quality = 85,
  previewWidth = 96,
  previewQuality = 45,
  onReady,
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);
  const previewSrc = getImagePreviewUrl(src, previewWidth, previewQuality);

  return (
    <span className="pimg pimg-progressive">
      <img
        className={`pimg-preview${loaded ? " is-hidden" : ""}`}
        src={previewSrc}
        alt=""
        aria-hidden="true"
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={eager ? "high" : "auto"}
      />
      <Image
        fill
        className={`pimg-full${loaded ? " is-loaded" : ""}`}
        src={src}
        alt={alt}
        sizes={sizes}
        quality={quality}
        priority={eager}
        onLoad={() => {
          setLoaded(true);
          onReady?.();
        }}
      />
    </span>
  );
}
