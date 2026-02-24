-- ============================================================
-- HybridSpace - Superadmin Cross-Company Access Fix
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Companies: superadmin sees all
DROP POLICY IF EXISTS "view_own_company" ON companies;
CREATE POLICY "view_all_companies_superadmin" ON companies
  FOR SELECT USING (
    public.is_superadmin() 
    OR id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- 2. Offices: superadmin sees/manages all
DROP POLICY IF EXISTS "view_own_offices" ON offices;
CREATE POLICY "view_all_offices_superadmin" ON offices
  FOR SELECT USING (
    public.is_superadmin()
    OR company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- 3. Zones: superadmin sees/manages all
-- (They already use offices as a filter, and offices are now open to superadmin)

-- 4. Teams: superadmin sees all
DROP POLICY IF EXISTS "view_own_teams" ON teams;
CREATE POLICY "view_all_teams_superadmin" ON teams
  FOR SELECT USING (
    public.is_superadmin()
    OR company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- 5. Bookings: superadmin sees all
DROP POLICY IF EXISTS "view_own_company_bookings" ON bookings;
CREATE POLICY "view_all_bookings_superadmin" ON bookings
  FOR SELECT USING (
    public.is_superadmin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p1, profiles p2 
      WHERE p1.id = auth.uid() AND p2.id = bookings.user_id 
      AND p1.company_id = p2.company_id AND p1.role = 'admin'
    )
  );

-- 6. Invitations: superadmin sees all
DROP POLICY IF EXISTS "admin_manage_invitations" ON invitations;
CREATE POLICY "superadmin_manage_all_invitations" ON invitations
  FOR ALL USING (
    public.is_superadmin()
    OR company_id = (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
