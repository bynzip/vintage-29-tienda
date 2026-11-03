create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = clock_timestamp(); return new; end $$;

-- Hito A: catálogo canónico. Probar/aplicar primero en una BD nueva.
-- El historial anterior se conserva; esta migración retira el modelo abandonado.
drop function if exists public.save_catalog_product(jsonb);
drop function if exists public.delete_catalog_value(text, uuid);
drop view if exists public.public_variant_availability;

drop table public.size_measurements, public.size_chart_rows, public.size_charts;
drop table public.variant_media, public.variant_option_values;
drop table public.product_attribute_values, public.variant_attribute_values;
drop table public.attribute_values, public.attributes;
drop table public.option_values, public.product_options;
drop table public.collection_products, public.collections;
alter table public.products
  drop column brand_id, drop column category_id, drop column age_group,
  drop column country_of_origin, drop column seo_title, drop column seo_description;
drop table public.brands, public.materials;
alter table public.product_variants
  drop column barcode, drop column weight_grams, drop column width_cm,
  drop column height_cm, drop column length_cm, drop column requires_shipping,
  drop column track_inventory, drop column allow_backorder;
-- Los costos no pertenecen al contrato del catálogo de esta fase.
alter table public.variant_prices drop column cost_amount_cents;

-- Una configuración estable; crear otra lista/almacén no cambia el canal.
insert into public.price_lists (id, name) values
  ('00000000-0000-4000-8000-000000000001', 'Catálogo online PEN') on conflict do nothing;
insert into public.warehouses (id, name, code) values
  ('00000000-0000-4000-8000-000000000002', 'Almacén online', 'ONLINE') on conflict do nothing;
create table public.catalog_settings (
  id boolean primary key default true check (id),
  price_list_id uuid not null references public.price_lists(id),
  warehouse_id uuid not null references public.warehouses(id)
);
insert into public.catalog_settings (price_list_id, warehouse_id)
values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');
alter table public.catalog_settings enable row level security;
create policy "Admins read catalog configuration" on public.catalog_settings
for select to authenticated using (public.is_active_admin());
revoke all on public.catalog_settings from public, anon, authenticated;
grant select on public.catalog_settings to authenticated;

-- La API pública entrega únicamente precio del canal y disponibilidad agregada.
drop policy "Public reads active prices" on public.variant_prices;
revoke all on public.variant_prices from anon;
create view public.public_catalog_variants with (security_barrier = true) as
select v.id, v.product_id, v.color_id, v.size_id, v.sku, v.variant_name, v.position,
  price.amount_cents,
  coalesce(stock.quantity_available > 0, false) as is_available
from public.product_variants v
join public.products p on p.id = v.product_id
cross join public.catalog_settings config
join public.price_lists list on list.id = config.price_list_id
left join lateral (
  select pr.amount_cents from public.variant_prices pr
  where pr.variant_id = v.id and pr.price_list_id = config.price_list_id
    and pr.is_active and list.is_active and list.currency = 'PEN'
    and (list.starts_at is null or list.starts_at <= now())
    and (list.ends_at is null or list.ends_at > now())
    and (pr.starts_at is null or pr.starts_at <= now())
    and (pr.ends_at is null or pr.ends_at > now())
  order by pr.starts_at desc nulls last, pr.updated_at desc, pr.id limit 1
) price on true
left join public.warehouses warehouse on warehouse.id = config.warehouse_id and warehouse.is_active
left join public.inventory_levels stock on stock.variant_id = v.id and stock.warehouse_id = warehouse.id
where p.status = 'published' and p.deleted_at is null and v.is_active;
revoke all on public.public_catalog_variants from public, anon, authenticated;
grant select on public.public_catalog_variants to anon, authenticated;

-- Acceso administrativo mínimo: los cambios compuestos solo se hacen por RPC.
revoke insert, update, delete on public.product_variants, public.variant_prices,
  public.product_colors, public.product_sizes, public.product_media,
  public.inventory_levels, public.inventory_movements from authenticated;
drop policy if exists "Public reads media assets" on public.media_assets;
revoke all on public.media_assets from anon;
alter view public.view_media_usage set (security_invoker = true);
revoke all on public.view_media_usage from public, anon, authenticated;
grant select on public.view_media_usage to authenticated;

-- La misma regla se evalúa al COMMIT independientemente de la tabla modificada.
create or replace function public.validate_product_publishable()
returns trigger language plpgsql security definer set search_path = public as $$
declare product_id uuid; product public.products;
begin
  if tg_table_name = 'products' then
    product_id := coalesce(new.id, old.id);
  elsif tg_table_name = 'variant_prices' then
    select v.product_id into product_id from public.product_variants v
    where v.id = coalesce(new.variant_id, old.variant_id);
  else
    product_id := coalesce(new.product_id, old.product_id);
  end if;
  select * into product from public.products p where p.id = product_id;
  if not found or product.status <> 'published' or product.deleted_at is not null then return null; end if;
  if not exists (select 1 from public.categories c join public.categories parent on parent.id = c.parent_id
    where c.id = product.subcategory_id and c.is_active and parent.is_active) then
    raise exception 'PUBLISH_REQUIRES_SUBCATEGORY' using errcode = '23514';
  end if;
  if not exists (select 1 from public.product_colors pc join public.colors c on c.id = pc.color_id
    where pc.product_id = product.id and c.is_active) then
    raise exception 'PUBLISH_REQUIRES_COLORS' using errcode = '23514';
  end if;
  if not exists (select 1 from public.product_sizes ps join public.sizes s on s.id = ps.size_id
    where ps.product_id = product.id and s.is_active) then
    raise exception 'PUBLISH_REQUIRES_SIZES' using errcode = '23514';
  end if;
  if not exists (select 1 from public.product_media m where m.product_id = product.id and m.media_type = 'image') then
    raise exception 'PUBLISH_REQUIRES_MEDIA' using errcode = '23514';
  end if;
  if not exists (select 1 from public.public_catalog_variants v
    where v.product_id = product.id and nullif(btrim(v.sku), '') is not null and v.amount_cents > 0) then
    raise exception 'PUBLISH_REQUIRES_VARIANT' using errcode = '23514';
  end if;
  return null;
end $$;
drop trigger products_validate_publishable on public.products;
create constraint trigger products_validate_publishable after insert or update on public.products
deferrable initially deferred for each row execute function public.validate_product_publishable();
do $$ declare t text; begin
  foreach t in array array['product_colors','product_sizes','product_media','product_variants','variant_prices'] loop
    execute format('create constraint trigger validate_publication after insert or update or delete on public.%I deferrable initially deferred for each row execute function public.validate_product_publishable()', t);
  end loop;
end $$;

-- Stock auditable: el cliente nunca escribe reservas. Comparación optimista del saldo.
create function public.adjust_catalog_stock(p_variant_id uuid, p_expected integer, p_quantity integer, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare config public.catalog_settings; current_stock public.inventory_levels;
begin
  if not public.is_active_admin() and coalesce(auth.role(), '') <> 'service_role' then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_expected is null or p_expected < 0 or p_quantity is null or p_quantity < 0 or length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'STOCK_REASON_AND_QUANTITY_REQUIRED' using errcode = '23514';
  end if;
  select * into strict config from public.catalog_settings;
  insert into public.inventory_levels (variant_id, warehouse_id) values (p_variant_id, config.warehouse_id) on conflict do nothing;
  select * into strict current_stock from public.inventory_levels
    where variant_id = p_variant_id and warehouse_id = config.warehouse_id for update;
  if current_stock.quantity_on_hand <> p_expected then raise exception 'STOCK_CONFLICT' using errcode = '40001'; end if;
  if p_quantity < current_stock.quantity_reserved then raise exception 'STOCK_BELOW_RESERVED' using errcode = '23514'; end if;
  if p_quantity <> current_stock.quantity_on_hand then
    update public.inventory_levels set quantity_on_hand = p_quantity
    where variant_id = p_variant_id and warehouse_id = config.warehouse_id;
    insert into public.inventory_movements (variant_id, warehouse_id, movement_type, quantity, notes, created_by)
    values (p_variant_id, config.warehouse_id, 'adjustment', p_quantity - current_stock.quantity_on_hand, btrim(p_reason), auth.uid());
  end if;
end $$;

create function public.save_catalog_product(p_payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  saved_id uuid := coalesce(nullif(p_payload->>'id', '')::uuid, gen_random_uuid());
  previous public.products; config public.catalog_settings; item jsonb; price jsonb;
  current_variant_id uuid; media_id uuid; previous_owner uuid; stock_item jsonb;
begin
  if not public.is_active_admin() and coalesce(auth.role(), '') <> 'service_role' then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if jsonb_array_length(coalesce(p_payload->'variants','[]'))<>(select count(distinct v->>'id') from jsonb_array_elements(coalesce(p_payload->'variants','[]')) v)
    or jsonb_array_length(coalesce(p_payload->'media','[]'))<>(select count(distinct v->>'id') from jsonb_array_elements(coalesce(p_payload->'media','[]')) v) then
    raise exception 'DUPLICATE_CATALOG_IDS' using errcode='23514';
  end if;
  select * into strict config from public.catalog_settings;
  perform pg_advisory_xact_lock(hashtextextended(saved_id::text, 0));
  select * into previous from public.products where id = saved_id for update;
  if found and (nullif(p_payload->>'expected_updated_at', '') is null
    or previous.updated_at <> (p_payload->>'expected_updated_at')::timestamptz) then
    raise exception 'PRODUCT_CONFLICT' using errcode = '40001';
  end if;
  insert into public.products (id, name, slug, description, short_description, subcategory_id,
    fit_id, material_summary, care_instructions, gender, status, is_featured)
  values (saved_id, btrim(p_payload->>'name'), p_payload->>'slug', nullif(p_payload->>'description', ''),
    nullif(p_payload->>'short_description', ''), nullif(p_payload->>'subcategory_id', '')::uuid,
    nullif(p_payload->>'fit_id', '')::uuid, nullif(p_payload->>'material_summary', ''),
    nullif(p_payload->>'care_instructions', ''), 'female', coalesce(p_payload->>'status','draft'),
    coalesce((p_payload->>'is_featured')::boolean, false))
  on conflict (id) do update set name = excluded.name, slug = excluded.slug,
    description = excluded.description, short_description = excluded.short_description,
    subcategory_id = excluded.subcategory_id, fit_id = excluded.fit_id,
    material_summary = excluded.material_summary, care_instructions = excluded.care_instructions,
    status = excluded.status, is_featured = excluded.is_featured, deleted_at = null;

  -- Se preserva toda variante con historial. Nunca se borra para editar una ficha.
  update public.product_variants set is_active = false
  where product_id = saved_id;
  delete from public.product_colors where product_id = saved_id;
  delete from public.product_sizes where product_id = saved_id;
  insert into public.product_colors (product_id, color_id, position)
    select saved_id, value::uuid, ordinality - 1 from jsonb_array_elements_text(coalesce(p_payload->'color_ids', '[]')) with ordinality;
  insert into public.product_sizes (product_id, size_id, position)
    select saved_id, value::uuid, ordinality - 1 from jsonb_array_elements_text(coalesce(p_payload->'size_ids', '[]')) with ordinality;

  if exists (select 1 from public.product_colors pc join public.colors c on c.id=pc.color_id where pc.product_id=saved_id and not c.is_active)
    or exists (select 1 from public.product_sizes ps join public.sizes sz on sz.id=ps.size_id where ps.product_id=saved_id and not sz.is_active) then
    raise exception 'INACTIVE_CATALOG_VALUE' using errcode='23514';
  end if;
  for item in select value from jsonb_array_elements(coalesce(p_payload->'variants', '[]')) loop
    current_variant_id := (item->>'id')::uuid;
    select product_id into previous_owner from public.product_variants where id = current_variant_id;
    if found and previous_owner <> saved_id then raise exception 'VARIANT_OWNER_MISMATCH' using errcode = '23514'; end if;
    if nullif(item->>'color_id', '') is null and nullif(item->>'size_id','') is null then
      raise exception 'VARIANT_REQUIRES_COLOR_OR_SIZE' using errcode = '23514';
    end if;
    if nullif(item->>'color_id','') is not null and not exists (select 1 from public.product_colors pc
      where pc.product_id = saved_id and pc.color_id = (item->>'color_id')::uuid) then
      raise exception 'VARIANT_COLOR_NOT_SELECTED' using errcode = '23503';
    end if;
    if nullif(item->>'size_id','') is not null and not exists (select 1 from public.product_sizes ps
      where ps.product_id = saved_id and ps.size_id = (item->>'size_id')::uuid) then
      raise exception 'VARIANT_SIZE_NOT_SELECTED' using errcode = '23503';
    end if;
    insert into public.product_variants (id, product_id, color_id, size_id, sku, variant_name, combination_key, position, is_active)
    values (current_variant_id, saved_id, nullif(item->>'color_id','')::uuid, nullif(item->>'size_id','')::uuid,
      nullif(btrim(item->>'sku'),''), nullif(item->>'variant_name',''),
      'color:' || coalesce(item->>'color_id','') || ':size:' || coalesce(item->>'size_id',''),
      (item->>'position')::integer, coalesce((item->>'is_active')::boolean,true))
    on conflict (id) do update set color_id = excluded.color_id, size_id = excluded.size_id,
      sku = excluded.sku, variant_name = excluded.variant_name, combination_key = excluded.combination_key,
      position = excluded.position, is_active = excluded.is_active;
    -- Solo se admite una entrada de la lista configurada; no costos ni importes externos.
    if jsonb_array_length(coalesce(item->'prices','[]')) > 1 then raise exception 'ONE_CATALOG_PRICE_REQUIRED'; end if;
    price := item->'prices'->0;
    if price is not null and (price->>'price_list_id')::uuid is distinct from config.price_list_id then
      raise exception 'CATALOG_PRICE_LIST_MISMATCH' using errcode = '23514';
    end if;
    if price is null then
      update public.variant_prices pr set is_active = false where pr.variant_id = current_variant_id and pr.price_list_id = config.price_list_id;
    elsif not exists (select 1 from public.variant_prices pr where pr.variant_id = current_variant_id
      and pr.price_list_id = config.price_list_id and pr.is_active and pr.amount_cents = (price->>'amount_cents')::bigint
      and pr.starts_at is null and pr.ends_at is null) then
      update public.variant_prices pr set is_active = false where pr.variant_id = current_variant_id and pr.price_list_id = config.price_list_id;
      insert into public.variant_prices (variant_id, price_list_id, amount_cents)
      values (current_variant_id, config.price_list_id, (price->>'amount_cents')::bigint);
    end if;
    -- Un guardado sin ajuste no toca inventario. Se exige saldo original y motivo al cambiarlo.
    stock_item := item->'stock_adjustment';
    if stock_item is not null and stock_item <> 'null'::jsonb then
      perform public.adjust_catalog_stock(current_variant_id, (stock_item->>'expected_quantity')::integer,
        (stock_item->>'quantity')::integer, stock_item->>'reason');
    end if;
  end loop;

  delete from public.product_media m where product_id = saved_id and not exists (
    select 1 from jsonb_array_elements(coalesce(p_payload->'media','[]')) i where (i->>'id')::uuid = m.id);
  update public.product_media set position = position + 1000000 where product_id = saved_id;
  for item in select value from jsonb_array_elements(coalesce(p_payload->'media','[]')) loop
    media_id := (item->>'id')::uuid;
    select product_id into previous_owner from public.product_media where id = media_id;
    if found and previous_owner <> saved_id then raise exception 'MEDIA_OWNER_MISMATCH' using errcode = '23514'; end if;
    if nullif(item->>'color_id','') is not null and not exists (select 1 from public.product_colors pc
      where pc.product_id = saved_id and pc.color_id = (item->>'color_id')::uuid) then
      raise exception 'MEDIA_COLOR_NOT_SELECTED' using errcode = '23514';
    end if;
    insert into public.product_media (id, product_id, color_id, asset_path, alt_text, position, is_primary, is_lifestyle)
    values (media_id, saved_id, nullif(item->>'color_id','')::uuid, item->>'asset_path', nullif(item->>'alt_text',''),
      (item->>'position')::integer, coalesce((item->>'is_primary')::boolean,false), coalesce((item->>'is_lifestyle')::boolean,false))
    on conflict (id) do update set color_id = excluded.color_id, asset_path = excluded.asset_path,
      alt_text = excluded.alt_text, position = excluded.position, is_primary = excluded.is_primary, is_lifestyle = excluded.is_lifestyle;
  end loop;
  return saved_id;
end $$;

-- Eliminar un valor conserva sus variantes (inactivas) y sus movimientos.
create function public.delete_catalog_value(p_kind text, p_value_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare affected integer; ids uuid[];
begin
  if not public.is_active_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_kind = 'categories' then
    select array_agg(id) into ids from public.categories where id = p_value_id or parent_id = p_value_id;
    if ids is null then raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002'; end if;
    update public.products set status = case when status = 'published' then 'draft' else status end,
      subcategory_id = null where subcategory_id = any(ids);
    get diagnostics affected = row_count;
    delete from public.categories where parent_id = p_value_id;
    delete from public.categories where id = p_value_id;
  elsif p_kind = 'fits' then
    update public.products set fit_id = null where fit_id = p_value_id;
    get diagnostics affected = row_count;
    delete from public.fits where id = p_value_id;
  elsif p_kind in ('colors','sizes') then
    if p_kind = 'colors' then
      select array_agg(product_id) into ids from public.product_colors where color_id = p_value_id;
      update public.product_variants set is_active = false where color_id = p_value_id;
      delete from public.product_colors where color_id = p_value_id;
      update public.colors set is_active = false where id = p_value_id;
    else
      select array_agg(product_id) into ids from public.product_sizes where size_id = p_value_id;
      update public.product_variants set is_active = false where size_id = p_value_id;
      delete from public.product_sizes where size_id = p_value_id;
      update public.sizes set is_active = false where id = p_value_id;
    end if;
    update public.products set status = 'draft' where id = any(ids) and status = 'published';
    get diagnostics affected = row_count;
  else raise exception 'CATALOG_VALUE_KIND_INVALID' using errcode = '22023'; end if;
  return affected;
end $$;

create function public.reorder_home_slides(p_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if cardinality(p_ids) <> (select count(*) from public.home_slides)
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id)
    or exists (select 1 from unnest(p_ids) id where not exists (select 1 from public.home_slides s where s.id = id)) then
    raise exception 'SLIDE_ORDER_CONFLICT' using errcode = '40001';
  end if;
  update public.home_slides s set sort_order = i.position from unnest(p_ids) with ordinality i(id, position) where s.id = i.id;
end $$;

do $$ declare fn text; begin
  foreach fn in array array['save_catalog_product(jsonb)','delete_catalog_value(text,uuid)',
    'adjust_catalog_stock(uuid,integer,integer,text)','reorder_home_slides(uuid[])'] loop
    execute 'revoke all on function public.' || fn || ' from public, anon';
    execute 'grant execute on function public.' || fn || ' to authenticated';
  end loop;
end $$;

update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm']
where id = 'catalog-media';
create trigger home_slides_updated before update on public.home_slides for each row execute function public.set_updated_at();
create trigger home_banners_updated before update on public.home_banners for each row execute function public.set_updated_at();

-- El valor existe en variantes archivadas; solo una combinación ACTIVA por producto.
alter table public.product_variants drop constraint product_variants_product_id_combination_key_key;
create unique index variants_active_combination on public.product_variants(product_id, combination_key) where is_active;

alter table public.product_variants drop constraint product_variants_product_id_position_key;
create unique index variants_active_position on public.product_variants(product_id, position) where is_active;

-- Prevent a stale editor from attaching a file while Storage deletion is in flight.
alter table public.media_assets add column deleting_at timestamptz;
create function public.guard_media_reference() returns trigger
language plpgsql security definer set search_path = public as $$
declare url text; asset public.media_assets;
begin
  if tg_table_name = 'product_media' then url := new.asset_path;
  elsif tg_table_name = 'home_slides' then url := new.media_url;
  else url := new.image_url; end if;
  if url = '' then return new; end if;
  if url like '/imagenes/%' and url not like '%..%' then return new; end if;
  select * into asset from public.media_assets where public_url = url or file_path = url for key share;
  if not found or asset.deleting_at is not null then
    raise exception 'MEDIA_NOT_REGISTERED_OR_DELETING' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger media_reference before insert or update of asset_path on public.product_media for each row execute function public.guard_media_reference();
create trigger media_reference before insert or update of media_url on public.home_slides for each row execute function public.guard_media_reference();
create trigger media_reference before insert or update of image_url on public.home_banners for each row execute function public.guard_media_reference();

create function public.begin_media_deletion(p_id uuid) returns table(file_path text)
language plpgsql security definer set search_path = public as $$
declare asset public.media_assets;
begin
  if not public.is_active_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  select * into strict asset from public.media_assets where id = p_id for update;
  if exists (select 1 from public.product_media where asset_path in (asset.public_url,asset.file_path))
    or exists (select 1 from public.home_slides where media_url in (asset.public_url,asset.file_path))
    or exists (select 1 from public.home_banners where image_url in (asset.public_url,asset.file_path)) then
    raise exception 'MEDIA_IN_USE' using errcode = '23514';
  end if;
  update public.media_assets set deleting_at = now() where id = p_id;
  return query select asset.file_path;
end $$;
create function public.finish_media_deletion(p_id uuid, p_removed boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_admin() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_removed then delete from public.media_assets where id = p_id and deleting_at is not null;
  else update public.media_assets set deleting_at = null where id = p_id; end if;
end $$;
revoke all on function public.begin_media_deletion(uuid), public.finish_media_deletion(uuid,boolean) from public, anon;
grant execute on function public.begin_media_deletion(uuid), public.finish_media_deletion(uuid,boolean) to authenticated;

-- Taxonomy and configuration changes must also preserve publication invariants.
create function public.validate_catalog_configuration() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.products p
    where p.status = 'published' and p.deleted_at is null and (
      not exists (select 1 from public.categories c join public.categories parent on parent.id = c.parent_id
        where c.id = p.subcategory_id and c.is_active and parent.is_active)
      or exists (select 1 from public.product_colors pc join public.colors c on c.id = pc.color_id
        where pc.product_id = p.id and not c.is_active)
      or exists (select 1 from public.product_sizes ps join public.sizes s on s.id = ps.size_id
        where ps.product_id = p.id and not s.is_active)
      or not exists (select 1 from public.public_catalog_variants v
        where v.product_id = p.id and v.amount_cents > 0 and nullif(btrim(v.sku),'') is not null)
    )) then raise exception 'PUBLISHED_CATALOG_CONFIGURATION_INVALID' using errcode = '23514'; end if;
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['categories','colors','sizes','price_lists','catalog_settings'] loop
    execute format('create constraint trigger validate_catalog_configuration after insert or update or delete on public.%I deferrable initially deferred for each row execute function public.validate_catalog_configuration()',t);
  end loop;
end $$;

grant execute on function public.save_catalog_product(jsonb), public.adjust_catalog_stock(uuid,integer,integer,text) to service_role;

create or replace function public.validate_category_depth() returns trigger language plpgsql set search_path=public as $$
begin
  if new.parent_id is null then
    if exists(select 1 from public.products where subcategory_id=new.id) then
      raise exception 'CATEGORY_IN_USE_AS_SUBCATEGORY' using errcode='23514';
    end if;
    return new;
  end if;
  if new.parent_id=new.id or not exists(select 1 from public.categories where id=new.parent_id and parent_id is null)
    or exists(select 1 from public.categories where parent_id=new.id) then
    raise exception 'CATEGORY_MAX_DEPTH' using errcode='23514';
  end if;
  return new;
end $$;
