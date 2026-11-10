# Documentación del proyecto — Vintage 29

Documento vivo con lo elaborado, lo que falta y los próximos pasos. La [planificación por módulos](planificacion/00-contexto-y-alcance.md) describe el proyecto completo; las instrucciones técnicas están en los README de [tienda](../README.md) y [Supabase](../supabase/README.md).

## Implementado en el repositorio

- Portada y ficha pública conectadas al catálogo Supabase; variantes con precio y disponibilidad.
- Panel privado con productos, categorías, colores, tallas, fits, medios y edición de portada.
- Publicación condicionada, variantes conservadas al retirarlas, stock del canal con ajustes auditables y control de concurrencia.
- Migraciones, pruebas locales y herramientas de seed y transferencia entre proyectos Supabase.

El catálogo es visible, pero aún no permite compras. El estado del Supabase remoto, despliegue, contenido real y revisión visual completa deben verificarse en el entorno elegido.

## Fase actual: nuevo proyecto Supabase

El 10 de noviembre de 2026 se transfirió el catálogo al nuevo proyecto Supabase con el esquema vigente. Incluye productos y variantes, sus categorías y atributos, precios y stock del canal online, biblioteca de medios y portada. Se excluyeron deliberadamente los campos y tablas antiguos que ya no se usan ni están previstos en la planificación, como marcas y país de origen. Los módulos futuros de pedidos, checkout y pagos se diseñarán en sus respectivas fases.

La exportación e importación incluyó 14 productos (12 publicados y 2 archivados), 75 variantes y 78 archivos. Se compararon los registros del catálogo y los checksums de todos los archivos. El registro público está deshabilitado y las 19 tablas del esquema tienen RLS activo. Se configuró el usuario administrador principal y una cuenta administradora de demostración. La configuración privada y el procedimiento están en [la guía de migración](../supabase/MIGRACION-NUEVO-PROYECTO.md).

## Pasos por completar

### 1. Tienda funcional y carrito

- Construir navegación de categorías, buscador y filtros; cerrar enlaces y controles que hoy son visuales.
- Implementar carrito persistente en navegador por ID de variante y cantidad, con mensajes de agotamiento y cambios de precio. Revalidar datos al avanzar; el carrito no reserva stock.
- Revisar móvil, accesibilidad, contenido comercial y páginas necesarias. Favoritos persistentes pueden añadirse si se priorizan.

**Resultado:** se pueden descubrir productos, seleccionar variantes y preparar una compra.

### 2. Pedidos, inventario y entrega

- Definir pedido, líneas con snapshots, reservas por línea y sus estados; crear pedido y reservar de forma atómica para evitar sobreventa.
- Implementar checkout como invitada con contacto, dirección, comprobante solicitado y validación del total en servidor.
- Configurar métodos, zonas y tarifas; añadir consulta y operación básica de pedidos en el admin.
- Definir vencimientos, cancelaciones, reembolsos, pago tardío y cómo coordinar el stock online con el negocio.

**Resultado:** pedido pendiente con total confiable y reserva consistente, listo para pago de prueba.

### 3. Pago con Culqi

- Validar cuenta, medios habilitados, contratos oficiales y entorno de pruebas. Integrar checkout/tokenización y pago desde servidor.
- Guardar intentos y reconciliar respuestas y eventos; prevenir duplicados y resolver resultados inciertos antes de reintentar.
- Probar aprobación, rechazo, doble clic, eventos duplicados, vencimiento y última unidad.

**Resultado:** pedido pagado de prueba asociado correctamente a su importe, sin depender de Odoo para conservarlo.

### 4. Venta y comprobante en Odoo

- Confirmar versión, acceso y permisos; mapear variantes, clientes, precios, impuestos, entrega y comprobantes con el negocio.
- Asociar cada variante vendible a una referencia válida; una carga controlada puede preceder a un importador completo.
- Crear al confirmar pago un trabajo persistente; registrar la venta, mostrar estado en admin y permitir conciliación y recuperación sin duplicados.
- Probar caídas y respuestas ambiguas. Consultar el comprobante solo si el sistema lo permite; acordar alternativa si no.

**Resultado:** venta pagada de prueba registrada de forma verificable o claramente pendiente de resolución.

### 5. Preparación y lanzamiento

- Verificar migraciones, autenticación y Storage en el proyecto destino, sin asumir que la base remota ya coincide con el repositorio.
- Configurar staging, dominio/HTTPS, límites de hosting, monitoreo, respaldos y recuperación. Revisar contenidos y accesibilidad.
- Ejecutar pruebas de seguridad y compra integral; efectuar una compra real controlada con el negocio, conciliación y procedimiento de reembolso acordado.

**Resultado:** tienda preparada para ventas reales y operación diaria.

## Decisiones y dependencias

- Credenciales y entorno de prueba Culqi; medios habilitados y mecanismos reales de confirmación.
- Acceso autorizado a Odoo, datos de ejemplo y reglas de precios, impuestos, despacho y comprobantes.
- Tarifas/cobertura, política de stock, expiración, cancelación y reembolso del negocio.
- Cuentas de clienta: **opcional, pendiente de decisión**. Supabase Auth puede acelerar acceso y recuperación; requerirá RLS para perfil, carrito e historial y cambios en la configuración de registro. No es requisito para comprar como invitada.
- Importación desde Odoo/Excel: opcional para el lanzamiento si la carga y vinculación inicial pueden hacerse de forma controlada.
