-- Restauración transaccional de una exportación del catálogo en un proyecto vacío.
-- No transfiere usuarios Auth, credenciales, pagos ni pedidos.
create or replace function public.restore_catalog_snapshot(p_snapshot jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare name text; records jsonb; tables jsonb := p_snapshot->'tables';
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
  if p_snapshot->>'format' is distinct from 'vintage29-catalog-v1' or tables is null then raise exception 'SNAPSHOT_FORMAT_INVALID'; end if;
  lock table public.products,public.home_slides,public.home_banners,public.media_assets in exclusive mode;
  if exists(select 1 from public.products) or exists(select 1 from public.home_slides)
    or exists(select 1 from public.home_banners) or exists(select 1 from public.media_assets) then
    raise exception 'TARGET_CATALOG_NOT_EMPTY' using errcode='23514';
  end if;
  delete from public.categories where parent_id is not null;
  delete from public.categories where id is not null;
  delete from public.colors where id is not null; delete from public.sizes where id is not null; delete from public.fits where id is not null;

  foreach name in array array['price_lists','warehouses'] loop
    records := coalesce(tables->name,'[]');
    execute format('insert into public.%1$I select * from jsonb_populate_recordset(null::public.%1$I,$1) on conflict(id) do nothing',name) using records;
  end loop;
  update public.catalog_settings set price_list_id=(p_snapshot->>'price_list_id')::uuid,
    warehouse_id=(p_snapshot->>'warehouse_id')::uuid where id=true;
  foreach name in array array['colors','sizes','fits','categories','media_assets'] loop
    records := coalesce(tables->name,'[]');
    if name='categories' then
      insert into public.categories select * from jsonb_populate_recordset(null::public.categories,records) c where c.parent_id is null;
      insert into public.categories select * from jsonb_populate_recordset(null::public.categories,records) c where c.parent_id is not null;
    else
      execute format('insert into public.%1$I select * from jsonb_populate_recordset(null::public.%1$I,$1)',name) using records;
    end if;
  end loop;
  -- Se mantienen los IDs, snapshots comerciales y variantes archivadas.
  -- Los triggers diferidos verifican los productos publicados al final de la operación.
  foreach name in array array['products','product_colors','product_sizes','product_variants','variant_prices',
    'inventory_levels','inventory_movements','product_media','home_slides','home_banners'] loop
    records := coalesce(tables->name,'[]');
    if name='inventory_levels' then
      insert into public.inventory_levels(variant_id,warehouse_id,quantity_on_hand,quantity_reserved,reorder_point,incoming_quantity,updated_at)
      select variant_id,warehouse_id,quantity_on_hand,quantity_reserved,reorder_point,incoming_quantity,updated_at
      from jsonb_populate_recordset(null::public.inventory_levels,records);
    else
      execute format('insert into public.%1$I select * from jsonb_populate_recordset(null::public.%1$I,$1)',name) using records;
    end if;
  end loop;
  insert into public.inventory_movements(variant_id,warehouse_id,movement_type,quantity,notes)
    select i.variant_id,i.warehouse_id,'adjustment',i.quantity_on_hand-coalesce(sum(m.quantity),0),
      'Saldo inicial conciliado durante migración de catálogo'
    from public.inventory_levels i left join public.inventory_movements m using(variant_id,warehouse_id)
    group by i.variant_id,i.warehouse_id,i.quantity_on_hand
    having i.quantity_on_hand<>coalesce(sum(m.quantity),0);
  delete from public.price_lists where id='00000000-0000-4000-8000-000000000001'
    and id<>(p_snapshot->>'price_list_id')::uuid;
  delete from public.warehouses where id='00000000-0000-4000-8000-000000000002'
    and id<>(p_snapshot->>'warehouse_id')::uuid;
end $$;
revoke all on function public.restore_catalog_snapshot(jsonb) from public, anon, authenticated;
grant execute on function public.restore_catalog_snapshot(jsonb) to service_role;
