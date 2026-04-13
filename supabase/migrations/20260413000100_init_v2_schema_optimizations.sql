-- Fix advisor warnings from init_v2_schema.
-- Applied 2026-04-13 via mcp__supabase__apply_migration.
--
-- Covers:
--  • move pg_trgm + btree_gin out of public schema (security)
--  • pin search_path = '' on trigger functions (security)
--  • rewrite RLS policies to use (select auth.uid()) so the planner
--    caches the result rather than re-evaluating per row (perf)
--  • add covering index on log_entries.food_id (perf)

-- 1. Move extensions out of public
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;
alter extension btree_gin set schema extensions;

-- 2. Pin search_path on trigger functions
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.log_entry_status_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'eaten' and old.status = 'planned' then
    new.logged_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.goals (user_id, kcal_goal) values (new.id, 2000);
  return new;
end;
$$;

-- 3. Rewrite RLS policies — wrap auth.uid() in a subquery to cache it

-- profiles
drop policy "profiles_select_own" on public.profiles;
drop policy "profiles_insert_own" on public.profiles;
drop policy "profiles_update_own" on public.profiles;
drop policy "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete using ((select auth.uid()) = id);

-- goals
drop policy "goals_select_own" on public.goals;
drop policy "goals_insert_own" on public.goals;
drop policy "goals_update_own" on public.goals;
drop policy "goals_delete_own" on public.goals;
create policy "goals_select_own" on public.goals
  for select using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals
  for insert with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals
  for delete using ((select auth.uid()) = user_id);

-- foods
drop policy "foods_select_own" on public.foods;
drop policy "foods_insert_own" on public.foods;
drop policy "foods_update_own" on public.foods;
drop policy "foods_delete_own" on public.foods;
create policy "foods_select_own" on public.foods
  for select using ((select auth.uid()) = user_id);
create policy "foods_insert_own" on public.foods
  for insert with check ((select auth.uid()) = user_id);
create policy "foods_update_own" on public.foods
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "foods_delete_own" on public.foods
  for delete using ((select auth.uid()) = user_id);

-- log_entries
drop policy "log_entries_select_own" on public.log_entries;
drop policy "log_entries_insert_own" on public.log_entries;
drop policy "log_entries_update_own" on public.log_entries;
drop policy "log_entries_delete_own" on public.log_entries;
create policy "log_entries_select_own" on public.log_entries
  for select using ((select auth.uid()) = user_id);
create policy "log_entries_insert_own" on public.log_entries
  for insert with check ((select auth.uid()) = user_id);
create policy "log_entries_update_own" on public.log_entries
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "log_entries_delete_own" on public.log_entries
  for delete using ((select auth.uid()) = user_id);

-- weight_entries
drop policy "weight_entries_select_own" on public.weight_entries;
drop policy "weight_entries_insert_own" on public.weight_entries;
drop policy "weight_entries_update_own" on public.weight_entries;
drop policy "weight_entries_delete_own" on public.weight_entries;
create policy "weight_entries_select_own" on public.weight_entries
  for select using ((select auth.uid()) = user_id);
create policy "weight_entries_insert_own" on public.weight_entries
  for insert with check ((select auth.uid()) = user_id);
create policy "weight_entries_update_own" on public.weight_entries
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weight_entries_delete_own" on public.weight_entries
  for delete using ((select auth.uid()) = user_id);

-- 4. Covering index for the food_id foreign key
create index log_entries_food_id_idx on public.log_entries (food_id)
  where food_id is not null;
