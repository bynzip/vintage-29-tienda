create extension if not exists pgcrypto;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  category text,
  price numeric(10, 2) check (price is null or price > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  asset_path text not null check (
    asset_path ~ '^/imagenes/[A-Za-z0-9 _().-]+(/[A-Za-z0-9 _().-]+)*$'
    and asset_path !~ '(^|/)\.\.?(/|$)'
  ),
  sort_order integer not null check (sort_order >= 0),
  is_lifestyle boolean not null default false,
  alt_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, sort_order),
  unique (product_id, asset_path)
);

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role = 'admin'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_published_created_idx
  on public.products (created_at desc)
  where status = 'published';
create index product_images_product_order_idx
  on public.product_images (product_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function public.set_updated_at();

create trigger admin_profiles_set_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = (select auth.uid())
      and role = 'admin'
      and is_active = true
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to anon, authenticated;

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.admin_profiles enable row level security;

create policy "Published products are readable by everyone"
  on public.products for select
  to anon, authenticated
  using (status = 'published');

create policy "Admins can manage products"
  on public.products for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "Published product images are readable by everyone"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.status = 'published'
    )
  );

create policy "Admins can manage product images"
  on public.product_images for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy "Admins can read their own authorization profile"
  on public.admin_profiles for select
  to authenticated
  using (user_id = (select auth.uid()) and public.is_active_admin());

revoke all on public.products, public.product_images, public.admin_profiles from anon, authenticated;
grant select on public.products, public.product_images to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant insert, update, delete on public.products, public.product_images to authenticated;

create or replace function public.save_product_with_images(
  p_product jsonb,
  p_images jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_id uuid;
  image jsonb;
  image_order integer := 0;
begin
  if not public.is_active_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  insert into public.products (id, name, slug, description, category, price, status)
  values (
    coalesce(nullif(p_product->>'id', '')::uuid, gen_random_uuid()),
    p_product->>'name',
    p_product->>'slug',
    nullif(p_product->>'description', ''),
    nullif(p_product->>'category', ''),
    nullif(p_product->>'price', '')::numeric,
    p_product->>'status'
  )
  on conflict (id) do update set
    name = excluded.name,
    slug = excluded.slug,
    description = excluded.description,
    category = excluded.category,
    price = excluded.price,
    status = excluded.status
  returning id into saved_id;

  delete from public.product_images where product_id = saved_id;
  for image in select value from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) loop
    insert into public.product_images (
      product_id, asset_path, sort_order, is_lifestyle, alt_text
    ) values (
      saved_id,
      image->>'asset_path',
      image_order,
      coalesce((image->>'is_lifestyle')::boolean, false),
      nullif(image->>'alt_text', '')
    );
    image_order := image_order + 1;
  end loop;

  return saved_id;
end;
$$;

revoke all on function public.save_product_with_images(jsonb, jsonb) from public, anon;
grant execute on function public.save_product_with_images(jsonb, jsonb) to authenticated;
