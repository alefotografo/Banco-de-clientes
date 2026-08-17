create type public.lead_status as enum ('novo', 'em análise', 'contatado', 'reunião', 'proposta', 'ganho', 'perdido');

create table public.leads (
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
  status public.lead_status not null default 'novo',
  notes text not null default '',
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, place_id)
);

create table public.approaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email', 'pitch')),
  briefing jsonb not null default '{}'::jsonb,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;
alter table public.approaches enable row level security;
create policy "users manage own leads" on public.leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users manage own approaches" on public.approaches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
