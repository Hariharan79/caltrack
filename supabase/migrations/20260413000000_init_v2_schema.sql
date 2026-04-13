-- v2 initial schema — multi-user caltrack
-- Tables: profiles, goals (log-style history), foods, log_entries, weight_entries
-- Includes: RLS policies, triggers (updated_at, handle_new_user, status-stamp),
-- trigram search index on foods.name, current_macros view.
--
-- Applied 2026-04-13 via mcp__supabase__apply_migration.

-- =========================================================================
-- Extensions
-- =========================================================================
create extension if not exists pg_trgm;
create extension if not exists btree_gin;

-- =========================================================================
-- profiles — 1:1 with auth.users, bootstrapped by handle_new_user trigger
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- =========================================================================
-- goals — log-style history so historical charts don't break on edit
-- Active goal at time t: SELECT DISTINCT ON (user_id) * FROM goals
--   WHERE user_id = $uid AND set_at <= $t
--   ORDER BY user_id, set_at DESC
-- =========================================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kcal_goal int not null check (kcal_goal > 0),
  protein_goal_g int check (protein_goal_g is null or protein_goal_g >= 0),
  carbs_goal_g int check (carbs_goal_g is null or carbs_goal_g >= 0),
  fat_goal_g int check (fat_goal_g is null or fat_goal_g >= 0),
  set_at timestamptz not null default now()
);

create index goals_user_set_at_idx on public.goals (user_id, set_at desc);

alter table public.goals enable row level security;

create policy "goals_select_own" on public.goals
  for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- foods — reusable food definitions, user-scoped library
-- =========================================================================
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  serving_size text,
  kcal_per_serving numeric(8,2) not null check (kcal_per_serving >= 0),
  protein_g_per_serving numeric(8,2) check (protein_g_per_serving is null or protein_g_per_serving >= 0),
  carbs_g_per_serving numeric(8,2) check (carbs_g_per_serving is null or carbs_g_per_serving >= 0),
  fat_g_per_serving numeric(8,2) check (fat_g_per_serving is null or fat_g_per_serving >= 0),
  barcode text,
  source text not null default 'manual' check (source in ('manual','barcode','import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigram fuzzy search on name, composed with user_id via btree_gin
create index foods_user_name_trgm_idx on public.foods
  using gin (user_id, name gin_trgm_ops);

-- Barcode lookup (only where present)
create index foods_user_barcode_idx on public.foods (user_id, barcode)
  where barcode is not null;

alter table public.foods enable row level security;

create policy "foods_select_own" on public.foods
  for select using (auth.uid() = user_id);
create policy "foods_insert_own" on public.foods
  for insert with check (auth.uid() = user_id);
create policy "foods_update_own" on public.foods
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods_delete_own" on public.foods
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- log_entries — eaten + planned meals in one table (F-19)
-- Denormalized name + macros so editing a food does not mutate history.
-- =========================================================================
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  name text not null,
  servings numeric(8,2) not null default 1 check (servings > 0),
  kcal numeric(8,2) not null check (kcal >= 0),
  protein_g numeric(8,2) check (protein_g is null or protein_g >= 0),
  carbs_g numeric(8,2) check (carbs_g is null or carbs_g >= 0),
  fat_g numeric(8,2) check (fat_g is null or fat_g >= 0),
  status text not null default 'eaten' check (status in ('planned','eaten')),
  meal_type text check (meal_type is null or meal_type in ('breakfast','lunch','dinner','snack')),
  logged_at timestamptz not null default now(),
  day_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index log_entries_user_day_idx on public.log_entries (user_id, day_key);
create index log_entries_user_status_day_idx on public.log_entries (user_id, status, day_key);

alter table public.log_entries enable row level security;

create policy "log_entries_select_own" on public.log_entries
  for select using (auth.uid() = user_id);
create policy "log_entries_insert_own" on public.log_entries
  for insert with check (auth.uid() = user_id);
create policy "log_entries_update_own" on public.log_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "log_entries_delete_own" on public.log_entries
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- weight_entries — body weight logs (F-15)
-- =========================================================================
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(6,2) not null check (weight_kg > 0),
  body_fat_pct numeric(4,1) check (body_fat_pct is null or (body_fat_pct > 0 and body_fat_pct < 100)),
  logged_at timestamptz not null default now(),
  day_key text not null,
  created_at timestamptz not null default now()
);

create index weight_entries_user_logged_at_idx on public.weight_entries (user_id, logged_at desc);

alter table public.weight_entries enable row level security;

create policy "weight_entries_select_own" on public.weight_entries
  for select using (auth.uid() = user_id);
create policy "weight_entries_insert_own" on public.weight_entries
  for insert with check (auth.uid() = user_id);
create policy "weight_entries_update_own" on public.weight_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_entries_delete_own" on public.weight_entries
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- Triggers
-- =========================================================================

-- Generic updated_at bumper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger foods_set_updated_at
  before update on public.foods
  for each row execute function public.set_updated_at();

create trigger log_entries_set_updated_at
  before update on public.log_entries
  for each row execute function public.set_updated_at();

-- Status planned -> eaten rewrites logged_at to now() (per D-14/D-17 review)
create or replace function public.log_entry_status_stamp()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'eaten' and old.status = 'planned' then
    new.logged_at = now();
  end if;
  return new;
end;
$$;

create trigger log_entries_status_stamp
  before update on public.log_entries
  for each row execute function public.log_entry_status_stamp();

-- Bootstrap profile + default goals on new auth.users row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.goals (user_id, kcal_goal) values (new.id, 2000);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- View: current_macros — sums eaten entries per user per day
-- security_invoker=on so the view respects RLS on log_entries
-- =========================================================================
create view public.current_macros
with (security_invoker = on) as
select
  user_id,
  day_key,
  sum(kcal) as total_kcal,
  sum(coalesce(protein_g, 0)) as total_protein_g,
  sum(coalesce(carbs_g, 0)) as total_carbs_g,
  sum(coalesce(fat_g, 0)) as total_fat_g,
  count(*) as entry_count
from public.log_entries
where status = 'eaten'
group by user_id, day_key;
