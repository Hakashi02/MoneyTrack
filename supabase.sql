
create table if not exists public.moneytrack_dados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb not null default '{"_parcelamentos":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.moneytrack_dados enable row level security;

drop policy if exists "Cada usuário lê seus próprios dados"
on public.moneytrack_dados;

create policy "Cada usuário lê seus próprios dados"
on public.moneytrack_dados
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Cada usuário cria seus próprios dados"
on public.moneytrack_dados;

create policy "Cada usuário cria seus próprios dados"
on public.moneytrack_dados
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Cada usuário atualiza seus próprios dados"
on public.moneytrack_dados;

create policy "Cada usuário atualiza seus próprios dados"
on public.moneytrack_dados
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
