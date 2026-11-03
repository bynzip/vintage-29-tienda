# Bitácora de avances — Tienda online Vintage 29

- **Periodo:** desde el 13 de octubre de 2026
- **Organización:** tres semanas, cuatro jornadas de trabajo por semana
- **Proyecto:** tienda online y panel de administración de Vintage 29

## Punto de partida

Al terminar el 12 de octubre ya contaba con una tienda conectada a Supabase y un panel administrativo con inicio de sesión, productos, categorías, colores, tallas y tipos de fit. Sobre esa base continué con la gestión de contenido, las imágenes y las validaciones necesarias para que el catálogo pudiera mantenerse desde el panel.

Las jornadas de este informe agrupan el trabajo por tema para explicar su evolución. No representan una fecha exacta por jornada: el historial registra commits el 13, 14, 15 y 21 de octubre, y las mejoras posteriores del catálogo se encontraban en el directorio de trabajo. Las capturas muestran el estado actual de la aplicación local; no son capturas históricas de cada fecha.

---

## Semana 1 — Medios y presentación de la tienda

### Día 1 — Almacenamiento de imágenes y biblioteca de medios

Comencé ampliando la forma en que se administraban los archivos. Hasta ese momento ya podía trabajar con productos, pero necesitaba una manera más cómoda de reunir imágenes y utilizarlas en varias partes de la tienda. Incorporé Supabase Storage y una biblioteca desde el panel para consultar los archivos, revisar dónde se utilizan y copiar sus enlaces públicos.

También organicé la relación entre las imágenes y los productos. Esto me permitió diferenciar una imagen general de una fotografía asociada a un color, algo útil cuando una misma prenda tiene varias presentaciones.

![[biblioteca-medios.jpg]]

### Día 2 — Orden y organización de las fotografías

Después trabajé en el orden de las imágenes. Reemplacé el movimiento mediante flechas por controles de arrastre, de manera que la persona administradora pudiera organizar la galería con una interacción más directa. Además, preparé vistas de medios en cuadrícula o lista y agrupaciones por producto para encontrar los archivos con mayor facilidad.

En el formulario de producto, el movimiento de una imagen actualiza el orden de la colección antes de guardar:

```tsx
const [dragged] = next.splice(draggedIndex, 1);
next.splice(index, 0, dragged);
```

![[variantes-galeria.jpg]]

### Día 3 — Portada y recursos audiovisuales

Continué con la portada de la tienda. Ajusté su presentación respecto a la barra de navegación y mejoré la calidad de las imágenes y su carga progresiva. La intención fue que la primera sección mantuviera una presentación más limpia y que el área de la portada pudiera dirigir a una página configurada.

En esta etapa también se incorporó soporte de video en portada y administración. Más adelante, al cerrar el hito de catálogo, se revisaron los formatos y límites admitidos para adaptarlos a las restricciones de carga del proyecto.

![[tienda-portada.jpg]]

### Día 4 — Edición de portada desde el panel

Preparé editores en ventanas modales para los slides de portada y los banners. Desde el panel se puede activar o desactivar contenido, revisar la previsualización y definir su enlace. También incorporé la opción de ordenar los slides y un minibanner para campañas.

El orden que el administrador establece se envía a una acción de servidor, que finalmente ejecuta la operación en Supabase:

```ts
const orderedIds = reorderItems.map((s) => s.id);
const res = await reorderHomeSlidesAction(orderedIds);
```

![[admin-home.jpg]]

---

## Semana 2 — Experiencia de edición y contenido dinámico

### Día 5 — Mejoras en los editores modales

Con los editores funcionando, revisé detalles de uso. Ajusté las dimensiones de las previsualizaciones para que imágenes y videos respetaran mejor sus proporciones, reduje los espacios innecesarios y afiné el aspecto de las ventanas.

También se bloqueó el desplazamiento del fondo mientras un modal está abierto y se evitó que un clic fuera del cuadro lo cerrara accidentalmente. Estos cambios buscan que el administrador pueda concentrarse en el contenido que está editando.

![[admin-home.jpg]]

### Día 6 — Mosaico, banners y comunidad

Amplié el contenido configurable de la página principal con un mosaico de cuatro imágenes, un minibanner intermedio y una sección de comunidad o redes sociales. La idea fue que la portada pudiera cambiar de campaña sin tener que editar directamente la página de la tienda.

Desde el panel se gestionan imágenes, títulos y enlaces; la tienda recupera esa información para componer las secciones visibles. El mosaico se integró entre los bloques de productos y el resto del catálogo.

![[tienda-catalogo.jpg]]

### Día 7 — URL de imágenes y galería de producto

Revisé la selección de imágenes dentro del editor de productos. Se incorporó la posibilidad de pegar una URL de imagen y visualizarla antes de añadirla a la galería. La ficha también permite asociar las fotografías a un color y ordenar su presentación.

Para el cierre del catálogo se añadió una validación de rutas: se aceptan imágenes locales seguras o archivos públicos del Storage configurado para la tienda. Esta comprobación ayuda a mantener controlado el origen de los recursos.

```ts
isCatalogMediaUrl(item.asset_path) &&
  (item.asset_path.startsWith("http") || assets.has(item.asset_path))
```

![[variantes-galeria.jpg]]

### Día 8 — Revisión de la ficha y del catálogo

Conecté los avances del panel con la vista pública. En la ficha de producto se muestran los datos de la prenda, sus opciones de color y talla, el precio y las imágenes disponibles. También revisé la presentación de productos relacionados y el recorrido desde la portada hasta el detalle.

En el estado actual, el carrito queda señalado como funcionalidad de una fase posterior. El objetivo de este avance fue asegurar la presentación y administración del catálogo antes de incorporar el flujo de compra.

![[ficha-producto.jpg]]

---

## Semana 3 — Integridad del catálogo y preparación de migración

### Día 9 — Reglas para productos y variantes

En la última etapa revisé las reglas para guardar y publicar productos. El formulario reúne la información general, las imágenes y las combinaciones de colores y tallas. Cada combinación puede tener su propio precio y disponibilidad, mientras que un producto incompleto puede mantenerse como borrador.

El guardado se canaliza por una función de base de datos para tratar el conjunto del producto de forma transaccional. Así se busca evitar que una ficha quede guardada parcialmente si alguna parte falla.

```ts
const { error } = await supabase.rpc("save_catalog_product", {
  p_payload: {
    ...parsed.data,
    gender: "female",
    color_ids: colorIds,
    size_ids: sizeIds,
    variants,
    media,
  },
});
```

![[editor-producto.jpg]]

La clasificación por categorías y subcategorías complementa estos datos del producto.

![[admin-categorias.jpg]]

### Día 10 — Precios, existencias y seguridad

Reforcé la separación entre los datos que necesita la tienda y los datos administrativos. La consulta pública de variantes entrega el precio del canal y la disponibilidad, mientras que los saldos detallados y su gestión permanecen en el ámbito administrativo.

También se incorporaron comprobaciones para el precio vigente, ajustes de stock con motivo y controles para evitar que una edición sobrescriba silenciosamente otra más reciente. En la base se añadieron validaciones y políticas para proteger el catálogo y los medios.

![[admin-productos.jpg]]

### Día 11 — Transferencia y prueba local con Docker

Preparé el proyecto para poder llevar el catálogo a una nueva base Supabase. La herramienta de transferencia exporta los datos compatibles y los archivos; al importar en un destino vacío conserva sus referencias y adapta las URL al nuevo Storage. La restauración de los datos se realiza de forma transaccional y evita sobrescribir un catálogo existente.

Para comprobar el procedimiento utilicé dos proyectos Supabase locales con Docker: uno como origen de prueba y otro como destino. La verificación registrada incluyó migraciones, permisos, exportación e importación, además de pruebas de acceso a la aplicación. Esta fue una prueba local; la migración definitiva a un nuevo proyecto en la nube queda pendiente.

```sh
pnpm db:verify --with-app
```

La siguiente vista corresponde al catálogo utilizado para revisar la aplicación en el entorno local:

![[admin-productos.jpg]]

**Captura pendiente:** vista de Docker Desktop con los servicios locales de la prueba. Esta imagen se añadirá manualmente.

### Día 12 — Comprobación final y documentación

Para cerrar el avance revisé la documentación de instalación y migración, las pruebas automatizadas y la separación de archivos temporales. Se añadieron comprobaciones de TypeScript, pruebas de catálogo y una configuración de integración continua para repetir la verificación.

Además preparé una copia temporal del catálogo remoto en un entorno local, conservando las URL públicas originales de las imágenes para revisar la tienda. Al usar dos proyectos distintos, ajusté únicamente la copia de prueba para que admitiera ese origen de imágenes. Esta solución temporal no reemplaza la migración futura de los archivos al Storage definitivo.

![[acceso-admin.jpg]]

Como siguiente paso queda preparar el nuevo proyecto Supabase real, trasladar el catálogo y sus archivos, aprovisionar la cuenta administrativa y comprobar nuevamente publicación, imágenes y permisos en el destino.
