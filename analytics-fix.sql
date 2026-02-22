-- ============================================================
-- Analytics View Fix: Add Company Isolation
-- ============================================================

-- Drop the old view if it exists
drop view if exists analytics_by_weekday;

-- Recreate it with company_id support
create or replace view analytics_by_weekday as
select
  p.company_id,
  to_char(b.date, 'Dy') as day_name,
  extract(isodow from b.date) as dow,
  count(*)            as total_bookings,
  count(*) filter (where b.check_in_status = 'checked_in') as checked_in_count
from bookings b
join profiles p on p.id = b.user_id
where b.date >= current_date - interval '90 days'
group by p.company_id, day_name, dow
order by p.company_id, dow;
