import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { TaskStatus } from "@/lib/database.types";

// A blocker: a task that must be done before the dependent task can complete.
export interface BlockerTask {
  dependencyId: string;
  taskId: string;
  title: string;
  status: TaskStatus;
}

export async function fetchDependencies(taskId: string): Promise<BlockerTask[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_dependencies")
    .select("id, depends_on:tasks!task_dependencies_depends_on_task_id_fkey(id, title, status)")
    .eq("task_id", taskId);
  if (error) throw error;
  return (data ?? []).map((d) => {
    const blocker = d.depends_on as unknown as {
      id: string;
      title: string;
      status: TaskStatus;
    } | null;
    return {
      dependencyId: d.id,
      taskId: blocker?.id ?? "",
      title: blocker?.title ?? "(deleted task)",
      status: blocker?.status ?? "todo",
    };
  });
}

export async function addDependency(input: {
  workspaceId: string;
  taskId: string;
  dependsOnTaskId: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("task_dependencies").insert({
    workspace_id: input.workspaceId,
    task_id: input.taskId,
    depends_on_task_id: input.dependsOnTaskId,
  });
  if (error) throw error;
}

export async function removeDependency(dependencyId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("task_dependencies").delete().eq("id", dependencyId);
  if (error) throw error;
}

// Which tasks in the workspace are currently blocked (have >=1 incomplete blocker).
export async function fetchBlockedTaskIds(workspaceId: string): Promise<Set<string>> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("task_dependencies")
    .select("task_id, blocker:tasks!task_dependencies_depends_on_task_id_fkey(status)")
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  const blocked = new Set<string>();
  for (const row of data ?? []) {
    const blocker = row.blocker as unknown as { status: TaskStatus } | null;
    if (blocker && blocker.status !== "done") blocked.add(row.task_id);
  }
  return blocked;
}

// Returns the titles of incomplete blockers for a task (empty = safe to complete).
export async function incompleteBlockers(taskId: string): Promise<string[]> {
  const deps = await fetchDependencies(taskId);
  return deps.filter((d) => d.status !== "done").map((d) => d.title);
}
