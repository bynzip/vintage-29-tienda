-- Materiales vuelve a ser un texto simple del producto (como cuidados).
-- Se endurecen las reglas de publicación: un producto publicado debe tener
-- subcategoría, colores, tallas, al menos una imagen y una variante vendible.
-- Los valores de catálogo (categorías, colores, tallas, fits) se eliminan en
-- definitivo en lugar de desactivarse: se quitan sus relaciones con productos,
-- se borran las variantes afectadas y los productos publicados implicados
-- pasan a borrador.

-- 1) Material como texto simple en products.
alter table public.products add column if not exists material_summary text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'material_id'
  ) then
    execute '
      update public.products as product
      set material_summary = material.name
      from public.materials as material
      where product.material_id = material.id
        and product.material_summary is null
    ';
  end if;
end $$;

alter table public.products drop column if exists material_id;

-- 2) La subcategoría deja de ser obligatoria en borrador; solo se exige para publicar.
create or replace function public.validate_product_subcategory()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subcategory_id is not null and not exists (
    select 1 from public.categories as subcategory
    where subcategory.id = new.subcategory_id and subcategory.parent_id is not null
  ) then
    raise exception 'PRODUCT_REQUIRES_SUBCATEGORY' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- 3) Reglas de publicación como disparador diferido: se evalúa al hacer COMMIT,
-- después de que save_catalog_product haya insertado colores, tallas, variantes
-- y media del producto dentro de la misma transacción.
create or replace function public.validate_product_publishable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'published' or new.deleted_at is not null then
    return new;
  end if;
  if new.subcategory_id is null then
    raise exception 'PUBLISH_REQUIRES_SUBCATEGORY' using errcode = '23514';
  end if;
  if not exists (select 1 from public.product_colors as link where link.product_id = new.id) then
    raise exception 'PUBLISH_REQUIRES_COLORS' using errcode = '23514';
  end if;
  if not exists (select 1 from public.product_sizes as link where link.product_id = new.id) then
    raise exception 'PUBLISH_REQUIRES_SIZES' using errcode = '23514';
  end if;
  if not exists (select 1 from public.product_media as media where media.product_id = new.id) then
    raise exception 'PUBLISH_REQUIRES_MEDIA' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.product_variants as variant
    where variant.product_id = new.id
      and variant.is_active
      and nullif(btrim(variant.sku), '') is not null
      and exists (
        select 1 from public.variant_prices as price
        where price.variant_id = variant.id and price.is_active and price.amount_cents > 0
      )
  ) then
    raise exception 'PUBLISH_REQUIRES_VARIANT' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists products_validate_publishable on public.products;
create constraint trigger products_validate_publishable
after insert or update on public.products
deferrable initially deferred
for each row when (new.status = 'published')
execute function public.validate_product_publishable();

-- 4) Guardado de producto: material_summary como texto y borrado real de las
-- variantes que ya no forman parte del producto (antes solo se desactivaban).
create or replace function public.save_catalog_product(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_product_id uuid;
  variant_item jsonb;
  price_item jsonb;
  inventory_item jsonb;
  media_item jsonb;
  current_variant_id uuid;
  current_color_id uuid;
  current_size_id uuid;
  current_combination_key text;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  saved_product_id := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());

  insert into public.products (
    id, brand_id, subcategory_id, name, slug, description, short_description,
    gender, age_group, fit_id, material_summary, care_instructions, country_of_origin,
    status, is_featured, seo_title, seo_description
  ) values (
    saved_product_id, nullif(p_payload->>'brand_id', '')::uuid,
    nullif(p_payload->>'subcategory_id', '')::uuid, p_payload->>'name',
    p_payload->>'slug', nullif(p_payload->>'description', ''),
    nullif(p_payload->>'short_description', ''), 'female',
    coalesce(nullif(p_payload->>'age_group', ''), 'adult'),
    nullif(p_payload->>'fit_id', '')::uuid,
    nullif(p_payload->>'material_summary', ''),
    nullif(p_payload->>'care_instructions', ''),
    nullif(p_payload->>'country_of_origin', ''),
    coalesce(nullif(p_payload->>'status', ''), 'draft'),
    coalesce((p_payload->>'is_featured')::boolean, false),
    nullif(p_payload->>'seo_title', ''), nullif(p_payload->>'seo_description', '')
  )
  on conflict (id) do update set
    subcategory_id = excluded.subcategory_id,
    name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    short_description = excluded.short_description,
    gender = 'female',
    age_group = excluded.age_group,
    fit_id = excluded.fit_id,
    material_summary = excluded.material_summary,
    care_instructions = excluded.care_instructions,
    country_of_origin = excluded.country_of_origin,
    status = excluded.status,
    is_featured = excluded.is_featured,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    deleted_at = null;

  delete from public.product_colors where product_id = saved_product_id;
  insert into public.product_colors (product_id, color_id, position)
  select saved_product_id, incoming.color_id::uuid, incoming.position::integer
  from jsonb_array_elements_text(coalesce(p_payload->'color_ids', '[]'::jsonb)) with ordinality as incoming(color_id, position)
  where nullif(incoming.color_id, '') is not null;

  delete from public.product_sizes where product_id = saved_product_id;
  insert into public.product_sizes (product_id, size_id, position)
  select saved_product_id, incoming.size_id::uuid, incoming.position::integer
  from jsonb_array_elements_text(coalesce(p_payload->'size_ids', '[]'::jsonb)) with ordinality as incoming(size_id, position)
  where nullif(incoming.size_id, '') is not null;

  update public.product_variants
  set is_active = false,
      position = position + 1000000,
      combination_key = 'inactive:' || id::text
  where product_id = saved_product_id;

  for variant_item in select value from jsonb_array_elements(coalesce(p_payload->'variants', '[]'::jsonb)) loop
    current_color_id := nullif(variant_item->>'color_id', '')::uuid;
    current_size_id := nullif(variant_item->>'size_id', '')::uuid;
    if current_color_id is null and current_size_id is null then
      raise exception 'VARIANT_REQUIRES_COLOR_OR_SIZE' using errcode = '23514';
    end if;
    if current_color_id is not null and not exists (
      select 1 from public.product_colors
      where product_id = saved_product_id and color_id = current_color_id
    ) then
      raise exception 'VARIANT_COLOR_NOT_SELECTED' using errcode = '23503';
    end if;
    if current_size_id is not null and not exists (
      select 1 from public.product_sizes
      where product_id = saved_product_id and size_id = current_size_id
    ) then
      raise exception 'VARIANT_SIZE_NOT_SELECTED' using errcode = '23503';
    end if;
    current_combination_key := 'color:' || coalesce(current_color_id::text, '') || ':size:' || coalesce(current_size_id::text, '');
    current_variant_id := coalesce(nullif(variant_item->>'id', '')::uuid, gen_random_uuid());

    insert into public.product_variants (
      id, product_id, color_id, size_id, sku, variant_name, combination_key,
      weight_grams, requires_shipping, track_inventory, allow_backorder, is_active, position
    ) values (
      current_variant_id, saved_product_id, current_color_id, current_size_id,
      nullif(trim(variant_item->>'sku'), ''), nullif(variant_item->>'variant_name', ''),
      current_combination_key, nullif(variant_item->>'weight_grams', '')::integer,
      coalesce((variant_item->>'requires_shipping')::boolean, true),
      coalesce((variant_item->>'track_inventory')::boolean, true),
      coalesce((variant_item->>'allow_backorder')::boolean, false),
      coalesce((variant_item->>'is_active')::boolean, true),
      coalesce((variant_item->>'position')::integer, 0)
    )
    on conflict (id) do update set
      color_id = excluded.color_id,
      size_id = excluded.size_id,
      sku = excluded.sku,
      variant_name = excluded.variant_name,
      combination_key = excluded.combination_key,
      weight_grams = excluded.weight_grams,
      requires_shipping = excluded.requires_shipping,
      track_inventory = excluded.track_inventory,
      allow_backorder = excluded.allow_backorder,
      is_active = excluded.is_active,
      position = excluded.position
    where product_variants.product_id = excluded.product_id;

    update public.variant_prices as price
    set is_active = false
    where price.variant_id = current_variant_id;

    for price_item in select value from jsonb_array_elements(coalesce(variant_item->'prices', '[]'::jsonb)) loop
      insert into public.variant_prices (
        variant_id, price_list_id, amount_cents, compare_at_amount_cents,
        cost_amount_cents, tax_included, starts_at, ends_at, is_active
      ) values (
        current_variant_id, (price_item->>'price_list_id')::uuid,
        (price_item->>'amount_cents')::bigint,
        nullif(price_item->>'compare_at_amount_cents', '')::bigint,
        nullif(price_item->>'cost_amount_cents', '')::bigint,
        coalesce((price_item->>'tax_included')::boolean, true),
        nullif(price_item->>'starts_at', '')::timestamptz,
        nullif(price_item->>'ends_at', '')::timestamptz,
        coalesce((price_item->>'is_active')::boolean, true)
      );
    end loop;

    for inventory_item in select value from jsonb_array_elements(coalesce(variant_item->'inventory', '[]'::jsonb)) loop
      insert into public.inventory_levels (
        variant_id, warehouse_id, quantity_on_hand, quantity_reserved, reorder_point, incoming_quantity
      ) values (
        current_variant_id, (inventory_item->>'warehouse_id')::uuid,
        coalesce((inventory_item->>'quantity_on_hand')::integer, 0),
        coalesce((inventory_item->>'quantity_reserved')::integer, 0),
        coalesce((inventory_item->>'reorder_point')::integer, 0),
        coalesce((inventory_item->>'incoming_quantity')::integer, 0)
      )
      on conflict (variant_id, warehouse_id) do update set
        quantity_on_hand = excluded.quantity_on_hand,
        quantity_reserved = excluded.quantity_reserved,
        reorder_point = excluded.reorder_point,
        incoming_quantity = excluded.incoming_quantity;
    end loop;
  end loop;

  -- Las variantes que conservan la clave 'inactive:' ya no pertenecen al
  -- producto: se eliminan en definitivo junto con sus datos asociados.
  delete from public.variant_media
  where variant_id in (
    select variant.id from public.product_variants as variant
    where variant.product_id = saved_product_id and variant.combination_key like 'inactive:%'
  );
  delete from public.variant_option_values
  where variant_id in (
    select variant.id from public.product_variants as variant
    where variant.product_id = saved_product_id and variant.combination_key like 'inactive:%'
  );
  delete from public.variant_prices
  where variant_id in (
    select variant.id from public.product_variants as variant
    where variant.product_id = saved_product_id and variant.combination_key like 'inactive:%'
  );
  delete from public.inventory_levels
  where variant_id in (
    select variant.id from public.product_variants as variant
    where variant.product_id = saved_product_id and variant.combination_key like 'inactive:%'
  );
  delete from public.product_variants
  where product_id = saved_product_id and combination_key like 'inactive:%';

  delete from public.variant_media as variant_media
  using public.product_media as media
  where variant_media.media_id = media.id
    and media.product_id = saved_product_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload->'media', '[]'::jsonb)) as incoming_media(media_json)
      where nullif(incoming_media.media_json->>'id', '')::uuid = media.id
    );

  delete from public.product_media as media
  where media.product_id = saved_product_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload->'media', '[]'::jsonb)) as incoming_media(media_json)
      where nullif(incoming_media.media_json->>'id', '')::uuid = media.id
    );

  update public.product_media as media
  set position = media.position + 1000000
  where media.product_id = saved_product_id;

  for media_item in select value from jsonb_array_elements(coalesce(p_payload->'media', '[]'::jsonb)) loop
    insert into public.product_media (
      id, product_id, asset_path, media_type, alt_text, position, is_primary, is_lifestyle
    ) values (
      coalesce(nullif(media_item->>'id', '')::uuid, gen_random_uuid()), saved_product_id,
      media_item->>'asset_path', coalesce(nullif(media_item->>'media_type', ''), 'image'),
      nullif(media_item->>'alt_text', ''), coalesce((media_item->>'position')::integer, 0),
      coalesce((media_item->>'is_primary')::boolean, false),
      coalesce((media_item->>'is_lifestyle')::boolean, false)
    )
    on conflict (id) do update set
      asset_path = excluded.asset_path,
      media_type = excluded.media_type,
      alt_text = excluded.alt_text,
      position = excluded.position,
      is_primary = excluded.is_primary,
      is_lifestyle = excluded.is_lifestyle
    where product_media.product_id = excluded.product_id;
  end loop;

  return saved_product_id;
end;
$$;

revoke all on function public.save_catalog_product(jsonb) from public, anon;
grant execute on function public.save_catalog_product(jsonb) to authenticated;

-- 5) Eliminación definitiva de valores de catálogo. Quita la relación con los
-- productos (sin borrar los productos), elimina las variantes que usaban el
-- valor y pasa a borrador los productos publicados afectados cuando el valor
-- era obligatorio para publicar (categoría, color, talla). Los fits son
-- dispensables: solo se quita la relación y el producto conserva su estado.
create or replace function public.delete_catalog_value(p_kind text, p_value_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected_products integer := 0;
  affected_ids uuid[];
  affected_categories uuid[];
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_kind is null or p_kind not in ('categories', 'colors', 'sizes', 'fits') then
    raise exception 'CATALOG_VALUE_KIND_INVALID' using errcode = '22023';
  end if;
  if p_value_id is null then
    raise exception 'CATALOG_VALUE_ARGUMENT_REQUIRED' using errcode = '22023';
  end if;

  if p_kind = 'categories' then
    if not exists (select 1 from public.categories as category where category.id = p_value_id) then
      raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002';
    end if;

    with recursive category_tree as (
      select category.id, category.parent_id
      from public.categories as category
      where category.id = p_value_id
      union all
      select child.id, child.parent_id
      from public.categories as child
      join category_tree as parent on child.parent_id = parent.id
    )
    select array_agg(id) into affected_categories from category_tree;

    update public.products as product
    set status = case when product.status = 'published' then 'draft' else product.status end,
        subcategory_id = case when product.subcategory_id = any(affected_categories) then null else product.subcategory_id end,
        category_id = case when product.category_id = any(affected_categories) then null else product.category_id end
    where product.subcategory_id = any(affected_categories)
       or product.category_id = any(affected_categories);
    get diagnostics affected_products = row_count;

    delete from public.categories where parent_id = p_value_id;
    delete from public.categories where id = p_value_id;
    return affected_products;
  end if;

  if p_kind = 'colors' then
    if not exists (select 1 from public.colors as color where color.id = p_value_id) then
      raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002';
    end if;
    select array_agg(distinct product_id) into affected_ids
    from (
      select link.product_id from public.product_colors as link where link.color_id = p_value_id
      union
      select variant.product_id from public.product_variants as variant where variant.color_id = p_value_id
    ) as related;

    delete from public.variant_media
    where variant_id in (select variant.id from public.product_variants as variant where variant.color_id = p_value_id);
    delete from public.variant_option_values
    where variant_id in (select variant.id from public.product_variants as variant where variant.color_id = p_value_id);
    delete from public.variant_prices
    where variant_id in (select variant.id from public.product_variants as variant where variant.color_id = p_value_id);
    delete from public.inventory_levels
    where variant_id in (select variant.id from public.product_variants as variant where variant.color_id = p_value_id);
    delete from public.product_variants where color_id = p_value_id;
    delete from public.product_colors where color_id = p_value_id;

    update public.products as product
    set status = 'draft'
    where product.id = any(coalesce(affected_ids, array[]::uuid[]))
      and product.status = 'published';
    get diagnostics affected_products = row_count;

    delete from public.colors where id = p_value_id;
    return affected_products;
  end if;

  if p_kind = 'sizes' then
    if not exists (select 1 from public.sizes as size where size.id = p_value_id) then
      raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002';
    end if;
    select array_agg(distinct product_id) into affected_ids
    from (
      select link.product_id from public.product_sizes as link where link.size_id = p_value_id
      union
      select variant.product_id from public.product_variants as variant where variant.size_id = p_value_id
    ) as related;

    delete from public.variant_media
    where variant_id in (select variant.id from public.product_variants as variant where variant.size_id = p_value_id);
    delete from public.variant_option_values
    where variant_id in (select variant.id from public.product_variants as variant where variant.size_id = p_value_id);
    delete from public.variant_prices
    where variant_id in (select variant.id from public.product_variants as variant where variant.size_id = p_value_id);
    delete from public.inventory_levels
    where variant_id in (select variant.id from public.product_variants as variant where variant.size_id = p_value_id);
    delete from public.product_variants where size_id = p_value_id;
    delete from public.product_sizes where size_id = p_value_id;

    update public.products as product
    set status = 'draft'
    where product.id = any(coalesce(affected_ids, array[]::uuid[]))
      and product.status = 'published';
    get diagnostics affected_products = row_count;

    delete from public.sizes where id = p_value_id;
    return affected_products;
  end if;

  -- fits: relación dispensable, solo se desvincula.
  if not exists (select 1 from public.fits as fit where fit.id = p_value_id) then
    raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002';
  end if;
  update public.products as product set fit_id = null where product.fit_id = p_value_id;
  get diagnostics affected_products = row_count;
  delete from public.fits where id = p_value_id;
  return affected_products;
end;
$$;

revoke all on function public.delete_catalog_value(text, uuid) from public, anon;
grant execute on function public.delete_catalog_value(text, uuid) to authenticated;

drop function if exists public.manage_catalog_value_status(text, uuid, boolean);

-- 6) Los valores que quedaron inactivos con el modelo anterior vuelven a estar
-- disponibles; sus relaciones ya se habían quitado al desactivarlos.
update public.colors set is_active = true where is_active = false;
update public.sizes set is_active = true where is_active = false;
update public.fits set is_active = true where is_active = false;
update public.categories set is_active = true where is_active = false;
