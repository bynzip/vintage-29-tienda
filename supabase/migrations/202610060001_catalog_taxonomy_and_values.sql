create table public.colors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  slug text not null unique,
  hex_color text check (hex_color is null or hex_color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 40),
  slug text not null unique,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fits (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  slug text not null unique,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  slug text not null unique,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column subcategory_id uuid references public.categories(id) on delete restrict;
alter table public.products add column fit_id uuid references public.fits(id) on delete restrict;
alter table public.products add column material_id uuid references public.materials(id) on delete restrict;
alter table public.product_variants add column color_id uuid references public.colors(id) on delete restrict;
alter table public.product_variants add column size_id uuid references public.sizes(id) on delete restrict;

create table public.product_colors (
  product_id uuid not null references public.products(id) on delete restrict,
  color_id uuid not null references public.colors(id) on delete restrict,
  position integer not null default 0 check (position >= 0),
  primary key (product_id, color_id),
  unique (product_id, position)
);

create table public.product_sizes (
  product_id uuid not null references public.products(id) on delete restrict,
  size_id uuid not null references public.sizes(id) on delete restrict,
  position integer not null default 0 check (position >= 0),
  primary key (product_id, size_id),
  unique (product_id, position)
);

create index products_subcategory_idx on public.products (subcategory_id);
create index products_fit_idx on public.products (fit_id);
create index products_material_idx on public.products (material_id);
create index variants_color_size_idx on public.product_variants (product_id, color_id, size_id);
create index product_colors_color_idx on public.product_colors (color_id);
create index product_sizes_size_idx on public.product_sizes (size_id);

insert into public.fits (name, slug)
select distinct btrim(product.fit),
  coalesce(nullif(trim(both '-' from regexp_replace(lower(btrim(product.fit)), '[^a-z0-9]+', '-', 'g')), ''), 'fit') || '-' || substr(md5(btrim(product.fit)), 1, 8)
from public.products as product
where nullif(btrim(product.fit), '') is not null
on conflict (slug) do nothing;

insert into public.materials (name, slug)
select distinct btrim(product.material_summary),
  coalesce(nullif(trim(both '-' from regexp_replace(lower(btrim(product.material_summary)), '[^a-z0-9]+', '-', 'g')), ''), 'material') || '-' || substr(md5(btrim(product.material_summary)), 1, 8)
from public.products as product
where nullif(btrim(product.material_summary), '') is not null
on conflict (slug) do nothing;

update public.products as product
set fit_id = fit.id
from public.fits as fit
where product.fit_id is null and fit.name = btrim(product.fit);

update public.products as product
set material_id = material.id
from public.materials as material
where product.material_id is null and material.name = btrim(product.material_summary);

insert into public.colors (name, slug, hex_color, sort_order)
select distinct btrim(value.value), value.slug || '-' || substr(md5(btrim(value.value)), 1, 8),
  value.hex_color,
  row_number() over (order by min(value.position), lower(btrim(value.value))) - 1
from public.option_values as value
join public.product_options as option on option.id = value.option_id
where lower(option.code) in ('color', 'colour', 'colors', 'colours')
  and nullif(btrim(value.value), '') is not null
group by btrim(value.value), value.slug, value.hex_color
on conflict (slug) do nothing;

insert into public.sizes (name, slug, sort_order)
select distinct btrim(value.value), value.slug || '-' || substr(md5(btrim(value.value)), 1, 8),
  row_number() over (order by min(value.position), lower(btrim(value.value))) - 1
from public.option_values as value
join public.product_options as option on option.id = value.option_id
where lower(option.code) in ('size', 'sizes', 'talla', 'tallas')
  and nullif(btrim(value.value), '') is not null
group by btrim(value.value), value.slug
on conflict (slug) do nothing;

update public.product_variants as variant
set color_id = color.id
from public.variant_option_values as link
join public.option_values as value on value.id = link.option_value_id
join public.product_options as option on option.id = value.option_id
join public.colors as color on color.name = btrim(value.value)
where link.variant_id = variant.id
  and variant.color_id is null
  and lower(option.code) in ('color', 'colour', 'colors', 'colours');

update public.product_variants as variant
set size_id = size.id
from public.variant_option_values as link
join public.option_values as value on value.id = link.option_value_id
join public.product_options as option on option.id = value.option_id
join public.sizes as size on size.name = btrim(value.value)
where link.variant_id = variant.id
  and variant.size_id is null
  and lower(option.code) in ('size', 'sizes', 'talla', 'tallas');

insert into public.product_colors (product_id, color_id, position)
select variant.product_id, variant.color_id, row_number() over (partition by variant.product_id order by min(variant.position), variant.color_id) - 1
from public.product_variants as variant
where variant.color_id is not null
group by variant.product_id, variant.color_id
on conflict (product_id, color_id) do nothing;

insert into public.product_sizes (product_id, size_id, position)
select variant.product_id, variant.size_id, row_number() over (partition by variant.product_id order by min(variant.position), variant.size_id) - 1
from public.product_variants as variant
where variant.size_id is not null
group by variant.product_id, variant.size_id
on conflict (product_id, size_id) do nothing;

alter table public.products drop column product_type;
alter table public.products drop column fit;
alter table public.products drop column material_summary;

alter table public.products alter column gender set default 'female';
update public.products set gender = 'female' where gender is distinct from 'female';

update public.products as product
set subcategory_id = product.category_id
where product.subcategory_id is null
  and exists (
    select 1 from public.categories as subcategory
    where subcategory.id = product.category_id and subcategory.parent_id is not null
  );

create or replace function public.validate_category_depth()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_parent_id uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  select parent.parent_id into parent_parent_id
  from public.categories as parent
  where parent.id = new.parent_id;

  if not found then
    raise exception 'CATEGORY_PARENT_NOT_FOUND' using errcode = '23503';
  end if;
  if parent_parent_id is not null then
    raise exception 'CATEGORY_MAX_DEPTH' using errcode = '23514';
  end if;
  if exists (select 1 from public.categories child where child.parent_id = new.id) then
    raise exception 'CATEGORY_PARENT_HAS_CHILDREN' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger categories_validate_depth
before insert or update of parent_id on public.categories
for each row execute function public.validate_category_depth();

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

create trigger products_validate_subcategory
before insert or update of subcategory_id on public.products
for each row execute function public.validate_product_subcategory();

do $$
declare
  table_name text;
begin
  foreach table_name in array array['colors', 'sizes', 'fits', 'materials'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

alter table public.colors enable row level security;
alter table public.sizes enable row level security;
alter table public.fits enable row level security;
alter table public.materials enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_sizes enable row level security;

create policy "Public reads active colors" on public.colors for select to anon, authenticated using (is_active);
create policy "Public reads active sizes" on public.sizes for select to anon, authenticated using (is_active);
create policy "Public reads active fits" on public.fits for select to anon, authenticated using (is_active);
create policy "Public reads active materials" on public.materials for select to anon, authenticated using (is_active);
create policy "Admins manage colors" on public.colors for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "Admins manage sizes" on public.sizes for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "Admins manage fits" on public.fits for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "Admins manage materials" on public.materials for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "Public reads product colors" on public.product_colors for select to anon, authenticated using (exists (select 1 from public.products product where product.id = product_id and product.status = 'published' and product.deleted_at is null));
create policy "Public reads product sizes" on public.product_sizes for select to anon, authenticated using (exists (select 1 from public.products product where product.id = product_id and product.status = 'published' and product.deleted_at is null));
create policy "Admins manage product colors" on public.product_colors for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "Admins manage product sizes" on public.product_sizes for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

revoke all on public.colors, public.sizes, public.fits, public.materials, public.product_colors, public.product_sizes from anon, authenticated;
grant select on public.colors, public.sizes, public.fits, public.materials, public.product_colors, public.product_sizes to anon, authenticated;
grant insert, update, delete on public.colors, public.sizes, public.fits, public.materials, public.product_colors, public.product_sizes to authenticated;

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
  combination_key text;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  saved_product_id := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());

  insert into public.products (
    id, brand_id, subcategory_id, name, slug, description, short_description,
    gender, age_group, fit_id, material_id, care_instructions, country_of_origin,
    status, is_featured, seo_title, seo_description
  ) values (
    saved_product_id, nullif(p_payload->>'brand_id', '')::uuid,
    nullif(p_payload->>'subcategory_id', '')::uuid, p_payload->>'name',
    p_payload->>'slug', nullif(p_payload->>'description', ''),
    nullif(p_payload->>'short_description', ''), 'female',
    coalesce(nullif(p_payload->>'age_group', ''), 'adult'),
    nullif(p_payload->>'fit_id', '')::uuid,
    nullif(p_payload->>'material_id', '')::uuid,
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
    material_id = excluded.material_id,
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
    combination_key := 'color:' || coalesce(current_color_id::text, '') || ':size:' || coalesce(current_size_id::text, '');
    current_variant_id := coalesce(nullif(variant_item->>'id', '')::uuid, gen_random_uuid());

    insert into public.product_variants (
      id, product_id, color_id, size_id, sku, variant_name, combination_key,
      weight_grams, requires_shipping, track_inventory, allow_backorder, is_active, position
    ) values (
      current_variant_id, saved_product_id, current_color_id, current_size_id,
      nullif(trim(variant_item->>'sku'), ''), nullif(variant_item->>'variant_name', ''),
      combination_key, nullif(variant_item->>'weight_grams', '')::integer,
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
