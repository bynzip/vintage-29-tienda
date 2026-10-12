import type { Metadata } from "next";
import AdminProductEditorClient from "@/components/admin/AdminProductEditorClient";
import { getImageAssetPaths } from "@/lib/catalog/products";

export const metadata: Metadata = { title: "Editar producto" };
export const dynamic = "force-dynamic";

type EditProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: EditProps) {
  const { id } = await params;
  return <AdminProductEditorClient productId={id} assets={getImageAssetPaths()} />;
}
