import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { logActivity } from "./activity";
import { createNotification } from "./notifications";
import type { TaskCommentWithAuthor } from "@/lib/database.types";

export async function fetchComments(taskId: string): Promise<TaskCommentWithAuthor[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_comments")
    .select("*, author:profiles(id, full_name, email)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TaskCommentWithAuthor[];
}

export async function addComment(input: {
  workspaceId: string;
  taskId: string;
  body: string;
  taskTitle?: string;
  taskCreatedBy?: string | null;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("task_comments").insert({
    workspace_id: input.workspaceId,
    task_id: input.taskId,
    author_id: user.id,
    body: input.body.trim(),
  });
  if (error) throw error;

  await logActivity({
    workspaceId: input.workspaceId,
    action: "comment_added",
    summary: `commented on "${input.taskTitle ?? "a task"}"`,
    entityType: "comment",
    entityId: input.taskId,
  });

  // "Comment added" notification to the task owner (if someone else commented).
  if (input.taskCreatedBy && input.taskCreatedBy !== user.id) {
    await createNotification({
      workspaceId: input.workspaceId,
      userId: input.taskCreatedBy,
      title: "Comment added",
      body: `New comment on "${input.taskTitle ?? "a task"}".`,
    }).catch(() => {});
  }
}

export async function updateComment(id: string, body: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("task_comments")
    .update({ body: body.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", id);
  if (error) throw error;
}
