-- ============================================================================
-- Prismora — Supabase Postgres schema
-- ----------------------------------------------------------------------------
-- Multi-tenant project management. Isolation boundary = workspace.
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Design notes
--  * `profiles` mirrors auth.users 1:1 and is auto-populated by a trigger.
--  * Tenancy is enforced by RLS on every table using SECURITY DEFINER helper
--    functions. The helpers break the policy<->workspace_members recursion that
--    naive "EXISTS (select from workspace_members ...)" policies cause.
--  * Every child row carries `workspace_id` so a single membership check covers
--    projects, tasks and notifications without multi-hop joins inside policies.
-- ============================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invite_status as enum ('pending', 'accepted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('active', 'on_hold', 'completed', 'archived');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- profiles : application-level mirror of auth.users -------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- workspaces : the tenant boundary ------------------------------------------
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique,
  description text,
  logo_url    text,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- workspace_members : membership + role -------------------------------------
create table if not exists public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade,
  invited_email text not null,
  role          member_role not null default 'member',
  status        invite_status not null default 'pending',
  created_at    timestamptz not null default now(),
  unique (workspace_id, invited_email)
);

create index if not exists idx_members_workspace on public.workspace_members (workspace_id);
create index if not exists idx_members_user on public.workspace_members (user_id);

-- projects ------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  description   text,
  status        project_status not null default 'active',
  created_by    uuid not null references public.profiles (id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_projects_workspace on public.projects (workspace_id);

-- tasks ---------------------------------------------------------------------
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 200),
  description    text,
  status         task_status not null default 'todo',
  priority       task_priority not null default 'medium',
  assignee_id    uuid references public.profiles (id) on delete set null,
  estimated_time text,
  due_date       timestamptz,
  created_by     uuid not null references public.profiles (id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_tasks_workspace on public.tasks (workspace_id);
create index if not exists idx_tasks_project on public.tasks (project_id);
create index if not exists idx_tasks_assignee on public.tasks (assignee_id);
create index if not exists idx_tasks_workspace_due on public.tasks (workspace_id, due_date);

-- notifications -------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  body          text,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id, read);
-- The app lists notifications filtered by workspace (RLS also pins user_id):
create index if not exists idx_notifications_workspace_user
  on public.notifications (workspace_id, user_id);

-- ============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER) — break RLS recursion
-- ----------------------------------------------------------------------------
-- These run as the table owner, so SELECTs inside them are NOT re-filtered by
-- RLS. Policies call them instead of selecting from workspace_members directly.
-- ============================================================================

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
  );
$$;

create or replace function public.is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
      and m.status = 'accepted'
      and m.role in ('owner', 'admin')
  );
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- 1. Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. When a workspace is created, add the owner as an accepted member.
create or replace function public.handle_new_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_email text;
begin
  select email into owner_email from public.profiles where id = new.owner_id;
  insert into public.workspace_members (workspace_id, user_id, invited_email, role, status)
  values (new.id, new.owner_id, coalesce(owner_email, ''), 'owner', 'accepted')
  on conflict (workspace_id, invited_email) do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- 3. Keep tasks.updated_at fresh.
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

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.workspaces         enable row level security;
alter table public.workspace_members  enable row level security;
alter table public.projects           enable row level security;
alter table public.tasks              enable row level security;
alter table public.notifications      enable row level security;

-- ── profiles ────────────────────────────────────────────────────────────────
-- Any authenticated user can read profiles (needed to render assignee names);
-- a user may only modify their own.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── workspaces ───────────────────────────────────────────────────────────────
drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member" on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id));

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner" on public.workspaces
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin" on public.workspaces
  for update to authenticated
  using (public.is_workspace_admin(id)) with check (public.is_workspace_admin(id));

drop policy if exists "workspaces_delete_owner" on public.workspaces;
create policy "workspaces_delete_owner" on public.workspaces
  for delete to authenticated
  using (owner_id = auth.uid());

-- ── workspace_members ────────────────────────────────────────────────────────
-- A member can see the membership list of any workspace they belong to.
-- The helper function avoids self-recursion on this table.
drop policy if exists "members_select" on public.workspace_members;
create policy "members_select" on public.workspace_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_workspace_member(workspace_id)
  );

-- Only owners/admins can invite (insert) new members.
drop policy if exists "members_insert_admin" on public.workspace_members;
create policy "members_insert_admin" on public.workspace_members
  for insert to authenticated
  with check (public.is_workspace_admin(workspace_id));

-- A user may accept their own invite (claim a pending row by email);
-- admins may update roles.
drop policy if exists "members_update" on public.workspace_members;
create policy "members_update" on public.workspace_members
  for update to authenticated
  using (
    public.is_workspace_admin(workspace_id)
    or lower(invited_email) = lower(auth.jwt() ->> 'email')
  )
  with check (
    public.is_workspace_admin(workspace_id)
    or lower(invited_email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "members_delete_admin" on public.workspace_members;
create policy "members_delete_admin" on public.workspace_members
  for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ── projects ────────────────────────────────────────────────────────────────
drop policy if exists "projects_select_member" on public.projects;
create policy "projects_select_member" on public.projects
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "projects_insert_member" on public.projects;
create policy "projects_insert_member" on public.projects
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "projects_update_member" on public.projects;
create policy "projects_update_member" on public.projects
  for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "projects_delete_admin" on public.projects;
create policy "projects_delete_admin" on public.projects
  for delete to authenticated
  using (public.is_workspace_admin(workspace_id));

-- ── tasks ────────────────────────────────────────────────────────────────────
drop policy if exists "tasks_select_member" on public.tasks;
create policy "tasks_select_member" on public.tasks
  for select to authenticated
  using (public.is_workspace_member(workspace_id));

drop policy if exists "tasks_insert_member" on public.tasks;
create policy "tasks_insert_member" on public.tasks
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());

drop policy if exists "tasks_update_member" on public.tasks;
create policy "tasks_update_member" on public.tasks
  for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "tasks_delete_member" on public.tasks;
create policy "tasks_delete_member" on public.tasks
  for delete to authenticated
  using (public.is_workspace_member(workspace_id));

-- ── notifications ────────────────────────────────────────────────────────────
-- A user only ever sees their own notifications.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Any workspace member can create a notification targeted at another member
-- (e.g. "you were assigned a task").
drop policy if exists "notifications_insert_member" on public.notifications;
create policy "notifications_insert_member" on public.notifications
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- REALTIME (optional) — expose tables to Supabase Realtime
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
