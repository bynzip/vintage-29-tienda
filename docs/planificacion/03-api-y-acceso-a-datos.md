# Plan de API y acceso a datos

## Principios

Usar clientes Supabase apropiados para navegador y servidor, con sesión y RLS. El catálogo público expone productos publicados, precio del canal y disponibilidad agregada. El acceso administrativo exige identidad válida y perfil activo, tanto en vistas como en acciones y funciones de base de datos.

Las operaciones sencillas pueden utilizar Supabase/PostgREST con permisos acotados. Las operaciones que coordinan varias entidades o requieren secretos usan acciones o servicios de servidor y funciones transaccionales. Los nombres concretos de rutas HTTP se fijan durante el diseño de cada contrato.

## Operaciones por módulo

| Módulo | Operaciones y controles |
|---|---|
| Catálogo | Consultar productos y categorías; guardar productos, relaciones y publicación con validación y control de concurrencia. |
| Medios | Subir y registrar archivos, comprobar referencias al eliminar y comunicar errores de base o Storage. |
| Inventario | Ajustar saldos con motivo, actor y saldo esperado; impedir escrituras directas no auditadas. |
| Checkout | Revalidar carrito, precios, cantidades y cobertura; crear pedido y reservas en una transacción. |
| Pagos | Crear intento, verificar el pedido y conciliar respuesta y eventos externos sin reprocesar operaciones. |
| Odoo | Crear y procesar trabajos persistentes; consultar resultados y permitir recuperación segura desde el admin. |
| Pedido/comprobante | Verificar propiedad o mecanismo seguro de acceso para invitadas antes de devolver información o documentos. |
| Importación | Validar fuente, presentar vista previa y aplicar cambios solo tras confirmación autorizada. |

## Validación y errores

Validar entradas en cliente para experiencia y de nuevo en servidor para seguridad. No aceptar importes, rol o estado sensibles declarados por el navegador. Usar límites de paginación y solicitudes, mensajes accionables y registros con referencia del pedido y resultado sin secretos, datos de tarjeta ni información personal innecesaria. La clave `service_role` solo se usa en procesos privilegiados controlados; no debe llegar al navegador.

## Verificación

Probar acceso anónimo, usuario autenticado no admin, admin activo y revocado; invocación directa de operaciones; concurrencia de reservas; duplicación de eventos; resultados externos ambiguos; y errores de Storage y base de datos.
