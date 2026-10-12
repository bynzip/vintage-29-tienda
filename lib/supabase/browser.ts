import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * The admin server layout verifies the approved project and admin session
 * before any admin screen is rendered. Browser reads then use the public key
 * and remain protected by the same Postgres RLS policies as server reads.
 */
export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  browserClient = createBrowserClient<Database>(url, anonKey);
  return browserClient;
}
