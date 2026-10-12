import { describe, expect, it } from "vitest";
import { isApprovedSupabaseUrl } from "./guard";

describe("protección del proyecto Supabase", () => {
  it("permite Supabase local y bloquea proyectos remotos sin confirmación", () => {
    expect(isApprovedSupabaseUrl("http://127.0.0.1:55321", false)).toBe(true);
    expect(isApprovedSupabaseUrl("https://project.supabase.co", false)).toBe(false);
    expect(isApprovedSupabaseUrl("http://project.supabase.co", true)).toBe(false);
  });

  it("permite HTTPS remoto solo después de la confirmación personal", () => {
    expect(isApprovedSupabaseUrl("https://project.supabase.co", true)).toBe(true);
    expect(isApprovedSupabaseUrl("nota-una-url", true)).toBe(false);
  });
});
