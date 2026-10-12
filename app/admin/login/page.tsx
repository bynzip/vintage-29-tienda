import type { Metadata } from "next";
import Link from "next/link";
import { signInAction } from "@/app/admin/actions";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Acceso administrador" };

type LoginProps = { searchParams: Promise<{ error?: string }> };

const errors: Record<string, string> = {
  "not-configured": "Configura la conexión Supabase de tu proyecto para iniciar sesión.",
  credentials: "No pudimos validar estas credenciales.",
  unauthorized: "Esta cuenta no tiene permisos de administración activos.",
};

export default async function AdminLoginPage({ searchParams }: LoginProps) {
  const { error } = await searchParams;
  const configured = hasSupabaseConfig();
  return (
    <main className="admin-login-page">
      <Link href="/" className="wordmark" aria-label="Volver a Vintage 29">
        vintage 29<span>®</span>
      </Link>
      <section className="admin-login-card">
        <span className="eyebrow">ÁREA PRIVADA</span>
        <h1>Hola de nuevo.</h1>
        <p>Inicia sesión para administrar el catálogo de Vintage 29.</p>
        {!configured && (
          <p className="admin-alert" role="status">
            Supabase aún no está configurado. La tienda pública seguirá mostrando el estado de configuración.
          </p>
        )}
        {error && errors[error] && <p className="admin-alert" role="alert">{errors[error]}</p>}
        <form action={signInAction} className="admin-form">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button className="dark-button" type="submit" disabled={!configured}>INICIAR SESIÓN</button>
        </form>
        <Link className="admin-back-link" href="/">Volver a la tienda</Link>
      </section>
    </main>
  );
}
