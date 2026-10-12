import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "./database.types";
import { isApprovedSupabaseUrl } from "./guard";

export function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      anonKey &&
      isApprovedSupabaseUrl(
        url,
        process.env.SUPABASE_PERSONAL_PROJECT_CONFIRMED === "true",
      ),
  );
}

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabaseConfig() || !url || !anonKey) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies; middleware/server actions refresh them.
        }
      },
    },
  });
}

export function createSupabasePublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabaseConfig() || !url || !anonKey) return null;
  return createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const getActiveAdmin = cache(async () => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { supabase, user: null };

  const { data: profile, error } = await supabase
    .from("admin_profiles")
    .select("user_id, role, is_active")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin" || !profile.is_active) {
    return { supabase, user: null };
  }
  return { supabase, user: authData.user };
});
