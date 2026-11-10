import { describe, expect, it } from "vitest";
import { isProjectMediaUrl, replaceMediaReferences } from "./media-references.mjs";

describe("referencias de medios durante la migración", () => {
  it("reconoce archivos del proyecto de origen y conserva enlaces externos", () => {
    const origin = "https://origen.supabase.co";
    const oldUrl = `${origin}/storage/v1/object/public/catalog-media/banner.jpg`;
    const newUrl = "https://destino.supabase.co/storage/v1/object/public/catalog-media/banner.jpg";
    expect(isProjectMediaUrl(oldUrl, origin)).toBe(true);
    expect(isProjectMediaUrl("https://ejemplo.com/campana", origin)).toBe(false);
    expect(isProjectMediaUrl("#productos", origin)).toBe(false);
    const tables = {
      categories: [{ image_path: oldUrl }],
      product_media: [{ asset_path: oldUrl }],
      home_slides: [{ media_url: oldUrl, href: "#productos" }],
      home_banners: [{ image_url: oldUrl, href: oldUrl }],
    };
    replaceMediaReferences(tables, new Map([[oldUrl, newUrl]]));
    expect(tables.categories[0].image_path).toBe(newUrl);
    expect(tables.product_media[0].asset_path).toBe(newUrl);
    expect(tables.home_slides[0]).toEqual({ media_url: newUrl, href: "#productos" });
    expect(tables.home_banners[0]).toEqual({ image_url: newUrl, href: newUrl });
  });
});
