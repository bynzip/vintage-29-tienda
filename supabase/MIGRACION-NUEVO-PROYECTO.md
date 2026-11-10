# Preparación de migración al nuevo proyecto Supabase

Esta guía prepara una transferencia del catálogo, no un respaldo completo de PostgreSQL ni de Auth. No ejecuta acciones remotas por sí sola. Sigue también [README.md](README.md), que describe el contrato y las restricciones del destino.

La migración inicial al proyecto nuevo se completó el 10 de noviembre de 2026: se verificaron 14 productos, 75 variantes y 78 archivos. El destino ya no está vacío, por lo que los comandos de importación no deben repetirse sobre él. Se configuró la cuenta administrativa principal y una cuenta de demostración. El respaldo local está en `catalog-backups/migracion-nuevo-proyecto/` y debe conservarse de manera segura.

## Antes de empezar

- Crear un proyecto Supabase nuevo y vacío. No ejecutar el seed en él. Identificar por separado el proyecto anterior y el nuevo; la URL de cada archivo de configuración debe corresponder a su clave de servicio.
- Para una nueva exportación desde otro proyecto, crear un archivo privado `tienda/.env.source.local` con su URL, su clave privada y `SUPABASE_PERSONAL_PROJECT_CONFIRMED=true`; el archivo del origen anterior se eliminó después de la migración. El archivo privado `tienda/.env.target.local` contiene la configuración de destino. `.env.local` configura la app y apunta al nuevo proyecto. Nunca compartir claves ni subirlas a Git. La clave privada no debe estar en variables `NEXT_PUBLIC_` ni en el hosting de la app.
- Los scripts usan Node 22 y las dependencias de `pnpm`.
- Respaldar por separado la base y Storage originales. Detener ediciones y cargas administrativas durante la exportación y mantener una copia segura de la exportación. No eliminar el proyecto anterior hasta verificar el resultado.
- Se conservarán los datos del catálogo compatibles con el modelo actual, con sus relaciones y archivos. Por decisión del proyecto se excluyen las tablas y campos antiguos que ya no se utilizan ni forman parte de la planificación actual, como marcas y país de origen. La migración no es un volcado completo de la base anterior.
- La transferencia selecciona una lista de precios y un almacén, no todos los canales. No transfiere Auth, usuarios, secretos, pedidos ni tablas ajenas al catálogo. Los objetos de Storage que no estén registrados en la biblioteca ni referenciados en los campos admitidos tampoco se descubren automáticamente. Las rutas locales `/imagenes/` siguen apuntando a los archivos de la aplicación; las imágenes externas deben incorporarse al Storage propio antes de exportar.

## Preparación y ejecución desde PowerShell

Usar una consola nueva en la carpeta `tienda`. Las variables ya definidas en la consola tienen prioridad sobre `--env-file` de Node; limpiar las variables de Supabase de la sesión o abrir una sesión sin ellas antes de empezar. Nunca imprimir las claves.

```powershell
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL,Env:NEXT_PUBLIC_SUPABASE_ANON_KEY,Env:SUPABASE_SERVICE_ROLE_KEY,Env:SUPABASE_PERSONAL_PROJECT_CONFIRMED -ErrorAction SilentlyContinue
pnpm install --frozen-lockfile
pnpm exec supabase login
pnpm exec supabase link --project-ref REFERENCIA_DEL_PROYECTO_NUEVO
pnpm exec supabase db push --dry-run
```

Comprobar que la referencia enlazada sea la del proyecto nuevo y revisar la lista del dry run. Solo entonces aplicar todas las migraciones: `pnpm exec supabase db push`. Configurar también en el dashboard el registro público deshabilitado, según el README. El enlace de la CLI es independiente de los archivos `.env`.

```powershell
# Lee el origen y descarga el catálogo y archivos. No modifica el origen.
node --env-file=.env.source.local scripts/transfer-catalog.mjs export --directory catalog-backups/catalog --confirm-personal-project

# Comprueba el manifiesto y los checksums sin escribir en el destino.
node --env-file=.env.target.local scripts/transfer-catalog.mjs import --directory catalog-backups/catalog --confirm-personal-project

# Una vez confirmados origen, destino, respaldo y alcance, importa al destino vacío.
node --env-file=.env.target.local scripts/transfer-catalog.mjs import --directory catalog-backups/catalog --confirm-personal-project --apply
```

Si existe más de una lista o almacén y no hay configuración inequívoca, añadir al comando `export` `--price-list UUID --warehouse UUID`. El importador rechaza el origen como destino para exportaciones nuevas y rechaza catálogos de destino no vacíos. La restauración de tablas es transaccional, pero Storage no: ante un fallo pueden quedar archivos subidos; conserva la exportación para reintentar y revisa el error.

## Comprobación antes de cambiar la app

1. Comparar los recuentos y datos del catálogo origen y destino, incluidas variantes, precios del canal, stock y archivos. Revisar imágenes y enlaces de campañas en la tienda y el panel; los enlaces de navegación a dominios antiguos pueden requerir corrección manual.
2. Crear/invitar una nueva cuenta Auth y asociarla a `admin_profiles` como indica [README.md](README.md). Verificar acceso, permisos, carga de medios y publicación.
3. Actualizar `.env.local` y el hosting con la URL y clave pública del destino, nunca la clave de servicio. Reiniciar el desarrollo o recompilar y desplegar; validar dominio, imágenes y lectura pública.
4. Mantener el proyecto anterior y su respaldo hasta que el negocio confirme la revisión. Definir respaldos periódicos para la nueva base y Storage.

La vista previa verifica el respaldo local, no demuestra que las credenciales del destino funcionen ni que el destino esté preparado. La prueba anterior en Docker tampoco verifica el nuevo proyecto remoto.

## Reutilizar el mismo proyecto anterior

Es una alternativa distinta de la transferencia anterior: primero habría que verificar una exportación completa del catálogo y sus archivos y obtener respaldos independientes de la base y Storage. Después se podría reconstruir la base del proyecto existente y restaurar el catálogo, pero el procedimiento no está preparado ni probado para este caso. El importador actual rechaza deliberadamente usar como destino el mismo origen de una exportación nueva. No eliminar ni reiniciar la base antes de contar con un procedimiento adaptado y una restauración probada en un entorno aislado.

Storage y Auth requieren revisión aparte: reiniciar la base no garantiza un Storage limpio ni sustituye un respaldo de archivos. Se debe evaluar también la disponibilidad de la tienda y sus credenciales. Un proyecto nuevo permite verificar el resultado manteniendo disponible el anterior.
