# Informe de Desarrollo y Bitácora de Proyecto: Creación del Panel de Administración de Vintage 29®

**Autor:** Estudiante de Ingeniería de Software / Desarrollador del Proyecto  
**Proyecto:** Tienda Online Vintage 29 (E-commerce de moda femenina y denim)  
**Módulo Documentado:** Aplicación y Panel de Administración (`/admin`)  
**Metodología y Calendario:** Proceso intensivo de 2 semanas (4 días de desarrollo por semana — 8 jornadas de trabajo)  
**Stack Tecnológico Principal:** Next.js (App Router, Server Actions, TypeScript), Supabase (PostgreSQL, Auth, RLS, RPC Pl/pgSQL), Tailwind CSS.

---

## Introducción y Resumen Ejecutivo

El presente informe documenta de manera cronológica y técnica el diseño, arquitectura, modelado de datos, políticas de seguridad y construcción de interfaces del **Panel de Administración propio** para la marca de moda femenina **Vintage 29®**. A través de una bitácora estructurada en dos semanas de trabajo (con cuatro sesiones intensivas por semana), se describe la evolución del software desde su concepción estratégica hasta la entrega de un sistema administrativo robusto, defensivo y completamente desacoplado del ERP corporativo.

A diferencia del escaparate digital (*storefront*) orientado a las clientas finales, este documento se enfoca de manera estricta y exclusiva en la **herramienta operativa privada**, detallando cómo se garantiza la integridad relacional de las prendas, la gestión del inventario online, la matriz de variantes y la seguridad perimetral para que únicamente el personal debidamente autenticado y autorizado pueda realizar modificaciones sobre el catálogo comercial.

---

## Semana 1: Estrategia, Vinculación con Supabase y Seguridad

```
   CRONOGRAMA - SEMANA 1
 ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
 │     DÍA 1       │     DÍA 2       │     DÍA 3       │     DÍA 4       │
 │ Reunión Técnica │ Modelado BD     │ Seguridad Auth, │ Shell del Panel │
 │ & Cambio Rumbos │ Supabase & RLS  │ Roles & Guard   │ y Login Privado │
 └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

### Día 1: La llamada técnica: El cambio estratégico y el desacoplamiento de Odoo

La jornada inaugural del proyecto estuvo marcada por una reunión técnica virtual crucial entre el equipo de desarrollo, los responsables del negocio Vintage 29 y el administrador de sistemas. El plan arquitectónico preliminar consideraba un modelo donde la tienda web consultaba directamente el catálogo de Odoo ERP en tiempo real a través de su API JSON-RPC, esperando que el ERP actuara como maestro absoluto tanto para la visualización de prendas como para la persistencia transaccional. Sin embargo, al analizar en profundidad las exigencias de un comercio electrónico de moda rápida —tiempos de respuesta inferiores a un segundo, alta disponibilidad en navegación móvil, gestión de imágenes de alta fidelidad, fotografías editoriales *lifestyle* y enriquecimiento visual de colores con muestras hexadecimales—, se evidenció que depender de las consultas directas a Odoo en cada petición generaría cuellos de botella severos, fragilidad operativa ante caídas del servidor ERP y una experiencia de usuario deficiente.

Durante esta conversación técnica se tomó la decisión unánime de pivotar la arquitectura: **"dejar a Odoo para el final de la cadena operativa"** y construir un panel de administración con una base de datos propia e independiente como la **Fuente de Verdad del canal online**. Bajo este nuevo paradigma, Supabase (PostgreSQL) almacena y gobierna la totalidad del catálogo, taxonomías, fotografías, matrices de variantes, precios en soles (PEN) y niveles de stock asignados al entorno digital. Odoo, en lugar de ser el cuello de botella visual de la tienda, queda confinado a su verdadero punto fuerte: la post-venta, actuando como un servicio asíncrono para el registro de ventas efectivamente pagadas vía pasarela (Culqi) y la emisión contable de boletas y facturas electrónicas hacia SUNAT.

Esta redefinición estratégica supuso el nacimiento formal del requerimiento del **Panel de Administración Propio (`/admin`)**. Al asumir la gobernanza total del catálogo dentro de la infraestructura de la tienda, el equipo de Vintage 29 necesitaba una interfaz web intuitiva, ágil y especializada que le permitiera confeccionar fichas de producto, organizar combinaciones de tallas y colores, previsualizar estados de publicación y gestionar el inventario destinado a la web sin depender de personal técnico de TI ni de las pantallas complejas y rígidas del ERP. Se cerró la sesión formalizando los requerimientos funcionales del panel y pactando el inicio inmediato de su construcción para el día siguiente.

[Captura de pantalla: Diagrama de arquitectura comparativa: Del modelo acoplado a Odoo hacia la arquitectura con Supabase como Fuente de Verdad y Odoo relegado al final del embudo]

[Captura de pantalla: Minuta técnica de la reunión con la matriz de responsabilidades acordada entre el canal online y el ERP]

---

### Día 2: Vinculación del proyecto con Supabase y Diseño Relacional en PostgreSQL

Con la arquitectura validada, la segunda jornada se dedicó por completo a la infraestructura de datos y al enlace del proyecto Next.js con el clúster administrado de Supabase. Para garantizar una conexión tipada, segura y eficiente, se implementó el paquete `@supabase/ssr`, estructurando dos clientes complementarios en `lib/supabase/`: uno para componentes de servidor (`createSupabaseServerClient`) encargado de leer cookies criptográficas de sesión mediante `next/headers`, y otro para componentes del navegador (`createSupabaseBrowserClient`) apoyado en variables de entorno públicas (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Asimismo, se desarrolló un módulo de guardia en `lib/supabase/guard.ts` con la función `isApprovedSupabaseUrl`, previniendo inyecciones de URL no autorizadas y validando conexiones hacia entornos locales o proyectos de staging debidamente homologados.

El núcleo de la jornada fue el diseño del esquema de base de datos relacional (DDL) mediante la migración fundacional `202610040001_catalog_and_admin.sql` y su posterior evolución `202610040002_final_catalog.sql`. Para satisfacer las complejidades del sector textil, se optó por un modelo altamente normalizado en Tercera Forma Normal (3NF) que evita cadenas de texto redundantes o propensas a errores tipográficos. Se estructuraron las tablas maestras de catálogo: `categories` (diseñada con una clave foránea recursiva `parent_id` para estructurar una jerarquía de dos niveles: Categoría Principal y Subcategoría), `colors` (con campo `hex_color` restringido por expresiones regulares para muestras visuales), `sizes` (con slugs únicos y orden posicional) y `fits` (cortes de calce específicos de jeans como Mom Fit o Wide Leg). Para representar los productos, se definió `products` con un identificador UUID, slug canónico único, descripciones, clave foránea `subcategory_id` y una máquina de estados estricta en el campo `status` (`'draft'`, `'published'`, `'archived'`).

Para resolver la relación muchos a muchos entre prendas y sus atributos físicos, se definieron tablas puente: `product_colors` y `product_sizes`. La persistencia transaccional de cada artículo concreto para el almacén y la venta se materializó en `product_variants`, donde cada registro enlaza el `product_id` con su `color_id` y `size_id` específicos, asegurando la unicidad de cada combinación mediante índices compuestos y constraints de exclusión. La economía y disponibilidad se desacoplaron a su vez en `variant_prices` (almacenando el importe exacto en céntimos enteros `amount_cents` para evadir los errores de redondeo de punto flotante) e `inventory_balances` / `inventory_levels` (controlando existencias físicas `quantity_on_hand` y reservas temporales `quantity_reserved`). Finalmente, se ejecutó la introspección del esquema mediante el CLI de Supabase para generar el archivo `database.types.ts`, garantizando la sincronización completa del tipado de TypeScript con el motor PostgreSQL.

[Captura de pantalla: Diagrama entidad-relación (ERD) generado en Supabase Studio mostrando las tablas de productos, atributos, variantes y precios]

[Captura de pantalla: Terminal ejecutando la sincronización de migraciones locales de Supabase y generación de tipos TypeScript]

---

### Día 3: Arquitectura de Seguridad: Supabase Auth, Roles y Row Level Security (RLS)

El tercer día estuvo consagrado al pilar de seguridad perimetral y gobernanza de accesos, garantizando que ninguna persona ajena a la operación pueda modificar datos del catálogo. Se estableció una premisa categórica: **no existe registro público de administradores**. La autenticación se delega en Supabase Auth (`auth.users`), pero la autorización se controla de manera granular en una tabla personalizada llamada `admin_profiles`, cuya clave primaria `user_id` referencia directamente a `auth.users(id)` con eliminación en cascada. Esta tabla almacena el rol operativo (`role = 'admin'`) y una bandera booleana crítica: `is_active`. De esta forma, si un usuario logra registrarse en el servicio de Auth mediante cualquier endpoint público, su acceso al panel sigue estando completamente vedado porque carece de un perfil activo en `admin_profiles`.

Para trasladar esta seguridad al nivel más profundo del sistema (la base de datos), se habilitó **Row Level Security (RLS)** en todas y cada una de las tablas del esquema. Se diseñó la función SQL almacenada `public.is_active_admin()` con modificador `security definer`, la cual evalúa si el token JWT remitente (`auth.uid()`) corresponde a un administrador activo en `admin_profiles`. A partir de esta función, se redactaron políticas RLS declarativas: mientras que los clientes anónimos (`anon`) únicamente pueden realizar operaciones `SELECT` sobre prendas con `status = 'published'`, las operaciones mutativas (`INSERT`, `UPDATE`, `DELETE`) en `products`, `product_variants`, `categories` y galerías quedan restringidas de manera inviolable a los usuarios donde `public.is_active_admin()` retorne verdadero.

A nivel de la aplicación Next.js, se complementó esta barrera de base de datos con una defensa en profundidad en dos capas. En primer lugar, se programó el middleware global de rutas en `middleware.ts`, interceptando todas las peticiones bajo `/admin/:path*` (exceptuando `/admin/login`) para refrescar la cookie de sesión mediante `@supabase/ssr` y evitar lecturas no autorizadas. En segundo lugar, se implementó en `lib/supabase/server.ts` la función cacheada `getActiveAdmin()`, la cual valida la identidad en el servidor antes de renderizar cualquier Layout o Server Action. Si la sesión no existe, o si la consulta a `admin_profiles` no arroja un perfil válido con rol de administrador activo, la función expulsa inmediatamente la petición y redirige al operador a la pantalla de login con un parámetro de error explícito.

[Captura de pantalla: Políticas de Row Level Security (RLS) configuradas en la interfaz de Supabase Database Policies]

[Captura de pantalla: Prueba en Postman/Insomnia demostrando el bloqueo de una petición PUT anónima con código HTTP 403 / RLS Violation]

---

### Día 4: Estructura del Panel: Shell Administrativo y Pantalla de Inicio de Sesión

Habiendo asegurado el núcleo de datos y permisos, la cuarta jornada se centró en la construcción del contenedor visual del panel administrativo. Siguiendo el sistema de diseño sobrio y editorial de Vintage 29, se diseñó la pantalla de acceso en `app/admin/login/page.tsx`. La interfaz presenta una tarjeta centralizada y minimalista con el wordmark oficial de la marca, campos de entrada accesibles para correo y contraseña, y un sistema contextual de mensajes de alerta alimentado por el Server Action `signInAction` (ubicado en `app/admin/actions.ts`). Dicho action recibe los datos del formulario, los valida rigurosamente con Zod, invoca `supabase.auth.signInWithPassword` y realiza una comprobación server-side contra `admin_profiles`. Si las credenciales fallan o el usuario carece de privilegios, se redirige con parámetros claros (`credentials` o `unauthorized`) sin revelar información interna del sistema.

Para las rutas interiores del panel, se construyó el layout compartido en `app/admin/(panel)/layout.tsx`. Este componente Server Component ejecuta en primera instancia la comprobación con `getActiveAdmin()`. Si la sesión es válida, renderiza una estructura envolvente (`admin-shell`) compuesta por una cabecera superior fija (`admin-header`) con el isotipo de la marca, enlaces de navegación directa hacia las distintas secciones de gestión (`PRODUCTOS`, `CATEGORÍAS`, `COLORES`, `TALLAS`, `FIT`), un botón directo para previsualizar el escaparate público (`VER TIENDA`) y un formulario con botón de cierre de sesión conectado a `signOutAction`.

Para resolver la hidratación del estado en el cliente sin incurrir en peticiones remotas redundantes hacia el servicio de Auth en cada navegación de Next.js, se introdujo el componente `AdminClientProvider.tsx` (`components/admin/AdminClientProvider.tsx`). Este componente aprovecha React Context para distribuir de forma segura el identificador verificado del administrador (`userId`) a los componentes hijos interactivos. Se concluyó la primera semana de trabajo con un cascarón administrativo funcional, protegido perimetralmente y listo para recibir los formularios de gestión del catálogo.

[Captura de pantalla: Interfaz de login administrativo en `/admin/login` con diseño sobrio y mensaje de error de credenciales]

[Captura de pantalla: Shell administrativo renderizado con la barra superior de navegación y el botón de cierre de sesión]

---

## Semana 2: Interfaces de Catálogo, Lógica Reactiva y Blindaje Operativo

```
   CRONOGRAMA - SEMANA 2
 ┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
 │     DÍA 5       │     DÍA 6       │     DÍA 7       │     DÍA 8       │
 │ Atributos Base  │ Listado Admin   │ Editor Prendas  │ Blindaje, Rellen│
 │ & Taxonomías    │ Filtros & Switch│ Matriz Variante │ y Reglas Delete │
 └─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

---

### Día 5: Gestión de la Taxonomía Base y Catálogos Auxiliares

Al iniciar la segunda semana, se abordó la creación de las interfaces para gobernar los atributos fundamentales que componen las prendas: **Categorías, Colores, Tallas y Cortes (Fit)**. Para que un producto pueda existir de forma consistente, el sistema requiere que estos valores maestros se encuentren debidamente catalogados. Se construyeron las vistas correspondientes bajo la convención de rutas de App Router: `app/admin/(panel)/categories/page.tsx`, `colors/page.tsx`, `sizes/page.tsx` y `fits/page.tsx`. Para evitar la duplicación de código, se diseñaron dos componentes cliente modulares: `AdminCatalogValuesClient.tsx` y `AdminCategoriesClient.tsx`, apoyados en la tabla genérica `CatalogValueTable.tsx`.

En la pantalla de **Categorías**, se implementó un modelo jerárquico estricto de dos niveles. El formulario permite registrar una categoría madre (ej. *Denim*, *Tops*) o seleccionar una categoría padre existente para crear una subcategoría especializada (ej. *Jeans Wide Leg*, *Polos Básicos*). En la pantalla de **Colores**, la interfaz incorpora un campo de muestra cromática (`hex_color`) conectado a un selector de color HTML5 nativo y previsualizaciones circulares en tiempo real. Por su parte, las pantallas de **Tallas** y **Fit** permiten ordenar alfanuméricamente y registrar las medidas comerciales (ej. 26 a 34 o XS a XL) y los cortes característicos de las prendas vaqueras.

Las mutaciones se gestionaron mediante los Server Actions `saveCategoryAction` y `saveCatalogValueAction`. Estos procedimientos reciben el `FormData`, normalizan de forma determinista el nombre para generar slugs aptos para URLs amigables mediante la función utilitaria `makeSlug` (eliminando diacríticos, acentos y caracteres especiales), calculan automáticamente el índice de orden secuencial (`sort_order`) y persisten la entidad. Tras la escritura, se ejecutan invalidaciones selectivas de caché con `revalidatePath` y `revalidateTag('catalog')`, garantizando que tanto la administración como las llamadas públicas reflejen inmediatamente los nuevos atributos sin requerir reinicios del servidor.

[Captura de pantalla: Vista de administración de Categorías mostrando la jerarquía de categorías principales y subcategorías]

[Captura de pantalla: Pantalla de administración de Colores con muestras cromáticas circulares y formulario de alta rápida]

---

### Día 6: Vista Principal del Catálogo: Listado Dinámico, Filtros y Switch de Publicación

La sexta jornada se centró en la creación de la pantalla principal de gestión de inventario: el listado de productos en `/admin/products` (`components/admin/AdminProductsClient.tsx`). Para maximizar la productividad de las administradoras de tienda, se descartó el enfoque de recargas completas de página en favor de una experiencia reactiva impulsada por el hook personalizado `useAdminQuery.ts`. Este hook implementa una estrategia de caché en memoria en el cliente con invalidación por prefijo de usuario, permitiendo filtrar y navegar entre cientos de artículos de forma instantánea sin latencias de red perceptibles.

En la parte superior se dispuso una barra de búsqueda por texto libre y cuatro selectores desplegables para filtrar de manera combinada por **Categoría/Subcategoría, Color, Talla y Fit**. La lógica del cliente en `loadProducts` resuelve de forma inteligente las consultas complejas: busca las coincidencias en las tablas puente (`product_colors`, `product_sizes`) y variantes (`product_variants`), calculando la intersección de identificadores de producto antes de solicitar el conjunto final a Supabase con ordenación descendente por fecha de actualización (`updated_at`).

La tabla resultante ofrece una visión operativa clara dividida en columnas estratégicas: **Producto** (con enlace directo a su editor), **Precio** (calculado al vuelo extrayendo el menor importe vigente registrado entre sus variantes), **Actualizado** (con fecha localizada para Perú) y **Estado**. En lugar de botones tradicionales dispersos, la publicación se controla con un **Switch interactivo minimalista** (verde salvia cuando la prenda está activa y pública en la tienda; gris cálido cuando es un borrador interno). Este switch envía el cambio mediante `setProductStatusAction`, el cual verifica previamente que el producto cumpla los requisitos mínimos antes de autorizar la visibilidad. Finalmente, la columna **Archivar** incorpora el componente `ArchiveButton.tsx`, el cual solicita una confirmación previa antes de ocultar una prenda sin destruir su registro ni romper los pedidos pasados asociados.

[Captura de pantalla: Tabla principal de `/admin/products` con filtros superiores, precios formateados en PEN y switch de estado]

[Captura de pantalla: Modal de confirmación del componente `ArchiveButton` para archivar un producto con confirmación de seguridad]

---

### Día 7: El Editor de Prendas: Matriz Reactiva de Variantes y Galería de Medios

El séptimo día representó el hito de mayor complejidad algorítmica y de diseño de experiencia de usuario: la construcción del formulario integral de producto en `components/admin/ProductForm.tsx`, utilizado tanto para creación (`/admin/products/new`) como para modificación (`/admin/products/[id]/edit`). La interfaz se dividió conceptualmente en cuatro cuadrantes de trabajo: **Información General** (título comercial, descripción corta y detallada, subcategoría jerárquica y corte fit), **Detalles de Confección** (filas dinámicas de colores, casillas de selección múltiple de tallas, composición textil en campo de texto libre y cuidados de lavado), **Matriz de Variantes** y **Galería Multimedia**.

La gran innovación del formulario radicó en la automatización del producto cartesiano entre atributos. A través del algoritmo `buildVariantCombinations` implementado en `lib/admin/variant-combinations.ts`, el sistema calcula en tiempo real todas las combinaciones posibles de color y talla a medida que la administradora marca o desmarca opciones. Crucialmente, la función preserva de manera inmutable los SKUs, precios en soles (`amount_cents`) y cantidades de stock físico que ya hubiesen sido capturados para las combinaciones preexistentes, evitando la pérdida accidental de datos al añadir una nueva talla. Para la gestión de fotos, la sección de galería permite subir archivos, reordenar la secuencia mediante botones de posición, asignar la fotografía de portada y catalogar imágenes con la etiqueta especial **Lifestyle**, permitiendo al frontend distribuir tomas de contexto a lo largo de la ficha descriptiva.

El guardado de toda la estructura de la prenda se unificó en el Server Action `saveProductAction`, el cual delega la persistencia en el procedimiento almacenado transaccional de PostgreSQL `public.save_catalog_product(p_payload jsonb)`. Este procedimiento recibe un único documento JSON estructurado y realiza dentro de una sola transacción ACID la inserción o actualización de la cabecera del producto, el mantenimiento de las filas en `product_colors` y `product_sizes`, la sincronización de las variantes en `product_variants`, la actualización de precios en `variant_prices` y el balance de inventario en `inventory_balances`. Esta atomicidad garantiza que nunca pueda quedar un producto a medio guardar o con variantes huérfanas ante un corte imprevisto de red.

[Captura de pantalla: Formulario de prenda en `/admin/products/new` mostrando la sección de Información General y los selectores de confección]

[Captura de pantalla: Matriz reactiva de variantes en tiempo real con campos editables de SKU, Precio y Stock por cada talla/color]

[Captura de pantalla: Galería multimedia de la prenda con opciones de ordenamiento y switch de fotografía tipo Lifestyle]

---

### Día 8: Blindaje Operativo: Reglas de Publicación, Alertas de Impacto y Cascada Limpia

La última jornada del plan de desarrollo se dedicó por entero al endurecimiento, pruebas defensivas y blindaje contra accidentes operativos. En un entorno comercial real, un operador puede cometer errores humanos que degraden la tienda pública (por ejemplo, publicar un vestido sin precio, o desmarcar una talla que ya tenía inventario asignado). Para erradicar este riesgo, se implementaron **Las 5 Reglas Obligatorias de Publicación**:
1. Tener obligatoriamente asignada una **Subcategoría** válida.
2. Contar con al menos un **Color** asignado.
3. Contar con al menos una **Talla** seleccionada.
4. Poseer como mínimo una **Imagen** en la galería de medios.
5. Contar con al menos una **Variante activa con SKU y Precio mayor a cero**.

Para garantizar que estas reglas sean inviolables tanto desde la interfaz web como ante invocaciones directas por API, se implementó en PostgreSQL la migración `202610090001_material_string_publish_rules_and_delete_values.sql` con la función `validate_product_publishable()`. Esta función se enlazó a un disparador de restricción diferido (`constraint trigger ... deferrable initially deferred`). Al ser diferido, el disparador permite que el procedimiento `save_catalog_product` inserte primero los colores, tallas, variantes e imágenes dentro de la transacción, y valida el cumplimiento estricto de las 5 condiciones justo al momento de realizar el `COMMIT`. Si falta algún requisito y el producto tiene estado `published`, la transacción emite una excepción con código SQLSTATE `23514` que el Server Action intercepta y traduce en mensajes de error perfectamente legibles para la usuaria. En cambio, si la prenda se guarda en estado `draft` (Borrador), el sistema es 100% permisivo, permitiendo a las administradoras guardar prendas a medio completar para terminarlas con posterioridad.

Por último, se construyó el mecanismo de **Protección contra Eliminaciones Accidentales y Cascada Inteligente**. En el formulario de producto, si se desmarca un color o talla que ya poseía variantes creadas, el sistema abre un modal de confirmación con el impacto exacto (`RemovalRequest`), listando los SKUs y unidades de stock que se suprimirán. Asimismo, a nivel de atributos globales en `CatalogValueTable.tsx`, la eliminación de un color, talla o categoría invoca la función RPC `delete_catalog_value`. Si el atributo estaba en uso, el sistema no borra los productos asociados; en su lugar, desvincula el atributo, purga limpiamente las variantes afectadas y **despublica automáticamente el producto pasándolo a Borrador**. De este modo, la vitrina digital de Vintage 29 queda completamente protegida contra artículos incompletos o rotos, culminando con éxito las dos semanas de desarrollo del panel de administración.

[Captura de pantalla: Modal de advertencia de impacto destructivo detallando los SKUs y stock que se perderán al desmarcar una talla existente]

[Captura de pantalla: Diálogo de confirmación para eliminar un valor de catálogo global mostrando la lista de productos que pasarán a Borrador]

---

## Conclusiones y Aprendizajes Técnicos

La realización de este proyecto permitió consolidar conceptos avanzados de ingeniería de software aplicados a un caso real de comercio electrónico:

1. **Arquitectura desacoplada y resiliencia:** Separar la fuente de verdad del canal online respecto al ERP empresarial (dejando a Odoo exclusivamente para la facturación final) evitó cuellos de botella y garantizó una autonomía operativa total para el equipo de marketing y catálogo.
2. **Defensa en profundidad en seguridad:** La combinación de autenticación perimetral (Supabase Auth), autorización basada en perfiles (`admin_profiles`), políticas estrictas a nivel de base de datos (RLS) y validación tipada en Server Actions demostró ser una arquitectura sumamente sólida contra ataques y manipulaciones indebidas.
3. **Integridad transaccional y disparadores diferidos:** La implementación de triggers diferidos (`DEFERRED`) en PostgreSQL resolvió de forma elegante el dilema entre restricciones de integridad estrictas y la inserción secuencial de entidades complejas en transacciones compuestas.
4. **UX Defensiva para operaciones comerciales:** Los sistemas administrativos no solo deben ser eficientes, sino preventivos. Los diálogos de impacto, las confirmaciones de variantes y la reversión automática de productos a borrador ante borrados en cascada aseguran la estabilidad continua del negocio.

---
*Informe técnico preparado y documentado para el repositorio de Vintage 29.*
