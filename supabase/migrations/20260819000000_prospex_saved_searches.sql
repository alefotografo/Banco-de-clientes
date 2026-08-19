create table public.prospex_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  city text not null,
  neighborhood text,
  segment text not null,
  radius integer not null default 5000,
  created_at timestamptz not null default now()
);
alter table public.prospex_searches enable row level security;
create policy "prospex users manage own searches" on public.prospex_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index prospex_searches_user_created_idx on public.prospex_searches (user_id, created_at desc);
