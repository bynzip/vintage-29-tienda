-- Declare the UPDATE target alias used by the option_id predicate.
do $migration$
declare
  function_definition text;
  old_statement constant text :=
    'update public.option_values
  set position = position + 1000000
  where existing_option_value.option_id in (select id from public.product_options where product_id = saved_product_id);';
  fixed_statement constant text :=
    'update public.option_values as existing_option_value
  set position = existing_option_value.position + 1000000
  where existing_option_value.option_id in (select id from public.product_options where product_id = saved_product_id);';
begin
  function_definition := pg_get_functiondef('public.save_catalog_product(jsonb)'::regprocedure);

  if position(old_statement in function_definition) = 0 then
    raise exception 'Expected option value position UPDATE was not found in save_catalog_product';
  end if;

  function_definition := replace(function_definition, old_statement, fixed_statement);
  execute function_definition;
end;
$migration$;
