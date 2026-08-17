alter table public.leads
  add column if not exists contact_name text,
  add column if not exists contact_role text,
  add column if not exists contact_source text;

comment on column public.leads.contact_name is 'Contato profissional somente quando divulgado oficialmente pela empresa.';
comment on column public.leads.contact_role is 'Cargo profissional divulgado oficialmente.';
comment on column public.leads.contact_source is 'URL ou descrição da fonte oficial da empresa.';
