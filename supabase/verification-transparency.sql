-- Run after schema.sql to expose the verification review date on public listings.
create or replace view public.published_jobs
with (security_barrier = true)
as
select
  id,
  agency_name as company,
  job_title as title,
  country,
  city,
  category,
  employment_type,
  description,
  salary_min,
  salary_max,
  salary_currency,
  listing_plan,
  verification_status,
  case when listing_plan = 'premium' then whatsapp_contact else null end as whatsapp_contact,
  created_at,
  reviewed_at as verification_checked_at
from public.job_submissions
where review_status = 'approved'
  and payment_status = 'paid'
  and published_at is not null
  and (expires_at is null or expires_at > now());

grant select on public.published_jobs to anon, authenticated;
