import AdminCategoriesClient from "@/components/admin/AdminCategoriesClient";

type CategoryPageProps = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function AdminCategoriesPage({ searchParams }: CategoryPageProps) {
  const params = await searchParams;
  return <AdminCategoriesClient saved={params.saved} error={params.error} />;
}
