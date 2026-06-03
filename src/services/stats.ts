import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

export interface DashboardStats {
  projects: number;
  tasks: number;
  completedTasks: number;
  pendingTasks: number;
  members: number;
}

/**
 * Aggregate counts for the dashboard stat cards, scoped to one workspace.
 * Uses `head: true` count queries so no rows are transferred. Every query is
 * filtered by `workspace_id` — switching workspace yields different numbers.
 */
export async function fetchDashboardStats(workspaceId: string): Promise<DashboardStats> {
  const supabase = getSupabaseBrowserClient();

  const [projects, tasks, completed, members] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "done"),
    supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("status", "accepted"),
  ]);

  if (projects.error) throw projects.error;
  if (tasks.error) throw tasks.error;
  if (completed.error) throw completed.error;
  if (members.error) throw members.error;

  const totalTasks = tasks.count ?? 0;
  const completedTasks = completed.count ?? 0;

  return {
    projects: projects.count ?? 0,
    tasks: totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    members: members.count ?? 0,
  };
}
