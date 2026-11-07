-- =====================================================================
-- SUNA — Seu Glow Up em 21 Dias · banco de dados (Supabase / Postgres)
-- Cole no SQL Editor do Supabase e execute. Pode ser executado de novo.
--
-- O Supabase guarda apenas contas (login/cadastro) e os registros de cada usuária.
-- Não há verificação de compra nem confirmação de e-mail: o link do app é entregue só a quem comprou.
--
-- Segurança:
--  • Cada usuária só lê e grava os próprios registros (RLS).
--  • O dia liberado é calculado pelo relógio do SERVIDOR em America/Sao_Paulo;
--    gravar em dia futuro é recusado pelo banco, mesmo que o relógio do aparelho seja alterado.
--  • A data de início da jornada é definida pelo servidor uma única vez e nunca reiniciada.
-- =====================================================================

create extension if not exists citext;

-- ---------------------------------------------------------------------
-- Perfil e jornada
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  email citext not null,
  journey_start date,               -- Dia 1 (data de São Paulo). Definido uma única vez, nunca reiniciado.
  onboarding_done boolean not null default false,
  gpt_opened_at timestamptz,        -- primeiro clique no GPT personalizado (apaga o destaque amarelo)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- A usuária só pode alterar estes campos. journey_start é exclusivo do servidor.
grant update (name, onboarding_done, gpt_opened_at) on public.profiles to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- Funções de acesso e calendário
-- ---------------------------------------------------------------------
-- Toda conta logada tem acesso.
create or replace function public.has_access()
returns boolean
language sql stable
set search_path = public, pg_temp
as $$ select auth.uid() is not null; $$;

-- Dia corrido da jornada pela data do servidor em America/Sao_Paulo (1 no dia de início).
create or replace function public.journey_day()
returns integer
language sql stable security definer
set search_path = public, pg_temp
as $$
  select ((now() at time zone 'America/Sao_Paulo')::date - journey_start + 1)
  from public.profiles where id = auth.uid();
$$;

create or replace function public.server_now()
returns timestamptz
language sql stable
set search_path = pg_catalog, pg_temp
as $$ select now(); $$;

revoke all on function public.has_access() from public, anon;
revoke all on function public.journey_day() from public, anon;
grant execute on function public.has_access() to authenticated;
grant execute on function public.journey_day() to authenticated;
grant execute on function public.server_now() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Registros diários (conversa, desafio, 3 checklists, hábitos, anotações, planner)
-- ---------------------------------------------------------------------
create table if not exists public.day_records (
  user_id uuid not null references auth.users (id) on delete cascade,
  day smallint not null check (day between 1 and 21),
  mood text check (mood in ('A', 'B', 'C')),
  conversation_at timestamptz,
  challenge_revealed_at timestamptz,
  challenge_done_at timestamptz,
  meal boolean not null default false,
  activity boolean not null default false,
  group_update boolean not null default false,
  habits jsonb not null default '{}'::jsonb check (jsonb_typeof(habits) = 'object'),
  water_ml integer check (water_ml between 0 and 10000),
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 24),
  note text not null default '' check (char_length(note) <= 4000),
  objective text not null default '' check (char_length(objective) <= 300),
  achievements text not null default '' check (char_length(achievements) <= 1000),
  challenge_text text not null default '' check (char_length(challenge_text) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.day_records enable row level security;
revoke all on public.day_records from anon, authenticated;
grant select, insert, update on public.day_records to authenticated;

drop policy if exists records_select_own on public.day_records;
create policy records_select_own on public.day_records for select to authenticated using (user_id = auth.uid());

drop policy if exists records_insert_own on public.day_records;
create policy records_insert_own on public.day_records for insert to authenticated
  with check (user_id = auth.uid() and public.has_access() and day <= coalesce(public.journey_day(), 0));

drop policy if exists records_update_own on public.day_records;
create policy records_update_own on public.day_records for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.has_access() and day <= coalesce(public.journey_day(), 0));

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists day_records_touch on public.day_records;
create trigger day_records_touch before update on public.day_records for each row execute function public.touch_updated_at();
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Perfil criado automaticamente no cadastro
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'name', ''), 80), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists suna_on_auth_user_created on auth.users;
create trigger suna_on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Início do app: cria a jornada uma única vez e devolve a hora do servidor
-- ---------------------------------------------------------------------
create or replace function public.suna_bootstrap()
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.profiles (id, name, email)
  select u.id, left(coalesce(u.raw_user_meta_data ->> 'name', ''), 80), u.email from auth.users u where u.id = uid
  on conflict (id) do nothing;

  -- Dia 1 = data do primeiro acesso (São Paulo). Definido uma única vez, nunca reiniciado.
  update public.profiles
    set journey_start = (now() at time zone 'America/Sao_Paulo')::date
    where id = uid and journey_start is null;

  select * into prof from public.profiles where id = uid;

  return jsonb_build_object(
    'server_now', now(),
    'access', 'ok',
    'profile', jsonb_build_object(
      'id', prof.id, 'name', prof.name, 'email', prof.email, 'journey_start', prof.journey_start,
      'onboarding_done', prof.onboarding_done, 'gpt_opened_at', prof.gpt_opened_at
    )
  );
end $$;

revoke all on function public.suna_bootstrap() from public, anon;
grant execute on function public.suna_bootstrap() to authenticated;
