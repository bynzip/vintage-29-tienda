import type { Metadata } from "next";
import AdminProductEditorClient from "@/components/admin/AdminProductEditorClient";
import { getAvailableMediaAssets } from "@/lib/catalog/products";

export const metadata: Metadata = { title: "Nuevo producto" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const assets = await getAvailableMediaAssets();
  return <AdminProductEditorClient assets={assets} />;
}
