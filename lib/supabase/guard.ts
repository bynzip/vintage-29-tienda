export function isApprovedSupabaseUrl(url: string, personalProjectConfirmed: boolean) {
  try {
    const parsed = new URL(url);
    const isLocal =
      parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    return isLocal || (parsed.protocol === "https:" && personalProjectConfirmed);
  } catch {
    return false;
  }
}
