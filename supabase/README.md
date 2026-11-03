# Supabase — Hito de catálogo

## Contrato actual

El esquema final tiene 19 tablas de aplicación: perfiles admin; categorías; colores, tallas y fits; productos; relaciones producto/color y producto/talla; variantes; listas y precios; almacenes, saldos y movimientos; configuración del canal; medios; slides y banners. No contiene pedidos ni integraciones de compra.

`catalog_settings` fija una lista PEN y un almacén online. Añadir otra lista o almacén no cambia lo que muestra la tienda. La API pública de variantes (`public_catalog_variants`) solo entrega precio del canal y disponibilidad agregada; `variant_prices` e inventario exacto son administrativos. La biblioteca y su vista respetan el rol activo. Las URLs del bucket público son públicas, pero su listado es administrativo: no subas allí documentos privados ni campañas que deban permanecer secretas.

`save_catalog_product` guarda el catálogo en una transacción y exige la versión `expected_updated_at` del editor. Los cambios de stock requieren saldo esperado y motivo; nunca se aceptan reservas enviadas por el formulario. Se conservan variantes retiradas y movimientos. Para cambiar el saldo se usa `adjust_catalog_stock`, sin permisos CRUD directos sobre inventario ni historial.

Las migraciones `202610270001`–`003` cierran el hito. Eliminan el modelo anterior sin uso, endurecen permisos y validaciones e incorporan restauración transaccional y gestión segura de medios. El historial previo se conserva y se aplica completo en un proyecto vacío. Esas migraciones retiran columnas/tablas: realiza respaldo antes de considerar aplicarlas a una base existente. El camino probado es un proyecto NUEVO y una transferencia controlada del catálogo.

## 1. Preparar el proyecto destino

Crear un proyecto Supabase propio. Mantener deshabilitado el registro público en Authentication. El repositorio bloquea el registro mediante `auth.enable_signup=false` y mantiene habilitado el proveedor de email. En la CLI usada, `auth.email.enable_signup=false` deshabilita también el login; por eso ese valor específico es `true` mientras el bloqueo global sigue en `false`. Esta combinación se prueba con registro rechazado y login permitido. En nube se configura desde el dashboard. No habilitar ventas ni introducir datos de clientes en este hito.

Desde `tienda/`, con la CLI instalada por `pnpm install`:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref REFERENCIA_DEL_PROYECTO_NUEVO
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

Comprobar que el proyecto enlazado sea el nuevo antes del push. Estos comandos son remotos; `db:verify` no los ejecuta. Si se cambia de referencia hay que enlazar de nuevo: las credenciales de la app y el enlace de la CLI son configuraciones independientes.

Copiar `.env.example` a un archivo privado para el destino y completar URL, clave anon y `SUPABASE_PERSONAL_PROJECT_CONFIRMED=true`. Añadir service role solo para ejecutar los scripts CLI; no configurarla en el frontend. El runtime público/admin usa clave anon, sesión y RLS.

## 2. Elegir carga inicial o transferencia

**Catálogo nuevo:** ejecutar el seed sin `--demo`. Crea los 11 nombres y 65 fotos como borradores; los existentes se conservan. Completar datos reales desde el admin antes de publicar.

```sh
node --env-file=.env.target.local scripts/seed-products.mjs
node --env-file=.env.target.local scripts/seed-products.mjs --apply --confirm-personal-project
```

**Conservar el catálogo del proyecto anterior:** detener las ediciones administrativas durante la exportación. La lectura de varias tablas y Storage necesita esa ventana para mantener una copia consistente. El origen puede tener el esquema anterior de este repositorio; el exportador selecciona únicamente campos compatibles. No es un migrador genérico de cualquier aplicación.

Preparar `.env.source.local` y `.env.target.local` por separado. Ambos deben apuntar a proyectos propios y tener la clave privada de su respectivo proyecto. Los archivos `.env.*` y `catalog-backups/` están ignorados por Git.

```sh
# Origen: solo lecturas; descarga también los archivos de la biblioteca.
node --env-file=.env.source.local scripts/transfer-catalog.mjs export --directory catalog-backups/catalog --confirm-personal-project
# Destino: vista previa local de la exportación, sin escrituras.
node --env-file=.env.target.local scripts/transfer-catalog.mjs import --directory catalog-backups/catalog --confirm-personal-project
# Destino vacío con migraciones actuales: subir archivos y restaurar datos.
node --env-file=.env.target.local scripts/transfer-catalog.mjs import --directory catalog-backups/catalog --confirm-personal-project --apply
```

Si el origen tiene varias listas/almacenes y carece de `catalog_settings`, el exportador exige `--price-list UUID --warehouse UUID` para evitar elegir datos arbitrarios. No consolida almacenes. Si hay reservas sin conciliar, detiene la exportación. Si detecta medios de otro proveedor/proyecto, deben incorporarse al Storage propio antes de exportar.

El importador verifica SHA-256 de los archivos; conserva IDs, publicación, precios del canal, atributos, saldos e historial; cambia las URLs al Storage destino. No copia usuarios Auth ni secretos. Los actores históricos del origen se desvinculan de Auth en destino. Cuando el historial anterior no explica el saldo, registra la diferencia como saldo inicial de migración, sin inventar ventas pasadas.

La restauración de tablas es una transacción. Storage no comparte esa transacción: si falla, la base revierte y pueden quedar archivos sin referencias en destino. Repetir la importación admite archivos idénticos por checksum y rechaza archivos diferentes. El destino debe seguir vacío; nunca sobrescribe un catálogo existente. No ejecutes el seed antes de importar.

## 3. Aprovisionar administración y activar la app

Crear/invitar la cuenta operadora desde Supabase Auth. Usar su UUID NUEVO en el SQL Editor del destino:

```sql
insert into public.admin_profiles (user_id, role, is_active)
values ('UUID_DEL_USUARIO_AUTH_NUEVO', 'admin', true);
```

Configurar el `.env.local` de desarrollo o las variables del hosting con el destino. Reiniciar `pnpm dev`, o recompilar y desplegar para producción. `NEXT_PUBLIC_SITE_URL` debe ser el dominio público HTTPS sin barra final. Verificar login, lectura pública, publicación/ocultamiento y una carga desde el admin. Los archivos pueden pesar hasta 10 MiB; formatos JPG, PNG, WebP, AVIF, MP4 y WebM. Las imágenes del catálogo deben ser imágenes, no videos.

El hosting debe admitir peticiones Server Actions de al menos 11 MiB para cargar archivos de 10 MiB por esta vía. Si tiene un límite inferior, implementar carga directa autorizada a Storage antes de usar archivos mayores; no basta modificar `next.config.mjs` para elevar un límite del proveedor.

## 4. Verificación local reproducible

```sh
pnpm db:verify --with-app
```

Con Docker activo, crea/reinicia únicamente `vintage-29-catalog-review` y `vintage-29-catalog-restore`, bajo `.verification/`. Instala migraciones, ejecuta pruebas SQL, comprueba tipos reales, seed en borrador/demo e idempotencia, transfiere a otra base/Storage y prueba la aplicación. No carga el `.env.local` del negocio ni usa `supabase link`.

Los logs están en `.verification/`. No se versionan ni se deben compartir en bloque: incluyen credenciales generadas para las instancias locales. Para actualizar tipos tras cambiar el esquema: `pnpm db:verify --update-types`. La CI contrasta los tipos y falla si difieren.

## 5. Operación y límites del hito

- Archivar un producto lo retira de la tienda sin destruir datos.
- Retirar talla/color conserva variantes e historial; puede despublicar productos afectados.
- Para borrar un archivo, retirarlo primero de productos y portada. La base bloquea referencias nuevas mientras su eliminación está en curso.
- Un conflicto de producto/stock exige recargar la ficha y revisar cambios antes de reintentar.
- Disponibilidad y precios públicos tienen caché de hasta 60 segundos; las acciones del admin invalidan el catálogo. No utilizar esa caché como autorización de una compra futura.
- El bucket público no aporta confidencialidad de archivos. Los datos de pedidos/comprobantes requerirán almacenamiento y permisos separados en la siguiente fase.
- Hacer respaldo del catálogo y Storage; la exportación probada permite recuperar en un proyecto vacío. Definir frecuencia y retención con el negocio al elegir hosting y plan de Supabase.
