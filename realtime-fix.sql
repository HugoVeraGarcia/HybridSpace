-- ============================================================
-- HybridSpace — Real-Time Fix
-- Ejecuta este script en el Editor SQL de Supabase
-- ============================================================

-- 1. Habilitar la replicación de tiempo real para la tabla de reservas
-- Esto permite que Supabase envíe eventos insert/update/delete al frontend
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- 2. Asegurar que los eventos de borrado contengan toda la fila
-- Útil para que el frontend sepa exactamente qué ID se borró
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- 3. Actualizar políticas RLS para que todos vean las reservas de su empresa
-- Sin esto, los usuarios 'employee' solo ven sus propias reservas y el tiempo real se filtra
DROP POLICY IF EXISTS "view_own_company_bookings" ON public.bookings;
CREATE POLICY "view_own_company_bookings" ON public.bookings
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p1, public.profiles p2 
        WHERE p1.id = auth.uid() 
          AND p2.id = public.bookings.user_id 
          AND p1.company_id = p2.company_id
          AND p1.active = true  -- Solo usuarios activos
    )
);

-- 4. Notificar cambios de esquema
NOTIFY pgrst, 'reload schema';
