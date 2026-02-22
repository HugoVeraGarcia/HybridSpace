-- ============================================================
-- HybridSpace — Bookings: fix RLS (clean slate)
-- Ejecuta en el Supabase SQL Editor
-- ============================================================

-- 1. Drop ALL existing bookings policies (clean slate)
do $$
declare r record;
begin
  for r in select policyname from pg_policies where tablename = 'bookings' loop
    execute format('drop policy if exists %I on bookings', r.policyname);
  end loop;
end $$;

-- 2. SELECT: TODOS los usuarios autenticados ven TODAS las reservas
--    (imprescindible para ver escritorios ocupados de otros usuarios)
create policy "read_all_bookings" on bookings
  for select using (auth.uid() is not null);

-- 3. INSERT: solo puedes insertar tu propia reserva
create policy "insert_own_booking" on bookings
  for insert with check (
    user_id = auth.uid() or public.is_admin()
  );

-- 4. UPDATE: solo tus reservas (check-in, etc.)
create policy "update_own_booking" on bookings
  for update using (
    user_id = auth.uid() or public.is_admin()
  );

-- 5. DELETE: solo tus reservas (cancelar)
create policy "delete_own_booking" on bookings
  for delete using (
    user_id = auth.uid() or public.is_admin()
  );
