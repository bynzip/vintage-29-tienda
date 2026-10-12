create or replace function public.validate_product_subcategory()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subcategory_id is null then
    if tg_op = 'INSERT'
      or new.status = 'published'
      or (tg_op = 'UPDATE' and new.subcategory_id is distinct from old.subcategory_id) then
      raise exception 'PRODUCT_REQUIRES_SUBCATEGORY' using errcode = '23514';
    end if;
    return new;
  end if;

  if not exists (
    select 1 from public.categories as subcategory
    where subcategory.id = new.subcategory_id and subcategory.parent_id is not null
  ) then
    raise exception 'PRODUCT_REQUIRES_SUBCATEGORY' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger products_validate_subcategory on public.products;
create trigger products_validate_subcategory
before insert or update of subcategory_id, status on public.products
for each row execute function public.validate_product_subcategory();
