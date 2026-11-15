-- Admin and member messaging. Apply after schema.sql.
create table if not exists public.inbox_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.inbox_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.inbox_messages add column if not exists read_at timestamptz;

create index if not exists inbox_messages_conversation_idx
  on public.inbox_messages (conversation_id, created_at);
create index if not exists inbox_messages_unread_idx
  on public.inbox_messages (conversation_id, created_at desc)
  where read_at is null;

alter table public.inbox_conversations enable row level security;
alter table public.inbox_messages enable row level security;

drop policy if exists "members and admins read inbox conversations" on public.inbox_conversations;
create policy "members and admins read inbox conversations"
  on public.inbox_conversations for select to authenticated
  using (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "members and admins create inbox conversations" on public.inbox_conversations;
create policy "members and admins create inbox conversations"
  on public.inbox_conversations for insert to authenticated
  with check (user_id = auth.uid() or public.has_role('admin'));

drop policy if exists "conversation participants read inbox messages" on public.inbox_messages;
create policy "conversation participants read inbox messages"
  on public.inbox_messages for select to authenticated
  using (
    public.has_role('admin')
    or exists (
      select 1 from public.inbox_conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "conversation participants send inbox messages" on public.inbox_messages;
create policy "conversation participants send inbox messages"
  on public.inbox_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      public.has_role('admin')
      or exists (
        select 1 from public.inbox_conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists "recipients mark inbox messages read" on public.inbox_messages;
create policy "recipients mark inbox messages read"
  on public.inbox_messages for update to authenticated
  using (
    sender_id <> auth.uid()
    and read_at is null
    and (
      public.has_role('admin')
      or exists (
        select 1 from public.inbox_conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
      )
    )
  )
  with check (
    sender_id <> auth.uid()
    and read_at is not null
    and (
      public.has_role('admin')
      or exists (
        select 1 from public.inbox_conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
      )
    )
  );

grant select, insert on public.inbox_conversations to authenticated;
grant select, insert on public.inbox_messages to authenticated;
grant update (read_at) on public.inbox_messages to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'inbox_messages'
    ) then
    alter publication supabase_realtime add table public.inbox_messages;
  end if;
end;
$$;
