-- ============================================================
-- HybridSpace — Promover usuario a Admin
-- Ejecuta en el Supabase SQL Editor
-- ============================================================

-- Opción A: Promover por email (reemplaza el email por el tuyo)
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'TU_EMAIL@ejemplo.com';

-- ──────────────────────────────────────────────────────────────

-- Opción B: Promover al usuario con sesión activa (sin saber el email)
UPDATE public.profiles
SET role = 'admin'
WHERE id = auth.uid();

-- ──────────────────────────────────────────────────────────────

-- Verificar el resultado
SELECT id, name, email, role FROM public.profiles;
