import { describe, expect, it } from "vitest";
import {
  isCatalogMediaUrl,
  isSafeLink,
  matchesMediaSignature,
} from "./validation";
import { isCurrentPrice } from "./pricing";

describe("límites públicos del catálogo", () => {
  const project = "https://own.supabase.co";
  it("solo admite imágenes locales seguras y el bucket del proyecto configurado", () => {
    expect(isCatalogMediaUrl("/imagenes/Prenda/foto 1.jpg", project)).toBe(
      true,
    );
    expect(
      isCatalogMediaUrl(
        `${project}/storage/v1/object/public/catalog-media/a.jpg`,
        project,
      ),
    ).toBe(true);
    for (const url of [
      "/imagenes/../secret.jpg",
      "//otro.com/a.jpg",
      "javascript:alert(1)",
      "https://other.supabase.co/storage/v1/object/public/catalog-media/a.jpg",
      `${project}/storage/v1/object/public/private/a.jpg`,
    ]) {
      expect(isCatalogMediaUrl(url, project)).toBe(false);
    }
  });
  it("rechaza enlaces ejecutables y formatos cuyo MIME no corresponde a su contenido", () => {
    expect(isSafeLink("javascript:alert(1)")).toBe(false);
    expect(isSafeLink("//evil.invalid")).toBe(false);
    expect(isSafeLink("/productos")).toBe(true);
    expect(
      matchesMediaSignature(new TextEncoder().encode("<svg>"), "image/png"),
    ).toBe(false);
    expect(
      matchesMediaSignature(Uint8Array.from([255, 216, 255, 0]), "image/jpeg"),
    ).toBe(true);
  });
  it("no usa precios vencidos, futuros ni desactivados", () => {
    const now = Date.parse("2026-10-27T12:00:00Z");
    expect(isCurrentPrice({ is_active: true }, now)).toBe(true);
    expect(
      isCurrentPrice({ is_active: true, ends_at: "2026-10-27T12:00:00Z" }, now),
    ).toBe(false);
    expect(
      isCurrentPrice(
        { is_active: true, starts_at: "2026-11-01T00:00:00Z" },
        now,
      ),
    ).toBe(false);
    expect(isCurrentPrice({ is_active: false }, now)).toBe(false);
  });
});
