# Plan de seguridad y operación

## Identidad y datos

- Restringir el admin a usuarios autenticados con perfil administrativo activo; comprobar permisos en servidor y en RLS, no solo en la interfaz.
- Limitar la lectura pública al catálogo permitido y disponibilidad agregada. Usar almacenamiento privado y control de acceso para comprobantes o datos personales; las URL de un bucket público no son secretas.
- Mantener secretos y claves privilegiadas fuera del navegador, repositorio, reportes y logs. No almacenar datos sensibles de tarjeta.
- Si se habilitan cuentas, aplicar RLS por propietario a perfil, carrito y pedidos; revisar registro, confirmación de correo, recuperación y controles contra abuso sin permitir autoasignación de admin.

## Riesgos comerciales

| Riesgo | Medidas previstas |
|---|---|
| Sobreventa | Reservas por pedido y variante, validación en servidor y transacciones con pruebas de concurrencia. |
| Cobro duplicado o incierto | Identificar intentos, procesar eventos de forma idempotente y reconciliar antes de reintentar. |
| Odoo indisponible | Pedido pagado persistente, trabajo con reintentos, monitoreo y resolución operativa. |
| Pérdida o exposición de datos | Accesos mínimos, separación de entornos, respaldos y restauración probada. |
| Cambios simultáneos de catálogo/stock | Control de versiones o saldo esperado y movimientos auditables. |

## Entornos y operación

Separar desarrollo, staging y producción; revisar migraciones y credenciales del destino antes de aplicar cambios. Configurar dominio, HTTPS, límites de carga, registros, alertas, retención y responsable de respaldo. Validar periódicamente restauración de datos y Storage en un entorno aislado. El servidor valida entradas, limita solicitudes sensibles y evita información privada innecesaria en errores.

## Verificación antes de ventas reales

Probar permisos y revocación, acceso directo a API, duplicados, concurrencia, caídas, reservas vencidas y conciliación. Revisar contenidos comerciales y páginas legales con el negocio. Acordar soporte, cancelación, reembolso y procedimiento ante incidencias; ejecutar una compra real controlada con autorización y conciliación.
