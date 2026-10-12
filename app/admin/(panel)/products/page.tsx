import AdminProductsClient from "@/components/admin/AdminProductsClient";

type ProductsProps = { searchParams: Promise<{ q?: string; category?: string; color?: string; size?: string; fit?: string; saved?: string; error?: string }> };

export default async function AdminProductsPage({ searchParams }: ProductsProps) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().replace(/[^a-zA-Z0-9À-ÿ -]/g, " ").slice(0, 80);
  const catalogId = (value?: string) => value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
  return <AdminProductsClient
    query={query}
    categoryId={catalogId(params.category)}
    colorId={catalogId(params.color)}
    sizeId={catalogId(params.size)}
    fitId={catalogId(params.fit)}
    saved={params.saved}
    error={params.error}
  />;
}
