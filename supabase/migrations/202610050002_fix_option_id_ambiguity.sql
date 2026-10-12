-- The RPC's PL/pgSQL variable `option_id` shadowed the column of the same name.
-- Replace only that predicate while preserving the already deployed function body.
do $migration$
declare
  function_definition text;
  ambiguous_clause constant text :=
    'where option_id in (select id from public.product_options where product_id = saved_product_id);';
  qualified_clause constant text :=
    'where existing_option_value.option_id in (select id from public.product_options where product_id = saved_product_id);';
begin
  function_definition := pg_get_functiondef('public.save_catalog_product(jsonb)'::regprocedure);

  if position(ambiguous_clause in function_definition) = 0 then
    raise exception 'Expected ambiguous option_id predicate was not found in save_catalog_product';
  end if;

  function_definition := replace(function_definition, ambiguous_clause, qualified_clause);
  execute function_definition;
end;
$migration$;
