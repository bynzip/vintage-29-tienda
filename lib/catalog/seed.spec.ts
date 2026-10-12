import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import source from "../../productos.json";

describe("catálogo inicial de productos", () => {
  it("conserva los 11 productos y slugs únicos del archivo fuente", () => {
    expect(source.productos).toHaveLength(11);
    expect(new Set(source.productos.map((product) => product.slug)).size).toBe(11);
    expect(source.productos.some((product) => product.slug.includes("portada"))).toBe(false);
  });

  it("resuelve las 65 fotos de producto a archivos existentes", () => {
    const photos = source.productos.flatMap((product) => product.fotos);
    expect(photos).toHaveLength(65);
    for (const photo of photos) {
      expect(existsSync(path.join(process.cwd(), "public", photo.ruta))).toBe(true);
    }
  });

  it("mantiene las marcas lifestyle originales", () => {
    expect(source.productos.flatMap((product) => product.fotos).filter((photo) => photo.lifestyle)).toHaveLength(20);
  });
});
