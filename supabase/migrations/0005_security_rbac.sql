-- ============================================================================
-- Prismora migration 0005 — RBAC 2.0 + audit logs
--  * Adds 'manager' and 'viewer' roles.
--  * Adds has_workspace_write() (everyone except viewers) and enforces it on
--    writes so Viewers are read-only at the DB level.
--  * Adds the audit_logs security table.
-- Idempotent. Run in the Supabase SQL editor.
--
-- NOTE: policies compare role::text (not enum literals) so this whole script is
-- safe to run in a single transaction right after ADD VALUE.
-- ============================================================================

-- ── New roles ────────────────────────────────────────────────────────────────
alter type member_role add value if not exists 'manager';
alter type member_role add value if not exists 'viewer';

-- ── Write-access helper: accepted member who is NOT a viewer ──────────────────
create or replace function public.has_workspace_write(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
      and m.role::text <> 'viewer'
  );
$$;

-- ── Enforce read-only for viewers on writes (selects stay member-wide) ────────
-- projects
drop policy if exists "projects_insert_member" on public.projects;
create policy "projects_insert_member" on public.projects
  for insert to authenticated
  with check (public.has_workspace_write(workspace_id) and created_by = auth.uid());
drop policy if exists "projects_update_member" on public.projects;
create policy "projects_update_member" on public.projects
  for update to authenticated
  using (public.has_workspace_write(workspace_id))
  with check (public.has_workspace_write(workspace_id));

-- tasks
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

-- comments / attachments / labels / time / dependencies / templates (write = non-viewer)
do $$ begin
  if to_regclass('public.task_comments') is not null then
    drop policy if exists "comments_insert" on public.task_comments;
    create policy "comments_insert" on public.task_comments
      for insert to authenticated
      with check (public.has_workspace_write(workspace_id) and author_id = auth.uid());
  end if;
  if to_regclass('public.file_attachments') is not null then
    drop policy if exists "attachments_insert" on public.file_attachments;
    create policy "attachments_insert" on public.file_attachments
      for insert to authenticated with check (public.has_workspace_write(workspace_id));
  end if;
  if to_regclass('public.task_labels') is not null then
    drop policy if exists "labels_insert" on public.task_labels;
    create policy "labels_insert" on public.task_labels
      for insert to authenticated with check (public.has_workspace_write(workspace_id));
  end if;
  if to_regclass('public.task_label_links') is not null then
    drop policy if exists "label_links_insert" on public.task_label_links;
    create policy "label_links_insert" on public.task_label_links
      for insert to authenticated with check (public.has_workspace_write(workspace_id));
  end if;
  if to_regclass('public.time_logs') is not null then
    drop policy if exists "time_insert_own" on public.time_logs;
    create policy "time_insert_own" on public.time_logs
      for insert to authenticated
      with check (public.has_workspace_write(workspace_id) and user_id = auth.uid());
  end if;
  if to_regclass('public.task_dependencies') is not null then
    drop policy if exists "deps_insert" on public.task_dependencies;
    create policy "deps_insert" on public.task_dependencies
      for insert to authenticated with check (public.has_workspace_write(workspace_id));
  end if;
  if to_regclass('public.project_templates') is not null then
    drop policy if exists "templates_insert" on public.project_templates;
    create policy "templates_insert" on public.project_templates
      for insert to authenticated
      with check (public.has_workspace_write(workspace_id) and created_by = auth.uid());
  end if;
end $$;

-- ============================================================================
-- audit_logs — security audit trail
-- ============================================================================
create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid references public.profiles (id) on delete set null,
  action       text not null,         -- e.g. task.deleted, member.role_changed
  entity_type  text,
  entity_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_audit_workspace on public.audit_logs (workspace_id, created_at desc);

alter table public.audit_logs enable row level security;

-- Only owners/admins can READ the audit trail; any member can append.
drop policy if exists "audit_select_admin" on public.audit_logs;
create policy "audit_select_admin" on public.audit_logs
  for select to authenticated using (public.is_workspace_admin(workspace_id));
drop policy if exists "audit_insert_member" on public.audit_logs;
create policy "audit_insert_member" on public.audit_logs
  for insert to authenticated with check (public.is_workspace_member(workspace_id));

do $$ begin alter publication supabase_realtime add table public.audit_logs;
exception when duplicate_object then null; end $$;
