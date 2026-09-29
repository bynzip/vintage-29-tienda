import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const CATALOG_SOURCE = path.resolve(process.cwd(), "productos.json");

function mediaUrl(ruta: string): string {
  return "/api/media/" + ruta.split("/").map(encodeURIComponent).join("/");
}

function sortByOrder(photos: any[]) {
  return [...photos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

export async function GET() {
  try {
    const raw = await readFile(CATALOG_SOURCE, "utf8");
    const data = JSON.parse(raw);

    const products = (data.productos ?? []).map((item: any) => {
      const images = sortByOrder(item.fotos ?? []).map((photo: any) => ({
        url: mediaUrl(photo.ruta),
        order: photo.orden,
        lifestyle: Boolean(photo.lifestyle),
      }));
      const cover = images.find((image) => !image.lifestyle) ?? images[0] ?? null;

      return {
        slug: item.slug,
        name: item.nombre,
        cover: cover?.url ?? null,
        images,
      };
    });

    const hero = sortByOrder(data.portada ?? []).map((photo: any) => ({
      url: mediaUrl(photo.ruta),
      order: photo.orden,
    }));

    return NextResponse.json({
      generatedAt: data.generadoEn ?? null,
      total: products.length,
      hero,
      products,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "catalog_unavailable", message: String(error) },
      { status: 502 },
    );
  }
}
