# Vintage 29 — Storefront

Tienda online de ropa de mujer, integrada con **Odoo 14 Community** (catálogo, stock,
ventas) y **Culqi** (pagos). Este repositorio contiene el **storefront** (React/Next.js).

La planificación completa está en `../docs` (empezar por `00-indice.md` y `02-arquitectura.md`).

## Stack

- **Next.js (App Router) + React 19 + TypeScript**
- **Tailwind CSS 4** + Radix UI (librería de componentes en `components/ui`)
- **Zod** para validación
- **Vitest** para pruebas
- **pnpm** como gestor de paquetes

## Alcance actual

De momento el foco es **diseño y frontend**. El catálogo es de **datos mock**
(`lib/products.ts`). Las integraciones (Odoo, Culqi, caché) están **preparadas pero sin
implementar**: route handlers y `lib/odoo`, `lib/culqi` contienen los esqueletos con `TODO`.

## Estructura

```
app/
  layout.tsx            Layout raíz (metadata, proveedores)
  providers.tsx         QueryClient + Tooltip + Toaster (cliente)
  (storefront)/         Grupo con header/footer/carrito
    page.tsx            Home
    products/[slug]/    Detalle de producto
    collections/[slug]/ Catálogo por colección
    search/  search/[query]/
    account/ favorites/ checkout/ pages/[slug]/
  api/                  Route handlers (BFF)
    ping/
    checkout/init/  checkout/pay/
    webhooks/culqi/
    cron/sync-catalog/  cron/retry-orders/
components/
  StorefrontLayout.tsx  Header + footer + contexto de bolsa/favoritos
  ProductCard.tsx
  pages/                Componentes de página (client)
  ui/                   Librería shadcn/ui (client)
lib/
  products.ts           Catálogo mock (temporal)
  types.ts              Esquema canónico (docs/02 §7)
  env.ts                Variables de entorno de servidor
  odoo/                 client.ts, catalog.ts, sales.ts, shipping.ts, mappers.ts
  culqi/client.ts
hooks/
```

## Comandos

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm start
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm format.fix
```

## Convenciones

- Alias `@/*` apunta a la raíz del proyecto (`@/components`, `@/lib`, ...).
- Componentes que usan hooks/estado/contexto → `"use client"`. Páginas del storefront ya lo son.
- Toda credencial (Odoo, Culqi, DB) vive **solo en el servidor** y en variables de entorno.
  No importar `lib/env.ts` ni `lib/odoo`/`lib/culqi` desde el cliente.
- El conocimiento de Odoo se concentra en `lib/odoo` (el resto habla el esquema canónico).

## Documentación de referencia

| Doc | Tema |
|-----|------|
| `../docs/02-arquitectura.md` | Arquitectura, estructura de carpetas, env |
| `../docs/03-integracion-odoo-catalogo.md` | Catálogo, variantes, stock, sync |
| `../docs/04-integracion-odoo-ventas.md` | Clientes, pedidos, comprobantes |
| `../docs/05-integracion-odoo-envios.md` | Envíos y tarifas |
| `../docs/06-integracion-culqi.md` | Pagos |
| `../docs/09-registros-necesarios-integracion.md` | Credenciales y permisos |
