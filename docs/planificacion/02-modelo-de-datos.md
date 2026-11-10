# Plan del modelo de datos

Las migraciones SQL y los tipos generados definen los nombres exactos del esquema. Esta sección describe las responsabilidades y relaciones que debe cubrir el modelo completo; el avance se consulta en [documentacion.md](../documentacion.md).

## Catálogo y contenido

| Entidad o grupo | Datos y reglas |
|---|---|
| Categorías | Identificador, nombre, slug, estado y relación padre; profundidad comercial de dos niveles. |
| Producto | Nombre, slug, descripción, subcategoría, fit, material en texto, cuidados, estado y fechas. Puede ser borrador incompleto. |
| Atributos y variantes | Colores y tallas seleccionables; cada combinación de producto, color y talla tiene identidad estable, SKU y estado. |
| Medios | Archivos y metadatos; relación con producto, orden, portada, lifestyle y color cuando corresponda. Portada y campañas tienen su propia configuración. |
| Precios | Lista, variante, precio en céntimos enteros, moneda, vigencia y estado; una configuración identifica la lista del canal online. |
| Stock | Almacén, saldo por variante, cantidad reservada y movimientos con fecha, actor y motivo; el canal utiliza un almacén configurado. |
| Acceso | Usuario Auth y perfil administrativo activo; el perfil no sustituye la autenticación. |

Para publicar se requiere subcategoría, color, talla, imagen y variante activa con SKU y precio positivo. Las variantes retiradas se conservan cuando tienen referencias o historial. La disponibilidad pública no necesita exponer cantidades exactas.

## Compra, pago e integraciones

| Grupo | Información y comportamiento requerido |
|---|---|
| Pedido | ID, referencia pública no predecible, contacto, datos de entrega y comprobante solicitado, importes, moneda, timestamps y estados. |
| Líneas | Referencias a producto/variante y snapshots de nombre, SKU, atributos, cantidad y precio; cambios posteriores del catálogo no modifican el pedido. |
| Reservas | Pedido, variante, cantidad, vencimiento y estado; crear, consumir o liberar una sola vez bajo concurrencia. |
| Entrega | Métodos, zonas y tarifas; la tarifa y dirección usadas quedan registradas en el pedido. |
| Pagos | Intentos, estado, importe, referencia externa y eventos deduplicables; no guardar datos sensibles de tarjeta. |
| Odoo | Referencia inequívoca de variante y trabajo persistente por pedido con estado, intentos, próxima ejecución y resultado. |
| Documentos | Referencias y permisos para comprobantes solo cuando el sistema del negocio los ofrezca. |

El servidor determina los importes; usar céntimos enteros y reglas de redondeo coherentes. La reserva no puede superar el stock disponible. Los cambios de stock y transición del pedido deben ser transaccionales, auditables e idempotentes. El pedido y el pago conservan estados relacionados pero separados; definir cancelación, devolución y pago tardío.

## Datos opcionales

Las cuentas de clienta pueden relacionar perfil, carrito y pedidos con `auth.users`, protegidos por RLS. Las importaciones pueden conservar identidad y lote de origen, sin actualizar el catálogo silenciosamente. Los nombres de tablas y columnas para módulos de venta se definen al implementar y verificar sus migraciones.
