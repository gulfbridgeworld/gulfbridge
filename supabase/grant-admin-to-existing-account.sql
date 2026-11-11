-- Run manually in the Supabase SQL editor only after the GulfBridge account
-- has been created normally and its email address has been confirmed.
-- This grants a role; it does not create an account or set a password.
do $$
declare
  target_user_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(19473152, 1);

  select id
    into target_user_id
    from auth.users
    where lower(email) = lower('gulfbridgeworld@gmail.com')
      and email_confirmed_at is not null;

  if target_user_id is null then
    raise exception 'No confirmed GulfBridge account exists for the configured admin email.';
  end if;

  if exists (
    select 1
      from public.user_roles
      where role = 'admin'::public.app_role
        and user_id <> target_user_id
  ) then
    raise exception 'An admin account already exists; this one-time grant is closed.';
  end if;

  insert into public.user_roles (user_id, role)
    values (target_user_id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
end;
$$;
