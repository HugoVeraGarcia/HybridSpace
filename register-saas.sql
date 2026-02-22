-- ============================================================
-- HybridSpace — SaaS Registration & Invitation Setup
-- Ejecuta en el Supabase SQL Editor
-- ============================================================

-- 1. Add max_users column to companies (if not already there)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_users int DEFAULT 10;

-- 2. Invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
    email       text NOT NULL,
    token       uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    role        text DEFAULT 'employee',
    expires_at  timestamptz DEFAULT (now() + interval '7 days'),
    used        boolean DEFAULT false,
    created_at  timestamptz DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations for their own company
DROP POLICY IF EXISTS "admin_invitations" ON invitations;
CREATE POLICY "admin_invitations" ON invitations
  FOR ALL USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND public.is_admin()
  );

-- 3. RPC: register_company
--    Called right after signUp — creates the company and sets the caller as admin
DROP FUNCTION IF EXISTS public.register_company(text, text);
CREATE OR REPLACE FUNCTION public.register_company(
    p_company_name text,
    p_user_name    text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    new_id uuid;
BEGIN
    -- Create the company
    INSERT INTO companies (name, plan, active, max_users)
    VALUES (p_company_name, 'starter', true, 10)
    RETURNING id INTO new_id;

    -- Wait for profile to exist (trigger may be slightly async in some setups)
    -- Then update it
    UPDATE profiles
    SET company_id = new_id,
        name       = p_user_name,
        role       = 'admin'
    WHERE id = auth.uid();

    RETURN new_id;
END;
$$;

-- 4. RPC: accept_invite
--    Called after invited employee signUp — links them to the company
DROP FUNCTION IF EXISTS public.accept_invite(uuid, text);
CREATE OR REPLACE FUNCTION public.accept_invite(
    p_token uuid,
    p_name  text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    inv         invitations%ROWTYPE;
    user_count  int;
    max_u       int;
BEGIN
    -- Find the invitation
    SELECT * INTO inv FROM invitations
    WHERE token = p_token AND used = false AND expires_at > now();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Invitación no válida o expirada');
    END IF;

    -- Check user limit
    SELECT COUNT(*) INTO user_count FROM profiles WHERE company_id = inv.company_id;
    SELECT max_users INTO max_u FROM companies WHERE id = inv.company_id;
    IF user_count >= max_u THEN
        RETURN jsonb_build_object('error', 'La empresa ha alcanzado su límite de usuarios. Contacta al administrador.');
    END IF;

    -- Link user to company
    UPDATE profiles
    SET company_id = inv.company_id,
        name       = p_name,
        role       = inv.role
    WHERE id = auth.uid();

    -- Mark invitation as used
    UPDATE invitations SET used = true WHERE id = inv.id;

    RETURN jsonb_build_object('success', true, 'company_id', inv.company_id);
END;
$$;

-- 5. Allow reading own profile company_id even before the profile is fully populated
-- (needed so register_company can find the profile row right after signUp)
-- The existing RLS on profiles already allows users to read their own row.
