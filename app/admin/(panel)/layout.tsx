import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/admin/actions";
import { AdminClientProvider } from "@/components/admin/AdminClientProvider";
import { getActiveAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getActiveAdmin();
  if (!user) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/admin/products" className="wordmark">vintage 29<span>®</span></Link>
        <nav aria-label="Administración">
          <Link href="/admin/products">PRODUCTOS</Link>
          <Link href="/admin/categories">CATEGORÍAS</Link>
          <Link href="/admin/colors">COLORES</Link>
          <Link href="/admin/sizes">TALLAS</Link>
          <Link href="/admin/fits">FIT</Link>
          <Link href="/admin/home">PORTADA</Link>
          <Link href="/admin/media">MEDIOS</Link>
          <Link href="/">VER TIENDA</Link>
          <form action={signOutAction}><button type="submit">CERRAR SESIÓN</button></form>
        </nav>
      </header>
      <AdminClientProvider userId={user.id}>{children}</AdminClientProvider>
    </div>
  );
}
