# Plan de integración con Culqi

## Alcance y preparación

Procesar pagos en PEN por los medios habilitados para el comercio. Se desean tarjeta y Yape; confirmar disponibilidad y condiciones de cada medio, incluido Plin si se decide ofrecerlo. El alcance comercial no contempla contraentrega. Confirmar cuenta, documentación vigente, entorno de pruebas y mecanismos reales de autenticidad e idempotencia antes de fijar el contrato.

## Flujo de pago

1. El servidor verifica la variante, cantidad, precio, cobertura y total, crea el pedido y reserva stock.
2. La clienta utiliza el componente o mecanismo de pago admitido por Culqi; la tienda no almacena PAN, CVV ni datos sensibles de tarjeta.
3. El servidor crea un intento asociado al pedido y monto persistidos. Guardar identificadores y estados útiles para conciliación, manteniendo credenciales privadas en servidor.
4. Procesar respuesta y eventos mediante transiciones válidas que toleren duplicados y orden variable. Validar autenticidad según el mecanismo oficial efectivamente disponible.
5. Ante rechazo comunicar el resultado; ante timeout o estado incierto reconciliar antes de intentar un nuevo cobro.
6. Un pago confirmado consume la reserva e inicia el trabajo de Odoo. Una caída del ERP no borra ni revierte automáticamente el pago.

## Reservas y pruebas

Definir vencimiento por medio de pago, liberación única, pago aprobado tardíamente, cancelación y reembolso con el negocio. Separar credenciales de prueba y producción. Probar aprobación, rechazo, doble clic, eventos duplicados, timeout, importe alterado, última unidad y reserva vencida. La aceptación requiere importes conciliados y ausencia de cargos o movimientos duplicados.
