-- ============================================================
-- HybridSpace — Auth RLS + Trigger
-- Run this in Supabase SQL Editor AFTER the main schema
-- ============================================================

-- 1. Auto-create profile (and company when registering a new org) on signup.
--    Reads metadata set by the client's supabase.auth.signUp() call:
--      full_name    – required for all users
--      company_name – only present when registering a NEW company (admin flow)
--    For invited employees company_id is set later by accept_invite() RPC.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_company_name text;
    v_company_id   uuid;
    v_role         text := 'employee';
BEGIN
    -- Extract metadata
    v_company_name := new.raw_user_meta_data->>'company_name';

    -- If company_name is present this is a company-founder registration
    IF v_company_name IS NOT NULL AND v_company_name <> '' THEN
        INSERT INTO public.companies (name, plan, active, max_users)
        VALUES (v_company_name, 'starter', true, 10)
        RETURNING id INTO v_company_id;

        v_role := 'admin';
    END IF;

    -- Create the profile row (company_id NULL for invited users until accept_invite runs)
    INSERT INTO public.profiles (id, name, email, avatar, company_id, role)
    VALUES (
        new.id,
        coalesce(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            split_part(new.email, '@', 1)
        ),
        new.email,
        upper(left(coalesce(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            new.email
        ), 2)),
        v_company_id,
        v_role
    )
    ON CONFLICT (id) DO UPDATE
        SET name       = excluded.name,
            email      = excluded.email,
            -- If this is a founder signup (v_company_id is set), always use the new company.
            -- For regular employees (v_company_id NULL), keep existing company if already set.
            company_id = CASE
                            WHEN excluded.company_id IS NOT NULL THEN excluded.company_id
                            ELSE COALESCE(profiles.company_id, excluded.company_id)
                         END,
            role       = CASE
                            WHEN excluded.company_id IS NOT NULL THEN excluded.role
                            ELSE COALESCE(
                                    CASE WHEN profiles.role <> 'employee' THEN profiles.role END,
                                    excluded.role
                                 )
                         END;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Enable RLS
alter table companies  enable row level security;
alter table offices    enable row level security;
alter table zones      enable row level security;
alter table assets     enable row level security;
alter table profiles   enable row level security;
alter table bookings   enable row level security;
alter table teams      enable row level security;
alter table invitations enable row level security;

-- 3. Companies: users see their own company
drop policy if exists "view_own_company" on companies;
create policy "view_own_company" on companies
  for select using (
    id = (select company_id from profiles where id = auth.uid())
  );

-- 4. Profiles: users see their own company
drop policy if exists "same_company_profiles" on profiles;
create policy "same_company_profiles" on profiles
  for select using (
    company_id = (select company_id from profiles where id = auth.uid())
  );

drop policy if exists "own_profile_update" on profiles;
create policy "own_profile_update" on profiles
  for update using (id = auth.uid());

-- 5. Offices: users see their own company's offices; admin writes
drop policy if exists "view_own_offices" on offices;
create policy "view_own_offices" on offices
  for select using (
    company_id = (select company_id from profiles where id = auth.uid())
  );

drop policy if exists "admin_manage_offices" on offices;
create policy "admin_manage_offices" on offices
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin' and company_id = offices.company_id)
  );

-- 6. Zones: users see their own company's zones; admin writes
drop policy if exists "view_own_zones" on zones;
create policy "view_own_zones" on zones
  for select using (
    exists (select 1 from offices where id = zones.office_id)
  );

drop policy if exists "admin_manage_zones" on zones;
create policy "admin_manage_zones" on zones
  for all using (
    exists (select 1 from profiles p j join offices o on o.company_id = p.company_id
            where p.id = auth.uid() and p.role = 'admin' and o.id = zones.office_id)
  );

-- 7. Assets: users see their own company's assets; admin writes
drop policy if exists "view_own_assets" on assets;
create policy "view_own_assets" on assets
  for select using (
    exists (select 1 from offices where id = assets.office_id)
  );

drop policy if exists "admin_manage_assets" on assets;
create policy "admin_manage_assets" on assets
  for all using (
    exists (select 1 from profiles p j join offices o on o.company_id = p.company_id
            where p.id = auth.uid() and p.role = 'admin' and o.id = assets.office_id)
  );

-- 8. Bookings: own rows, or company admin sees all
drop policy if exists "view_own_company_bookings" on bookings;
create policy "view_own_company_bookings" on bookings
  for select using (
    user_id = auth.uid()
    or exists (select 1 from profiles p1, profiles p2 
               where p1.id = auth.uid() and p2.id = bookings.user_id 
               and p1.company_id = p2.company_id and p1.role = 'admin')
  );

drop policy if exists "manage_own_bookings" on bookings;
create policy "manage_own_bookings" on bookings
  for all using (user_id = auth.uid());

-- 9. Teams: users see their own company's teams
drop policy if exists "view_own_teams" on teams;
create policy "view_own_teams" on teams
  for select using (
    company_id = (select company_id from profiles where id = auth.uid())
  );

-- 10. Invitations: admin sees/manages their own company's invites
drop policy if exists "admin_manage_invitations" on invitations;
create policy "admin_manage_invitations" on invitations
  for all using (
    company_id = (select company_id from profiles where id = auth.uid() and role = 'admin')
  );
