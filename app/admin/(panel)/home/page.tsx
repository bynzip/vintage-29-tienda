import type { Metadata } from "next";
import AdminHomeClient from "@/components/admin/AdminHomeClient";

export const metadata: Metadata = {
  title: "Configuración de Portada",
};

export default function AdminHomePage() {
  return <AdminHomeClient />;
}
