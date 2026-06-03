-- ============================================================================
-- Prismora migration 0008 — SYNC ALL
-- ----------------------------------------------------------------------------
-- One-shot reconciliation that brings a database created from the original
-- schema.sql fully up to date. Folds in migrations 0002–0005 (columns + every
-- feature table + RBAC) and reloads the PostgREST schema cache at the end.
--
-- Fixes errors like:
--   "Could not find the 'status' column of 'projects' in the schema cache"
--   "Could not find the 'due_date' column of 'tasks' in the schema cache"
--   "Could not find the table 'public.task_dependencies' in the schema cache"
--
-- Fully idempotent (if-not-exists / drop-if-exists). Safe to run repeatedly in
-- the Supabase SQL editor.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────
do $$ begin create type task_status   as enum ('todo','in_progress','done'); exception when duplicate_object then null; end $$;
do $$ begin create type task_priority as enum ('low','medium','high');       exception when duplicate_object then null; end $$;
do $$ begin create type member_role   as enum ('owner','admin','member');    exception when duplicate_object then null; end $$;
do $$ begin create type invite_status as enum ('pending','accepted');        exception when duplicate_object then null; end $$;
do $$ begin create type project_status as enum ('active','on_hold','completed','archived'); exception when duplicate_object then null; end $$;

-- RBAC 2.0 roles (0005). ADD VALUE is transaction-safe here because all policies
-- below compare role::text, never the new enum literals directly.
alter type member_role add value if not exists 'manager';
alter type member_role add value if not exists 'viewer';

-- ─────────────────────────────────────────────────────────────────────────────
-- COLUMN BACKFILLS (0002) — core tables created by schema.sql
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.projects
  add column if not exists status project_status not null default 'active';

alter table public.tasks
  add column if not exists description    text,
  add column if not exists status         task_status   not null default 'todo',
  add column if not exists priority        task_priority not null default 'medium',
  add column if not exists assignee_id     uuid references public.profiles (id) on delete set null,
  add column if not exists estimated_time  text,
  add column if not exists due_date        timestamptz,
  add column if not exists updated_at      timestamptz   not null default now();

alter table public.workspaces
  add column if not exists description text,
  add column if not exists logo_url    text;

create index if not exists idx_tasks_workspace_due on public.tasks (workspace_id, due_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS (security definer)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.has_workspace_write(ws_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
      and m.role::text <> 'viewer'
  );
$$;

-- tasks.updated_at trigger (needs the column added above)
drop trigger if exists on_task_updated on public.tasks;
create trigger on_task_updated
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ═════════════════════════════════════════════════════════════════════════════
-- COLLAB TABLES (0003): activity_logs, task_comments, file_attachments,
--                       task_labels (+ links)
-- ═════════════════════════════════════════════════════════════════════════════
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  summary      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_activity_workspace on public.activity_logs (workspace_id, created_at desc);

create table if not exists public.task_comments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  task_id      uuid not null references public.tasks (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_comments_task on public.task_comments (task_id, created_at);
drop trigger if exists on_comment_updated on public.task_comments;
create trigger on_comment_updated
  before update on public.task_comments
  for each row execute function public.touch_updated_at();

create table if not exists public.file_attachments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  task_id      uuid not null references public.tasks (id) on delete cascade,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  name         text not null,
  path         text not null,
  mime_type    text,
  size         bigint,
  created_at   timestamptz not null default now()
);
create index if not exists idx_attachments_task on public.file_attachments (task_id, created_at);

create table if not exists public.task_labels (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);
create index if not exists idx_labels_workspace on public.task_labels (workspace_id);

create table if not exists public.task_label_links (
  task_id      uuid not null references public.tasks (id) on delete cascade,
  label_id     uuid not null references public.task_labels (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  primary key (task_id, label_id)
);
create index if not exists idx_label_links_task on public.task_label_links (task_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- POWER TABLES (0004): time_logs, task_dependencies, project_templates
-- ═════════════════════════════════════════════════════════════════════════════
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

-- ═════════════════════════════════════════════════════════════════════════════
-- AUDIT TABLE (0005)
-- ═════════════════════════════════════════════════════════════════════════════
create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid references public.profiles (id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_audit_workspace on public.audit_logs (workspace_id, created_at desc);

-- ═════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.activity_logs     enable row level security;
alter table public.task_comments      enable row level security;
alter table public.file_attachments   enable row level security;
alter table public.task_labels         enable row level security;
alter table public.task_label_links    enable row level security;
alter table public.time_logs          enable row level security;
alter table public.task_dependencies   enable row level security;
alter table public.project_templates    enable row level security;
alter table public.audit_logs         enable row level security;

-- activity_logs
drop policy if exists "activity_select" on public.activity_logs;
create policy "activity_select" on public.activity_logs
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "activity_insert" on public.activity_logs;
create policy "activity_insert" on public.activity_logs
  for insert to authenticated with check (public.is_workspace_member(workspace_id));

-- task_comments  (insert gated on non-viewer per 0005)
drop policy if exists "comments_select" on public.task_comments;
create policy "comments_select" on public.task_comments
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "comments_insert" on public.task_comments;
create policy "comments_insert" on public.task_comments
  for insert to authenticated
  with check (public.has_workspace_write(workspace_id) and author_id = auth.uid());
drop policy if exists "comments_update_own" on public.task_comments;
create policy "comments_update_own" on public.task_comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "comments_delete_own" on public.task_comments;
create policy "comments_delete_own" on public.task_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- file_attachments
drop policy if exists "attachments_select" on public.file_attachments;
create policy "attachments_select" on public.file_attachments
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "attachments_insert" on public.file_attachments;
create policy "attachments_insert" on public.file_attachments
  for insert to authenticated with check (public.has_workspace_write(workspace_id));
drop policy if exists "attachments_delete" on public.file_attachments;
create policy "attachments_delete" on public.file_attachments
  for delete to authenticated using (uploaded_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- task_labels
drop policy if exists "labels_select" on public.task_labels;
create policy "labels_select" on public.task_labels
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "labels_insert" on public.task_labels;
create policy "labels_insert" on public.task_labels
  for insert to authenticated with check (public.has_workspace_write(workspace_id));
drop policy if exists "labels_delete" on public.task_labels;
create policy "labels_delete" on public.task_labels
  for delete to authenticated using (public.is_workspace_member(workspace_id));

-- task_label_links
drop policy if exists "label_links_select" on public.task_label_links;
create policy "label_links_select" on public.task_label_links
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "label_links_insert" on public.task_label_links;
create policy "label_links_insert" on public.task_label_links
  for insert to authenticated with check (public.has_workspace_write(workspace_id));
drop policy if exists "label_links_delete" on public.task_label_links;
create policy "label_links_delete" on public.task_label_links
  for delete to authenticated using (public.is_workspace_member(workspace_id));

-- time_logs
drop policy if exists "time_select" on public.time_logs;
create policy "time_select" on public.time_logs
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "time_insert_own" on public.time_logs;
create policy "time_insert_own" on public.time_logs
  for insert to authenticated
  with check (public.has_workspace_write(workspace_id) and user_id = auth.uid());
drop policy if exists "time_update_own" on public.time_logs;
create policy "time_update_own" on public.time_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "time_delete_own" on public.time_logs;
create policy "time_delete_own" on public.time_logs
  for delete to authenticated using (user_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- task_dependencies
drop policy if exists "deps_select" on public.task_dependencies;
create policy "deps_select" on public.task_dependencies
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "deps_insert" on public.task_dependencies;
create policy "deps_insert" on public.task_dependencies
  for insert to authenticated with check (public.has_workspace_write(workspace_id));
drop policy if exists "deps_delete" on public.task_dependencies;
create policy "deps_delete" on public.task_dependencies
  for delete to authenticated using (public.is_workspace_member(workspace_id));

-- project_templates
drop policy if exists "templates_select" on public.project_templates;
create policy "templates_select" on public.project_templates
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "templates_insert" on public.project_templates;
create policy "templates_insert" on public.project_templates
  for insert to authenticated
  with check (public.has_workspace_write(workspace_id) and created_by = auth.uid());
drop policy if exists "templates_delete" on public.project_templates;
create policy "templates_delete" on public.project_templates
  for delete to authenticated using (public.is_workspace_admin(workspace_id) or created_by = auth.uid());

-- audit_logs
drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin" on public.audit_logs
  for select to authenticated using (public.is_workspace_admin(workspace_id));
drop policy if exists "audit_insert_member" on public.audit_logs;
create policy "audit_insert_member" on public.audit_logs
  for insert to authenticated with check (public.is_workspace_member(workspace_id));

-- projects / tasks write policies re-asserted for viewers (0005)
drop policy if exists "projects_insert_member" on public.projects;
create policy "projects_insert_member" on public.projects
  for insert to authenticated
  with check (public.has_workspace_write(workspace_id) and created_by = auth.uid());
drop policy if exists "projects_update_member" on public.projects;
create policy "projects_update_member" on public.projects
  for update to authenticated
  using (public.has_workspace_write(workspace_id))
  with check (public.has_workspace_write(workspace_id));

drop policy if exists "tasks_insert_member" on public.tasks;
create policy "tasks_insert_member" on public.tasks
  for insert to authenticated
  with check (public.has_workspace_write(workspace_id) and created_by = auth.uid());
drop policy if exists "tasks_update_member" on public.tasks;
create policy "tasks_update_member" on public.tasks
  for update to authenticated
  using (public.has_workspace_write(workspace_id))
  with check (public.has_workspace_write(workspace_id));
drop policy if exists "tasks_delete_member" on public.tasks;
create policy "tasks_delete_member" on public.tasks
  for delete to authenticated
  using (public.has_workspace_write(workspace_id));

-- ═════════════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═════════════════════════════════════════════════════════════════════════════
do $$ begin alter publication supabase_realtime add table public.task_comments;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.activity_logs;     exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.time_logs;          exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.task_dependencies;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.audit_logs;         exception when duplicate_object then null; end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- RELOAD POSTGREST SCHEMA CACHE — makes every change above visible immediately
-- ═════════════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';
