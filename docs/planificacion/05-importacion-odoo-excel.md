# Plan de importación desde Odoo y Excel

## Alcance y objetivo

Reducir la carga manual y relacionar variantes del canal web con productos vendibles de Odoo, sin convertir la estructura de origen en el modelo interno. Un importador completo es opcional si una carga controlada cubre el catálogo y sus referencias de manera suficiente.

## Preparación de fuentes

1. Solicitar acceso de lectura autorizado, versión, API, modelos y campos de la instancia de Odoo; utilizar un usuario técnico de mínimo privilegio.
2. Obtener muestra anonimizada de Excel, descripción de columnas y reglas de actualización.
3. Definir mapeo de producto, variante, atributos, identificador externo, precio, stock e imágenes. No asumir que nombre o SKU son únicos sin validación.
4. Acordar qué campos controla el negocio desde el admin, cuáles pueden actualizarse desde cada fuente y cómo resolver discrepancias.

## Flujo de carga

1. La persona administradora selecciona la fuente o archivo.
2. El servidor valida tamaño, formato, columnas, tipos, relaciones, duplicados y permisos; transforma los datos al modelo propio.
3. Presentar vista previa de altas, actualizaciones, registros sin cambio, conflictos y errores por fila; no aplicar cambios sin confirmación.
4. Aplicar en lotes transaccionales apropiados; registrar origen, actor, fecha, identidad externa y resultado.
5. Ofrecer reporte de errores y resultados. Repetir una importación no crea duplicados ni sobrescribe silenciosamente cambios locales.

## Reglas de operación y pruebas

Las relaciones ambiguas quedan en revisión y no habilitan una venta integrada. Los datos y archivos temporales tienen una política de retención; los reportes no incluyen credenciales. Probar duplicados, errores parciales, reimportación y cambios concurrentes. La transferencia de catálogo entre proyectos Supabase es un proceso distinto de esta importación comercial.
