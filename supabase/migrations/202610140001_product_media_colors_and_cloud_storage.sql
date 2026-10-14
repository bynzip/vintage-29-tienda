-- Migración 202610140001: Soporte para Supabase Storage, fotos por color,
-- configuración dinámica de HomePage y tabla de control de medios (Media Library).

-- 1) Ajuste de restricciones en product_media:
-- Se retira la restricción de regex local ('^/imagenes/...') para permitir
-- URLs de almacenamiento en la nube (Supabase Storage / CDN).
do $$
declare
  r record;
begin
  for r in (
    select constraint_name
    from information_schema.constraint_column_usage
    where table_name = 'product_media' and column_name = 'asset_path'
  ) loop
    execute 'alter table public.product_media drop constraint if exists ' || quote_ident(r.constraint_name);
  end loop;
end $$;

alter table public.product_media
  add constraint product_media_asset_path_check check (length(trim(asset_path)) > 0);

-- 2) Asociación de foto con un color específico (o NULL para todos los colores):
alter table public.product_media
  add column if not exists color_id uuid references public.colors(id) on delete set null;

create index if not exists product_media_color_idx on public.product_media (color_id);

-- 3) Actualización de save_catalog_product para persistir color_id en product_media:
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
      id, product_id, color_id, asset_path, media_type, alt_text, position, is_primary, is_lifestyle
    ) values (
      coalesce(nullif(media_item->>'id', '')::uuid, gen_random_uuid()), saved_product_id,
      nullif(media_item->>'color_id', '')::uuid,
      media_item->>'asset_path', coalesce(nullif(media_item->>'media_type', ''), 'image'),
      nullif(media_item->>'alt_text', ''), coalesce((media_item->>'position')::integer, 0),
      coalesce((media_item->>'is_primary')::boolean, false),
      coalesce((media_item->>'is_lifestyle')::boolean, false)
    )
    on conflict (id) do update set
      color_id = excluded.color_id,
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

-- 4) Políticas de seguridad RLS para el Bucket catalog-media en Supabase Storage:
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalog-media', 'catalog-media', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set public = true;

drop policy if exists "Public Access catalog-media" on storage.objects;
create policy "Public Access catalog-media"
  on storage.objects for select
  using (bucket_id = 'catalog-media');

drop policy if exists "Admin Insert catalog-media" on storage.objects;
create policy "Admin Insert catalog-media"
  on storage.objects for insert
  with check (bucket_id = 'catalog-media' and public.is_active_admin());

drop policy if exists "Admin Update catalog-media" on storage.objects;
create policy "Admin Update catalog-media"
  on storage.objects for update
  using (bucket_id = 'catalog-media' and public.is_active_admin());

drop policy if exists "Admin Delete catalog-media" on storage.objects;
create policy "Admin Delete catalog-media"
  on storage.objects for delete
  using (bucket_id = 'catalog-media' and public.is_active_admin());

-- 5) Configuración de HomePage (Slides y Banners):
create table if not exists public.home_slides (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  media_url text not null,
  button_label text,
  href text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.home_banners (
  id uuid primary key default gen_random_uuid(),
  identifier text not null unique,
  title text not null,
  subtitle text,
  button_label text not null default 'Comprar ahora',
  href text not null default '#productos',
  image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.home_slides enable row level security;
alter table public.home_banners enable row level security;

drop policy if exists "Public reads active home slides" on public.home_slides;
create policy "Public reads active home slides" on public.home_slides
  for select to anon, authenticated using (is_active = true);

drop policy if exists "Public reads active home banners" on public.home_banners;
create policy "Public reads active home banners" on public.home_banners
  for select to anon, authenticated using (is_active = true);

drop policy if exists "Admin manages home slides" on public.home_slides;
create policy "Admin manages home slides" on public.home_slides
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists "Admin manages home banners" on public.home_banners;
create policy "Admin manages home banners" on public.home_banners
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

grant select on public.home_slides, public.home_banners to anon, authenticated;
grant all on public.home_slides, public.home_banners to authenticated;

-- 6) Biblioteca de Medios centralizada (Media Library):
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null default 'catalog-media',
  file_path text not null unique,
  public_url text not null,
  file_name text not null,
  content_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.media_assets enable row level security;

drop policy if exists "Public reads media assets" on public.media_assets;
create policy "Public reads media assets" on public.media_assets
  for select to anon, authenticated using (true);

drop policy if exists "Admin manages media assets" on public.media_assets;
create policy "Admin manages media assets" on public.media_assets
  for all to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

grant select on public.media_assets to anon, authenticated;
grant all on public.media_assets to authenticated;

-- Vista para auditar uso de imágenes (En uso vs Huérfanas):
create or replace view public.view_media_usage as
select
  m.id,
  m.bucket_id,
  m.file_path,
  m.public_url,
  m.file_name,
  m.content_type,
  m.file_size_bytes,
  m.created_at,
  (
    select count(*)::int
    from public.product_media pm
    where pm.asset_path = m.public_url or pm.asset_path = m.file_path
  ) +
  (
    select count(*)::int
    from public.home_slides hs
    where hs.media_url = m.public_url or hs.media_url = m.file_path
  ) +
  (
    select count(*)::int
    from public.home_banners hb
    where hb.image_url = m.public_url or hb.image_url = m.file_path
  ) as usage_count,
  (
    select coalesce(json_agg(distinct p.name), '[]'::json)
    from public.product_media pm
    join public.products p on p.id = pm.product_id
    where pm.asset_path = m.public_url or pm.asset_path = m.file_path
  ) as used_in_products
from public.media_assets m;

grant select on public.view_media_usage to authenticated;
