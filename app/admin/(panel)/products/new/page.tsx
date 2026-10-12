import type { Metadata } from "next";
import AdminProductEditorClient from "@/components/admin/AdminProductEditorClient";
import { getImageAssetPaths } from "@/lib/catalog/products";

export const metadata: Metadata = { title: "Nuevo producto" };

export default function NewProductPage() {
  return <AdminProductEditorClient assets={getImageAssetPaths()} />;
}
