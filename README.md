# Vintage 29 — Tienda Online

Storefront + panel `/admin` en Next.js 15 + Supabase. El catálogo se lee desde Supabase, no desde archivos locales.

Repo: https://github.com/bynzip/vintage-29-tienda

## Requisitos

- Node.js 22+
- pnpm 10 (`corepack enable` o `npm i -g pnpm`)
- Git
- Un proyecto Supabase ya creado (las credenciales te las pasan por privado en un `.env.local`, no van en git)

## Puesta en marcha (5 min)

```bash
# 1. Clonar y entrar
git clone https://github.com/bynzip/vintage-29-tienda.git
cd vintage-29-tienda

# 2. Copiar el .env que te pasaron por privado a la raíz del proyecto
# Debe quedar como: vintage-29-tienda/.env.local
# (si te pasaron un archivo `.env`, renómbralo a `.env.local`)

# 3. Instalar dependencias
pnpm install

# 4. Correr en desarrollo
pnpm dev
```

Abre:

- Tienda: http://localhost:3000
- Admin: http://localhost:3000/admin (te redirige a `/admin/login` si no hay sesión)

## Variables de entorno

Copia la plantilla y completa:

```bash
cp .env.example .env.local
```

| Variable | Dónde se usa | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador + servidor | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador + servidor | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | solo servidor / seed | `eyJ...` (no exponer) |
| `NEXT_PUBLIC_STORE_NAME` | opcional | `Vintage 29` |
| `NEXT_PUBLIC_STORE_WHATSAPP` | opcional | `51999...` |

> Nunca commitees `.env` ni `.env.local`. Solo `.env.example`.

## Scripts

```bash
pnpm dev            # desarrollo (puerto 3000)
pnpm build          # build producción
pnpm start          # servir build
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm seed:products  # vista previa del seed (lee productos.json, no escribe)
```

Seed real (solo si te lo piden, borra/inserta en tu BD):

```bash
node --env-file=.env.local scripts/seed-products.mjs --apply --confirm-personal-project
```

## Estructura

```text
app/
  (storefront)/      # tienda pública
  admin/             # panel: login + (panel)/products, categories, colors, sizes, fits
components/
  catalog/           # grillas, carruseles, galería, variantes
  admin/             # tablas y formularios del panel
lib/
  catalog/           # lectura de catálogo
  supabase/          # browser/server/middleware/guard
  admin/             # catalog.ts, query-cache, variant-combinations
supabase/
  migrations/        # SQL versionado (lo que se aplica a la BD)
  tests/             # checks SQL
scripts/
  seed-products.mjs  # importa productos.json a Supabase
```

## Supabase

- Las migraciones están en `supabase/migrations/`. Se aplican desde el dashboard de Supabase o con `supabase db push` (requiere Supabase CLI + link al proyecto).
- Auth: el middleware protege `/admin/:path*`. Crea el usuario admin en Supabase Auth y entra por `/admin/login`.
- RLS: la lectura pública del catálogo y la escritura admin dependen de las políticas incluidas en las migraciones.

## Problemas comunes

- **Página en blanco / error Supabase**: revisa que `.env.local` esté en la raíz y que `NEXT_PUBLIC_SUPABASE_URL` y `ANON_KEY` sean correctas. Reinicia `pnpm dev`.
- **`pnpm install` falla**: usa Node 22 (`node -v`) y pnpm 10 (`pnpm -v`).
- **Puerto ocupado**: `pnpm dev -- -p 3001`.
- **Seed no corre**: sin `--apply --confirm-personal-project` solo muestra vista previa, es normal.

## Prompt para IA (pega esto en tu modelo + adjunta el .env.local)

```text
Tengo el repo vintage-29-tienda clonado en ./vintage-29-tienda y ya copié el
.env.local con las credenciales de Supabase en la raíz.

Haz esto en orden y dime qué sale en cada paso:
1. Verifica node -v (>=22) y pnpm -v (>=10).
2. Corre `pnpm install`.
3. Verifica que .env.local tenga NEXT_PUBLIC_SUPABASE_URL,
   NEXT_PUBLIC_SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY (solo dime si
   existen, no muestres sus valores).
4. Corre `pnpm typecheck` y `pnpm test`. Si algo falla, explica el error y
   cómo arreglarlo.
5. Levanta `pnpm dev` en puerto 3000 y dime qué URLs abrir para tienda y admin.
6. No hagas seed ni toques la base de datos salvo que yo te lo pida.

Mi SO es [Windows / Mac / Linux].
```
