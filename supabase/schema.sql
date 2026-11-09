-- GulfBridge production schema for Supabase. Run in a new project after reviewing
-- the RLS policies and configuring the private storage buckets below.
create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('seeker', 'recruiter', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_state as enum ('pending', 'needs_changes', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_plan as enum ('standard', 'premium');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.employer_market as enum ('kenyan_agency', 'gulf_employer');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_state as enum ('not_due', 'awaiting_payment', 'pending_confirmation', 'paid', 'failed', 'refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.application_state as enum ('applied', 'interview', 'offer', 'medical', 'visa', 'travel', 'flight', 'rejected', 'withdrawn');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null check (length(trim(phone)) >= 7),
  location text not null default '',
  headline text not null default '',
  skills text[] not null default '{}',
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop policy if exists "job seeker reads saved jobs" on public.saved_jobs;
create policy "job seeker reads saved jobs" on public.saved_jobs for select to authenticated using (applicant_id = auth.uid());
drop policy if exists "job seeker saves published jobs" on public.saved_jobs;
create policy "job seeker saves published jobs" on public.saved_jobs for insert to authenticated with check (
  applicant_id = auth.uid() and public.is_published_job(job_id)
);
drop policy if exists "job seeker removes saved jobs" on public.saved_jobs;
create policy "job seeker removes saved jobs" on public.saved_jobs for delete to authenticated using (applicant_id = auth.uid());

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = required_role
  );
$$;

revoke all on function public.has_role(public.app_role) from public;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.has_role(public.app_role) to anon;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = excluded.phone;

  insert into public.user_roles (user_id, role)
  values (new.id, 'seeker')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.job_submissions (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users(id) on delete cascade,
  agency_name text not null,
  representative_name text not null,
  contact_email text not null,
  contact_phone text not null,
  business_registration_number text not null,
  employer_market public.employer_market not null,
  listing_plan public.listing_plan not null default 'standard',
  whatsapp_contact text,
  job_title text not null,
  country text not null,
  city text not null,
  category text not null,
  employment_type text not null default 'Full time',
  description text not null,
  salary_min numeric(12, 2) not null check (salary_min >= 0),
  salary_max numeric(12, 2) not null check (salary_max >= salary_min),
  salary_currency text not null check (salary_currency in ('SAR', 'AED', 'QAR', 'KWD', 'OMR', 'BHD', 'CAD', 'USD')),
  verification_status boolean not null default false,
  review_status public.review_state not null default 'pending',
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  payment_status public.payment_state not null default 'not_due',
  payment_amount numeric(12, 2) not null,
  payment_currency text not null check (payment_currency in ('KES', 'SAR')),
  payment_reference text,
  payment_confirmed_by uuid references auth.users(id),
  payment_confirmed_at timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (employer_market <> 'kenyan_agency' or payment_currency = 'KES'),
  check (employer_market <> 'gulf_employer' or payment_currency = 'SAR'),
  check (listing_plan <> 'premium' or expires_at is null or expires_at > created_at)
);

create or replace function public.is_job_employer(target_job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.job_submissions
    where id = target_job and employer_id = auth.uid()
  );
$$;

create or replace function public.is_published_job(target_job uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.job_submissions
    where id = target_job
      and review_status = 'approved'
      and payment_status = 'paid'
      and published_at is not null
      and (expires_at is null or expires_at > now())
  );
$$;

revoke all on function public.is_job_employer(uuid) from public;
revoke all on function public.is_published_job(uuid) from public;
grant execute on function public.is_job_employer(uuid) to authenticated;
grant execute on function public.is_published_job(uuid) to authenticated;

create index if not exists job_submissions_public_idx
  on public.job_submissions (country, category, created_at desc)
  where review_status = 'approved' and payment_status = 'paid' and published_at is not null;
create index if not exists job_submissions_employer_idx
  on public.job_submissions (employer_id, created_at desc);
create index if not exists job_submissions_review_idx
  on public.job_submissions (review_status, created_at)
  where review_status = 'pending';

create or replace function public.set_listing_price()
returns trigger
language plpgsql
as $$
begin
  if new.employer_market = 'kenyan_agency' then
    new.payment_currency := 'KES';
    new.payment_amount := case when new.listing_plan = 'premium' then 0 else 5000 end;
  else
    new.payment_currency := 'SAR';
    new.payment_amount := case when new.listing_plan = 'premium' then 0 else 289 end;
  end if;
  return new;
end;
$$;

drop trigger if exists set_job_submission_price on public.job_submissions;
create trigger set_job_submission_price
  before insert or update of employer_market, listing_plan on public.job_submissions
  for each row execute procedure public.set_listing_price();

create table if not exists public.job_submission_documents (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.job_submissions(id) on delete cascade,
  employer_id uuid not null references auth.users(id) on delete cascade,
  document_kind text not null check (document_kind in ('business_registration', 'recruitment_licence', 'representative_id')),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  created_at timestamptz not null default now(),
  unique (submission_id, document_kind)
);

create table if not exists public.saved_jobs (
  applicant_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_submissions(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (applicant_id, job_id)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_submissions(id),
  applicant_id uuid not null references auth.users(id) on delete cascade,
  status public.application_state not null default 'applied',
  employer_note text,
  admin_note text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index if not exists applications_applicant_idx on public.applications (applicant_id, applied_at desc);
create index if not exists applications_job_idx on public.applications (job_id, applied_at desc);

create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  document_kind text not null check (document_kind in ('cv', 'passport', 'national_id')),
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 10485760),
  created_at timestamptz not null default now(),
  unique (application_id, document_kind)
);

create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  old_status public.application_state,
  new_status public.application_state not null,
  note text,
  created_at timestamptz not null default now()
);

create or replace function public.cleanup_incomplete_application(target_application uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.applications
    where id = target_application and applicant_id = auth.uid()
  ) then
    raise exception 'Application was not found for this account';
  end if;
  if (
    select count(*) from public.application_documents
    where application_id = target_application
  ) >= 2 then
    raise exception 'Completed applications cannot be removed by this cleanup action';
  end if;
  delete from public.applications where id = target_application and applicant_id = auth.uid();
end;
$$;
grant execute on function public.cleanup_incomplete_application(uuid) to authenticated;

create or replace function public.guard_application_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_role('admin') then
    return new;
  end if;
  if new.applicant_id is distinct from old.applicant_id
    or new.job_id is distinct from old.job_id
    or new.applied_at is distinct from old.applied_at
    or new.admin_note is distinct from old.admin_note then
    raise exception 'Application ownership and admin fields cannot be changed by an employer';
  end if;
  if public.is_job_employer(old.job_id) then
    if new.status in ('applied', 'withdrawn') then
      raise exception 'Employers cannot reset or withdraw an applicant status';
    end if;
  else
    raise exception 'Only the employer for this job or an admin may update progress';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_application_update on public.applications;
create trigger guard_application_update
  before update on public.applications
  for each row execute procedure public.guard_application_update();

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_payments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.job_submissions(id) on delete cascade,
  employer_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('KES', 'SAR')),
  method text not null check (method in ('mpesa', 'card', 'bank_transfer')),
  provider_reference text,
  status public.payment_state not null default 'pending_confirmation',
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references auth.users(id) on delete cascade,
  employer_market public.employer_market not null,
  payment_amount numeric(12,2) not null,
  payment_currency text not null check (payment_currency in ('KES','SAR')),
  status public.payment_state not null default 'awaiting_payment',
  payment_method text check (payment_method in ('mpesa', 'card', 'bank_transfer')),
  payment_reference text,
  starts_at timestamptz,
  ends_at timestamptz,
  homepage_logo_path text,
  created_at timestamptz not null default now()
);

create or replace function public.guard_premium_subscription_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_role('admin') then
    return new;
  end if;
  if auth.uid() <> old.employer_id
    or old.status <> 'awaiting_payment'
    or new.status not in ('awaiting_payment', 'pending_confirmation')
    or new.employer_id is distinct from old.employer_id
    or new.employer_market is distinct from old.employer_market
    or new.payment_amount is distinct from old.payment_amount
    or new.payment_currency is distinct from old.payment_currency
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or new.homepage_logo_path is distinct from old.homepage_logo_path then
    raise exception 'Premium subscription terms and payment status are admin controlled';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_premium_subscription_update on public.premium_subscriptions;
create trigger guard_premium_subscription_update
  before update on public.premium_subscriptions
  for each row execute procedure public.guard_premium_subscription_update();

create or replace function public.admin_review_job_submission(
  target_submission uuid,
  decision text,
  reason text default null,
  verify_agency boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  submission public.job_submissions%rowtype;
  premium_end timestamptz;
begin
  if not public.has_role('admin') then
    raise exception 'Admin permission required';
  end if;
  if decision not in ('approved', 'rejected', 'needs_changes') then
    raise exception 'Unsupported review decision';
  end if;
  if decision <> 'approved' and coalesce(trim(reason), '') = '' then
    raise exception 'A reason is required when a listing is not approved';
  end if;
  select * into submission from public.job_submissions where id = target_submission for update;
  if not found then
    raise exception 'Submission not found';
  end if;
  if submission.review_status not in ('pending', 'needs_changes') then
    raise exception 'This submission has already been reviewed';
  end if;

  if decision = 'approved' and submission.listing_plan = 'premium' then
    select ends_at into premium_end
    from public.premium_subscriptions
    where employer_id = submission.employer_id
      and status = 'paid'
      and starts_at <= now()
      and ends_at > now()
    order by ends_at desc
    limit 1;
    if premium_end is null then
      raise exception 'An active premium subscription is required before approving a premium listing';
    end if;
  end if;
  if decision = 'approved' and verify_agency then
    if (
      select count(distinct document_kind)
      from public.job_submission_documents
      where submission_id = target_submission
        and document_kind in ('business_registration', 'recruitment_licence', 'representative_id')
    ) < 3 then
      raise exception 'All required official documents must be available before marking this agency platform-verified';
    end if;
  end if;

  update public.job_submissions
  set review_status = decision::public.review_state,
      review_note = reason,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      verification_status = case when decision = 'approved' then verify_agency else false end,
      payment_status = case
        when decision <> 'approved' then 'not_due'::public.payment_state
        when submission.listing_plan = 'premium' then 'paid'::public.payment_state
        else 'awaiting_payment'::public.payment_state
      end,
      payment_confirmed_by = case when decision = 'approved' and submission.listing_plan = 'premium' then auth.uid() else null end,
      payment_confirmed_at = case when decision = 'approved' and submission.listing_plan = 'premium' then now() else null end,
      published_at = case when decision = 'approved' and submission.listing_plan = 'premium' then now() else null end,
      expires_at = case
        when decision = 'approved' and submission.listing_plan = 'premium' then premium_end
        else null
      end,
      updated_at = now()
  where id = target_submission;
end;
$$;

create or replace function public.admin_confirm_listing_payment(target_payment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment public.listing_payments%rowtype;
begin
  if not public.has_role('admin') then
    raise exception 'Admin permission required';
  end if;
  select * into payment from public.listing_payments where id = target_payment for update;
  if not found or payment.status <> 'pending_confirmation' then
    raise exception 'Pending payment request not found';
  end if;
  update public.job_submissions
  set payment_status = 'paid',
      payment_reference = payment.provider_reference,
      payment_confirmed_by = auth.uid(),
      payment_confirmed_at = now(),
      published_at = now(),
      expires_at = now() + interval '30 days',
      updated_at = now()
  where id = payment.submission_id
    and employer_id = payment.employer_id
    and review_status = 'approved'
    and listing_plan = 'standard'
    and payment_status = 'awaiting_payment'
    and payment_amount = payment.amount
    and payment_currency = payment.currency;
  if not found then
    raise exception 'Listing is not approved or payment details do not match';
  end if;
  update public.listing_payments
  set status = 'paid', confirmed_by = auth.uid(), confirmed_at = now()
  where id = target_payment;
end;
$$;

create or replace function public.admin_confirm_premium_subscription(target_subscription uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('admin') then
    raise exception 'Admin permission required';
  end if;
  update public.premium_subscriptions
  set status = 'paid',
      starts_at = now(),
      ends_at = now() + interval '1 month'
  where id = target_subscription
    and status = 'pending_confirmation';
  if not found then
    raise exception 'Pending premium subscription payment not found';
  end if;
end;
$$;

grant execute on function public.admin_review_job_submission(uuid, text, text, boolean) to authenticated;
grant execute on function public.admin_confirm_listing_payment(uuid) to authenticated;
grant execute on function public.admin_confirm_premium_subscription(uuid) to authenticated;

create or replace function public.set_premium_price()
returns trigger
language plpgsql
as $$
begin
  if new.employer_market = 'kenyan_agency' then
    new.payment_currency := 'KES';
    new.payment_amount := 20000;
  else
    new.payment_currency := 'SAR';
    new.payment_amount := 578;
  end if;
  return new;
end;
$$;

drop trigger if exists set_premium_subscription_price on public.premium_subscriptions;
create trigger set_premium_subscription_price
  before insert or update of employer_market on public.premium_subscriptions
  for each row execute procedure public.set_premium_price();

create or replace function public.guard_job_submission_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.has_role('admin') then
    return new;
  end if;
  if auth.uid() <> old.employer_id then
    raise exception 'Only the submitting employer or an admin may update this listing';
  end if;
  if old.review_status not in ('pending', 'needs_changes') then
    raise exception 'Reviewed listings cannot be edited directly';
  end if;
  if new.employer_id is distinct from old.employer_id
    or new.review_status is distinct from old.review_status
    or new.review_note is distinct from old.review_note
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.payment_status is distinct from old.payment_status
    or new.payment_amount is distinct from old.payment_amount
    or new.payment_currency is distinct from old.payment_currency
    or new.payment_reference is distinct from old.payment_reference
    or new.payment_confirmed_by is distinct from old.payment_confirmed_by
    or new.payment_confirmed_at is distinct from old.payment_confirmed_at
    or new.published_at is distinct from old.published_at
    or new.expires_at is distinct from old.expires_at
    or new.verification_status is distinct from old.verification_status then
    raise exception 'Employers cannot change review, verification, payment, or publication fields';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_job_submission_update on public.job_submissions;
create trigger guard_job_submission_update
  before update on public.job_submissions
  for each row execute procedure public.guard_job_submission_updates();

create or replace function public.audit_job_submission_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.review_status is distinct from new.review_status
    or old.payment_status is distinct from new.payment_status
    or old.published_at is distinct from new.published_at
    or old.verification_status is distinct from new.verification_status then
    insert into public.admin_audit_log (
      actor_id, entity_type, entity_id, action, reason, before_data, after_data
    ) values (
      auth.uid(), 'job_submission', new.id,
      'review_or_publication_changed', new.review_note,
      jsonb_build_object(
        'review_status', old.review_status,
        'payment_status', old.payment_status,
        'published_at', old.published_at,
        'verification_status', old.verification_status
      ),
      jsonb_build_object(
        'review_status', new.review_status,
        'payment_status', new.payment_status,
        'published_at', new.published_at,
        'verification_status', new.verification_status
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_job_submission_change on public.job_submissions;
create trigger audit_job_submission_change
  after update on public.job_submissions
  for each row execute procedure public.audit_job_submission_changes();

create or replace function public.record_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_events (application_id, actor_id, old_status, new_status)
    values (new.id, auth.uid(), null, new.status);
    return new;
  end if;
  if old.status is distinct from new.status then
    if not public.has_role('admin') then
      if new.status in ('applied', 'withdrawn')
        or (array_position(enum_range(null::public.application_state), new.status)
          < array_position(enum_range(null::public.application_state), old.status)) then
        raise exception 'Application progress cannot be moved backwards or reset';
      end if;
    end if;
    insert into public.application_events (application_id, actor_id, old_status, new_status, note)
    values (new.id, auth.uid(), old.status, new.status, coalesce(new.employer_note, new.admin_note));
  end if;
  return new;
end;
$$;

drop trigger if exists record_application_status on public.applications;
create trigger record_application_status
  after insert or update on public.applications
  for each row execute procedure public.record_application_status_change();

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
  created_at
from public.job_submissions
where review_status = 'approved'
  and payment_status = 'paid'
  and published_at is not null
  and (expires_at is null or expires_at > now());

create or replace view public.employer_applications
with (security_barrier = true)
as
select
  a.id as application_id,
  a.job_id,
  a.status,
  a.applied_at,
  a.updated_at,
  s.job_title,
  s.agency_name as company,
  p.full_name as applicant_name,
  p.headline as applicant_headline,
  p.location as applicant_location,
  p.skills as applicant_skills
from public.applications a
join public.job_submissions s on s.id = a.job_id
join public.profiles p on p.id = a.applicant_id
where s.employer_id = auth.uid();

create or replace view public.application_tracking
with (security_barrier = true)
as
select
  a.id as application_id,
  a.job_id,
  a.status,
  a.applied_at,
  a.updated_at,
  s.job_title,
  s.agency_name as company,
  s.country,
  s.city
from public.applications a
join public.job_submissions s on s.id = a.job_id
where a.applicant_id = auth.uid();

create or replace view public.admin_applications
with (security_barrier = true)
as
select
  a.id as application_id,
  a.job_id,
  a.status,
  a.applied_at,
  a.updated_at,
  a.admin_note,
  a.employer_note,
  s.job_title,
  s.agency_name as company,
  p.full_name as applicant_name
from public.applications a
join public.job_submissions s on s.id = a.job_id
join public.profiles p on p.id = a.applicant_id
where public.has_role('admin');

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.job_submissions enable row level security;
alter table public.job_submission_documents enable row level security;
alter table public.applications enable row level security;
alter table public.saved_jobs enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_events enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.listing_payments enable row level security;
alter table public.premium_subscriptions enable row level security;

drop policy if exists "profile owner reads profile" on public.profiles;
create policy "profile owner reads profile" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role('admin'));
drop policy if exists "profile owner edits profile" on public.profiles;
create policy "profile owner edits profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "user reads own roles" on public.user_roles;
create policy "user reads own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role('admin'));
drop policy if exists "user requests recruiter role" on public.user_roles;
create policy "user requests recruiter role" on public.user_roles for insert to authenticated with check (user_id = auth.uid() and role = 'recruiter');

drop policy if exists "public reads published listings" on public.job_submissions;
drop policy if exists "employer and admin read submissions" on public.job_submissions;
create policy "employer and admin read submissions" on public.job_submissions for select to authenticated using (
  employer_id = auth.uid() or public.has_role('admin')
);
drop policy if exists "employer creates own pending listing" on public.job_submissions;
create policy "employer creates own pending listing" on public.job_submissions for insert to authenticated with check (
  employer_id = auth.uid()
  and review_status = 'pending'
  and payment_status = 'not_due'
  and published_at is null
  and expires_at is null
  and verification_status = false
  and reviewed_by is null
  and reviewed_at is null
  and review_note is null
  and payment_reference is null
  and payment_confirmed_by is null
  and payment_confirmed_at is null
);
drop policy if exists "admin manages listing review" on public.job_submissions;
create policy "admin manages listing review" on public.job_submissions for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "employer edits own unreviewed listing" on public.job_submissions;
create policy "employer edits own unreviewed listing" on public.job_submissions for update to authenticated using (
  employer_id = auth.uid() and review_status in ('pending', 'needs_changes')
) with check (
  employer_id = auth.uid() and review_status in ('pending', 'needs_changes')
);
drop policy if exists "employer deletes own pending submission" on public.job_submissions;
create policy "employer deletes own pending submission" on public.job_submissions for delete to authenticated using (
  employer_id = auth.uid() and review_status = 'pending'
);

drop policy if exists "employer reads own submission documents" on public.job_submission_documents;
create policy "employer reads own submission documents" on public.job_submission_documents for select to authenticated using (
  employer_id = auth.uid() or public.has_role('admin')
);
drop policy if exists "employer registers own submission documents" on public.job_submission_documents;
create policy "employer registers own submission documents" on public.job_submission_documents for insert to authenticated with check (
  employer_id = auth.uid() and exists (
    select 1 from public.job_submissions s where s.id = submission_id and s.employer_id = auth.uid()
  )
);

drop policy if exists "participants read applications" on public.applications;
create policy "participants read applications" on public.applications for select to authenticated using (
  applicant_id = auth.uid()
  or public.has_role('admin')
  or public.is_job_employer(job_id)
);
drop policy if exists "applicant applies to published job" on public.applications;
create policy "applicant applies to published job" on public.applications for insert to authenticated with check (
  applicant_id = auth.uid() and status = 'applied' and public.is_published_job(job_id)
);
drop policy if exists "employer or admin updates application" on public.applications;
create policy "employer or admin updates application" on public.applications for update to authenticated using (
  public.has_role('admin')
  or public.is_job_employer(job_id)
) with check (
  public.has_role('admin')
  or public.is_job_employer(job_id)
);

drop policy if exists "application parties read documents" on public.application_documents;
create policy "application parties read documents" on public.application_documents for select to authenticated using (
  applicant_id = auth.uid()
  or public.has_role('admin')
  or exists (select 1 from public.applications a where a.id = application_id and public.is_job_employer(a.job_id))
);
drop policy if exists "applicant adds own application documents" on public.application_documents;
create policy "applicant adds own application documents" on public.application_documents for insert to authenticated with check (
  applicant_id = auth.uid() and exists (select 1 from public.applications a where a.id = application_id and a.applicant_id = auth.uid())
);

drop policy if exists "participants read application timeline" on public.application_events;
create policy "participants read application timeline" on public.application_events for select to authenticated using (
  public.has_role('admin')
  or exists (
    select 1 from public.applications a
    where a.id = application_id and (a.applicant_id = auth.uid() or public.is_job_employer(a.job_id))
  )
);

drop policy if exists "admin reads audit log" on public.admin_audit_log;
create policy "admin reads audit log" on public.admin_audit_log for select to authenticated using (public.has_role('admin'));

drop policy if exists "employer reads listing payments" on public.listing_payments;
create policy "employer reads listing payments" on public.listing_payments for select to authenticated using (employer_id = auth.uid() or public.has_role('admin'));
drop policy if exists "admin manages listing payments" on public.listing_payments;
create policy "admin manages listing payments" on public.listing_payments for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "employer requests own listing payment" on public.listing_payments;
create policy "employer requests own listing payment" on public.listing_payments for insert to authenticated with check (
  employer_id = auth.uid()
  and status = 'pending_confirmation'
  and exists (
    select 1 from public.job_submissions s
    where s.id = submission_id and s.employer_id = auth.uid()
      and s.review_status = 'approved'
      and s.listing_plan = 'standard'
      and s.payment_status = 'awaiting_payment'
      and s.payment_amount = amount
      and s.payment_currency = currency
  )
);

drop policy if exists "employer reads premium subscription" on public.premium_subscriptions;
create policy "employer reads premium subscription" on public.premium_subscriptions for select to authenticated using (employer_id = auth.uid() or public.has_role('admin'));
drop policy if exists "admin manages premium subscription" on public.premium_subscriptions;
create policy "admin manages premium subscription" on public.premium_subscriptions for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));
drop policy if exists "employer requests premium subscription" on public.premium_subscriptions;
create policy "employer requests premium subscription" on public.premium_subscriptions for insert to authenticated with check (
  employer_id = auth.uid()
  and status = 'awaiting_payment'
  and starts_at is null
  and ends_at is null
);
drop policy if exists "employer records premium payment details" on public.premium_subscriptions;
create policy "employer records premium payment details" on public.premium_subscriptions for update to authenticated using (
  employer_id = auth.uid() and status in ('awaiting_payment', 'pending_confirmation')
) with check (
  employer_id = auth.uid() and status in ('awaiting_payment', 'pending_confirmation')
);

grant select on public.published_jobs to anon, authenticated;
grant select on public.employer_applications to authenticated;
grant select on public.application_tracking to authenticated;
grant select on public.admin_applications to authenticated;
grant select on public.job_submissions to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant insert, select, update on public.job_submissions to authenticated;
grant delete on public.job_submissions to authenticated;
grant insert, select on public.job_submission_documents to authenticated;
grant select, insert, update on public.applications to authenticated;
grant select, insert on public.application_documents to authenticated;
grant select on public.application_events to authenticated;
grant select, insert, delete on public.saved_jobs to authenticated;
grant select on public.admin_audit_log to authenticated;
grant select, insert, update on public.listing_payments to authenticated;
grant select, insert, update on public.premium_subscriptions to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('application-documents', 'application-documents', false, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/jpeg','image/png']),
  ('agency-documents', 'agency-documents', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760;

drop policy if exists "applicant uploads own application files" on storage.objects;
create policy "applicant uploads own application files" on storage.objects for insert to authenticated with check (
  bucket_id = 'application-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.applications a
    where a.id::text = (storage.foldername(name))[2]
      and a.applicant_id = auth.uid()
  )
);
drop policy if exists "application participants download private files" on storage.objects;
create policy "application participants download private files" on storage.objects for select to authenticated using (
  bucket_id = 'application-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role('admin')
    or exists (
      select 1 from public.application_documents d
      join public.applications a on a.id = d.application_id
      join public.job_submissions s on s.id = a.job_id
      where d.storage_path = name and s.employer_id = auth.uid()
    )
  )
);
drop policy if exists "applicant removes own private files" on storage.objects;
create policy "applicant removes own private files" on storage.objects for delete to authenticated using (
  bucket_id = 'application-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "recruiter uploads own verification files" on storage.objects;
create policy "recruiter uploads own verification files" on storage.objects for insert to authenticated with check (
  bucket_id = 'agency-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "recruiter and admin read private verification files" on storage.objects;
create policy "recruiter and admin read private verification files" on storage.objects for select to authenticated using (
  bucket_id = 'agency-documents'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role('admin')
  )
);
drop policy if exists "recruiter removes own unreviewed files" on storage.objects;
create policy "recruiter removes own unreviewed files" on storage.objects for delete to authenticated using (
  bucket_id = 'agency-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
);
