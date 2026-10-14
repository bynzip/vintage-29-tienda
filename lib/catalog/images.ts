export function withWidth(url: string, width: number, quality?: number): string {
  const params = new URLSearchParams({ w: String(width) });
  if (quality) params.set("q", String(quality));
  return `${url}?${params.toString()}`;
}

export function getImagePreviewUrl(url: string, width = 96, quality = 45): string {
  const params = new URLSearchParams({ url, w: String(width), q: String(quality) });
  return `/_next/image?${params.toString()}`;
}
