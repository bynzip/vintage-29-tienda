"use client";

import { useState } from "react";

type ProgressiveImageProps = {
  src: string;
  previewSrc: string;
  alt?: string;
  eager?: boolean;
  onReady?: () => void;
};

/**
 * Imagen con carga progresiva (LQIP): muestra al instante una versión diminuta
 * y difuminada, y la reemplaza por la definitiva cuando termina de cargar.
 */
export default function ProgressiveImage({
  src,
  previewSrc,
  alt = "",
  eager = false,
  onReady,
}: ProgressiveImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="pimg">
      <img
        className={`pimg-preview${loaded ? " is-hidden" : ""}`}
        src={previewSrc}
        alt=""
        aria-hidden="true"
        onLoad={onReady}
      />
      <img
        className={`pimg-full${loaded ? " is-loaded" : ""}`}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}
