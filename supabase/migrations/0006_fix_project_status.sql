-- ============================================================================
-- Prismora migration 0006 — repair projects.status
-- ----------------------------------------------------------------------------
-- Fixes: PostgREST error "Could not find the 'status' column of 'projects'
-- in the schema cache" when creating a project (also via a template).
--
-- Cause: the live `projects` table was created by an older schema, before the
-- `status` column existed. Re-running schema.sql does NOT fix this because it
-- uses `create table if not exists`, which is a no-op on an existing table.
--
-- This migration adds the enum + column if missing, then reloads PostgREST's
-- schema cache. Safe to run repeatedly.
-- ============================================================================

-- 1. Ensure the enum type exists.
do $$ begin
  create type project_status as enum ('active', 'on_hold', 'completed', 'archived');
exception when duplicate_object then null; end $$;

-- 2. Add the column if it is missing (matches schema.sql definition).
alter table public.projects
  add column if not exists status project_status not null default 'active';

-- 3. Reload PostgREST's schema cache so the new column is visible immediately
--    (otherwise the API keeps returning the "schema cache" error until reload).
notify pgrst, 'reload schema';
