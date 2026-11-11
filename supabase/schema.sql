-- =====================================================================
--  Online trgovina — postavljanje baze (Supabase)
--  Pokreni CIJELU ovu skriptu u Supabase → SQL Editor → New query → Run.
--  Skriptu je sigurno pokrenuti više puta.
-- =====================================================================

-- ---------- Tablica proizvoda ----------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 200),
  description text not null default '' check (char_length(description) <= 5000),
  price       numeric(10,2) not null check (price >= 0),
  image_path  text,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Kategorije (grupa → podkategorija) ----------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.categories(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 120),
  slug       text not null unique,
  sort_order integer not null default 0
);

alter table public.products add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.products add column if not exists brand text not null default '';
alter table public.products add column if not exists old_price numeric(10,2) check (old_price is null or old_price >= 0);
create index if not exists products_category_idx on public.products(category_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------- Popis administratora (samo ti) ----------
-- U ovu tablicu se može upisati SAMO kroz SQL Editor (nema pravila za upis iz aplikacije).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Sigurnosna pravila (Row Level Security) ----------
alter table public.products enable row level security;
alter table public.admins   enable row level security;
alter table public.categories enable row level security;

drop policy if exists "categories_read"  on public.categories;
drop policy if exists "categories_write" on public.categories;
create policy "categories_read" on public.categories for select using (true);
create policy "categories_write" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_read"   on public.products;
drop policy if exists "products_insert" on public.products;
drop policy if exists "products_update" on public.products;
drop policy if exists "products_delete" on public.products;
drop policy if exists "admins_self"     on public.admins;

-- Kupci vide samo aktivne proizvode; ti vidiš sve (i skrivene).
create policy "products_read" on public.products
  for select using (active or public.is_admin());

-- Dodavanje, izmjena i brisanje: samo administrator.
create policy "products_insert" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "products_update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "products_delete" on public.products
  for delete to authenticated using (public.is_admin());

-- Prijavljeni korisnik smije vidjeti samo svoj red u popisu administratora.
create policy "admins_self" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- ---------- Spremište slika ----------
-- Slike su javno dostupne preko linka (da ih kupci vide u trgovini),
-- ali popis datoteka, upload, zamjena i brisanje dozvoljeni su samo tebi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "images_admin_select" on storage.objects;
drop policy if exists "images_admin_insert" on storage.objects;
drop policy if exists "images_admin_update" on storage.objects;
drop policy if exists "images_admin_delete" on storage.objects;

create policy "images_admin_select" on storage.objects
  for select to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "images_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "images_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "images_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- =====================================================================
--  ZADNJI KORAK (pokreni posebno, NAKON što u Authentication → Users
--  napraviš svog korisnika). Zamijeni email svojim:
--
--  insert into public.admins (user_id)
--  select id from auth.users where email = 'tvoj@email.com'
--  on conflict do nothing;
-- =====================================================================
