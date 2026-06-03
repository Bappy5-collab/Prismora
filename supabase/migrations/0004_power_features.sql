-- ============================================================================
-- Prismora migration 0004 — power features
-- New tables: time_logs, task_dependencies, project_templates
-- All workspace-scoped with RLS via is_workspace_member(). Idempotent.
-- ============================================================================

-- ── time_logs ───────────────────────────────────────────────────────────────
-- A running timer has ended_at IS NULL. duration_seconds is filled on stop.
create table if not exists public.time_logs (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  task_id          uuid not null references public.tasks (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds integer,
  created_at       timestamptz not null default now()
);
create index if not exists idx_time_logs_workspace on public.time_logs (workspace_id, started_at desc);
create index if not exists idx_time_logs_user on public.time_logs (user_id, ended_at);
create index if not exists idx_time_logs_task on public.time_logs (task_id);

-- ── task_dependencies ─────────────────────────────────────────────────────────
-- task_id is BLOCKED BY depends_on_task_id (must finish first).
create table if not exists public.task_dependencies (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  task_id            uuid not null references public.tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.tasks (id) on delete cascade,
  created_at         timestamptz not null default now(),
  unique (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);
create index if not exists idx_deps_task on public.task_dependencies (task_id);
create index if not exists idx_deps_blocker on public.task_dependencies (depends_on_task_id);
create index if not exists idx_deps_workspace on public.task_dependencies (workspace_id);

-- ── project_templates ─────────────────────────────────────────────────────────
-- User-defined, workspace-scoped templates. `tasks` is a JSON array of
-- { title, priority }. Built-in templates ship in code (not stored here).
create table if not exists public.project_templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text,
  tasks        jsonb not null default '[]'::jsonb,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_templates_workspace on public.project_templates (workspace_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.time_logs          enable row level security;
alter table public.task_dependencies   enable row level security;
alter table public.project_templates    enable row level security;

-- time_logs: members can read all (for reports); users manage only their own.
drop policy if exists "time_select" on public.time_logs;
create policy "time_select" on public.time_logs
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "time_insert_own" on public.time_logs;
create policy "time_insert_own" on public.time_logs
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and user_id = auth.uid());
drop policy if exists "time_update_own" on public.time_logs;
create policy "time_update_own" on public.time_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "time_delete_own" on public.time_logs;
create policy "time_delete_own" on public.time_logs
  for delete to authenticated using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- task_dependencies: members read/manage.
drop policy if exists "deps_select" on public.task_dependencies;
create policy "deps_select" on public.task_dependencies
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "deps_insert" on public.task_dependencies;
create policy "deps_insert" on public.task_dependencies
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "deps_delete" on public.task_dependencies;
create policy "deps_delete" on public.task_dependencies
  for delete to authenticated using (public.is_workspace_member(workspace_id));

-- project_templates: members read/manage.
drop policy if exists "templates_select" on public.project_templates;
create policy "templates_select" on public.project_templates
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "templates_insert" on public.project_templates;
create policy "templates_insert" on public.project_templates
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
drop policy if exists "templates_delete" on public.project_templates;
create policy "templates_delete" on public.project_templates
  for delete to authenticated using (public.is_workspace_admin(workspace_id) or created_by = auth.uid());

-- ============================================================================
-- REALTIME
-- ============================================================================
do $$ begin alter publication supabase_realtime add table public.time_logs;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.task_dependencies;
exception when duplicate_object then null; end $$;
