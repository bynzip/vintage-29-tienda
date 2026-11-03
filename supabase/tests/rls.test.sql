begin;
select no_plan();

select ok(to_regclass('public.product_options') is null, 'modelo de opciones antiguo retirado');
select ok(to_regclass('public.materials') is null, 'materiales antiguos retirados');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='variant_prices' and column_name='cost_amount_cents'), 'costos fuera del catálogo público');
select is((select count(*) from public.catalog_settings),1::bigint,'configuración única');

insert into auth.users(id,aud,role,email) values
('10000000-0000-4000-8000-000000000001','authenticated','authenticated','admin@test.invalid'),
('10000000-0000-4000-8000-000000000002','authenticated','authenticated','user@test.invalid');
insert into public.admin_profiles(user_id) values ('10000000-0000-4000-8000-000000000001');
insert into public.categories(id,name,slug) values ('20000000-0000-4000-8000-000000000001','RLS principal','rls-principal');
insert into public.categories(id,name,slug,parent_id) values ('20000000-0000-4000-8000-000000000002','RLS prendas','rls-prendas','20000000-0000-4000-8000-000000000001');
insert into public.colors(id,name,slug) values ('30000000-0000-4000-8000-000000000001','RLS azul','rls-azul');
insert into public.sizes(id,name,slug) values ('30000000-0000-4000-8000-000000000002','RLS M','rls-m');
create temporary table test_payload (payload jsonb);
insert into test_payload select jsonb_build_object(
 'id','40000000-0000-4000-8000-000000000001','expected_updated_at',null,'name','RLS publicado','slug','rls-publicado',
 'subcategory_id','20000000-0000-4000-8000-000000000002','status','published',
 'color_ids',jsonb_build_array('30000000-0000-4000-8000-000000000001'),
 'size_ids',jsonb_build_array('30000000-0000-4000-8000-000000000002'),
 'variants',jsonb_build_array(jsonb_build_object('id','50000000-0000-4000-8000-000000000001',
   'color_id','30000000-0000-4000-8000-000000000001','size_id','30000000-0000-4000-8000-000000000002',
   'sku','RLS-ONE','variant_name','Azul / M','position',0,'is_active',true,
   'prices',jsonb_build_array(jsonb_build_object('price_list_id',price_list_id,'amount_cents',10000)),
   'stock_adjustment',jsonb_build_object('expected_quantity',0,'quantity',3,'reason','Conteo inicial'))),
 'media',jsonb_build_array(jsonb_build_object('id','60000000-0000-4000-8000-000000000001','asset_path','/imagenes/prueba.jpg','position',0,'is_primary',true)))
from public.catalog_settings;
grant select,update on test_payload to authenticated;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select ok(public.is_active_admin(),'admin autorizado');
select lives_ok($$select public.save_catalog_product(payload) from test_payload$$,'guardado transaccional completo');
set constraints all immediate;
reset role;
insert into public.products(id,name,slug) values ('40000000-0000-4000-8000-000000000002','RLS borrador','rls-borrador');
insert into public.price_lists(id,name) values ('70000000-0000-4000-8000-000000000001','Lista ajena');
insert into public.variant_prices(variant_id,price_list_id,amount_cents) values ('50000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000001',1);

set local role anon;
select is((select count(*) from public.products where slug like 'rls-%'),1::bigint,'anon solo ve publicados');
select is((select amount_cents from public.public_catalog_variants where sku='RLS-ONE'),10000::bigint,'precio solo de la lista configurada');
select is((select is_available from public.public_catalog_variants where sku='RLS-ONE'),true,'disponibilidad agregada');
select throws_ok('select * from public.inventory_levels','42501',null,'inventario exacto privado');
select throws_ok('select * from public.variant_prices','42501',null,'precios internos privados');
select throws_ok('select * from public.media_assets','42501',null,'biblioteca privada');
select throws_ok('select * from public.view_media_usage','42501',null,'vista de medios privada');
select is((select count(*) from storage.objects where bucket_id='catalog-media'),0::bigint,'anon no enumera archivos de Storage');
select throws_ok($$insert into public.products(name,slug) values ('Intruso','intruso')$$,'42501',null,'anon no escribe');
select throws_ok($$select public.save_catalog_product('{}')$$,'42501',null,'anon no ejecuta RPC');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.is_active_admin(),false,'usuario normal no es admin');
select throws_ok($$select public.restore_catalog_snapshot('{}')$$,'42501',null,'usuario normal no restaura snapshots');
select is((select count(*) from public.view_media_usage),0::bigint,'vista respeta RLS del usuario normal');
select throws_ok($$select public.save_catalog_product('{}')$$,'42501','ADMIN_REQUIRED','RPC rechaza usuario normal');
select throws_ok($$insert into public.admin_profiles(user_id) values ('10000000-0000-4000-8000-000000000002')$$,'42501',null,'usuario no puede elevar permisos');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok('update public.inventory_levels set quantity_reserved=0','42501',null,'admin no escribe reservas directamente');
select throws_ok('delete from public.inventory_movements','42501',null,'historial inmutable para admin');
select throws_ok('delete from public.media_assets where id is not null','42501',null,'metadata solo se elimina por el flujo protegido');
select throws_ok('delete from public.product_media','42501',null,'admin no elude publicación mediante CRUD de imágenes');
reset role;
select throws_ok($$delete from public.product_media where product_id='40000000-0000-4000-8000-000000000001'$$,'23514','PUBLISH_REQUIRES_MEDIA','regla se aplica también a tablas hijas');
select throws_ok($$update public.colors set is_active=false where id='30000000-0000-4000-8000-000000000001'$$,'23514','PUBLISHED_CATALOG_CONFIGURATION_INVALID','desactivar atributo no rompe publicación');
select throws_ok($$update public.products set status='published' where slug='rls-borrador'$$,'23514','PUBLISH_REQUIRES_SUBCATEGORY','publicación incompleta rechazada');
update public.inventory_levels set quantity_reserved=2 where variant_id='50000000-0000-4000-8000-000000000001';
update test_payload set payload=jsonb_set(jsonb_set(payload,'{expected_updated_at}',to_jsonb((select updated_at from public.products where slug='rls-publicado'))),'{variants,0,stock_adjustment}','null');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set constraints all deferred;
select lives_ok($$select public.save_catalog_product(payload) from test_payload$$,'editar catálogo sin tocar stock');
set constraints all immediate;
select is((select quantity_reserved from public.inventory_levels where variant_id='50000000-0000-4000-8000-000000000001'),2,'reservas conservadas al guardar');
select is((select count(*) from public.inventory_movements where variant_id='50000000-0000-4000-8000-000000000001'),1::bigint,'guardar descripción no crea ajustes');
select throws_ok($$select public.save_catalog_product(payload) from test_payload$$,'40001','PRODUCT_CONFLICT','editor obsoleto rechazado');
select throws_ok($$select public.adjust_catalog_stock('50000000-0000-4000-8000-000000000001',0,4,'Conteo físico')$$,'40001','STOCK_CONFLICT','saldo obsoleto rechazado');
select throws_ok($$select public.adjust_catalog_stock('50000000-0000-4000-8000-000000000001',3,1,'Conteo físico')$$,'23514','STOCK_BELOW_RESERVED','no reduce stock bajo reserva');
select lives_ok($$select public.adjust_catalog_stock('50000000-0000-4000-8000-000000000001',3,4,'Conteo físico')$$,'ajuste auditado');
select is((select sum(quantity) from public.inventory_movements where variant_id='50000000-0000-4000-8000-000000000001'),4::bigint,'historial explica saldo');
reset role;
update test_payload set payload=jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload,'{expected_updated_at}',to_jsonb((select updated_at from public.products where slug='rls-publicado'))),'{status}','"draft"'),'{variants}','[]'),'{color_ids}','[]');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set constraints all deferred;
select lives_ok($$select public.save_catalog_product(payload) from test_payload$$,'retirar combinación conserva historia');
set constraints all immediate;
select is((select is_active from public.product_variants where sku='RLS-ONE'),false,'variante retirada inactiva');
select is((select count(*) from public.inventory_movements where variant_id='50000000-0000-4000-8000-000000000001'),2::bigint,'movimientos no se borran');
reset role;
insert into public.media_assets(id,file_path,public_url,file_name) values ('80000000-0000-4000-8000-000000000001','test/photo.jpg','https://local.invalid/storage/v1/object/public/catalog-media/test/photo.jpg','photo.jpg');
insert into public.home_slides(id,media_url) values ('90000000-0000-4000-8000-000000000001','https://local.invalid/storage/v1/object/public/catalog-media/test/photo.jpg');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$select public.begin_media_deletion('80000000-0000-4000-8000-000000000001')$$,'23514','MEDIA_IN_USE','no borra archivo en uso');
select throws_ok($$select public.reorder_home_slides('{}')$$,'40001','SLIDE_ORDER_CONFLICT','orden parcial rechazado');
delete from public.home_slides where id='90000000-0000-4000-8000-000000000001';
select lives_ok($$select public.begin_media_deletion('80000000-0000-4000-8000-000000000001')$$,'marca eliminación antes de Storage');
select throws_ok($$insert into public.home_slides(media_url) values ('https://local.invalid/storage/v1/object/public/catalog-media/test/photo.jpg')$$,'23514','MEDIA_NOT_REGISTERED_OR_DELETING','no referencia archivo mientras se borra');
select lives_ok($$select public.finish_media_deletion('80000000-0000-4000-8000-000000000001',false)$$,'fallo de Storage puede revertir marca');
reset role;
update public.admin_profiles set is_active=false where user_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.is_active_admin(),false,'revocación de admin efectiva');
select is((select count(*) from public.view_media_usage),0::bigint,'admin revocado pierde medios');
select throws_ok($$select public.save_catalog_product('{}')$$,'42501','ADMIN_REQUIRED','admin revocado no muta');
select * from finish();
rollback;
