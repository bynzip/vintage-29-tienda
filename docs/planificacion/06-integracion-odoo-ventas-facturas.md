# Plan de integración con Odoo

## Objetivo y preparación

Registrar en Odoo ventas pagadas desde la tienda sin que el catálogo público dependa de consultas al ERP. Obtener acceso autorizado a pruebas y confirmar versión, protocolo disponible, usuario técnico, permisos, modelos y reglas del negocio. JSON-RPC es una opción a validar, no un contrato supuesto.

Mapear cada variante web con una entidad vendible de Odoo. Confirmar los campos y reglas para cliente, DNI/RUC, dirección, líneas, cantidad, precios, impuestos, envío, referencia del pedido, estado de venta y comprobante. Conciliar los totales cobrados con el tratamiento fiscal de la instancia.

## Flujo de venta

1. Confirmar el pago y registrar un trabajo de integración de forma consistente con el pedido local.
2. Un proceso de servidor transmite el snapshot y una referencia estable usando credenciales privadas y permisos mínimos.
3. Guardar el identificador de Odoo y el resultado; mostrar en el admin el estado y los errores útiles para operación.
4. Si Odoo falla, conservar el pedido pagado y programar recuperación con reintentos limitados y alerta.
5. Ante respuesta ambigua, reconciliar por referencia antes de volver a crear; validar exclusión de duplicados también ante procesos concurrentes. Si la instancia no permite garantías suficientes, acordar resolución operativa.

## Comprobantes y aceptación

El negocio conserva la emisión en su flujo de Odoo. Consultar número, estado o archivo solo si la instalación y permisos lo permiten; restringir la entrega a la persona autorizada. Si no es viable, acordar el envío mediante el procedimiento del negocio.

Probar creación de venta, correspondencia de variantes y totales, errores de permisos, caída, timeout, reintento concurrente y reconciliación. Una venta confirmada no debe duplicarse ni perderse cuando falle la integración.
