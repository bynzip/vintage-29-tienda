import type { Metadata } from "next";
import AdminMediaClient from "@/components/admin/AdminMediaClient";

export const metadata: Metadata = {
  title: "Biblioteca de Medios",
};

export default function AdminMediaPage() {
  return <AdminMediaClient />;
}
