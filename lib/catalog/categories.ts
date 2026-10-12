import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/server";
import type { CategoryRow } from "@/lib/supabase/database.types";

export type MainCategory = Pick<CategoryRow, "id" | "name" | "slug">;

export async function getMainCategories(): Promise<MainCategory[]> {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .is("parent_id", null)
    .neq("slug", "ver-todo")
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data;
}
