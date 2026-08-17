create table if not exists public.lead_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table if not exists public.lead_list_items (
  list_id uuid not null references public.lead_lists(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, lead_id)
);

alter table public.lead_lists enable row level security;
alter table public.lead_list_items enable row level security;

create policy "users manage own lead lists" on public.lead_lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own list items" on public.lead_list_items for all using (exists (select 1 from public.lead_lists where id = list_id and user_id = auth.uid())) with check (exists (select 1 from public.lead_lists where id = list_id and user_id = auth.uid()));
