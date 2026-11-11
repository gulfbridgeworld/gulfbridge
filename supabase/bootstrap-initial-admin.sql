-- Install this function once before using the first-admin setup in the website.
-- Only the server-side bootstrap-admin Edge Function may execute the grant.
create or replace function public.bootstrap_initial_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception 'An authenticated user is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(19473152, 1);

  if not exists (
    select 1
      from auth.users
      where id = p_user_id
        and lower(email) = lower('gulfbridgeworld@gmail.com')
        and email_confirmed_at is not null
  ) then
    raise exception 'The account is not the confirmed first-admin account.';
  end if;

  if exists (
    select 1
      from public.user_roles
      where role = 'admin'::public.app_role
  ) then
    raise exception 'Initial admin setup has already been completed.';
  end if;

  insert into public.user_roles (user_id, role)
    values (p_user_id, 'admin'::public.app_role)
    on conflict (user_id, role) do nothing;
end;
$$;

revoke all on function public.bootstrap_initial_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_initial_admin(uuid) to service_role;
