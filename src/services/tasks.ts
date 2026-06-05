import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { createNotification } from "./notifications";
import { logActivity } from "./activity";
import { logAudit } from "./audit";
import { incompleteBlockers } from "./dependencies";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskWithAssignee,
} from "@/lib/database.types";

const TASK_SELECT = "*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, email)";

// Best-effort branded "task assigned" email. The server route holds the SMTP
// credentials and looks up the assignee from the taskId; failures are ignored.
function sendTaskAssignedEmail(taskId: string) {
  return fetch("/api/email/task-assigned", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId }),
  }).catch(() => {});
}

export async function fetchTasks(projectId: string): Promise<TaskWithAssignee[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithAssignee[];
}

// Workspace-wide tasks (Tasks page + Calendar). Joins the project name so the
// UI can show which project each task belongs to. Strictly workspace-scoped.
export interface TaskWithContext extends TaskWithAssignee {
  project: { id: string; name: string } | null;
}

export async function fetchWorkspaceTasks(workspaceId: string): Promise<TaskWithContext[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, email), project:projects(id, name)"
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithContext[];
}

export interface CreateTaskInput {
  workspaceId: string;
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: string | null;
  estimatedTime?: string | null;
  dueDate?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? "medium",
      status: input.status ?? "todo",
      assignee_id: input.assigneeId ?? null,
      estimated_time: input.estimatedTime ?? null,
      due_date: input.dueDate ?? null,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;

  // Fire an in-app notification + branded email when assigning to someone else.
  if (input.assigneeId && input.assigneeId !== user.id) {
    await createNotification({
      workspaceId: input.workspaceId,
      userId: input.assigneeId,
      title: "Task assigned",
      body: `You were assigned "${data.title}".`,
    });
    void sendTaskAssignedEmail(data.id);
  }

  await logActivity({
    workspaceId: input.workspaceId,
    action: "task_created",
    summary: `created task "${data.title}"`,
    entityType: "task",
    entityId: data.id,
  });
  return data;
}

export type UpdateTaskInput = Partial<
  Pick<
    Task,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "assignee_id"
    | "estimated_time"
    | "due_date"
  >
>;

export async function updateTask(taskId: string, patch: UpdateTaskInput): Promise<Task> {
  const supabase = getSupabaseBrowserClient();

  // Dependency gate: a task can't be marked done while any blocker is unfinished.
  if (patch.status === "done") {
    const blockers = await incompleteBlockers(taskId);
    if (blockers.length > 0) {
      throw new Error(
        `Blocked by unfinished task${blockers.length > 1 ? "s" : ""}: ${blockers.join(", ")}`
      );
    }
  }

  // Read the prior row so we can detect meaningful transitions (e.g. completion)
  // and notify the right people.
  const { data: prev } = await supabase
    .from("tasks")
    .select("status, created_by, assignee_id, title, workspace_id")
    .eq("id", taskId)
    .single();

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) throw error;

  const justCompleted = patch.status === "done" && prev?.status !== "done";

  // "Task completed" notification → notify the creator when someone else closes it.
  if (justCompleted && prev?.created_by && prev.created_by !== data.assignee_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && user.id !== prev.created_by) {
      await createNotification({
        workspaceId: data.workspace_id,
        userId: prev.created_by,
        title: "Task completed",
        body: `"${data.title}" was marked done.`,
      });
    }
  }

  // Re-assignment → notify + email the new assignee (when it isn't the actor).
  const assignmentChanged =
    "assignee_id" in patch && data.assignee_id && data.assignee_id !== prev?.assignee_id;
  if (assignmentChanged && data.assignee_id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (data.assignee_id !== user?.id) {
      await createNotification({
        workspaceId: data.workspace_id,
        userId: data.assignee_id,
        title: "Task assigned",
        body: `You were assigned "${data.title}".`,
      });
      void sendTaskAssignedEmail(data.id);
    }
  }

  await logActivity({
    workspaceId: data.workspace_id,
    action: justCompleted ? "task_completed" : "task_updated",
    summary: justCompleted ? `completed "${data.title}"` : `updated "${data.title}"`,
    entityType: "task",
    entityId: data.id,
  });
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: task } = await supabase
    .from("tasks")
    .select("workspace_id, title")
    .eq("id", taskId)
    .maybeSingle();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  if (task) {
    await logAudit({
      workspaceId: task.workspace_id,
      action: "task.deleted",
      entityType: "task",
      entityId: taskId,
      metadata: { title: task.title },
    });
  }
}
