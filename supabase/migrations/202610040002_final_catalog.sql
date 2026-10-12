-- Reemplaza el esquema inicial de la demo por el modelo permanente de catálogo.
-- Esta migración es destructiva para las tablas de catálogo existentes. El seed
-- vuelve a crear los 11 productos como datos de prueba enriquecidos.

drop function if exists public.save_product_with_images(jsonb, jsonb);
drop function if exists public.is_active_admin() cascade;
drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop policy if exists "Admins read own profile" on public.admin_profiles;
drop policy if exists "Admins can read their own authorization profile" on public.admin_profiles;
drop trigger if exists admin_profiles_set_updated_at on public.admin_profiles;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  short_description text,
  product_type text,
  gender text check (gender is null or gender in ('female', 'male', 'unisex')),
  age_group text not null default 'adult' check (age_group in ('newborn', 'infant', 'kids', 'adult')),
  fit text,
  material_summary text,
  care_instructions text,
  country_of_origin text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_featured boolean not null default false,
  seo_title text,
  seo_description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  code text not null check (code ~ '^[a-z0-9_]+$'),
  name text not null,
  position integer not null default 0 check (position >= 0),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, code),
  unique (product_id, position)
);

create table public.option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options(id) on delete restrict,
  value text not null,
  slug text not null,
  position integer not null default 0 check (position >= 0),
  hex_color text check (hex_color is null or hex_color ~ '^#[0-9A-Fa-f]{6}$'),
  swatch_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_id, slug),
  unique (option_id, position)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  sku text unique,
  barcode text unique,
  variant_name text,
  combination_key text not null,
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  width_cm numeric(8, 2) check (width_cm is null or width_cm >= 0),
  height_cm numeric(8, 2) check (height_cm is null or height_cm >= 0),
  length_cm numeric(8, 2) check (length_cm is null or length_cm >= 0),
  requires_shipping boolean not null default true,
  track_inventory boolean not null default true,
  allow_backorder boolean not null default false,
  is_active boolean not null default true,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, combination_key),
  unique (product_id, position)
);

create table public.variant_option_values (
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  option_value_id uuid not null references public.option_values(id) on delete restrict,
  primary key (variant_id, option_value_id)
);

create table public.attributes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  data_type text not null check (data_type in ('text', 'number', 'boolean', 'enum', 'multiselect')),
  scope text not null check (scope in ('product', 'variant', 'both')),
  is_filterable boolean not null default false,
  is_required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attribute_values (
  id uuid primary key default gen_random_uuid(),
  attribute_id uuid not null references public.attributes(id) on delete restrict,
  value text not null,
  slug text not null,
  position integer not null default 0,
  unique (attribute_id, slug)
);

create table public.product_attribute_values (
  product_id uuid not null references public.products(id) on delete restrict,
  attribute_id uuid not null references public.attributes(id) on delete restrict,
  attribute_value_id uuid references public.attribute_values(id) on delete restrict,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  primary key (product_id, attribute_id),
  check (num_nonnulls(attribute_value_id, value_text, value_number, value_boolean) = 1)
);

create table public.variant_attribute_values (
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  attribute_id uuid not null references public.attributes(id) on delete restrict,
  attribute_value_id uuid references public.attribute_values(id) on delete restrict,
  value_text text,
  value_number numeric,
  value_boolean boolean,
  primary key (variant_id, attribute_id),
  check (num_nonnulls(attribute_value_id, value_text, value_number, value_boolean) = 1)
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  asset_path text not null check (asset_path ~ '^/imagenes/[A-Za-z0-9 _().-]+(/[A-Za-z0-9 _().-]+)*$'),
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  alt_text text,
  position integer not null default 0 check (position >= 0),
  is_primary boolean not null default false,
  is_lifestyle boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, asset_path),
  unique (product_id, position)
);

create table public.variant_media (
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  media_id uuid not null references public.product_media(id) on delete restrict,
  position integer not null default 0,
  primary key (variant_id, media_id),
  unique (variant_id, position)
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_products (
  collection_id uuid not null references public.collections(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  position integer not null default 0,
  primary key (collection_id, product_id),
  unique (collection_id, position)
);

create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency char(3) not null default 'PEN',
  country_code char(2) not null default 'PE',
  sales_channel text not null default 'online',
  customer_group text not null default 'retail',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.variant_prices (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  price_list_id uuid not null references public.price_lists(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  compare_at_amount_cents bigint check (compare_at_amount_cents is null or compare_at_amount_cents >= amount_cents),
  cost_amount_cents bigint check (cost_amount_cents is null or cost_amount_cents >= 0),
  tax_included boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, price_list_id, starts_at),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text,
  country_code char(2) not null default 'PE',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_levels (
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0 and quantity_reserved <= quantity_on_hand),
  quantity_available integer generated always as (quantity_on_hand - quantity_reserved) stored,
  reorder_point integer not null default 0 check (reorder_point >= 0),
  incoming_quantity integer not null default 0 check (incoming_quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (variant_id, warehouse_id)
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  warehouse_id uuid not null references public.warehouses(id) on delete restrict,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'return', 'adjustment', 'transfer')),
  quantity integer not null check (quantity <> 0),
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.size_charts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  name text not null,
  category text,
  size_system text not null default 'INT',
  unit text not null default 'cm' check (unit in ('cm', 'in')),
  measurement_type text not null default 'garment' check (measurement_type in ('body', 'garment')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name)
);

create table public.size_chart_rows (
  id uuid primary key default gen_random_uuid(),
  size_chart_id uuid not null references public.size_charts(id) on delete restrict,
  option_value_id uuid references public.option_values(id) on delete restrict,
  size_label text not null,
  regional_size text,
  sort_order integer not null default 0,
  unique (size_chart_id, size_label)
);

create table public.size_measurements (
  id uuid primary key default gen_random_uuid(),
  size_chart_row_id uuid not null references public.size_chart_rows(id) on delete restrict,
  measurement_code text not null,
  min_value numeric(8, 2),
  max_value numeric(8, 2),
  unit text not null default 'cm' check (unit in ('cm', 'in')),
  unique (size_chart_row_id, measurement_code),
  check (min_value is null or max_value is null or max_value >= min_value)
);

create index products_published_idx on public.products (status, created_at desc) where deleted_at is null;
create index products_updated_idx on public.products (updated_at desc);
create index product_options_product_idx on public.product_options (product_id, position);
create index option_values_option_idx on public.option_values (option_id, position);
create index variants_product_idx on public.product_variants (product_id, position);
create index media_product_idx on public.product_media (product_id, position);
create index prices_variant_active_idx on public.variant_prices (variant_id, price_list_id, is_active);
create index inventory_variant_idx on public.inventory_levels (variant_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['admin_profiles','brands','categories','products','product_options','option_values','product_variants','attributes','product_media','collections','price_lists','variant_prices','warehouses','size_charts','inventory_levels'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_profiles
    where user_id = (select auth.uid()) and role = 'admin' and is_active = true
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'admin_profiles','brands','categories','products','product_options','option_values',
    'product_variants','variant_option_values','attributes','attribute_values',
    'product_attribute_values','variant_attribute_values','product_media','variant_media',
    'collections','collection_products','price_lists','variant_prices','warehouses',
    'inventory_levels','inventory_movements','size_charts','size_chart_rows','size_measurements'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy "Public reads published products" on public.products for select to anon, authenticated using (status = 'published' and deleted_at is null);
create policy "Public reads published product options" on public.product_options for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.deleted_at is null));
create policy "Public reads option values" on public.option_values for select to anon, authenticated using (exists (select 1 from public.product_options o join public.products p on p.id = o.product_id where o.id = option_id and p.status = 'published' and p.deleted_at is null));
create policy "Public reads active variants" on public.product_variants for select to anon, authenticated using (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.deleted_at is null));
create policy "Public reads variant options" on public.variant_option_values for select to anon, authenticated using (exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and v.is_active and p.status = 'published' and p.deleted_at is null));
create policy "Public reads published media" on public.product_media for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published' and p.deleted_at is null));
create policy "Public reads variant media" on public.variant_media for select to anon, authenticated using (exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and v.is_active and p.status = 'published' and p.deleted_at is null));
create policy "Public reads active prices" on public.variant_prices for select to anon, authenticated using (is_active and exists (select 1 from public.product_variants v join public.products p on p.id = v.product_id where v.id = variant_id and v.is_active and p.status = 'published' and p.deleted_at is null));
create policy "Public reads active categories" on public.categories for select to anon, authenticated using (is_active);
create policy "Public reads active collections" on public.collections for select to anon, authenticated using (is_active);
create policy "Public reads collection products" on public.collection_products for select to anon, authenticated using (exists (select 1 from public.collections c where c.id = collection_id and c.is_active));
create policy "Public reads size charts" on public.size_charts for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "Public reads size rows" on public.size_chart_rows for select to anon, authenticated using (exists (select 1 from public.size_charts s join public.products p on p.id = s.product_id where s.id = size_chart_id and p.status = 'published'));
create policy "Public reads size measurements" on public.size_measurements for select to anon, authenticated using (exists (select 1 from public.size_chart_rows r join public.size_charts s on s.id = r.size_chart_id join public.products p on p.id = s.product_id where r.id = size_chart_row_id and p.status = 'published'));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'brands','categories','products','product_options','option_values','product_variants','variant_option_values',
    'attributes','attribute_values','product_attribute_values','variant_attribute_values','product_media','variant_media',
    'collections','collection_products','price_lists','variant_prices','warehouses','inventory_levels','inventory_movements',
    'size_charts','size_chart_rows','size_measurements'
  ] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin())', 'Admins manage ' || table_name, table_name);
  end loop;
end;
$$;

create policy "Admins read own profile" on public.admin_profiles for select to authenticated using (user_id = (select auth.uid()) and public.is_active_admin());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.categories, public.products, public.product_options, public.option_values, public.product_variants, public.variant_option_values, public.product_media, public.variant_media, public.variant_prices, public.collections, public.collection_products, public.size_charts, public.size_chart_rows, public.size_measurements to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

create or replace function public.save_catalog_product(p_payload jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  saved_product_id uuid;
  option_item jsonb;
  value_item jsonb;
  variant_item jsonb;
  price_item jsonb;
  media_item jsonb;
  option_id uuid;
  variant_id uuid;
  value_ids text[];
  combination_key text;
  position integer;
begin
  if not public.is_active_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;

  saved_product_id := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  insert into public.products (id, brand_id, category_id, name, slug, description, short_description, product_type, gender, age_group, fit, material_summary, care_instructions, country_of_origin, status, is_featured, seo_title, seo_description)
  values (saved_product_id, nullif(p_payload->>'brand_id','')::uuid, nullif(p_payload->>'category_id','')::uuid, p_payload->>'name', p_payload->>'slug', nullif(p_payload->>'description',''), nullif(p_payload->>'short_description',''), nullif(p_payload->>'product_type',''), nullif(p_payload->>'gender',''), coalesce(nullif(p_payload->>'age_group',''), 'adult'), nullif(p_payload->>'fit',''), nullif(p_payload->>'material_summary',''), nullif(p_payload->>'care_instructions',''), nullif(p_payload->>'country_of_origin',''), coalesce(nullif(p_payload->>'status',''), 'draft'), coalesce((p_payload->>'is_featured')::boolean, false), nullif(p_payload->>'seo_title',''), nullif(p_payload->>'seo_description',''))
  on conflict (id) do update set brand_id = excluded.brand_id, category_id = excluded.category_id, name = excluded.name, slug = excluded.slug, description = excluded.description, short_description = excluded.short_description, product_type = excluded.product_type, gender = excluded.gender, age_group = excluded.age_group, fit = excluded.fit, material_summary = excluded.material_summary, care_instructions = excluded.care_instructions, country_of_origin = excluded.country_of_origin, status = excluded.status, is_featured = excluded.is_featured, seo_title = excluded.seo_title, seo_description = excluded.seo_description, deleted_at = null;

  delete from public.variant_media where variant_id in (select id from public.product_variants where product_id = saved_product_id);
  delete from public.variant_option_values where variant_id in (select id from public.product_variants where product_id = saved_product_id);
  delete from public.variant_prices where variant_id in (select id from public.product_variants where product_id = saved_product_id);
  delete from public.inventory_levels where variant_id in (select id from public.product_variants where product_id = saved_product_id);
  delete from public.product_variants where product_id = saved_product_id;
  delete from public.option_values where option_id in (select id from public.product_options where product_id = saved_product_id);
  delete from public.product_options where product_id = saved_product_id;
  delete from public.product_media where product_id = saved_product_id;

  for option_item in select value from jsonb_array_elements(coalesce(p_payload->'options','[]'::jsonb)) loop
    option_id := coalesce(nullif(option_item->>'id','')::uuid, gen_random_uuid());
    insert into public.product_options (id, product_id, code, name, position, is_required) values (option_id, saved_product_id, option_item->>'code', option_item->>'name', coalesce((option_item->>'position')::integer, 0), coalesce((option_item->>'is_required')::boolean, true));
    for value_item in select value from jsonb_array_elements(coalesce(option_item->'values','[]'::jsonb)) loop
      insert into public.option_values (id, option_id, value, slug, position, hex_color, swatch_path) values (coalesce(nullif(value_item->>'id','')::uuid, gen_random_uuid()), option_id, value_item->>'value', value_item->>'slug', coalesce((value_item->>'position')::integer, 0), nullif(value_item->>'hex_color',''), nullif(value_item->>'swatch_path',''));
    end loop;
  end loop;

  for variant_item in select value from jsonb_array_elements(coalesce(p_payload->'variants','[]'::jsonb)) loop
    select array_agg(value_id order by value_id) into value_ids from jsonb_array_elements_text(coalesce(variant_item->'option_value_ids','[]'::jsonb)) as value_id;
    combination_key := coalesce(array_to_string(value_ids, ':'), 'default');
    variant_id := coalesce(nullif(variant_item->>'id','')::uuid, gen_random_uuid());
    insert into public.product_variants (id, product_id, sku, barcode, variant_name, combination_key, weight_grams, requires_shipping, track_inventory, allow_backorder, is_active, position)
    values (variant_id, saved_product_id, nullif(variant_item->>'sku',''), nullif(variant_item->>'barcode',''), nullif(variant_item->>'variant_name',''), combination_key, nullif(variant_item->>'weight_grams','')::integer, coalesce((variant_item->>'requires_shipping')::boolean, true), coalesce((variant_item->>'track_inventory')::boolean, true), coalesce((variant_item->>'allow_backorder')::boolean, false), coalesce((variant_item->>'is_active')::boolean, true), coalesce((variant_item->>'position')::integer, 0));
    insert into public.variant_option_values (variant_id, option_value_id) select variant_id, value_id::uuid from unnest(value_ids) as value_id;
    for price_item in select value from jsonb_array_elements(coalesce(variant_item->'prices','[]'::jsonb)) loop
      insert into public.variant_prices (variant_id, price_list_id, amount_cents, compare_at_amount_cents, cost_amount_cents, tax_included, starts_at, ends_at, is_active) values (variant_id, (price_item->>'price_list_id')::uuid, (price_item->>'amount_cents')::bigint, nullif(price_item->>'compare_at_amount_cents','')::bigint, nullif(price_item->>'cost_amount_cents','')::bigint, coalesce((price_item->>'tax_included')::boolean, true), nullif(price_item->>'starts_at','')::timestamptz, nullif(price_item->>'ends_at','')::timestamptz, coalesce((price_item->>'is_active')::boolean, true));
    end loop;
    for price_item in select value from jsonb_array_elements(coalesce(variant_item->'inventory','[]'::jsonb)) loop
      insert into public.inventory_levels (variant_id, warehouse_id, quantity_on_hand, quantity_reserved, reorder_point, incoming_quantity) values (variant_id, (price_item->>'warehouse_id')::uuid, coalesce((price_item->>'quantity_on_hand')::integer, 0), coalesce((price_item->>'quantity_reserved')::integer, 0), coalesce((price_item->>'reorder_point')::integer, 0), coalesce((price_item->>'incoming_quantity')::integer, 0));
    end loop;
    for media_item in select value from jsonb_array_elements(coalesce(variant_item->'media_ids','[]'::jsonb)) loop
      insert into public.variant_media (variant_id, media_id, position) values (variant_id, media_item::text::uuid, position);
      position := position + 1;
    end loop;
    position := 0;
  end loop;

  for media_item in select value from jsonb_array_elements(coalesce(p_payload->'media','[]'::jsonb)) loop
    insert into public.product_media (id, product_id, asset_path, media_type, alt_text, position, is_primary, is_lifestyle) values (coalesce(nullif(media_item->>'id','')::uuid, gen_random_uuid()), saved_product_id, media_item->>'asset_path', coalesce(nullif(media_item->>'media_type',''), 'image'), nullif(media_item->>'alt_text',''), coalesce((media_item->>'position')::integer, 0), coalesce((media_item->>'is_primary')::boolean, false), coalesce((media_item->>'is_lifestyle')::boolean, false));
  end loop;
  return saved_product_id;
end;
$$;

revoke all on function public.save_catalog_product(jsonb) from public, anon;
grant execute on function public.save_catalog_product(jsonb) to authenticated;
