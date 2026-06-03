-- ============================================================================
-- Prismora migration 0007 — repair tasks columns
-- ----------------------------------------------------------------------------
-- Fixes: PostgREST error "Could not find the 'due_date' column of 'tasks'
-- in the schema cache" when creating a project from a template (which seeds
-- tasks), or when creating/editing any task.
--
-- Cause: the live `tasks` table was created by an older schema, before these
-- columns existed. `create table if not exists` in schema.sql is a no-op on an
-- existing table, so the columns were never added.
--
-- Adds every column the app writes (idempotently), ensures the enum types and
-- the updated_at trigger exist, then reloads PostgREST's schema cache.
-- Safe to run repeatedly.
-- ============================================================================

-- 1. Ensure enum types exist (used by status / priority columns below).
do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

-- 2. Add any missing columns (matches schema.sql definitions).
alter table public.tasks
  add column if not exists description    text,
  add column if not exists status         task_status   not null default 'todo',
  add column if not exists priority        task_priority not null default 'medium',
  add column if not exists assignee_id     uuid references public.profiles (id) on delete set null,
  add column if not exists estimated_time  text,
  add column if not exists due_date        timestamptz,
  add column if not exists updated_at      timestamptz   not null default now();

-- 3. Ensure the updated_at trigger exists (depends on the column above).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_task_updated on public.tasks;
create trigger on_task_updated
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- 4. Reload PostgREST's schema cache so the new columns are visible immediately.
notify pgrst, 'reload schema';
