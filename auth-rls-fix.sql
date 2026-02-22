-- ============================================================
-- HybridSpace — Profiles RLS Fix v2 (sin recursión)
-- Ejecuta en el Supabase SQL Editor
-- ============================================================

-- Función que obtiene el company_id del usuario actual
-- SECURITY DEFINER bypasea RLS → sin bucle infinito
create or replace function public.my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- Reemplaza la policy anterior por una que NO usa subquery directo
drop policy if exists "same_company_profiles"              on profiles;
drop policy if exists "read_own_or_same_company_profiles"  on profiles;

create policy "read_profiles" on profiles
  for select using (
    id = auth.uid()
    OR company_id = public.my_company_id()
  );
