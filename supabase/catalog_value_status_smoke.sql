-- Remote smoke test for catalog-value actions; the final rollback leaves no fixture data.
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('20000000-0000-4000-8000-000000000091', 'authenticated', 'authenticated', 'catalog-status-test@example.invalid', '', now(), now(), now());
insert into public.admin_profiles (user_id, role, is_active)
values ('20000000-0000-4000-8000-000000000091', 'admin', true);

insert into public.categories (id, name, slug, is_active)
values ('21000000-0000-4000-8000-000000000091', 'Prueba migración', 'migration-probe-parent', true);
insert into public.categories (id, parent_id, name, slug, is_active)
values ('21000000-0000-4000-8000-000000000092', '21000000-0000-4000-8000-000000000091', 'Prueba subcategoría', 'migration-probe-child', true);
insert into public.colors (id, name, slug, hex_color, is_active)
values ('22000000-0000-4000-8000-000000000091', 'Azul prueba', 'migration-probe-blue', '#224466', true);
insert into public.sizes (id, name, slug, is_active)
values ('23000000-0000-4000-8000-000000000091', '30 prueba', 'migration-probe-size', true);
insert into public.fits (id, name, slug, is_active)
values ('24000000-0000-4000-8000-000000000091', 'Fit prueba', 'migration-probe-fit', true);
insert into public.materials (id, name, slug, is_active)
values ('25000000-0000-4000-8000-000000000091', 'Material prueba', 'migration-probe-material', true);
insert into public.products (id, category_id, subcategory_id, fit_id, material_id, name, slug, gender, status)
values (
  '26000000-0000-4000-8000-000000000091',
  '21000000-0000-4000-8000-000000000091',
  '21000000-0000-4000-8000-000000000092',
  '24000000-0000-4000-8000-000000000091',
  '25000000-0000-4000-8000-000000000091',
  'Producto prueba migración', 'migration-probe-product', 'female', 'published'
);
insert into public.product_colors (product_id, color_id, position)
values ('26000000-0000-4000-8000-000000000091', '22000000-0000-4000-8000-000000000091', 0);
insert into public.product_sizes (product_id, size_id, position)
values ('26000000-0000-4000-8000-000000000091', '23000000-0000-4000-8000-000000000091', 0);
insert into public.product_variants (id, product_id, color_id, size_id, variant_name, combination_key, position, is_active)
values (
  '27000000-0000-4000-8000-000000000091',
  '26000000-0000-4000-8000-000000000091',
  '22000000-0000-4000-8000-000000000091',
  '23000000-0000-4000-8000-000000000091',
  'Azul prueba / 30 prueba', 'migration-probe-combination', 0, true
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000091","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000091', true);

do $migration_test$
declare
  affected_products integer;
  value_is_active boolean;
  product_status text;
  variant_is_active boolean;
  variant_key text;
  current_variant_name text;
  assigned_categories integer;
  inactive_categories integer;
begin
  if not public.is_active_admin() then
    raise exception 'SMOKE_TEST_FAILED: test admin was not authorized';
  end if;

  update public.colors set name = 'Azul actualizado' where id = '22000000-0000-4000-8000-000000000091';
  update public.sizes set name = '30 actualizado' where id = '23000000-0000-4000-8000-000000000091';
  select variant.variant_name into current_variant_name from public.product_variants as variant where variant.id = '27000000-0000-4000-8000-000000000091';
  if current_variant_name <> 'Azul actualizado / 30 actualizado' then
    raise exception 'SMOKE_TEST_FAILED: variant name did not track catalog renames';
  end if;

  select public.manage_catalog_value_status('colors', '22000000-0000-4000-8000-000000000091', false) into affected_products;
  select status into product_status from public.products where id = '26000000-0000-4000-8000-000000000091';
  select is_active, combination_key into variant_is_active, variant_key from public.product_variants where id = '27000000-0000-4000-8000-000000000091';
  if affected_products <> 1 or product_status <> 'draft' or variant_is_active or variant_key not like 'inactive:%'
    or exists (select 1 from public.product_colors where product_id = '26000000-0000-4000-8000-000000000091') then
    raise exception 'SMOKE_TEST_FAILED: color deactivation did not safely detach and draft the product';
  end if;

  select public.manage_catalog_value_status('sizes', '23000000-0000-4000-8000-000000000091', false) into affected_products;
  if affected_products <> 1 or exists (select 1 from public.product_sizes where product_id = '26000000-0000-4000-8000-000000000091') then
    raise exception 'SMOKE_TEST_FAILED: size deactivation did not detach the product';
  end if;

  select public.manage_catalog_value_status('fits', '24000000-0000-4000-8000-000000000091', false) into affected_products;
  if affected_products <> 1 or exists (select 1 from public.products where id = '26000000-0000-4000-8000-000000000091' and fit_id is not null) then
    raise exception 'SMOKE_TEST_FAILED: fit deactivation did not detach the product';
  end if;

  select public.manage_catalog_value_status('materials', '25000000-0000-4000-8000-000000000091', false) into affected_products;
  if affected_products <> 1 or exists (select 1 from public.products where id = '26000000-0000-4000-8000-000000000091' and material_id is not null) then
    raise exception 'SMOKE_TEST_FAILED: material deactivation did not detach the product';
  end if;

  select public.manage_catalog_value_status('categories', '21000000-0000-4000-8000-000000000091', false) into affected_products;
  select count(*) into assigned_categories from public.products where id = '26000000-0000-4000-8000-000000000091' and category_id is null and subcategory_id is null;
  select count(*) into inactive_categories from public.categories where id in ('21000000-0000-4000-8000-000000000091', '21000000-0000-4000-8000-000000000092') and not is_active;
  if affected_products <> 1 or assigned_categories <> 1 or inactive_categories <> 2 then
    raise exception 'SMOKE_TEST_FAILED: category deactivation did not detach the hierarchy';
  end if;

  select public.manage_catalog_value_status('colors', '22000000-0000-4000-8000-000000000091', true) into affected_products;
  select is_active into value_is_active from public.colors where id = '22000000-0000-4000-8000-000000000091';
  if affected_products <> 0 or not value_is_active or exists (select 1 from public.product_colors where product_id = '26000000-0000-4000-8000-000000000091') then
    raise exception 'SMOKE_TEST_FAILED: reactivation unexpectedly reattached the product';
  end if;
end;
$migration_test$;

rollback;
