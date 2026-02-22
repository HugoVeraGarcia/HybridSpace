-- ============================================================
-- HybridSpace — Office Editor RLS (v2, sin recursión)
-- Corrección del "infinite recursion in policy for profiles"
-- Ejecuta este SQL en el Supabase SQL Editor
-- ============================================================

-- 1. Función auxiliar que comprueba si el usuario actual es admin
--    SECURITY DEFINER = se ejecuta con privilegios del owner,
--    ignorando RLS en profiles → sin bucle infinito.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ──────────────────────────────────────────────────────────────
-- OFFICES
-- ──────────────────────────────────────────────────────────────
drop policy if exists "read_offices"        on offices;
drop policy if exists "admin_write_offices" on offices;

alter table offices enable row level security;

create policy "read_offices" on offices
  for select using (auth.uid() is not null);

create policy "admin_write_offices" on offices
  for all using (public.is_admin());

-- ──────────────────────────────────────────────────────────────
-- ASSETS
-- ──────────────────────────────────────────────────────────────
drop policy if exists "admin_write_assets"  on assets;
drop policy if exists "admin_update_assets" on assets;
drop policy if exists "admin_delete_assets" on assets;

create policy "admin_insert_assets" on assets
  for insert with check (public.is_admin());

create policy "admin_update_assets" on assets
  for update using (public.is_admin());

create policy "admin_delete_assets" on assets
  for delete using (public.is_admin());

-- ──────────────────────────────────────────────────────────────
-- ZONES
-- ──────────────────────────────────────────────────────────────
drop policy if exists "admin_insert_zones" on zones;
drop policy if exists "admin_delete_zones" on zones;

create policy "admin_insert_zones" on zones
  for insert with check (public.is_admin());

create policy "admin_delete_zones" on zones
  for delete using (public.is_admin());
