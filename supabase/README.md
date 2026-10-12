# Supabase de Vintage 29

El catálogo final usa productos padre, opciones, variantes/SKU, precios por lista,
media de producto y variante, categorías, colecciones, tallas e inventario por
variante y almacén. Los pedidos futuros deberán referenciar `product_variants.id`.

## Desarrollo local

1. Instala Docker Desktop y deja iniciado el motor Docker.
2. Desde `tienda/`, ejecuta `pnpm dlx supabase start` para levantar Supabase local.
3. Aplica las migraciones locales con `pnpm dlx supabase db reset`.
4. Ejecuta las pruebas RLS con `pnpm dlx supabase test db`.
5. `pnpm seed:products` muestra el plan del catálogo y no escribe nada.

La migración `202610040002_final_catalog.sql` reemplaza las tablas de la demo por el esquema final del catálogo. Conserva el perfil admin, pero elimina los datos de catálogo anteriores porque esta operación se realiza antes de tener ventas reales. Las migraciones `202610050001`–`202610050003` mantienen estables las variantes e historiales durante las ediciones, publican únicamente disponibilidad agregada y evitan la ambigüedad de columnas en el guardado RPC. El seed crea datos de prueba enriquecidos: 11 productos, variantes, precios, stock, tallas y media real del repositorio.

## Proyecto personal de Supabase

Configura `.env.local` a partir de `.env.example` usando la URL y la clave anon de un proyecto Supabase que pertenezca al equipo. El storefront y admin rechazan conexiones HTTPS remotas mientras `SUPABASE_PERSONAL_PROJECT_CONFIRMED` no sea `true`, así que una configuración remota heredada no se usa accidentalmente. Activa esa variable solo después de verificar que la URL corresponde a tu proyecto. No reutilices credenciales de otra persona. Nunca pongas la clave `service_role` en una variable `NEXT_PUBLIC_*`.

Antes de aplicar migraciones o carga remota, confirma que esas variables apuntan al proyecto personal. Después, con esa confirmación, aplica la migración versionada desde `tienda/`:

```sh
pnpm dlx supabase link --project-ref <referencia-del-proyecto-personal>
pnpm dlx supabase db push
```

Para ejecutar la prueba funcional de valores de catálogo contra el proyecto enlazado:

```sh
pnpm dlx supabase db query --linked --file supabase/catalog_value_status_smoke.sql
```

La prueba verifica renombrado, desactivación, productos afectados, limpieza de categoría y reactivación dentro de una transacción que termina con `ROLLBACK`; no conserva sus registros de prueba.

En Supabase Auth, mantén deshabilitado el registro público y crea/invita la cuenta autorizada desde el panel del proyecto. Para conceder permisos, inserta el UUID de esa cuenta en `public.admin_profiles` desde el SQL Editor de ese mismo proyecto:

```sql
insert into public.admin_profiles (user_id, role, is_active)
values ('<uuid-del-usuario-auth>', 'admin', true);
```

El alta del perfil es una operación privilegiada; no se ofrece en la aplicación.

## Carga inicial

La vista previa valida los 11 productos, slugs repetidos y rutas de imágenes:

```sh
pnpm seed:products
```

El seed remoto requiere credenciales privadas configuradas en el entorno del proceso, `SUPABASE_PERSONAL_PROJECT_CONFIRMED=true` y dos confirmaciones explícitas del operador:

```sh
pnpm seed:products -- --apply --confirm-personal-project
```

No se ejecuta el modo de aplicación hasta confirmar con la propietaria que el entorno apunta a su proyecto personal. No borra ni reemplaza productos, precios, descripciones, estados o imágenes que ya existan.
