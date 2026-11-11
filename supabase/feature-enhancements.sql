-- Optional GulfBridge feature tables. Run after schema.sql in the Supabase SQL editor.
-- Admin privileges continue to depend on the existing public.user_roles table.

create table if not exists public.job_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  keyword text not null default '',
  country text,
  category text,
  employment_type text,
  channels text[] not null default array['web']::text[],
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (channels <@ array['web', 'email', 'whatsapp']::text[]),
  check (length(trim(email)) > 3)
);

create index if not exists job_alerts_owner_idx on public.job_alerts (user_id, created_at desc);
create index if not exists job_alerts_active_idx on public.job_alerts (enabled) where enabled;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.job_submissions(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, job_id)
);

create index if not exists user_notifications_inbox_idx
  on public.user_notifications (user_id, created_at desc);

create table if not exists public.job_alert_email_queue (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.job_alerts(id) on delete cascade,
  job_id uuid not null references public.job_submissions(id) on delete cascade,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (alert_id, job_id)
);

create table if not exists public.job_categories (
  name text primary key check (length(trim(name)) between 2 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.job_categories (name) values
  ('Healthcare'), ('Driver'), ('Construction'), ('Hospitality'),
  ('Technician'), ('Logistics'), ('Customer service')
on conflict (name) do nothing;

create table if not exists public.overseas_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 5 and 180),
  summary text not null check (length(trim(summary)) between 10 and 1200),
  country text,
  source_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_url is null or source_url ~ '^https://')
);

create index if not exists overseas_news_public_idx
  on public.overseas_news (published_at desc) where is_published;

create table if not exists public.scam_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  job_id uuid references public.job_submissions(id) on delete set null,
  employer_name text not null default '',
  details text not null check (length(trim(details)) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'investigating', 'resolved', 'dismissed')),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scam_reports_queue_idx
  on public.scam_reports (status, created_at desc);

alter table public.job_alerts enable row level security;
alter table public.user_notifications enable row level security;
alter table public.job_alert_email_queue enable row level security;
alter table public.job_categories enable row level security;
alter table public.overseas_news enable row level security;
alter table public.scam_reports enable row level security;

drop policy if exists "owners manage their job alerts" on public.job_alerts;
create policy "owners manage their job alerts" on public.job_alerts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "owners read their notifications" on public.user_notifications;
create policy "owners read their notifications" on public.user_notifications
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "owners mark their notifications read" on public.user_notifications;
create policy "owners mark their notifications read" on public.user_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "public reads active job categories" on public.job_categories;
create policy "public reads active job categories" on public.job_categories
  for select to anon, authenticated using (is_active or public.has_role('admin'));
drop policy if exists "admins manage job categories" on public.job_categories;
create policy "admins manage job categories" on public.job_categories
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists "public reads published overseas news" on public.overseas_news;
create policy "public reads published overseas news" on public.overseas_news
  for select to anon, authenticated using (is_published or public.has_role('admin'));
drop policy if exists "admins manage overseas news" on public.overseas_news;
create policy "admins manage overseas news" on public.overseas_news
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists "visitors submit scam reports" on public.scam_reports;
create policy "visitors submit scam reports" on public.scam_reports
  for insert to anon, authenticated
  with check (
    status = 'open' and reviewed_by is null and admin_note is null
    and ((auth.uid() is null and reporter_id is null) or reporter_id = auth.uid())
  );
drop policy if exists "reporters read their reports" on public.scam_reports;
create policy "reporters read their reports" on public.scam_reports
  for select to authenticated using (reporter_id = auth.uid() or public.has_role('admin'));
drop policy if exists "admins manage scam reports" on public.scam_reports;
create policy "admins manage scam reports" on public.scam_reports
  for update to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists "admins delete job submissions" on public.job_submissions;
create policy "admins delete job submissions" on public.job_submissions
  for delete to authenticated using (public.has_role('admin'));

create or replace function public.notify_matching_job_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alert public.job_alerts%rowtype;
  was_public boolean := false;
begin
  if tg_op = 'UPDATE' then
    was_public := old.review_status = 'approved'
      and old.payment_status = 'paid'
      and old.published_at is not null
      and (old.expires_at is null or old.expires_at > now());
  end if;

  if new.review_status <> 'approved'
    or new.payment_status <> 'paid'
    or new.published_at is null
    or (new.expires_at is not null and new.expires_at <= now())
    or was_public then
    return new;
  end if;

  for alert in
    select * from public.job_alerts
    where enabled
      and (
        nullif(trim(keyword), '') is null
        or lower(concat_ws(' ', new.job_title, new.agency_name, new.country, new.city, new.category, new.description))
          like '%' || lower(trim(keyword)) || '%'
      )
      and (country is null or country = new.country)
      and (category is null or category = new.category)
      and (employment_type is null or employment_type = new.employment_type)
  loop
    if 'web' = any(alert.channels) then
      insert into public.user_notifications (user_id, job_id, title, body)
      values (
        alert.user_id,
        new.id,
        new.job_title,
        concat(new.city, ', ', new.country, ' · ', new.agency_name)
      )
      on conflict (user_id, job_id) do nothing;
    end if;

    if 'email' = any(alert.channels) then
      insert into public.job_alert_email_queue (alert_id, job_id, recipient_email)
      values (alert.id, new.id, alert.email)
      on conflict (alert_id, job_id) do nothing;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists matching_job_alerts_after_publish on public.job_submissions;
create trigger matching_job_alerts_after_publish
  after insert or update of review_status, payment_status, published_at, expires_at
  on public.job_submissions
  for each row execute procedure public.notify_matching_job_alerts();

do $$
begin
  alter publication supabase_realtime add table public.user_notifications;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'supabase_realtime publication is unavailable; enable it before using live notifications';
end;
$$;

revoke all on function public.notify_matching_job_alerts() from public, anon, authenticated;
grant select, insert, update, delete on public.job_alerts to authenticated;
grant select, update on public.user_notifications to authenticated;
grant select on public.job_categories to anon, authenticated;
grant insert, select, update, delete on public.job_categories to authenticated;
grant select, insert, update, delete on public.overseas_news to authenticated;
grant select, insert, update on public.scam_reports to authenticated;
