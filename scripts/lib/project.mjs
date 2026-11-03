import { createClient } from "@supabase/supabase-js";

export function projectClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Faltan URL y clave privada. Carga el archivo de entorno explícitamente con node --env-file.",
    );
  const parsed = new URL(url);
  const local =
    parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (
    !local &&
    (parsed.protocol !== "https:" ||
      process.env.SUPABASE_PERSONAL_PROJECT_CONFIRMED !== "true")
  ) {
    throw new Error(
      "Confirma el proyecto propio mediante SUPABASE_PERSONAL_PROJECT_CONFIRMED=true.",
    );
  }
  if (!process.argv.includes("--confirm-personal-project"))
    throw new Error("Falta --confirm-personal-project.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function checked(request) {
  const { data, error } = await request;
  if (error)
    throw new Error(`${error.code ?? "DATABASE_ERROR"}: ${error.message}`);
  return data;
}
