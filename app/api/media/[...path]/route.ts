import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MEDIA_ROOT = path.resolve(process.cwd(), "public");
const DISK_CACHE_DIR = path.resolve(process.cwd(), ".image-cache");

const PASSTHROUGH: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

const CACHE_HEADERS = {
  // Caché corta en el navegador durante la fase de diseño.
  "Cache-Control": "public, max-age=300",
};

// Caché 1: en memoria del proceso (instantánea dentro de una misma sesión).
type CachedImage = { body: BodyInit; type: string };
const memoryCache = new Map<string, CachedImage>();
const MEMORY_LIMIT = 200;

function getMemory(key: string): CachedImage | undefined {
  const hit = memoryCache.get(key);
  if (!hit) return undefined;
  memoryCache.delete(key);
  memoryCache.set(key, hit);
  return hit;
}

function setMemory(key: string, value: CachedImage) {
  if (memoryCache.size >= MEMORY_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, value);
}

// Caché 2: en disco (sobrevive reinicios). Se invalida sola si cambia el archivo
// de origen (mtime) o los parámetros de transformación.
async function getDisk(key: string): Promise<Buffer | null> {
  try {
    return await readFile(path.join(DISK_CACHE_DIR, key));
  } catch {
    return null;
  }
}

async function setDisk(key: string, body: Buffer): Promise<void> {
  try {
    await mkdir(DISK_CACHE_DIR, { recursive: true });
    await writeFile(path.join(DISK_CACHE_DIR, key), body);
  } catch {
    // La caché es best-effort: si falla, seguimos sin ella.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const target = path.resolve(MEDIA_ROOT, segments.join("/"));
  const relative = path.relative(MEDIA_ROOT, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let info;
  try {
    info = await stat(target);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const extension = path.extname(target).toLowerCase();
  const search = new URL(request.url).searchParams;
  const width = clamp(Number(search.get("w")) || 1080, 16, 3200);
  const quality = clamp(Number(search.get("q")) || 72, 20, 90);

  const key = createHash("sha1")
    .update(`${relative}|${info.mtimeMs}|${width}|${quality}|${extension}`)
    .digest("hex");
  const diskFile = `${key}.webp`;

  const inMemory = getMemory(key);
  if (inMemory) {
    return new NextResponse(inMemory.body, {
      headers: { "Content-Type": inMemory.type, ...CACHE_HEADERS },
    });
  }

  if (!PASSTHROUGH[extension]) {
    const fromDisk = await getDisk(diskFile);
    if (fromDisk) {
      const body = new Uint8Array(fromDisk);
      setMemory(key, { body, type: "image/webp" });
      return new NextResponse(body, {
        headers: { "Content-Type": "image/webp", ...CACHE_HEADERS },
      });
    }
  }

  let file: Buffer;
  try {
    file = await readFile(target);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  if (PASSTHROUGH[extension]) {
    const body = new Uint8Array(file);
    setMemory(key, { body, type: PASSTHROUGH[extension] });
    return new NextResponse(body, {
      headers: { "Content-Type": PASSTHROUGH[extension], ...CACHE_HEADERS },
    });
  }

  try {
    const optimized = await sharp(file)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    await setDisk(diskFile, optimized);
    const body = new Uint8Array(optimized);
    setMemory(key, { body, type: "image/webp" });
    return new NextResponse(body, {
      headers: { "Content-Type": "image/webp", ...CACHE_HEADERS },
    });
  } catch {
    const body = new Uint8Array(file);
    return new NextResponse(body, {
      headers: { "Content-Type": "application/octet-stream", ...CACHE_HEADERS },
    });
  }
}
