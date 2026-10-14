import type { Metadata } from "next";
import AdminProductEditorClient from "@/components/admin/AdminProductEditorClient";
import { getAvailableMediaAssets } from "@/lib/catalog/products";

export const metadata: Metadata = { title: "Editar producto" };
export const dynamic = "force-dynamic";

type EditProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: EditProps) {
  const { id } = await params;
  const assets = await getAvailableMediaAssets();
  return <AdminProductEditorClient productId={id} assets={assets} />;
}
