# Bitácora de avances — Tienda online Vintage 29

- **Periodo:** desde el 13 de octubre de 2026.
- **Organización:** tres semanas de cuatro jornadas de trabajo.
- **Proyecto:** tienda online y panel de administración de Vintage 29.

## Punto de partida y organización

Al terminar el 12 de octubre contaba con una tienda conectada a Supabase y un panel con inicio de sesión y administración de productos, categorías, colores, tallas y tipos de fit. A partir de esa base continué con la gestión de imágenes, la edición de la página principal y el fortalecimiento del catálogo para preparar su traslado a otro proyecto Supabase.

Para presentar el avance de manera ordenada, agrupé el trabajo en doce jornadas temáticas. No son una reconstrucción exacta de fechas: Git registra commits el 13, 14, 15 y 21 de octubre; parte del trabajo posterior estaba en el directorio antes de incorporarse a los commits. Los bloques siguientes son extractos del código actual y se incluyen para explicar las decisiones principales.

---

## Semana 1 — Medios y presentación de la tienda

### Día 1 — Almacenamiento y biblioteca de medios

Comencé revisando cómo se gestionaban las imágenes de los productos y de la portada. El panel ya permitía administrar el catálogo, pero era necesario reunir los archivos en un lugar donde fuera posible encontrarlos, relacionarlos con las prendas y volver a utilizarlos en distintas secciones. Para ello incorporé Supabase Storage y una biblioteca accesible desde la administración.

La biblioteca muestra información del archivo y de sus usos, además de opciones para buscar, filtrar y copiar enlaces. También se contempló la asociación de imágenes a un color concreto, de modo que una prenda con varias presentaciones pudiera mantener una galería más clara. En el código actual la consulta usa paginación para evitar que la lista quede incompleta cuando aumente la cantidad de archivos.

**Código: carga de la biblioteca de medios — `components/admin/AdminMediaClient.tsx`**

```tsx
  async function loadMedia() {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const data = await readAllPages((from,to) => supabase.from("view_media_usage").select("*")
        .order("created_at", { ascending:false }).order("id").range(from,to));
      setMediaList(data as ViewMediaUsageRow[]);
    } catch {
      setUploadError("No se pudo cargar la biblioteca de medios.");
    }
    setLoading(false);
  }
```

### Día 2 — Organización y orden de fotografías

Una vez que los archivos se encontraban en la biblioteca, trabajé en el orden de la galería de cada producto. Al principio el desplazamiento mediante flechas resultaba poco práctico para varias imágenes, así que el flujo evolucionó hacia el arrastre de elementos. También se añadieron opciones de visualización de la biblioteca en cuadrícula o lista y agrupación por producto.

La posición es importante porque determina cómo se presentan las fotografías en la tienda. Al soltar una imagen, el formulario reconstruye la lista, recalcula la posición de cada elemento y señala el primero como principal. Con ello el orden queda preparado para guardarse junto con el resto de la ficha.

**Código: fragmento de actualización del orden de la galería — `components/admin/ProductForm.tsx`**

```tsx
                onDragStart={(e) => {
                  setDraggedIndex(index);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverIndex !== index) setDragOverIndex(index);
                }}
                onDragLeave={() => {
                  if (dragOverIndex === index) setDragOverIndex(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverIndex(null);
                  if (draggedIndex === null || draggedIndex === index) return;
                  setMedia((current) => {
                    const next = [...current];
                    const [dragged] = next.splice(draggedIndex, 1);
                    next.splice(index, 0, dragged);
                    return next.map((mediaItem, position) => ({
                      ...mediaItem,
                      position,
                      is_primary: position === 0,
                    }));
                  });
                  setDraggedIndex(null);
                }}
```

### Día 3 — Portada y recursos audiovisuales

Continué con la página de inicio, especialmente con el carrusel principal y su relación con la barra de navegación. Ajusté la presentación de la portada y la carga de imágenes para conseguir una transición más limpia. También se habilitó que el área principal dirigiera al destino configurado para cada slide.

El carrusel admite una secuencia de recursos y avanza automáticamente cuando existe más de uno. En esta etapa se trabajó además el soporte de video en la tienda y en el panel. Los formatos y límites de carga se volvieron a revisar durante el cierre del catálogo, por lo que los límites actuales deben consultarse en la documentación y configuración vigentes.

**Código: avance del carrusel y retorno al primer elemento — `components/catalog/HeroCarousel.tsx`**

```tsx
  // Avance automático: siempre hacia adelante. El clon de la primera imagen
  // al final de la pista hace que el loop se sienta continuo.
  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => Math.min(current + 1, count));
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count]);

  // Al aterrizar en el clon saltamos a la posición real sin animación.
  useEffect(() => {
    if (index !== count) return;
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
    }, TRANSITION_MS + 60);
    return () => window.clearTimeout(timer);
  }, [index, count]);
```

### Día 4 — Edición de portada desde el panel

Preparé la sección Home del administrador para que el contenido de la página principal pudiera modificarse desde una interfaz. El panel permite gestionar slides y banners, definir el recurso visual y el enlace asociado, y decidir si cada contenido estará activo. De esta forma la actualización de una campaña no depende de editar manualmente la página pública.

También incorporé una vista para ordenar slides y editores modales para sus datos. Para presentar el contenido publicado, la tienda consulta las entradas activas y respeta el orden guardado. Este paso conecta lo que configura la persona administradora con lo que aparece en la portada.

**Código: fragmento de la consulta de slides activos — `lib/catalog/home.ts`**

```ts
  const [slidesResult, bannerResult, couponResult, mosaicMiniResult, socialResult, mosaicResult] = await Promise.all([
    supabase
      .from("home_slides")
      .select("id, title, subtitle, media_type, media_url, button_label, href, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
```

---

## Semana 2 — Experiencia de edición y contenido dinámico

### Día 5 — Ajustes de ventanas y previsualizaciones

Con los editores de Home en funcionamiento, revisé el comportamiento de las ventanas modales. Ajusté márgenes, bordes y dimensiones de las previsualizaciones para que imágenes y videos se adaptaran mejor a sus proporciones. El objetivo era que el contenido se pudiera reconocer antes de guardar sin generar espacios innecesarios.

También traté la interacción con la página de fondo. Mientras alguno de los editores está abierto se bloquea el desplazamiento del documento y, al cerrarlo, se restaura el valor anterior. Además se evitó el cierre accidental por un clic en el fondo, para reducir interrupciones durante la edición.

**Código: control del desplazamiento al abrir un modal — `components/admin/AdminHomeClient.tsx`**

```tsx
  const isAnyModalOpen =
    slideModalOpen ||
    reorderModalOpen ||
    couponModalOpen ||
    mosaicMiniModalOpen ||
    promoModalOpen ||
    socialModalOpen ||
    mosaicModalOpen;

  useEffect(() => {
    if (isAnyModalOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalBodyOverflow;
      };
    }
  }, [isAnyModalOpen]);
```

### Día 6 — Mosaico, banners y sección de comunidad

Amplié la configuración del Home para incluir un mosaico de cuatro imágenes, un minibanner intermedio y una sección de comunidad o redes sociales. Cada bloque tiene una función distinta dentro del recorrido visual: presentar campañas, separar secciones o dirigir a la comunidad de la marca.

El administrador puede actualizar los recursos y enlaces desde el panel, mientras que la tienda consulta el contenido activo y construye cada sección con esos datos. Al organizar los bloques por identificadores se facilita distinguir el banner principal, los banners intermedios y las demás piezas de la página.

**Código: composición del mosaico de campañas — `components/catalog/CampaignMosaic.tsx`**

```tsx
export default function CampaignMosaic({ items, label = "Explora nuestras colecciones" }: CampaignMosaicProps) {
  const tiles = items.slice(0, 4);
  if (tiles.length !== 4 || tiles.some((tile) => !tile.image)) return null;

  return (
    <section className="home-campaign-mosaic" aria-label={label}>
      {tiles.map((tile, index) => (
        <article className="home-campaign-tile" key={`${tile.image}-${index}`}>
          <Image
            className="home-campaign-image"
            src={tile.image}
            alt={tile.imageAlt ?? ""}
            fill
            sizes="50vw"
            quality={90}
            loading="lazy"
          />
          <Link className="home-campaign-button" href={tile.href}>
            {tile.buttonLabel}
          </Link>
        </article>
      ))}
    </section>
  );
}
```

### Día 7 — Enlaces de imágenes y galería de producto

Revisé el ingreso de fotografías en el editor de productos. Se incorporó la posibilidad de usar una URL pública con previsualización y agregar el resultado a la galería. Esto complementa el flujo de subida de archivos y permite asociar imágenes a un color o mantenerlas disponibles para todas las variantes.

Durante el cierre del catálogo incorporé una validación del origen de los archivos. El código acepta rutas locales de imágenes que cumplen determinadas condiciones o URL del bucket público del Supabase configurado. Esta regla explica también por qué, en la prueba temporal con base local e imágenes de otro proyecto, fue necesario un ajuste aislado para ese entorno.

**Código: validación del origen de medios — `lib/catalog/validation.ts`**

```ts
export function isCatalogMediaUrl(
  value: string,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
): boolean {
  if (
    /^\/imagenes\/[A-Za-z0-9 _()./-]+$/.test(value) &&
    !value.split("/").includes("..")
  )
    return true;
  try {
    if (!supabaseUrl) return false;
    const asset = new URL(value);
    const project = new URL(supabaseUrl);
    return (
      asset.origin === project.origin &&
      !asset.username &&
      !asset.password &&
      asset.pathname.startsWith("/storage/v1/object/public/catalog-media/") &&
      !asset.hash &&
      !asset.search
    );
  } catch {
    return false;
  }
}
```

### Día 8 — Ficha pública y lectura del catálogo

Con los cambios del panel listos, revisé cómo se reflejaban en la tienda. La ficha muestra el nombre, descripción, categoría, colores, tallas, precio y galería disponibles para cada producto. También se presentan otras prendas para continuar la navegación desde el detalle.

La consulta del catálogo limita la lectura a productos publicados que no estén eliminados y recupera sus relaciones con imágenes, colores, tallas, categoría y fit. El carrito queda como trabajo de una etapa posterior; en este avance me concentré en que el catálogo pudiera administrarse y visualizarse correctamente.

**Código: consulta base de productos publicados — `lib/catalog/products.ts`**

```ts
function catalogQuery(supabase: SupabaseClient<Database>) {
  return supabase
    .from("products")
    .select(
      `
    id, subcategory_id, name, slug, description, short_description, gender, fit_id,
    material_summary, care_instructions, status, is_featured, deleted_at, created_at, updated_at,
    product_media(id, color_id, asset_path, media_type, alt_text, position, is_primary, is_lifestyle),
    product_colors(color_id, position, color:colors!product_colors_color_id_fkey(id, name, hex_color)),
    product_sizes(position, size:sizes!product_sizes_size_id_fkey(id, name)),
    subcategory:categories!products_subcategory_id_fkey(id, name, slug, parent_id),
    fit:fits!products_fit_id_fkey(name)
  `,
    )
    .eq("status", "published")
    .is("deleted_at", null);
}
```

---

## Semana 3 — Integridad del catálogo y preparación de migración

### Día 9 — Productos y combinaciones de variantes

En la tercera etapa revisé la estructura del editor de productos. El formulario reúne la información general, la clasificación, las fotografías y los atributos que dan lugar a las variantes. Un producto puede permanecer como borrador mientras se completan los datos necesarios para su publicación.

Para construir las variantes, la lógica toma los colores y tallas seleccionados y genera sus combinaciones. Cuando una combinación ya existe, la identifica mediante sus dos atributos para conservar sus datos. Esto ayuda a que modificar las selecciones no obligue a rehacer innecesariamente la información de cada variante.

**Código: preparación de las combinaciones existentes — `lib/admin/variant-combinations.ts`**

```ts
if (!colorIds.length && !sizeIds.length) return existing;

  const colors: Array<string | null> = colorIds.length ? colorIds : [null];
  const sizes: Array<string | null> = sizeIds.length ? sizeIds : [null];
  const previousByCombination = new Map(
    existing.map((variant) => [`${variant.color_id ?? ""}::${variant.size_id ?? ""}`, variant]),
  );

  return colors.flatMap((colorId, colorIndex) => sizes.map((sizeId, sizeIndex) => {
    const position = colorIndex * sizes.length + sizeIndex;
    const combination = `${colorId ?? ""}::${sizeId ?? ""}`;
    const variantName = [colorId ? colorNames.get(colorId) : null, sizeId ? sizeNames.get(sizeId) : null]
      .filter(Boolean)
      .join(" / ");
    const previous = previousByCombination.get(combination);
    if (previous) {
      return { ...previous, color_id: colorId, size_id: sizeId, variant_name: variantName, position };
    }
    return {
      id: createId(),
      color_id: colorId,
      size_id: sizeId,
      sku: "",
      variant_name: variantName,
      amount_cents: null,
      quantity_on_hand: 0,
      quantity_reserved: 0,
      is_active: true,
      position,
    };
  }));
}
```

### Día 10 — Precios, existencias y control de acceso

Reforcé la separación entre información pública y administrativa. La tienda necesita mostrar un precio vigente y disponibilidad, mientras que la gestión detallada de existencias e historial corresponde al panel. En el cierre del catálogo se añadieron comprobaciones para ajustes de stock, validaciones de publicación y controles de cambios concurrentes.

También revisé el acceso a las operaciones administrativas: la sesión debe corresponder a un perfil activo de administrador y las políticas de base de datos complementan ese control. Para los precios, la función de lectura considera el estado y las fechas de inicio y fin, evitando tratar como vigente un precio inactivo, futuro o vencido.

**Código: comprobación de vigencia del precio — `lib/catalog/pricing.ts`**

```ts
export function isCurrentPrice(
  price: {
    is_active: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  },
  now = Date.now(),
) {
  return (
    price.is_active &&
    (!price.starts_at || Date.parse(price.starts_at) <= now) &&
    (!price.ends_at || Date.parse(price.ends_at) > now)
  );
}
```

### Día 11 — Transferencia y prueba de migración local

Preparé un procedimiento para trasladar el catálogo a un proyecto Supabase nuevo. La exportación reúne los datos compatibles y los archivos; la importación conserva identificadores y referencias, y adapta las URL de Storage al destino. Como los usuarios de autenticación no se incluyen, la cuenta administrativa debe prepararse por separado en el nuevo proyecto.

Para comprobar el flujo se utilizaron dos instancias locales de Supabase con Docker, una de origen y otra de destino. La restauración exige un catálogo de destino vacío y realiza la inserción de datos en una transacción. La prueba local quedó registrada como satisfactoria, pero no constituye una migración definitiva al nuevo proyecto en la nube.

**Código: fragmento de protección de la restauración — `supabase/migrations/202610270002_catalog_transfer.sql`**

```sql
create or replace function public.restore_catalog_snapshot(p_snapshot jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare name text; records jsonb; tables jsonb := p_snapshot->'tables';
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
  if p_snapshot->>'format' is distinct from 'vintage29-catalog-v1' or tables is null then raise exception 'SNAPSHOT_FORMAT_INVALID'; end if;
  lock table public.products,public.home_slides,public.home_banners,public.media_assets in exclusive mode;
  if exists(select 1 from public.products) or exists(select 1 from public.home_slides)
    or exists(select 1 from public.home_banners) or exists(select 1 from public.media_assets) then
    raise exception 'TARGET_CATALOG_NOT_EMPTY' using errcode='23514';
  end if;
```

### Día 12 — Comprobaciones y documentación

Para cerrar el avance revisé las instrucciones de instalación, transferencia y verificación, junto con las pruebas del catálogo. Se incorporaron herramientas para comprobar el esquema, permisos y flujo de la aplicación, además de una configuración de integración continua. La comprobación de tipos y las pruebas unitarias ayudan a detectar regresiones antes de trasladar los cambios.

También preparé una copia temporal del catálogo remoto en una base local, manteniendo las URL públicas anteriores para revisar la tienda. Esta copia no se sincroniza automáticamente y el ajuste temporal de imágenes no sustituye la futura transferencia de archivos al Storage definitivo. Como siguiente paso queda crear el proyecto real, migrar los datos y archivos y comprobar de nuevo los accesos y la publicación.

**Código: lectura paginada para no perder registros — `lib/supabase/pagination.ts`**

```ts
export async function readAllPages<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 200,
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await page(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}
```

---

## Tarea significativa — Edición de la página de inicio desde el panel

### Título de la tarea

**Implementación del editor de Home para administrar portada y banners de Vintage 29.**

### Motivo de la elección

Elegí esta tarea porque conecta varias partes del proyecto en un flujo que puede usar directamente la persona encargada de la tienda. No se limita a mostrar una imagen: requiere seleccionar un recurso, preparar su vista previa, guardar la configuración, proteger la operación y reflejar el resultado en la página pública.

También es representativa del objetivo del panel. Las campañas visuales cambian con frecuencia y administrar esos contenidos desde Home reduce la necesidad de intervenir en el código cada vez que se quiera modificar una portada o un enlace. Los slides y banners comparten el mismo propósito, aunque cada tipo de bloque tiene su propio editor y datos.

### Desarrollo paso a paso

1. **Identifiqué los bloques administrables.** Separé el carrusel principal de los minibanners, el mosaico, el banner promocional y la sección de comunidad. Cada sección necesitaba información distinta, pero todas debían poder mostrarse u ocultarse según su estado.
2. **Preparé la lectura de datos.** Desde el panel se consultan los registros de slides y banners y se almacenan en el estado de la interfaz. En la tienda pública se consultan los elementos activos; para los slides se utiliza el orden guardado.
3. **Construí los editores y la previsualización.** Organicé la edición en ventanas modales donde se selecciona o asigna una imagen o video, se introduce el destino y se revisa el recurso antes de confirmar. Mientras un modal está abierto, se controla el desplazamiento del fondo.
4. **Preparé los datos para guardar.** Al enviar el formulario, el cliente comprueba que exista un recurso multimedia y reúne el identificador, URL, tipo, enlace, orden y estado en `FormData`. Después llama a una acción de servidor; si hay un error lo presenta y, si la operación termina correctamente, cierra el editor y recarga los datos.
5. **Validé y guardé en el servidor.** La acción verifica la sesión de administrador activo, valida el contenido y decide si debe actualizar un slide existente o insertar uno nuevo. Tras guardar, invalida las rutas y la etiqueta de caché relacionadas con el Home para que el cambio pueda reflejarse en la tienda.
6. **Añadí el ordenamiento y revisé el resultado.** La interfaz prepara una lista de identificadores en el orden elegido y la envía a una acción específica. Finalmente revisé el contenido de Home desde el panel y la página pública, teniendo en cuenta que los enlaces y recursos deben existir en el entorno utilizado.

**Código del cliente: preparación y envío del slide — `components/admin/AdminHomeClient.tsx`**

```tsx
  async function handleSaveSlide(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSlide?.media_url) {
      setError("Debes subir o asignar una imagen o video.");
      return;
    }
    setSavingSlide(true);
    const formData = new FormData();
    if (editingSlide.id) formData.set("id", editingSlide.id);
    formData.set("media_url", editingSlide.media_url);
    formData.set("media_type", editingSlide.media_type ?? (isVideoUrl(editingSlide.media_url) ? "video" : "image"));
    formData.set("href", editingSlide.href ?? "#productos");
    formData.set("sort_order", String(editingSlide.sort_order ?? slides.length + 1));
    formData.set("is_active", (editingSlide.is_active ?? true) ? "true" : "false");

    const res = await saveHomeSlideAction(formData);
    setSavingSlide(false);
    if (res.error) {
      setError(res.error);
    } else {
      notify("Slide guardado correctamente.");
      setSlideModalOpen(false);
      setEditingSlide(null);
      loadData();
    }
  }
```

**Código del servidor: autorización, validación y persistencia — `app/admin/actions.ts`**

```ts
export async function saveHomeSlideAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const { supabase, user } = await getActiveAdmin();
  if (!supabase || !user) return { error: "No autorizado." };

  const id = String(formData.get("id") ?? "").trim() || undefined;
  const title = String(formData.get("title") ?? "").trim() || null;
  const subtitle = String(formData.get("subtitle") ?? "").trim() || null;
  const media_url = String(formData.get("media_url") ?? "").trim();
  const isVideoExt = /\.(mp4|mov|webm)(\?.*)?$/i.test(media_url);
  const rawMediaType = String(formData.get("media_type") ?? "").trim();
  const media_type: "image" | "video" = (rawMediaType === "video" || isVideoExt) ? "video" : "image";
  const button_label = String(formData.get("button_label") ?? "").trim() || null;
  const href = String(formData.get("href") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const is_active = formData.get("is_active") === "true" || formData.get("is_active") === "on";

  const validation = z.object({ id: z.uuid().optional(), title: z.string().max(180).nullable(), subtitle: z.string().max(1000).nullable(),
    media_url: homeMediaSchema, href: homeLinkSchema.nullable(), button_label: z.string().max(100).nullable(), sort_order: z.number().int().min(0).max(10000) })
    .safeParse({ id, title, subtitle, media_url, href, button_label, sort_order });
  if (!validation.success) return { error: validation.error.issues[0].message };

  const payload = {
    title,
    subtitle,
    media_url,
    media_type,
    button_label,
    href,
    sort_order,
    is_active,
  };

  if (id) {
    const { data, error } = await supabase.from("home_slides").update(payload).eq("id", id).select("id").maybeSingle();
    if (!data && !error) return { error: "El slide ya no existe. Actualiza la vista." };
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("home_slides").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/home");
  revalidateTag("home");
  return { success: true };
}
```

El resultado es un flujo en el que la edición y la presentación de la portada quedan conectadas. Para la migración definitiva será necesario repetir la comprobación con los archivos, usuarios y permisos del proyecto Supabase de destino.
