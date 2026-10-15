import type { Metadata } from "next";
import AdminHomeClient from "@/components/admin/AdminHomeClient";

export const metadata: Metadata = {
  title: "Configuración de Home",
};

export default function AdminHomePage() {
  return <AdminHomeClient />;
}
