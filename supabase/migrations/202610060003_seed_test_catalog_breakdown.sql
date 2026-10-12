update public.categories
set name = 'Jeans', slug = 'jeans', sort_order = 0
where parent_id is null and lower(name) = 'jeens';

update public.categories
set name = 'Shorts & Faldas', slug = 'shorts-faldas', sort_order = 3
where parent_id is null and lower(name) = 'pantalones';

update public.categories
set name = 'Blusas & Tops', slug = 'blusas-tops', sort_order = 2
where parent_id is null and lower(name) = 'tops';

update public.categories
set name = 'Vestidos', slug = 'vestidos', sort_order = 4
where parent_id is null and lower(name) = 'vestidos';

insert into public.categories (name, slug, sort_order, is_active)
values
  ('Jeans', 'jeans', 0, true),
  ('Casacas', 'casacas', 1, true),
  ('Blusas & Tops', 'blusas-tops', 2, true),
  ('Shorts & Faldas', 'shorts-faldas', 3, true),
  ('Vestidos', 'vestidos', 4, true),
  ('Sale', 'sale', 5, true),
  ('Ver todo', 'ver-todo', 6, true)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.categories (name, slug, parent_id, sort_order, is_active)
select breakdown.name, breakdown.slug, parent.id, breakdown.sort_order, true
from (values
  ('Jeans', 'Mom Fit', 'jeans-mom-fit', 0),
  ('Jeans', 'Flare Fit', 'jeans-flare-fit', 1),
  ('Jeans', 'Palazzo Fit', 'jeans-palazzo-fit', 2),
  ('Jeans', 'Low Rise Fit (Cadera)', 'jeans-low-rise-fit-cadera', 3),
  ('Jeans', 'Wide Leg Fit', 'jeans-wide-leg-fit', 4),
  ('Jeans', 'Skinny Fit', 'jeans-skinny-fit', 5),
  ('Jeans', 'Straight Fit', 'jeans-straight-fit', 6),
  ('Jeans', 'Culotte Fit', 'jeans-culotte-fit', 7),
  ('Jeans', 'Bootcut Fit', 'jeans-bootcut-fit', 8),
  ('Jeans', 'Cargo Fit', 'jeans-cargo-fit', 9),
  ('Casacas', 'Casacas', 'casacas-casacas', 0),
  ('Casacas', 'Boleros', 'casacas-boleros', 1),
  ('Blusas & Tops', 'Blusas', 'blusas-tops-blusas', 0),
  ('Blusas & Tops', 'Tops', 'blusas-tops-tops', 1),
  ('Blusas & Tops', 'Chalecos', 'blusas-tops-chalecos', 2),
  ('Shorts & Faldas', 'Falda', 'shorts-faldas-falda', 0),
  ('Shorts & Faldas', 'Short', 'shorts-faldas-short', 1),
  ('Shorts & Faldas', 'Falda short', 'shorts-faldas-falda-short', 2),
  ('Shorts & Faldas', 'Maxifalda', 'shorts-faldas-maxifalda', 3),
  ('Shorts & Faldas', 'Bermudas', 'shorts-faldas-bermudas', 4),
  ('Vestidos', 'Vestidos cortos', 'vestidos-cortos', 0),
  ('Vestidos', 'Vestidos largos', 'vestidos-largos', 1),
  ('Sale', 'Productos en descuento', 'sale-productos-en-descuento', 0),
  ('Ver todo', 'Stock de todos los productos', 'ver-todo-stock-de-todos-los-productos', 0)
) as breakdown(parent_name, name, slug, sort_order)
join public.categories as parent on parent.name = breakdown.parent_name and parent.parent_id is null
on conflict (slug) do update set
  name = excluded.name,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.fits (name, slug, sort_order, is_active)
values
  ('Mom Fit', 'mom-fit', 0, true),
  ('Flare Fit', 'flare-fit', 1, true),
  ('Palazzo Fit', 'palazzo-fit', 2, true),
  ('Low Rise Fit (Cadera)', 'low-rise-fit-cadera', 3, true),
  ('Wide Leg Fit', 'wide-leg-fit', 4, true),
  ('Skinny Fit', 'skinny-fit', 5, true),
  ('Straight Fit', 'straight-fit', 6, true),
  ('Culotte Fit', 'culotte-fit', 7, true),
  ('Bootcut Fit', 'bootcut-fit', 8, true),
  ('Cargo Fit', 'cargo-fit', 9, true)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

update public.colors
set name = 'Azul', slug = 'azul', hex_color = '#245A85', sort_order = 7, is_active = true
where lower(name) = 'azul denim';

update public.colors
set name = 'Negro', slug = 'negro', hex_color = '#171717', sort_order = 14, is_active = true
where lower(name) = 'negro';

insert into public.colors (name, slug, hex_color, sort_order, is_active)
values
  ('Ice', 'ice', '#DDE8EA', 0, true),
  ('Celeste Light', 'celeste-light', '#8FBBD5', 1, true),
  ('Celeste', 'celeste', '#5799C5', 2, true),
  ('Maiz', 'maiz', '#E7C649', 3, true),
  ('Oximaiz', 'oximaiz', '#C78B20', 4, true),
  ('Oxiblue', 'oxiblue', '#263C70', 5, true),
  ('Oxigreen', 'oxigreen', '#5E7F58', 6, true),
  ('Azul Navy', 'azul-navy', '#1C2940', 8, true),
  ('Natural', 'natural', '#D9C7A5', 9, true),
  ('Old Green', 'old-green', '#66764B', 10, true),
  ('Plomo', 'plomo', '#777C80', 11, true),
  ('Plomo Intermedio', 'plomo-intermedio', '#62666A', 12, true),
  ('Plomo Oscuro', 'plomo-oscuro', '#3D4145', 13, true)
on conflict (slug) do update set
  name = excluded.name,
  hex_color = excluded.hex_color,
  sort_order = excluded.sort_order,
  is_active = true;

update public.sizes
set name = '32', slug = '32', sort_order = 2, is_active = true
where name = '26';

update public.sizes
set name = '28', slug = '28', sort_order = 0, is_active = true
where name = '28';

update public.sizes
set name = '30', slug = '30', sort_order = 1, is_active = true
where name = '30';

insert into public.sizes (name, slug, sort_order, is_active)
values ('34', '34', 3, true)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;

update public.product_sizes set position = position + 1000;
update public.product_sizes as product_size
set position = size.sort_order
from public.sizes as size
where size.id = product_size.size_id;

update public.product_colors as product_color
set position = color.sort_order
from public.colors as color
where color.id = product_color.color_id;

update public.products as product
set subcategory_id = subcategory.id,
    category_id = null
from public.categories as subcategory
where subcategory.slug = case lower(product.name)
  when 'cadera pant alana' then 'jeans-low-rise-fit-cadera'
  when 'cadera pant chloe' then 'jeans-low-rise-fit-cadera'
  when 'culotte ashley bordado lazos' then 'jeans-culotte-fit'
  when 'flare pant cadera laila' then 'jeans-flare-fit'
  when 'flare pant freya op 1083' then 'jeans-flare-fit'
  when 'palazo odette' then 'jeans-palazzo-fit'
  when 'palazzo bianca' then 'jeans-palazzo-fit'
  when 'straight pant deysi bordado' then 'jeans-straight-fit'
  when 'top denim liuba op 1095' then 'blusas-tops-tops'
  when 'vestido denim charlotte' then 'vestidos-cortos'
  when 'vestido denim shelly op 2007' then 'vestidos-cortos'
  else null
end;

update public.products as product
set fit_id = fit.id
from public.categories as subcategory
join public.fits as fit on fit.name = subcategory.name
where subcategory.id = product.subcategory_id
  and subcategory.parent_id = (select id from public.categories where slug = 'jeans');

update public.product_variants as variant
set variant_name = concat_ws(' / ', color.name, size.name)
from public.colors as color, public.sizes as size
where variant.color_id = color.id and variant.size_id = size.id;

do $$
begin
  if exists (select 1 from public.products where subcategory_id is null) then
    raise exception 'TEST_CATALOG_PRODUCTS_REQUIRE_SUBCATEGORY';
  end if;
  if (select count(*) from public.categories where parent_id is null) <> 7 then
    raise exception 'EXPECTED_SEVEN_MAIN_CATEGORIES';
  end if;
end;
$$;
