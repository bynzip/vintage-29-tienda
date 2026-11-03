# Vintage 29 — Catálogo y administración

Hito actual: mostrar productos correctamente desde Supabase y administrarlos bajo `/admin`. Next.js 15.5.28, React, TypeScript y Supabase Auth/PostgreSQL/Storage. Pagos, pedidos, Culqi y Odoo pertenecen a la siguiente fase. El buscador público, filtros, carrito y favoritos persistentes también quedan para esa fase de frontend.

## Inicio

Requisitos: Node 22, pnpm 10.14 y un proyecto Supabase propio con las migraciones actuales. Docker Desktop es necesario para la verificación completa local, no para ejecutar la app contra un proyecto remoto.

```sh
pnpm install --frozen-lockfile
# Copia .env.example a .env.local y completa el proyecto propio.
pnpm dev
```

Las variables obligatorias son `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y, para un proyecto HTTPS remoto, `SUPABASE_PERSONAL_PROJECT_CONFIRMED=true`. La URL y clave pública se incorporan al build: cambiar de proyecto exige reiniciar desarrollo o recompilar y desplegar. `NEXT_PUBLIC_SITE_URL` configura canonical/sitemap. La clave `SUPABASE_SERVICE_ROLE_KEY` se usa exclusivamente en scripts de transferencia/seed; el servidor de la tienda no la necesita.

No compartas archivos de entorno ni sus valores. El alta de admin se hace en Supabase Auth y mediante `admin_profiles`; no hay registro público. Ver instrucciones en [supabase/README.md](supabase/README.md).

## Comprobaciones

```sh
pnpm typecheck
pnpm test
pnpm build
# Docker activo: instala DOS proyectos locales aislados y los reinicia.
pnpm db:verify --with-app
```

La verificación completa prueba todas las migraciones desde una base vacía, RLS/RPC, seeds repetibles, exportación e importación en otro proyecto local, copia de archivos Storage y cambio de URLs, tipos generados, build y acceso HTTP anónimo/admin/revocado. No utiliza `.env.local` ni bases enlazadas de nube. Sus datos, credenciales locales y logs se guardan en `.verification/`, ignorado por Git.

Los proyectos de prueba son `vintage-29-catalog-review` (API 56321/DB 56322) y `vintage-29-catalog-restore` (API 57321/DB 57322). Para detenerlos conservando sus volúmenes:

```sh
pnpm exec supabase stop --workdir .verification
pnpm exec supabase stop --workdir .verification/target
```

Para regenerar tipos después de modificar migraciones:

```sh
pnpm db:verify --update-types
```

La CI ejecuta el mismo verificador. Las pruebas no cubren todavía una inspección visual completa ni el hosting real.

## Nueva base y migración del catálogo

Lee [la guía de Supabase](supabase/README.md) antes de cambiar las credenciales. Cambiar únicamente `.env.local` no crea tablas, copia archivos ni aprovisiona el usuario admin.

- Proyecto nuevo sin conservar catálogo: aplicar todas las migraciones y usar el seed de borradores si se desean los 11 productos fuente.
- Proyecto nuevo conservando catálogo: exportar desde el origen, aplicar migraciones al destino vacío e importar el catálogo y sus archivos. El importador conserva IDs y referencias, adapta URLs de Storage y rechaza sobrescrituras.

```sh
# Solo vista previa; no conecta a ninguna base.
pnpm seed:products
# Escribe borradores sin precios, categorías ni variantes inventados.
node --env-file=.env.local scripts/seed-products.mjs --apply --confirm-personal-project
# Solo pruebas: productos publicados, precios y existencias FICTICIOS.
node --env-file=.env.local scripts/seed-products.mjs --apply --demo --confirm-personal-project
```

## Estructura

- `app/(storefront)`: landing y ficha; `app/admin`: acceso y panel.
- `lib/catalog`: consultas públicas, DTO, validación y precios.
- `lib/admin`: carga del editor y caché por usuario.
- `lib/supabase/database.generated.ts`: tipos generados desde PostgreSQL.
- `supabase/migrations`: historial completo y migraciones de cierre del catálogo.
- `supabase/tests`: pruebas de permisos, publicación, concurrencia optimista e integridad.
- `scripts/verify-catalog.mjs`: instalación y transferencia reproducibles entre dos proyectos locales.
- `scripts/transfer-catalog.mjs`: exportación/importación de datos y archivos, sin cuentas Auth ni secretos.

Las migraciones históricas permanecen para entornos que ya las aplicaron. El esquema final elimina las tablas de opciones/atributos genéricos, colecciones, medidas, materiales y marcas que el catálogo actual no utiliza. No ejecutes `db reset` sobre una base de negocio.
