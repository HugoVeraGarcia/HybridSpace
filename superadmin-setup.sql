-- ============================================================
-- HybridSpace — Superadmin & Global Access Setup
-- Ejecuta en el Supabase SQL Editor
-- ============================================================

-- 1. Actualizar la restricción de roles en profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('employee', 'admin', 'superadmin'));

-- 2. Función helper para detectar Superadmin (Security Definer para evitar recursión)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'superadmin'
  );
END;
$$;

-- 3. Función helper para cualquier admin (Admin de empresa o Superadmin)
CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.is_superadmin()
  );
END;
$$;

-- 4. Actualizar Políticas RLS para Acceso Global

-- Companies: Superadmin ve todas, Admin solo la suya
DROP POLICY IF EXISTS "view_own_company" ON public.companies;
DROP POLICY IF EXISTS "read_companies" ON public.companies;
CREATE POLICY "read_companies_v2" ON public.companies
FOR SELECT USING (
  public.is_superadmin()
  OR id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Profiles: Superadmin ve todos, Admin ve su empresa
DROP POLICY IF EXISTS "same_company_profiles" ON public.profiles;
DROP POLICY IF EXISTS "read_profiles" ON public.profiles;
CREATE POLICY "read_profiles_v3" ON public.profiles
FOR SELECT USING (
  public.is_superadmin()
  OR id = auth.uid()
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- Offices: Superadmin gestiona todas, Admin gestiona la suya
DROP POLICY IF EXISTS "view_own_offices" ON public.offices;
DROP POLICY IF EXISTS "admin_manage_offices" ON public.offices;
CREATE POLICY "read_offices_v2" ON public.offices
FOR SELECT USING (
  public.is_superadmin()
  OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "manage_offices_v2" ON public.offices
FOR ALL USING (
  public.is_superadmin()
  OR (public.is_any_admin() AND company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()))
);

-- Bookings: Superadmin ve todas
DROP POLICY IF EXISTS "view_own_company_bookings" ON public.bookings;
CREATE POLICY "read_bookings_v2" ON public.bookings
FOR SELECT USING (
  public.is_superadmin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2 
    WHERE p1.id = auth.uid() AND p2.id = bookings.user_id 
    AND p1.company_id = p2.company_id AND p1.role = 'admin'
  )
);

-- 5. Comando para convertirte en Superadmin (reemplaza 'tu@email.com')
-- UPDATE public.profiles SET role = 'superadmin' WHERE email = 'tu@email.com';
