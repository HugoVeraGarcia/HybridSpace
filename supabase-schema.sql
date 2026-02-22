-- ============================================================
-- HybridSpace - Supabase SQL Schema + Seed Data
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────

create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plan        text default 'freemium',   -- freemium | pro | enterprise
  timezone    text default 'America/Mexico_City',
  created_at  timestamptz default now()
);

create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  name        text not null,
  color       text default '#6c63ff',
  created_at  timestamptz default now()
);

create table if not exists profiles (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  team_id     uuid references teams(id) on delete set null,
  name        text not null,
  email       text unique not null,
  role        text default 'employee',   -- employee | admin
  avatar      text,                      -- 2-letter initials
  created_at  timestamptz default now()
);

create table if not exists offices (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid references companies(id) on delete cascade,
  name          text not null,
  address       text,
  floor_map_url text,
  created_at    timestamptz default now()
);

create table if not exists zones (
  id              uuid primary key default gen_random_uuid(),
  office_id       uuid references offices(id) on delete cascade,
  team_id         uuid references teams(id) on delete set null,
  label           text not null,           -- 'A', 'B', etc.
  name            text not null,
  color           text default '#6c63ff',
  max_capacity    int default 20,
  coord_x         int,
  coord_y         int,
  coord_w         int,
  coord_h         int,
  created_at      timestamptz default now()
);

create table if not exists assets (
  id           uuid primary key default gen_random_uuid(),
  office_id    uuid references offices(id) on delete cascade,
  zone_id      uuid references zones(id) on delete set null,
  type         text not null,              -- 'desk' | 'room'
  name         text not null,             -- 'D-01', 'Sala Alpha', etc.
  status       text default 'free',       -- 'free' | 'maintenance'
  capacity     int default 1,             -- 1 for desks, N for rooms
  coord_x      int,
  coord_y      int,
  created_at   timestamptz default now()
);

create table if not exists bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references profiles(id) on delete cascade,
  asset_id         uuid references assets(id) on delete cascade,
  date             date not null,
  start_time       time default '09:00',
  end_time         time default '18:00',
  check_in_status  text default 'pending',  -- 'pending' | 'checked_in' | 'no_show'
  checked_in_at    timestamptz,
  created_at       timestamptz default now(),
  unique (asset_id, date)                   -- one booking per asset per day
);

-- ─────────────────────────────────────────────
-- 2. USEFUL VIEW: today's bookings with user info
-- ─────────────────────────────────────────────

create or replace view bookings_today as
select
  b.id,
  b.date,
  b.start_time,
  b.end_time,
  b.check_in_status,
  b.checked_in_at,
  p.id        as user_id,
  p.name      as user_name,
  p.email     as user_email,
  p.avatar    as user_avatar,
  p.team_id,
  a.id        as asset_id,
  a.name      as asset_name,
  a.type      as asset_type,
  a.coord_x,
  a.coord_y,
  z.label     as zone_label,
  z.name      as zone_name
from bookings b
join profiles p  on p.id = b.user_id
join assets   a  on a.id = b.asset_id
left join zones z on z.id = a.zone_id
where b.date = current_date;

-- ─────────────────────────────────────────────
-- 3. ANALYTICS VIEW: occupancy per weekday (last 90 days)
-- ─────────────────────────────────────────────

create or replace view analytics_by_weekday as
select
  to_char(date, 'Dy') as day_name,
  extract(isodow from date) as dow,
  count(*)            as total_bookings,
  count(*) filter (where check_in_status = 'checked_in') as checked_in_count
from bookings
where date >= current_date - interval '90 days'
group by day_name, dow
order by dow;

-- ─────────────────────────────────────────────
-- 4. RLS (Row-Level Security) - disabled for MVP dev
-- Enable when you add authentication
-- ─────────────────────────────────────────────

alter table companies  disable row level security;
alter table teams      disable row level security;
alter table profiles   disable row level security;
alter table offices    disable row level security;
alter table zones      disable row level security;
alter table assets     disable row level security;
alter table bookings   disable row level security;

-- ─────────────────────────────────────────────
-- 5. SEED DATA
-- ─────────────────────────────────────────────

-- Company
insert into companies (id, name, plan, timezone) values
  ('00000000-0000-0000-0000-000000000001', 'Acme Corp', 'pro', 'America/Mexico_City')
on conflict do nothing;

-- Teams
insert into teams (id, company_id, name, color) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering', '#6c63ff'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Marketing',   '#f59e0b'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'RRHH',        '#10b981'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Producto',    '#ef4444')
on conflict do nothing;

-- Profiles
insert into profiles (id, company_id, team_id, name, email, role, avatar) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Alex Rivera',   'alex.rivera@corp.com',   'admin',    'AR'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sofia Morales', 'sofia.morales@corp.com', 'employee', 'SM'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Carlos Vega',   'carlos.vega@corp.com',   'employee', 'CV'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Lucia Perez',   'lucia.perez@corp.com',   'employee', 'LP'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Rocio Herrera', 'rocio.herrera@corp.com', 'employee', 'RH'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Juan Torres',   'juan.torres@corp.com',   'employee', 'JT'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Maya Castillo', 'maya.castillo@corp.com', 'employee', 'MC'),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Diego Ramos',   'diego.ramos@corp.com',   'employee', 'DR')
on conflict do nothing;

-- Office
insert into offices (id, company_id, name, address) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Torre Oriente', 'Av. Insurgentes Sur 1234, CDMX')
on conflict do nothing;

-- Zones
insert into zones (id, office_id, team_id, label, name, color, max_capacity, coord_x, coord_y, coord_w, coord_h) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A', 'Zona Ingeniería', '#6c63ff', 20, 55,  65,  250, 220),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'B', 'Zona Marketing',  '#f59e0b', 15, 285, 65,  240, 220),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'C', 'Zona RRHH',       '#10b981', 10, 55,  350, 250, 120),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'D', 'Zona Producto',   '#ef4444', 12, 285, 350, 240, 120)
on conflict do nothing;

-- Assets (desks)
insert into assets (id, office_id, zone_id, type, name, coord_x, coord_y) values
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-01', 80,  90),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-02', 80,  140),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-03', 80,  190),
  ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-04', 80,  240),
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-05', 160, 90),
  ('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-06', 160, 140),
  ('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-07', 160, 190),
  ('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'desk', 'D-08', 160, 240),
  ('50000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'desk', 'D-09', 310, 90),
  ('50000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'desk', 'D-10', 310, 140),
  ('50000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'desk', 'D-11', 310, 190),
  ('50000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'desk', 'D-12', 310, 240),
  ('50000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'desk', 'D-13', 390, 90),
  ('50000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'desk', 'D-14', 390, 140),
  ('50000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'desk', 'D-15', 80,  380),
  ('50000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'desk', 'D-16', 80,  430),
  ('50000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'desk', 'D-17', 160, 380),
  ('50000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'desk', 'D-18', 160, 430),
  ('50000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'desk', 'D-19', 310, 380),
  ('50000000-0000-0000-0000-000000000020', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'desk', 'D-20', 310, 430),
  ('50000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'desk', 'D-21', 390, 380)
on conflict do nothing;

-- Assets (rooms)
insert into assets (id, office_id, zone_id, type, name, capacity, coord_x, coord_y) values
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'room', 'Sala Alpha', 8,  230, 90),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'room', 'Sala Beta',  4,  450, 90),
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'room', 'Sala Gamma', 12, 230, 380),
  ('60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000004', 'room', 'Sala Delta', 4,  450, 380)
on conflict do nothing;

-- Seed bookings for today (Alex + Sofia + Juan + Maya have desks)
insert into bookings (user_id, asset_id, date, check_in_status) values
  ('20000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', current_date, 'pending'),
  ('20000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000003', current_date, 'checked_in'),
  ('20000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000009', current_date, 'checked_in'),
  ('20000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000010', current_date, 'pending')
on conflict do nothing;

-- Seed historical bookings (last 5 weeks Mon-Fri for analytics)
insert into bookings (user_id, asset_id, date, check_in_status)
select
  ('20000000-0000-0000-0000-000000000001')::uuid,
  ('50000000-0000-0000-0000-000000000001')::uuid,
  d::date,
  case when random() > 0.2 then 'checked_in' else 'no_show' end
from generate_series(
  current_date - interval '35 days',
  current_date - interval '1 day',
  '1 day'
) as d
where extract(isodow from d) between 1 and 5
on conflict do nothing;
