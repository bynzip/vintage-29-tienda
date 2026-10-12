create or replace function public.validate_product_subcategory()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subcategory_id is null then
    if tg_op = 'INSERT' or new.status = 'published' then
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
