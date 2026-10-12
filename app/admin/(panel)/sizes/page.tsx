import AdminCatalogValuesClient, { type CatalogValueKind } from "@/components/admin/AdminCatalogValuesClient";

type PageProps = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function SizesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <AdminCatalogValuesClient kind={"sizes" satisfies CatalogValueKind} saved={params.saved} error={params.error} />;
}
