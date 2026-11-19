create table if not exists public.moneytrack_dados (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dados jsonb not null default '{"_parcelamentos": []}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.moneytrack_dados enable row level security;

grant select, insert, update on public.moneytrack_dados to authenticated;

-- Cada usuário só pode acessar os próprios dados.
drop policy if exists "Cada usuário lê seus próprios dados"
  on public.moneytrack_dados;
create policy "Cada usuário lê seus próprios dados"
  on public.moneytrack_dados
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Cada usuário cria seus próprios dados"
  on public.moneytrack_dados;
create policy "Cada usuário cria seus próprios dados"
  on public.moneytrack_dados
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Cada usuário atualiza seus próprios dados"
  on public.moneytrack_dados;
create policy "Cada usuário atualiza seus próprios dados"
  on public.moneytrack_dados
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 2. Lista privada de administradores.
-- Não concedemos acesso direto a esta tabela pelo navegador.
create table if not exists public.moneytrack_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.moneytrack_admins enable row level security;

revoke all on table public.moneytrack_admins from anon, authenticated;

-- 3. Função chamada pelo JavaScript usando supabase.rpc().
create or replace function public.is_moneytrack_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moneytrack_admins as admins
    where admins.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_moneytrack_admin() from public;
grant execute on function public.is_moneytrack_admin() to authenticated;