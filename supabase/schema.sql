-- MercaFamily: esquema de Supabase
-- Se pega entero en Supabase > SQL Editor > New query > Run. Se puede ejecutar más de una vez.

create extension if not exists pgcrypto;

-- Hogares: una lista compartida por familia
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Casa',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  weekly_budget numeric(10, 2),
  preferences jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Quién pertenece a cada hogar
create table if not exists public.members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Listas de la compra de cada hogar (la principal tiene el mismo id que el hogar)
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Productos apuntados
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  merc_id text,
  name text not null,
  category integer,
  qty numeric(6, 2) not null default 1,
  note text,
  price numeric(10, 2),
  checked boolean not null default false,
  added_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compras terminadas
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  store text not null default 'Mercadona',
  date date not null default current_date,
  total numeric(10, 2),
  est_total numeric(10, 2),
  total_is_estimate boolean not null default false,
  items_count integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

-- Productos de cada compra
create table if not exists public.trip_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  trip_id uuid not null references public.trips on delete cascade,
  merc_id text,
  name text not null,
  category integer,
  qty numeric(6, 2) not null default 1,
  price numeric(10, 2),
  bought_on date not null
);

-- Columnas añadidas después de la primera versión (no hacen nada si ya existen)
alter table public.households add column if not exists aliases jsonb not null default '{}'::jsonb;
alter table public.items add column if not exists list_id uuid references public.lists on delete cascade;
-- Tanda 1: en el súper
alter table public.households add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.items add column if not exists taken_by text;
alter table public.items add column if not exists missing boolean not null default false;
alter table public.lists add column if not exists icon text;
alter table public.lists add column if not exists color text;
alter table public.members add column if not exists color text;

-- Tanda 2: antes de ir
alter table public.items add column if not exists requested boolean not null default false;
alter table public.members add column if not exists role text not null default 'adulto';

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  day date not null,
  slot text not null default 'cena',
  recipe_id uuid references public.recipes on delete set null,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists meals_household_day_idx on public.meals (household_id, day);

alter table public.recipes enable row level security;
alter table public.meals enable row level security;
drop policy if exists recipes_all on public.recipes;
drop policy if exists meals_all on public.meals;
create policy recipes_all on public.recipes for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy meals_all on public.meals for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
grant select, insert, update, delete on public.recipes, public.meals to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['recipes', 'meals'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

create index if not exists items_household_idx on public.items (household_id);
create index if not exists lists_household_idx on public.lists (household_id);
create index if not exists trips_household_idx on public.trips (household_id, date desc);
create index if not exists trip_items_household_idx on public.trip_items (household_id);
create index if not exists trip_items_trip_idx on public.trip_items (trip_id);

-- ¿El usuario actual es de este hogar?
create or replace function public.is_member(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.members where household_id = hid and user_id = auth.uid())
$$;

-- Seguridad por filas: cada familia solo ve y cambia lo suyo
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.lists enable row level security;
alter table public.items enable row level security;
alter table public.trips enable row level security;
alter table public.trip_items enable row level security;

drop policy if exists households_select on public.households;
drop policy if exists households_update on public.households;
create policy households_select on public.households for select to authenticated using (public.is_member(id));
create policy households_update on public.households for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

drop policy if exists members_select on public.members;
drop policy if exists members_update_self on public.members;
drop policy if exists members_delete_self on public.members;
create policy members_select on public.members for select to authenticated using (public.is_member(household_id));
create policy members_update_self on public.members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members_delete_self on public.members for delete to authenticated using (user_id = auth.uid());

drop policy if exists lists_all on public.lists;
drop policy if exists items_all on public.items;
drop policy if exists trips_all on public.trips;
drop policy if exists trip_items_all on public.trip_items;
create policy lists_all on public.lists for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy items_all on public.items for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy trips_all on public.trips for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy trip_items_all on public.trip_items for all to authenticated using (public.is_member(household_id)) with check (public.is_member(household_id));

grant select, insert, update, delete on public.households, public.members, public.lists, public.items, public.trips, public.trip_items to authenticated;

-- Crear un hogar y entrar en él
create or replace function public.create_household(p_name text, p_display_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  insert into public.households (name) values (coalesce(nullif(trim(p_name), ''), 'Casa')) returning * into h;
  insert into public.members (household_id, user_id, display_name) values (h.id, auth.uid(), nullif(trim(p_display_name), ''));
  return h;
end;
$$;

-- Unirse a un hogar con su código
create or replace function public.join_household(p_code text, p_display_name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  h public.households;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  select * into h from public.households where invite_code = upper(trim(p_code));
  if h.id is null then
    raise exception 'Ese código no existe. Revisa que esté bien escrito.';
  end if;
  insert into public.members (household_id, user_id, display_name)
  values (h.id, auth.uid(), nullif(trim(p_display_name), ''))
  on conflict (household_id, user_id) do update set display_name = excluded.display_name;
  return h;
end;
$$;

revoke all on function public.create_household(text, text) from public, anon;
revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- Latido semanal (la tarea de GitHub lo llama para que el proyecto gratuito no se pause)
create or replace function public.heartbeat()
returns timestamptz
language sql
stable
as $$ select now() $$;
grant execute on function public.heartbeat() to anon, authenticated;

-- Tiempo real
do $$
declare
  t text;
begin
  foreach t in array array['households', 'lists', 'items', 'trips', 'trip_items'] loop
    if not exists (
      select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- Tanda 5: avisos push
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- Configuración del proyecto (la dirección de la función de avisos). Se rellena al desplegar.
create table if not exists public.app_config (
  key text primary key,
  value text not null
);
alter table public.app_config enable row level security;

-- Suscripciones de cada móvil a los avisos
create table if not exists public.push_subs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  member_name text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists push_subs_own on public.push_subs;
create policy push_subs_own on public.push_subs for all to authenticated
  using (user_id = auth.uid() and public.is_member(household_id))
  with check (user_id = auth.uid() and public.is_member(household_id));
grant select, insert, update, delete on public.push_subs to authenticated;

-- Registro de avisos enviados para no repetirlos (solo lo usa la función)
create table if not exists public.push_log (
  kind text not null,
  key text not null,
  created_at timestamptz not null default now(),
  primary key (kind, key)
);
alter table public.push_log enable row level security;

-- Llamar a la función de avisos cuando alguien apunta algo o termina una compra
create or replace function public.notify_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text;
begin
  select value into fn from public.app_config where key = 'push_url';
  if fn is not null then
    perform net.http_post(
      url := fn,
      body := jsonb_build_object('type', tg_argv[0], 'id', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists items_push on public.items;
create trigger items_push after insert on public.items for each row execute function public.notify_push('item');
drop trigger if exists trips_push on public.trips;
create trigger trips_push after insert on public.trips for each row execute function public.notify_push('trip');

-- Cada 15 minutos: aviso al salir del trabajo y resumen del domingo
create or replace function public.push_tick()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text;
begin
  select value into fn from public.app_config where key = 'push_url';
  if fn is not null then
    perform net.http_post(url := fn, body := '{"type": "tick"}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb);
  end if;
  delete from public.push_log where created_at < now() - interval '30 days';
end;
$$;

select cron.unschedule(jobid) from cron.job where jobname = 'mercafamily-push-tick';
select cron.schedule('mercafamily-push-tick', '*/15 * * * *', 'select public.push_tick()');

-- Comparar con Dia y Consum: resultados guardados 7 días (solo los usa la función compare)
create table if not exists public.compare_cache (
  key text primary key,
  data jsonb not null,
  at timestamptz not null default now()
);
alter table public.compare_cache enable row level security;
