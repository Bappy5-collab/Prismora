-- ============================================================================
-- Prismora migration 0003 — collaboration features
-- New tables: activity_logs, task_comments, file_attachments,
--             task_labels (+ task_label_links join).
-- Also re-asserts the 0002 columns so a single run brings any DB fully current.
-- Idempotent. Run in the Supabase SQL editor (or via a DB connection).
-- ============================================================================

-- ── 0002 columns (safe to re-run) ───────────────────────────────────────────
do $$ begin
  create type project_status as enum ('active','on_hold','completed','archived');
exception when duplicate_object then null; end $$;
alter table public.projects   add column if not exists status project_status not null default 'active';
alter table public.tasks      add column if not exists due_date timestamptz;
alter table public.workspaces add column if not exists description text;
alter table public.workspaces add column if not exists logo_url text;
create index if not exists idx_tasks_workspace_due on public.tasks (workspace_id, due_date);

-- ============================================================================
-- activity_logs ─ append-only audit feed, workspace-scoped
-- ============================================================================
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  action       text not null,        -- task_created | task_updated | task_completed | project_created | member_invited | comment_added
  entity_type  text,                 -- task | project | member | comment
  entity_id    uuid,
  summary      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_activity_workspace on public.activity_logs (workspace_id, created_at desc);

-- ============================================================================
-- task_comments
-- ============================================================================
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

-- ============================================================================
-- file_attachments ─ metadata; bytes live in Storage bucket 'task-attachments'
-- ============================================================================
create table if not exists public.file_attachments (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  task_id      uuid not null references public.tasks (id) on delete cascade,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  name         text not null,
  path         text not null,        -- storage object path: {workspace_id}/{task_id}/{uuid}-{name}
  mime_type    text,
  size         bigint,
  created_at   timestamptz not null default now()
);
create index if not exists idx_attachments_task on public.file_attachments (task_id, created_at);

-- ============================================================================
-- task_labels (+ links)
-- ============================================================================
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

-- ============================================================================
-- ROW LEVEL SECURITY — every table workspace-isolated via is_workspace_member()
-- ============================================================================
alter table public.activity_logs    enable row level security;
alter table public.task_comments     enable row level security;
alter table public.file_attachments  enable row level security;
alter table public.task_labels        enable row level security;
alter table public.task_label_links   enable row level security;

-- activity_logs: members read; members append; immutable (no update/delete).
drop policy if exists "activity_select" on public.activity_logs;
create policy "activity_select" on public.activity_logs
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "activity_insert" on public.activity_logs;
create policy "activity_insert" on public.activity_logs
  for insert to authenticated with check (public.is_workspace_member(workspace_id));

-- task_comments: members read; members create (as themselves); author edits/deletes.
drop policy if exists "comments_select" on public.task_comments;
create policy "comments_select" on public.task_comments
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "comments_insert" on public.task_comments;
create policy "comments_insert" on public.task_comments
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and author_id = auth.uid());
drop policy if exists "comments_update_own" on public.task_comments;
create policy "comments_update_own" on public.task_comments
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "comments_delete_own" on public.task_comments;
create policy "comments_delete_own" on public.task_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_workspace_admin(workspace_id));

-- file_attachments: members read/create; uploader or admin deletes.
drop policy if exists "attachments_select" on public.file_attachments;
create policy "attachments_select" on public.file_attachments
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "attachments_insert" on public.file_attachments;
create policy "attachments_insert" on public.file_attachments
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "attachments_delete" on public.file_attachments;
create policy "attachments_delete" on public.file_attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_workspace_admin(workspace_id));

-- task_labels: members read; members manage.
drop policy if exists "labels_select" on public.task_labels;
create policy "labels_select" on public.task_labels
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "labels_insert" on public.task_labels;
create policy "labels_insert" on public.task_labels
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "labels_delete" on public.task_labels;
create policy "labels_delete" on public.task_labels
  for delete to authenticated using (public.is_workspace_member(workspace_id));

-- task_label_links: members read/manage.
drop policy if exists "label_links_select" on public.task_label_links;
create policy "label_links_select" on public.task_label_links
  for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists "label_links_insert" on public.task_label_links;
create policy "label_links_insert" on public.task_label_links
  for insert to authenticated with check (public.is_workspace_member(workspace_id));
drop policy if exists "label_links_delete" on public.task_label_links;
create policy "label_links_delete" on public.task_label_links
  for delete to authenticated using (public.is_workspace_member(workspace_id));

-- ============================================================================
-- REALTIME — push comments + activity + notifications live
-- ============================================================================
do $$ begin alter publication supabase_realtime add table public.task_comments;
exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.activity_logs;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- STORAGE RLS — bucket 'task-attachments'. Path = {workspace_id}/{task_id}/{file}
-- Membership is derived from the first path segment. (Bucket is created via the
-- app's service-role script; uploads/reads also go through a server route, but
-- these policies make direct client access safe too.)
-- ============================================================================
do $$ begin
  -- Read objects in a workspace you belong to.
  drop policy if exists "attachments_read" on storage.objects;
  create policy "attachments_read" on storage.objects
    for select to authenticated
    using (
      bucket_id = 'task-attachments'
      and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    );

  drop policy if exists "attachments_write" on storage.objects;
  create policy "attachments_write" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'task-attachments'
      and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    );

  drop policy if exists "attachments_remove" on storage.objects;
  create policy "attachments_remove" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'task-attachments'
      and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
    );
exception when others then
  raise notice 'storage.objects policies skipped: %', sqlerrm;
end $$;
