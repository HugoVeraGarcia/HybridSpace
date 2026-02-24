-- ============================================================
-- HybridSpace - OWNER Company & Superadmin Setup
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Create the OWNER company (HybridSpace itself)
INSERT INTO companies (id, name, plan, timezone)
VALUES (
    'ffffffff-ffff-ffff-ffff-ffffffffffff', -- Fixed ID for easy reference
    'OWNER', 
    'enterprise', 
    'America/Lima_City'
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Create/Update the Superadmin profile
-- Replace 'tu-email@ejemplo.com' with your actual email
DO $$
DECLARE
    v_user_id uuid;
    v_email text := 'hugo.vera.garcia@gmail.com'; -- <--- EDITA ESTO
BEGIN
    -- Find the user by email in auth.users
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

    IF v_user_id IS NOT NULL THEN
        -- Link the user to the OWNER company and set as superadmin
        INSERT INTO profiles (id, company_id, name, email, role)
        VALUES (
            v_user_id, 
            'ffffffff-ffff-ffff-ffff-ffffffffffff', 
            'Super Admin', 
            v_email, 
            'superadmin'
        )
        ON CONFLICT (id) DO UPDATE SET 
            company_id = EXCLUDED.company_id,
            role = 'superadmin';
            
        RAISE NOTICE 'Usuario % configurado como superadmin en OWNER', v_email;
    ELSE
        RAISE WARNING 'No se encontró el usuario con email %. Primero regístrate en la app.', v_email;
    END IF;
END $$;
