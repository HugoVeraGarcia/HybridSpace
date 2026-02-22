-- ============================================================
-- HybridSpace — User Deactivation (SQL FIX)
-- Ejecuta este script para asegurar que la columna existe
-- ============================================================

-- 1. Añadir columna de forma directa (si no existe)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- 2. VERIFICACIÓN (Ejecuta esto para confirmar)
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'active';

-- 3. Funciones Helper (Security Definer)
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

CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR public.is_superadmin()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.my_company_id()
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  IF public.is_superadmin() THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND active = true
  );
END;
$$;

-- 4. Re-aplicar políticas
DROP POLICY IF EXISTS "read_profiles_v4" ON public.profiles;
CREATE POLICY "read_profiles_v4" ON public.profiles
FOR SELECT USING (
  public.is_superadmin()
  OR (public.is_active_user() AND (
    id = auth.uid()
    OR company_id = public.my_company_id()
  ))
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "admin_manage_profiles_v2" ON public.profiles;
CREATE POLICY "admin_manage_profiles_v2" ON public.profiles
FOR UPDATE USING (
  public.is_active_user() AND (
    public.is_superadmin()
    OR (public.is_any_admin() AND company_id = public.my_company_id())
  )
) WITH CHECK (
  public.is_superadmin()
  OR (public.is_any_admin() AND company_id = public.my_company_id())
);

-- 5. AUTOMATIZACIÓN: Liberar reservas al desactivar
-- Esta función se dispara cuando un perfil cambia de active=true a active=false
CREATE OR REPLACE FUNCTION public.handle_user_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el usuario pasa de activo a inactivo
    IF (OLD.active = true AND NEW.active = false) THEN
        -- Borrar reservas pendientes de hoy en adelante
        DELETE FROM public.bookings
        WHERE user_id = NEW.id
          AND date >= CURRENT_DATE
          AND check_in_status = 'pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_deactivated ON public.profiles;
CREATE TRIGGER on_user_deactivated
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (OLD.active IS DISTINCT FROM NEW.active)
    EXECUTE FUNCTION public.handle_user_deactivation();

-- Forzar recarga (otra vez por si acaso)
NOTIFY pgrst, 'reload schema';
