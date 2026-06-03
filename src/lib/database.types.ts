// Hand-maintained types that mirror supabase/schema.sql.
// In a larger project generate these with `supabase gen types typescript`.
//
// IMPORTANT: these are `type` aliases, NOT `interface`s. The Supabase typed
// client requires each table Row/Insert/Update to be assignable to
// `Record<string, unknown>`. Interfaces have no implicit index signature and
// fail that constraint, which silently collapses inserts/updates to `never`.

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type MemberRole = "owner" | "admin" | "manager" | "member" | "viewer";
export type InviteStatus = "pending" | "accepted";
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  invited_email: string;
  role: MemberRole;
  status: InviteStatus;
  created_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
};

export type Task = {
  id: string;
  workspace_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  estimated_time: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Notification = {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export type ActivityAction =
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "project_created"
  | "member_invited"
  | "comment_added";

export type ActivityLog = {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: ActivityAction;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  created_at: string;
};

export type TaskComment = {
  id: string;
  workspace_id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type FileAttachment = {
  id: string;
  workspace_id: string;
  task_id: string;
  uploaded_by: string | null;
  name: string;
  path: string;
  mime_type: string | null;
  size: number | null;
  created_at: string;
};

export type TaskLabel = {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
};

export type TaskLabelLink = {
  task_id: string;
  label_id: string;
  workspace_id: string;
};

export type TimeLog = {
  id: string;
  workspace_id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
};

export type TaskDependency = {
  id: string;
  workspace_id: string;
  task_id: string;
  depends_on_task_id: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditLogWithActor = AuditLog & {
  actor: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export type ProjectTemplateTask = { title: string; priority: TaskPriority };

export type ProjectTemplate = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  tasks: ProjectTemplateTask[];
  created_by: string | null;
  created_at: string;
};

// Convenience joined shapes returned by some queries.
export type TaskWithAssignee = Task & {
  assignee: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export type ActivityLogWithActor = ActivityLog & {
  actor: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export type TaskCommentWithAuthor = TaskComment & {
  author: Pick<Profile, "id" | "full_name" | "email"> | null;
};

export type WorkspaceMemberWithProfile = WorkspaceMember & {
  profile: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
};

// Minimal Database type for the typed Supabase client.
// NOTE: each table must include `Relationships` and the schema must include
// `Views`, otherwise the type stops satisfying supabase-js's GenericSchema
// constraint and inserts/updates silently collapse to `never`.
export interface Database {
  // Required by @supabase/supabase-js v2.105+ for postgrest version detection.
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      workspaces: {
        Row: Workspace;
        Insert: Partial<Workspace> & { name: string; slug: string; owner_id: string };
        Update: Partial<Workspace>;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: Partial<WorkspaceMember> & { workspace_id: string; invited_email: string };
        Update: Partial<WorkspaceMember>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: Partial<Project> & { workspace_id: string; name: string; created_by: string };
        Update: Partial<Project>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Partial<Task> & {
          workspace_id: string;
          project_id: string;
          title: string;
          created_by: string;
        };
        Update: Partial<Task>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { workspace_id: string; user_id: string; title: string };
        Update: Partial<Notification>;
        Relationships: [];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog> & {
          workspace_id: string;
          action: ActivityAction;
          summary: string;
        };
        Update: Partial<ActivityLog>;
        Relationships: [];
      };
      task_comments: {
        Row: TaskComment;
        Insert: Partial<TaskComment> & {
          workspace_id: string;
          task_id: string;
          author_id: string;
          body: string;
        };
        Update: Partial<TaskComment>;
        Relationships: [];
      };
      file_attachments: {
        Row: FileAttachment;
        Insert: Partial<FileAttachment> & {
          workspace_id: string;
          task_id: string;
          name: string;
          path: string;
        };
        Update: Partial<FileAttachment>;
        Relationships: [];
      };
      task_labels: {
        Row: TaskLabel;
        Insert: Partial<TaskLabel> & { workspace_id: string; name: string };
        Update: Partial<TaskLabel>;
        Relationships: [];
      };
      task_label_links: {
        Row: TaskLabelLink;
        Insert: TaskLabelLink;
        Update: Partial<TaskLabelLink>;
        Relationships: [];
      };
      time_logs: {
        Row: TimeLog;
        Insert: Partial<TimeLog> & { workspace_id: string; task_id: string; user_id: string };
        Update: Partial<TimeLog>;
        Relationships: [];
      };
      task_dependencies: {
        Row: TaskDependency;
        Insert: Partial<TaskDependency> & {
          workspace_id: string;
          task_id: string;
          depends_on_task_id: string;
        };
        Update: Partial<TaskDependency>;
        Relationships: [];
      };
      project_templates: {
        Row: ProjectTemplate;
        Insert: Partial<Omit<ProjectTemplate, "tasks">> & {
          workspace_id: string;
          name: string;
          tasks?: unknown;
        };
        Update: Partial<ProjectTemplate>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Partial<Omit<AuditLog, "metadata">> & {
          workspace_id: string;
          action: string;
          metadata?: unknown;
        };
        Update: Partial<AuditLog>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean };
      is_workspace_admin: { Args: { ws_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
