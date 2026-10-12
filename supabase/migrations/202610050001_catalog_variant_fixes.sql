-- Expose only aggregated availability to the storefront; exact inventory stays private.
create or replace view public.public_variant_availability
with (security_barrier = true)
as
select
  variant.id as variant_id,
  coalesce(bool_or(inventory.quantity_available > 0), false) as is_available
from public.product_variants as variant
join public.products as product on product.id = variant.product_id
left join public.inventory_levels as inventory on inventory.variant_id = variant.id
where variant.is_active
  and product.status = 'published'
  and product.deleted_at is null
group by variant.id;

revoke all on public.public_variant_availability from public;
grant select on public.public_variant_availability to anon, authenticated;

create or replace function public.save_catalog_product(p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_product_id uuid;
  option_item jsonb;
  value_item jsonb;
  variant_item jsonb;
  price_item jsonb;
  inventory_item jsonb;
  media_item jsonb;
  option_id uuid;
  current_variant_id uuid;
  value_ids text[];
  combination_key text;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  saved_product_id := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  insert into public.products (
    id, brand_id, category_id, name, slug, description, short_description,
    product_type, gender, age_group, fit, material_summary, care_instructions,
    country_of_origin, status, is_featured, seo_title, seo_description
  ) values (
    saved_product_id, nullif(p_payload->>'brand_id', '')::uuid,
    nullif(p_payload->>'category_id', '')::uuid, p_payload->>'name',
    p_payload->>'slug', nullif(p_payload->>'description', ''),
    nullif(p_payload->>'short_description', ''), nullif(p_payload->>'product_type', ''),
    nullif(p_payload->>'gender', ''), coalesce(nullif(p_payload->>'age_group', ''), 'adult'),
    nullif(p_payload->>'fit', ''), nullif(p_payload->>'material_summary', ''),
    nullif(p_payload->>'care_instructions', ''), nullif(p_payload->>'country_of_origin', ''),
    coalesce(nullif(p_payload->>'status', ''), 'draft'),
    coalesce((p_payload->>'is_featured')::boolean, false),
    nullif(p_payload->>'seo_title', ''), nullif(p_payload->>'seo_description', '')
  )
  on conflict (id) do update set
    brand_id = excluded.brand_id,
    category_id = excluded.category_id,
    name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    short_description = excluded.short_description,
    product_type = excluded.product_type,
    gender = excluded.gender,
    age_group = excluded.age_group,
    fit = excluded.fit,
    material_summary = excluded.material_summary,
    care_instructions = excluded.care_instructions,
    country_of_origin = excluded.country_of_origin,
    status = excluded.status,
    is_featured = excluded.is_featured,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description,
    deleted_at = null;

  -- Keep variant IDs, price history and inventory history stable when editing a product.
  delete from public.variant_option_values
  where variant_id in (select id from public.product_variants where product_id = saved_product_id);

  update public.product_variants
  set is_active = false,
      position = position + 1000000,
      combination_key = 'inactive:' || id::text
  where product_id = saved_product_id;

  -- Removed size values may have size-chart rows. Remove only those dependent
  -- measurements before deleting the removed option values.
  delete from public.size_measurements
  where size_chart_row_id in (
    select chart_row.id
    from public.size_chart_rows as chart_row
    join public.option_values as option_value on option_value.id = chart_row.option_value_id
    join public.product_options as product_option on product_option.id = option_value.option_id
    where product_option.product_id = saved_product_id
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_payload->'options', '[]'::jsonb)) as incoming_options(option_json)
        cross join lateral jsonb_array_elements(coalesce(incoming_options.option_json->'values', '[]'::jsonb)) as incoming_values(value_json)
        where nullif(incoming_values.value_json->>'id', '')::uuid = option_value.id
      )
  );

  delete from public.size_chart_rows as chart_row
  using public.option_values as option_value, public.product_options as product_option
  where chart_row.option_value_id = option_value.id
    and option_value.option_id = product_option.id
    and product_option.product_id = saved_product_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload->'options', '[]'::jsonb)) as incoming_options(option_json)
      cross join lateral jsonb_array_elements(coalesce(incoming_options.option_json->'values', '[]'::jsonb)) as incoming_values(value_json)
      where nullif(incoming_values.value_json->>'id', '')::uuid = option_value.id
    );

  delete from public.option_values as option_value
  using public.product_options as product_option
  where option_value.option_id = product_option.id
    and product_option.product_id = saved_product_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload->'options', '[]'::jsonb)) as incoming_options(option_json)
      cross join lateral jsonb_array_elements(coalesce(incoming_options.option_json->'values', '[]'::jsonb)) as incoming_values(value_json)
      where nullif(incoming_values.value_json->>'id', '')::uuid = option_value.id
    );

  delete from public.product_options as product_option
  where product_option.product_id = saved_product_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_payload->'options', '[]'::jsonb)) as incoming_options(option_json)
      where nullif(incoming_options.option_json->>'id', '')::uuid = product_option.id
    );

  update public.product_options
  set position = position + 1000000
  where product_id = saved_product_id;

  update public.option_values
  set position = position + 1000000
  where option_id in (select id from public.product_options where product_id = saved_product_id);

  for option_item in select value from jsonb_array_elements(coalesce(p_payload->'options', '[]'::jsonb)) loop
    option_id := coalesce(nullif(option_item->>'id', '')::uuid, gen_random_uuid());
    insert into public.product_options (id, product_id, code, name, position, is_required)
    values (
      option_id, saved_product_id, option_item->>'code', option_item->>'name',
      coalesce((option_item->>'position')::integer, 0),
      coalesce((option_item->>'is_required')::boolean, true)
    )
    on conflict (id) do update set
      code = excluded.code,
      name = excluded.name,
      position = excluded.position,
      is_required = excluded.is_required
    where product_options.product_id = excluded.product_id;

    for value_item in select value from jsonb_array_elements(coalesce(option_item->'values', '[]'::jsonb)) loop
      insert into public.option_values (id, option_id, value, slug, position, hex_color, swatch_path)
      values (
        coalesce(nullif(value_item->>'id', '')::uuid, gen_random_uuid()), option_id,
        value_item->>'value', value_item->>'slug', coalesce((value_item->>'position')::integer, 0),
        nullif(value_item->>'hex_color', ''), nullif(value_item->>'swatch_path', '')
      )
      on conflict (id) do update set
        value = excluded.value,
        slug = excluded.slug,
        position = excluded.position,
        hex_color = excluded.hex_color,
        swatch_path = excluded.swatch_path
      where option_values.option_id = excluded.option_id;
    end loop;
  end loop;

  for variant_item in select value from jsonb_array_elements(coalesce(p_payload->'variants', '[]'::jsonb)) loop
    select array_agg(incoming.value order by incoming.value)
    into value_ids
    from jsonb_array_elements_text(coalesce(variant_item->'option_value_ids', '[]'::jsonb)) as incoming(value);

    if coalesce(cardinality(value_ids), 0) > 0 and exists (
      select 1
      from unnest(value_ids) as incoming(value_id)
      where not exists (
        select 1
        from public.option_values as option_value
        join public.product_options as product_option on product_option.id = option_value.option_id
        where option_value.id = incoming.value_id::uuid
          and product_option.product_id = saved_product_id
      )
    ) then
      raise exception 'VARIANT_OPTION_VALUE_MISMATCH' using errcode = '23503';
    end if;

    combination_key := coalesce(array_to_string(value_ids, ':'), 'default');
    current_variant_id := coalesce(nullif(variant_item->>'id', '')::uuid, gen_random_uuid());
    insert into public.product_variants (
      id, product_id, sku, barcode, variant_name, combination_key, weight_grams,
      requires_shipping, track_inventory, allow_backorder, is_active, position
    ) values (
      current_variant_id, saved_product_id, nullif(trim(variant_item->>'sku'), ''),
      nullif(variant_item->>'barcode', ''), nullif(variant_item->>'variant_name', ''),
      combination_key, nullif(variant_item->>'weight_grams', '')::integer,
      coalesce((variant_item->>'requires_shipping')::boolean, true),
      coalesce((variant_item->>'track_inventory')::boolean, true),
      coalesce((variant_item->>'allow_backorder')::boolean, false),
      coalesce((variant_item->>'is_active')::boolean, true),
      coalesce((variant_item->>'position')::integer, 0)
    )
    on conflict (id) do update set
      sku = excluded.sku,
      barcode = excluded.barcode,
      variant_name = excluded.variant_name,
      combination_key = excluded.combination_key,
      weight_grams = excluded.weight_grams,
      requires_shipping = excluded.requires_shipping,
      track_inventory = excluded.track_inventory,
      allow_backorder = excluded.allow_backorder,
      is_active = excluded.is_active,
      position = excluded.position
    where product_variants.product_id = excluded.product_id;

    insert into public.variant_option_values (variant_id, option_value_id)
    select current_variant_id, incoming.value_id::uuid
    from unnest(value_ids) as incoming(value_id);

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

  -- Replaced variants stay in the database for historical references, but are
  -- inactive and use a non-colliding combination key after the edit.
  update public.variant_prices as price
  set is_active = false
  where price.variant_id in (
    select variant.id from public.product_variants as variant
    where variant.product_id = saved_product_id and not variant.is_active
  );

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

  update public.product_media
  set position = position + 1000000
  where product_id = saved_product_id;

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
