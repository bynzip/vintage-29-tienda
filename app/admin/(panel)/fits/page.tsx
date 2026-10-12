import AdminCatalogValuesClient, { type CatalogValueKind } from "@/components/admin/AdminCatalogValuesClient";

type PageProps = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function FitsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <AdminCatalogValuesClient kind={"fits" satisfies CatalogValueKind} saved={params.saved} error={params.error} />;
}
