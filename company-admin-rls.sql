    -- ============================================================
    -- HybridSpace — Companies: add active column + update RLS
    -- Ejecuta en el Supabase SQL Editor
    -- ============================================================

    -- 1. Añadir columna active si no existe
    alter table companies
    add column if not exists active boolean not null default true;

    -- 2. RLS (idempotente)
    alter table companies enable row level security;

    drop policy if exists "read_companies"          on companies;
    drop policy if exists "admin_insert_companies"  on companies;
    drop policy if exists "admin_update_companies"  on companies;

    create policy "read_companies" on companies
    for select using (auth.uid() is not null);

    create policy "admin_insert_companies" on companies
    for insert with check (public.is_admin());

    create policy "admin_update_companies" on companies
    for update using (public.is_admin());
