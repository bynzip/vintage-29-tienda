# Plan de tienda, checkout y envíos

## Descubrimiento y carrito

- Ofrecer portada, categorías, búsqueda, filtros y ficha con fotos, descripción, variantes, precio y disponibilidad.
- Seleccionar una combinación válida de color y talla y cantidad; explicar agotamiento y cambios de precio.
- Persistir el carrito en el navegador usando IDs de variantes y cantidades. El carrito no es una reserva ni garantiza el precio; revalidarlo al avanzar.
- Permitir compra como invitada. Si se habilitan cuentas, decidir cómo fusionar el carrito local al iniciar sesión sin duplicar líneas ni confiar en precios antiguos.

## Checkout

1. Solicitar contacto y método de entrega; recoger dirección y datos del comprobante que correspondan.
2. Consultar métodos, zonas y tarifas definidos por el negocio. No convertir una zona sin cobertura o tarifa en envío gratuito.
3. Validar de nuevo en servidor existencia, publicación, variantes, precios, cantidades y tarifa; calcular subtotal y total en PEN.
4. Crear el pedido con snapshots y reservar cada línea en una transacción que soporte peticiones simultáneas. Informar al usuario si hay cambios o falta stock.
5. Presentar el total y continuar al pago; después mostrar el resultado y un acceso seguro al estado para clientas e invitadas.

## Operación y aceptación

El admin configura métodos y tarifas y consulta pedidos y entregas. Definir vencimiento de reservas, pago tardío, cancelación y reembolso antes de operar. Probar última unidad con dos compradores, actualización de precio, zona sin cobertura, expiración y reintentos. El comprobante se gestiona según lo que permita la integración con Odoo.
