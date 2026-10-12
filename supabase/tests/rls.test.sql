begin;

select plan(16);

insert into public.products (id, name, slug, status)
values
  ('10000000-0000-4000-8000-000000000001', 'Producto publicado de prueba', 'rls-visible-product', 'published'),
  ('10000000-0000-4000-8000-000000000002', 'Producto borrador de prueba', 'rls-draft-product', 'draft');

insert into public.product_media (product_id, asset_path, position, is_primary)
values
  ('10000000-0000-4000-8000-000000000001', '/imagenes/rls-visible.jpg', 0, true),
  ('10000000-0000-4000-8000-000000000002', '/imagenes/rls-hidden.jpg', 0, true);

insert into public.warehouses (id, name, code)
values ('40000000-0000-4000-8000-000000000001', 'Almacén de prueba', 'RLS');
insert into public.product_variants (id, product_id, sku, combination_key)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'RLS-PUBLIC-SKU', 'public'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'RLS-DRAFT-SKU', 'draft');
insert into public.inventory_levels (variant_id, warehouse_id, quantity_on_hand)
values ('30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-admin@example.invalid', '', now(), now(), now());
insert into public.admin_profiles (user_id, role, is_active)
values ('20000000-0000-4000-8000-000000000001', 'admin', true);

set local role anon;
select is((select count(*) from public.products where slug like 'rls-%'), 1::bigint, 'anon solo lee productos publicados');
select is((select count(*) from public.product_media where asset_path like '/imagenes/rls-%'), 1::bigint, 'anon solo lee media publicada');
select is((select count(*) from public.public_variant_availability), 1::bigint, 'la disponibilidad pública solo incluye variantes publicadas');
select is((select is_available from public.public_variant_availability where variant_id = '30000000-0000-4000-8000-000000000001'), true, 'el storefront recibe disponibilidad agregada');
select throws_ok(
  $$select quantity_on_hand from public.inventory_levels$$,
  '42501', 'permission denied for table inventory_levels', 'anon no puede consultar cantidades exactas de inventario'
);
select throws_ok(
  $$insert into public.products (name, slug, status) values ('No autorizado', 'rls-anon-write', 'published')$$,
  '42501', 'permission denied for table products', 'anon no puede escribir productos'
);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
select ok(public.is_active_admin(), 'el admin activo está autorizado');
select lives_ok(
  $$insert into public.products (name, slug, status) values ('CRUD del admin', 'rls-admin-created', 'draft')$$,
  'admin puede crear productos'
);
select lives_ok(
  $$update public.products set status = 'published' where slug = 'rls-admin-created'$$,
  'admin puede editar y publicar productos'
);
select lives_ok(
  $$insert into public.product_variants (product_id, sku, combination_key) select id, 'RLS-SKU-1', 'default' from public.products where slug = 'rls-admin-created'$$,
  'admin puede crear variantes'
);
select lives_ok(
  $$select public.save_catalog_product(
    '{"id":"50000000-0000-4000-8000-000000000001","name":"Producto guardado por RPC","slug":"rls-rpc-product","status":"draft","gender":"female","options":[{"id":"60000000-0000-4000-8000-000000000001","code":"size","name":"Talla","position":0,"is_required":true,"values":[{"id":"70000000-0000-4000-8000-000000000001","value":"M","slug":"m","position":0}]}],"variants":[{"id":"30000000-0000-4000-8000-000000000003","sku":"RLS-RPC-SKU","variant_name":"M","option_value_ids":["70000000-0000-4000-8000-000000000001"],"is_active":true,"position":0,"prices":[],"inventory":[]}],"media":[]}'::jsonb
  )$$,
  'admin puede guardar producto y variante mediante la función del editor'
);
insert into public.size_charts (product_id, name)
values ('50000000-0000-4000-8000-000000000001', 'Tabla de prueba');
insert into public.size_chart_rows (size_chart_id, option_value_id, size_label)
select chart.id, '70000000-0000-4000-8000-000000000001', 'M'
from public.size_charts chart where chart.product_id = '50000000-0000-4000-8000-000000000001';
insert into public.inventory_movements (variant_id, warehouse_id, movement_type, quantity)
values ('30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', 'adjustment', 1);
select lives_ok(
  $$select public.save_catalog_product(
    '{"id":"50000000-0000-4000-8000-000000000001","name":"Producto guardado editado","slug":"rls-rpc-product","status":"draft","gender":"female","options":[{"id":"60000000-0000-4000-8000-000000000001","code":"size","name":"Talla","position":0,"is_required":true,"values":[{"id":"70000000-0000-4000-8000-000000000001","value":"M","slug":"m","position":0}]}],"variants":[{"id":"30000000-0000-4000-8000-000000000003","sku":"RLS-RPC-SKU","variant_name":"M","option_value_ids":["70000000-0000-4000-8000-000000000001"],"is_active":true,"position":0,"prices":[],"inventory":[]}],"media":[]}'::jsonb
  )$$,
  'editar no borra una variante todavía referenciada'
);
select is((select count(*) from public.inventory_movements where variant_id = '30000000-0000-4000-8000-000000000003'), 1::bigint, 'el historial de inventario de variante permanece intacto');
select is((select count(*) from public.size_chart_rows where option_value_id = '70000000-0000-4000-8000-000000000001'), 1::bigint, 'una talla que sigue seleccionada conserva su tabla de medidas');
select lives_ok(
  $$insert into public.product_media (product_id, asset_path, position) select id, '/imagenes/admin-created.jpg', 0 from public.products where slug = 'rls-admin-created'$$,
  'admin puede asociar media'
);
select throws_ok(
  $$insert into public.admin_profiles (user_id, role, is_active) values ('20000000-0000-4000-8000-000000000001', 'admin', true)$$,
  '42501', 'new row violates row-level security policy for table "admin_profiles"', 'el usuario no puede darse permisos'
);

select * from finish();
rollback;
