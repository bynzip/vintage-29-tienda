# Contexto y alcance del proyecto

## Objetivo

Construir una tienda online para Vintage 29 que permita descubrir prendas, elegir variantes, completar una compra y recibir información del pedido. El personal gestiona el canal mediante un panel propio. El estado de ejecución y los pasos inmediatos se mantienen únicamente en [documentacion.md](../documentacion.md).

## Módulos de la tienda

- **Catálogo y navegación:** portada, categorías y subcategorías, búsqueda, filtros, fichas, imágenes, colores, tallas, precios y disponibilidad.
- **Carrito y checkout:** carrito persistente, datos de contacto y entrega, selección de comprobante, cálculo del total y confirmación del pedido.
- **Inventario y pedidos:** stock destinado al canal online, reservas, movimientos, snapshots, estados de pago y seguimiento de cada pedido.
- **Pagos y ventas:** cobro mediante Culqi y solicitud de registro de la venta pagada en Odoo. El negocio gestiona su proceso de emisión de comprobantes.
- **Administración:** catálogo, medios, portada, stock, tarifas, pedidos e incidencias de integración.
- **Operación:** permisos, seguridad, respaldos, monitoreo, pruebas y puesta en producción.

## Reglas del negocio

1. Supabase mantiene los datos que gobiernan el canal web; Odoo no es una dependencia para visualizar el catálogo.
2. El negocio asigna y concilia el stock del canal online con su inventario físico y otros canales.
3. El servidor determina precio, disponibilidad, tarifa y total; los datos enviados por el navegador deben validarse.
4. Una compra confirmada conserva un pedido propio con el detalle y los importes acordados. El registro en Odoo se solicita después de confirmar el pago.
5. Una caída de Odoo no debe perder el pedido ni ocultar un pago confirmado. Cada variante necesita su relación externa o una alternativa operativa validada antes de vender.
6. La compra como invitada está contemplada. Las cuentas de clienta, favoritos y el importador completo son opciones adicionales sujetas a priorización.

## Límites y dependencias

No se plantea sustituir Odoo, implementar una aplicación móvil nativa, programa de puntos o integración automática con courier. Confirmar con el negocio medios de pago habilitados, zonas y tarifas, política de stock y reembolsos, datos fiscales y acceso a una instancia autorizada de Odoo. El importador de Odoo o Excel puede sustituirse inicialmente por una carga controlada si el volumen lo permite.

## Criterios generales de entrega

El equipo administra el catálogo, la clienta completa una compra segura, el stock no se sobrevende ante concurrencia, el pago y el pedido quedan conciliados y la venta se registra en Odoo o queda identificada para recuperación. El proyecto debe contar con procedimientos de respaldo, atención de incidencias y pruebas de operación.
