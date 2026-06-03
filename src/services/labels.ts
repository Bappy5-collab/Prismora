import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { TaskLabel } from "@/lib/database.types";

export async function fetchLabels(workspaceId: string): Promise<TaskLabel[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_labels")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createLabel(workspaceId: string, name: string): Promise<TaskLabel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_labels")
    .insert({ workspace_id: workspaceId, name: name.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLabel(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("task_labels").delete().eq("id", id);
  if (error) throw error;
}

// Label assignments for a single task.
export async function fetchTaskLabelIds(taskId: string): Promise<string[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_label_links")
    .select("label_id")
    .eq("task_id", taskId);
  if (error) throw error;
  return (data ?? []).map((r) => r.label_id);
}

export async function setTaskLabels(input: {
  workspaceId: string;
  taskId: string;
  labelIds: string[];
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  // Replace the set: delete existing links, then insert the new selection.
  const del = await supabase.from("task_label_links").delete().eq("task_id", input.taskId);
  if (del.error) throw del.error;
  if (input.labelIds.length === 0) return;
  const rows = input.labelIds.map((label_id) => ({
    task_id: input.taskId,
    label_id,
    workspace_id: input.workspaceId,
  }));
  const { error } = await supabase.from("task_label_links").insert(rows);
  if (error) throw error;
}

// All (task_id → label) links in a workspace, for filtering the Tasks page.
export interface WorkspaceLabelLink {
  task_id: string;
  label: { id: string; name: string };
}

export async function fetchWorkspaceLabelLinks(
  workspaceId: string
): Promise<WorkspaceLabelLink[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_label_links")
    .select("task_id, label:task_labels(id, name)")
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return (data ?? []) as unknown as WorkspaceLabelLink[];
}
