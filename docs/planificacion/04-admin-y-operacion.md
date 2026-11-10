# Plan del panel de administración

## Acceso

Autenticar al personal mediante Supabase Auth y exigir perfil administrativo activo. Aprovisionar administradores mediante operación controlada; el registro de clientas no debe conceder privilegios. Proteger pantallas, acciones y datos; permitir cierre de sesión y mensajes claros ante acceso revocado.

## Catálogo

- Crear, editar, buscar, filtrar, publicar y archivar productos; manejar borradores incompletos y vista pública.
- Gestionar categorías y subcategorías, colores, tallas y fits; material y cuidados son datos descriptivos de producto.
- Seleccionar colores y tallas, generar combinaciones y mantener SKU, precio y stock por variante; conservar identidades e historial al retirar una combinación.
- Exigir subcategoría, color, talla, imagen y variante activa con SKU y precio positivo para publicar. Los errores deben indicar qué falta.
- Cargar, reutilizar, ordenar y asociar imágenes a colores; verificar referencias antes de eliminar archivos.

## Portada y contenido

Administrar slides, imágenes, banners, enlaces, orden y visibilidad de las secciones de portada. La biblioteca de medios permite localizar recursos y comprobar su uso. Solo el contenido destinado a ser público debe ir a un bucket público.

## Stock, envíos y pedidos

- Consultar existencias asignadas al canal por variante; registrar ajustes con motivo, actor y control de concurrencia. Mantener movimientos y reservas rastreables.
- Configurar métodos de entrega, zonas, cobertura y tarifas; impedir que una zona sin tarifa se trate como envío gratis.
- Consultar pedidos por referencia, fecha y estado; mostrar importe, pago, entrega, inventario y resultado de Odoo sin exponer datos de tarjeta.
- Mostrar pagos e integraciones pendientes o fallidos; habilitar reintento solo con control de permisos, idempotencia y conciliación.
- Definir operación de cancelación, reembolso y atención de incidencias junto con el negocio.

## Importaciones y aceptación

Cuando se incluyan importaciones, mostrar origen, vista previa, conflictos, confirmación y resultado. El panel debe permitir completar el flujo comercial con usuario autorizado, presentar errores de forma entendible y mantener la integridad incluso ante ediciones simultáneas.
