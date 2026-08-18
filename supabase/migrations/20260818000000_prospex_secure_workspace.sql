-- Isolated workspace for Prospex. These tables intentionally do not share
-- names with existing applications in this Supabase project.
create type public.prospex_lead_status as enum ('novo', 'em análise', 'contatado', 'reunião', 'proposta', 'ganho', 'perdido');

create table public.prospex_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id text,
  name text not null,
  category text,
  address text,
  phone text,
  website text,
  email text,
  whatsapp text,
  contact_name text,
  contact_role text,
  contact_source text,
  status public.prospex_lead_status not null default 'novo',
  priority_score integer not null default 50 check (priority_score between 0 and 100),
  next_action text,
  next_action_at timestamptz,
  tags text[] not null default '{}',
  notes text not null default '',
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, place_id)
);

create table public.prospex_approaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.prospex_leads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email', 'pitch')),
  briefing jsonb not null default '{}'::jsonb,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.prospex_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.prospex_list_items (
  list_id uuid not null references public.prospex_lists(id) on delete cascade,
  lead_id uuid not null references public.prospex_leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (list_id, lead_id)
);

create table public.prospex_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.prospex_leads(id) on delete cascade,
  kind text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.prospex_leads enable row level security;
alter table public.prospex_approaches enable row level security;
alter table public.prospex_lists enable row level security;
alter table public.prospex_list_items enable row level security;
alter table public.prospex_activity enable row level security;

create policy "prospex users manage own leads" on public.prospex_leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prospex users manage own approaches" on public.prospex_approaches for all using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.prospex_leads l where l.id = lead_id and l.user_id = auth.uid()));
create policy "prospex users manage own lists" on public.prospex_lists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prospex users manage own list items" on public.prospex_list_items for all using (exists (select 1 from public.prospex_lists x where x.id = list_id and x.user_id = auth.uid())) with check (exists (select 1 from public.prospex_lists x join public.prospex_leads l on l.id = lead_id where x.id = list_id and x.user_id = auth.uid() and l.user_id = auth.uid()));
create policy "prospex users manage own activity" on public.prospex_activity for all using (auth.uid() = user_id) with check (auth.uid() = user_id and exists (select 1 from public.prospex_leads l where l.id = lead_id and l.user_id = auth.uid()));

create index prospex_leads_user_priority_idx on public.prospex_leads (user_id, priority_score desc, updated_at desc);
create index prospex_activity_lead_idx on public.prospex_activity (lead_id, created_at desc);
