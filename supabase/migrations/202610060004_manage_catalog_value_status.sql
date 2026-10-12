create or replace function public.manage_catalog_value_status(
  p_kind text,
  p_value_id uuid,
  p_is_active boolean
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  affected_products integer := 0;
  affected_categories uuid[];
  parent_category_id uuid;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_kind is null or p_kind not in ('categories', 'colors', 'sizes', 'fits', 'materials') then
    raise exception 'CATALOG_VALUE_KIND_INVALID' using errcode = '22023';
  end if;
  if p_value_id is null or p_is_active is null then
    raise exception 'CATALOG_VALUE_ARGUMENT_REQUIRED' using errcode = '22023';
  end if;

  if p_kind = 'categories' then
    select category.parent_id
    into parent_category_id
    from public.categories as category
    where category.id = p_value_id;

    if not found then
      raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002';
    end if;

    if p_is_active then
      if parent_category_id is not null and not exists (
        select 1 from public.categories as parent
        where parent.id = parent_category_id and parent.is_active
      ) then
        raise exception 'CATEGORY_PARENT_INACTIVE' using errcode = '23514';
      end if;
      update public.categories set is_active = true where id = p_value_id;
      return 0;
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
    set status = 'draft',
        subcategory_id = case when product.subcategory_id = any(affected_categories) then null else product.subcategory_id end,
        category_id = case when product.category_id = any(affected_categories) then null else product.category_id end
    where product.subcategory_id = any(affected_categories)
       or product.category_id = any(affected_categories);
    get diagnostics affected_products = row_count;

    update public.categories set is_active = false where id = any(affected_categories);
    return affected_products;
  end if;

  if p_is_active then
    if p_kind = 'colors' then
      update public.colors set is_active = true where id = p_value_id;
    elsif p_kind = 'sizes' then
      update public.sizes set is_active = true where id = p_value_id;
    elsif p_kind = 'fits' then
      update public.fits set is_active = true where id = p_value_id;
    else
      update public.materials set is_active = true where id = p_value_id;
    end if;
    if not found then
      raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002';
    end if;
    return 0;
  end if;

  if p_kind = 'colors' then
    update public.products as product
    set status = 'draft'
    where exists (select 1 from public.product_colors link where link.product_id = product.id and link.color_id = p_value_id)
       or exists (select 1 from public.product_variants variant where variant.product_id = product.id and variant.color_id = p_value_id);
    get diagnostics affected_products = row_count;

    update public.variant_prices as price
    set is_active = false
    where price.variant_id in (select variant.id from public.product_variants variant where variant.color_id = p_value_id);
    update public.product_variants as variant
    set is_active = false, combination_key = 'inactive:' || variant.id::text
    where variant.color_id = p_value_id and variant.is_active;
    delete from public.product_colors where color_id = p_value_id;
    update public.colors set is_active = false where id = p_value_id;
  elsif p_kind = 'sizes' then
    update public.products as product
    set status = 'draft'
    where exists (select 1 from public.product_sizes link where link.product_id = product.id and link.size_id = p_value_id)
       or exists (select 1 from public.product_variants variant where variant.product_id = product.id and variant.size_id = p_value_id);
    get diagnostics affected_products = row_count;

    update public.variant_prices as price
    set is_active = false
    where price.variant_id in (select variant.id from public.product_variants variant where variant.size_id = p_value_id);
    update public.product_variants as variant
    set is_active = false, combination_key = 'inactive:' || variant.id::text
    where variant.size_id = p_value_id and variant.is_active;
    delete from public.product_sizes where size_id = p_value_id;
    update public.sizes set is_active = false where id = p_value_id;
  elsif p_kind = 'fits' then
    update public.products set status = 'draft', fit_id = null where fit_id = p_value_id;
    get diagnostics affected_products = row_count;
    update public.fits set is_active = false where id = p_value_id;
  else
    update public.products set status = 'draft', material_id = null where material_id = p_value_id;
    get diagnostics affected_products = row_count;
    update public.materials set is_active = false where id = p_value_id;
  end if;

  if not found then
    raise exception 'CATALOG_VALUE_NOT_FOUND' using errcode = 'P0002';
  end if;

  return affected_products;
end;
$$;

create or replace function public.refresh_variant_names_for_catalog_value()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_table_name = 'colors' then
    update public.product_variants as variant
    set variant_name = concat_ws(' / ', new.name, size.name)
    from public.sizes as size
    where variant.color_id = new.id
      and variant.size_id = size.id;

    update public.product_variants as variant
    set variant_name = new.name
    where variant.color_id = new.id and variant.size_id is null;
  elsif tg_table_name = 'sizes' then
    update public.product_variants as variant
    set variant_name = concat_ws(' / ', color.name, new.name)
    from public.colors as color
    where variant.size_id = new.id
      and variant.color_id = color.id;

    update public.product_variants as variant
    set variant_name = new.name
    where variant.size_id = new.id and variant.color_id is null;
  end if;
  return new;
end;
$$;

create trigger colors_refresh_variant_names
after update of name on public.colors
for each row when (old.name is distinct from new.name)
execute function public.refresh_variant_names_for_catalog_value();

create trigger sizes_refresh_variant_names
after update of name on public.sizes
for each row when (old.name is distinct from new.name)
execute function public.refresh_variant_names_for_catalog_value();

revoke all on function public.manage_catalog_value_status(text, uuid, boolean) from public, anon;
grant execute on function public.manage_catalog_value_status(text, uuid, boolean) to authenticated;
