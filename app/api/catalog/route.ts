import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const isConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("https://"),
);

type DbImage = { url: string; order: number; lifestyle: boolean };

function normalizeImages(raw: unknown): DbImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((image, idx) => {
      if (typeof image === "string") {
        return { url: image, order: idx + 1, lifestyle: false };
      }
      if (image && typeof image === "object" && "url" in image) {
        const item = image as { url: string; order?: number; lifestyle?: boolean };
        return { url: item.url, order: item.order ?? idx + 1, lifestyle: Boolean(item.lifestyle) };
      }
      return null;
    })
    .filter((image): image is DbImage => image !== null)
    .sort((a, b) => a.order - b.order);
}

export async function GET() {
  if (!isConfigured) {
    return NextResponse.json(
      {
        error: "supabase_not_configured",
        message:
          "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY y ejecuta la importación (pnpm import:catalog).",
      },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  try {
    const [productsRes, slidesRes] = await Promise.all([
      supabase.from("products").select("*").eq("is_published", true).order("id", { ascending: true }),
      supabase
        .from("hero_slides")
        .select("*")
        .eq("is_published", true)
        .eq("zone", "main")
        .order("order_index", { ascending: true }),
    ]);

    if (productsRes.error) throw productsRes.error;

    const products = productsRes.data ?? [];
    const ids = products.map((product) => product.id);

    const variantsByProduct = new Map<string, { sku: string; size: string; color: string; available: number }[]>();
    if (ids.length) {
      const { data: variants, error: vErr } = await supabase
        .from("product_variants")
        .select("product_id, sku, size, color, stock_online_qty, reserved_qty, sold_qty")
        .in("product_id", ids)
        .eq("is_active", true)
        .order("id", { ascending: true });
      if (vErr) throw vErr;

      (variants ?? []).forEach((v) => {
        const key = String(v.product_id);
        const list = variantsByProduct.get(key) ?? [];
        list.push({
          sku: v.sku,
          size: v.size,
          color: v.color,
          available: (v.stock_online_qty ?? 0) - (v.sold_qty ?? 0) - (v.reserved_qty ?? 0),
        });
        variantsByProduct.set(key, list);
      });
    }

    const mapped = products.map((product) => {
      const images = normalizeImages(product.images);
      const cover = images.find((image) => !image.lifestyle) ?? images[0] ?? null;
      return {
        slug: product.slug,
        name: product.name,
        description: product.description ?? "",
        category: product.category,
        price: Number(product.price),
        cover: cover?.url ?? null,
        images,
        variants: variantsByProduct.get(String(product.id)) ?? [],
      };
    });

    const hero = (slidesRes.data ?? []).map((slide) => ({
      url: slide.media_url,
      order: slide.order_index,
    }));

    return NextResponse.json({
      source: "supabase",
      generatedAt: new Date().toISOString(),
      total: mapped.length,
      hero,
      products: mapped,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "catalog_unavailable", message: String(error) },
      { status: 502 },
    );
  }
}
