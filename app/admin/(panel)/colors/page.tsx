import AdminCatalogValuesClient, { type CatalogValueKind } from "@/components/admin/AdminCatalogValuesClient";

type PageProps = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function ColorsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <AdminCatalogValuesClient kind={"colors" satisfies CatalogValueKind} saved={params.saved} error={params.error} />;
}
