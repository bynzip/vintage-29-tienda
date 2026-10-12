"use client";

import { useEffect } from "react";

export default function HomeHeaderController() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    const overlay = document.querySelector<HTMLElement>(".home-overlay-content");
    if (!header || !overlay) return;

    let frame: number | null = null;
    const updateHeader = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        const transitionDistance = Math.max(header.offsetHeight * 3, 160);
        const transitionStart = header.offsetHeight + transitionDistance;
        const overlayTop = overlay.getBoundingClientRect().top;
        const progress = Math.min(1, Math.max(0, (transitionStart - overlayTop) / transitionDistance));
        const foregroundChannel = Math.round(255 + (23 - 255) * progress);

        header.style.setProperty(
          "--home-header-foreground",
          `rgb(${foregroundChannel}, ${foregroundChannel}, ${foregroundChannel})`,
        );
        header.style.setProperty("--home-header-background", `rgba(255, 255, 255, ${progress})`);
        header.style.setProperty("--home-header-border", `rgba(23, 23, 23, ${progress})`);
      });
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    window.addEventListener("resize", updateHeader);

    return () => {
      window.removeEventListener("scroll", updateHeader);
      window.removeEventListener("resize", updateHeader);
      if (frame !== null) window.cancelAnimationFrame(frame);
      header.style.removeProperty("--home-header-foreground");
      header.style.removeProperty("--home-header-background");
      header.style.removeProperty("--home-header-border");
    };
  }, []);

  return null;
}
