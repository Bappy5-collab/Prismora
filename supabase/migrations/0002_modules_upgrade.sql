-- ============================================================================
-- Prismora migration 0002 — modules upgrade
-- Adds columns the new modules depend on:
--   * projects.status        (Projects module: status field)
--   * tasks.due_date         (Calendar module: deadlines / overdue / upcoming)
--   * workspaces.description, workspaces.logo_url  (Settings module)
-- Idempotent: safe to run multiple times. Run in the Supabase SQL editor.
-- ============================================================================

-- project status enum
do $$ begin
  create type project_status as enum ('active', 'on_hold', 'completed', 'archived');
exception when duplicate_object then null; end $$;

-- projects.status
alter table public.projects
  add column if not exists status project_status not null default 'active';

-- tasks.due_date (+ index for calendar range queries)
alter table public.tasks
  add column if not exists due_date timestamptz;
create index if not exists idx_tasks_workspace_due on public.tasks (workspace_id, due_date);

-- workspace settings fields
alter table public.workspaces add column if not exists description text;
alter table public.workspaces add column if not exists logo_url text;
