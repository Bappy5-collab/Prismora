import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

// Workspace-scoped analytics for the dashboard upgrade. Reads task/project rows
// once and aggregates client-side (small datasets per workspace).
export interface WorkloadRow {
  userId: string | null;
  name: string;
  active: number; // assigned, not done
  total: number;
  load: "overloaded" | "balanced" | "underloaded";
}

export interface WorkspaceAnalytics {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number; // todo + in_progress
  completionRate: number; // 0..100
  productivityScore: number; // 0..100, completion adjusted for overdue
  overdueCount: number;
  byStatus: { todo: number; in_progress: number; done: number };
  projectProgress: { id: string; name: string; total: number; done: number; pct: number }[];
  teamActivity: { name: string; total: number; done: number }[];
  workload: WorkloadRow[];
}

export async function fetchAnalytics(workspaceId: string): Promise<WorkspaceAnalytics> {
  const supabase = getSupabaseBrowserClient();

  const [tasksRes, projectsRes, membersRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, status, project_id, assignee_id, due_date")
      .eq("workspace_id", workspaceId),
    supabase.from("projects").select("id, name").eq("workspace_id", workspaceId),
    supabase
      .from("workspace_members")
      .select("user_id, invited_email, profile:profiles(id, full_name, email)")
      .eq("workspace_id", workspaceId)
      .eq("status", "accepted"),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (membersRes.error) throw membersRes.error;

  const tasks = tasksRes.data ?? [];
  const projects = projectsRes.data ?? [];
  const members = membersRes.data ?? [];

  const completed = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const byStatus = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: completed,
  };

  const projectProgress = projects.map((p) => {
    const pt = tasks.filter((t) => t.project_id === p.id);
    const done = pt.filter((t) => t.status === "done").length;
    return {
      id: p.id,
      name: p.name,
      total: pt.length,
      done,
      pct: pt.length ? Math.round((done / pt.length) * 100) : 0,
    };
  });

  const now = new Date();
  const overdueCount = tasks.filter(
    (t) => t.status !== "done" && t.due_date && new Date(t.due_date) < now
  ).length;

  const teamActivity = members.map((m) => {
    const profile = m.profile as unknown as
      | { full_name: string | null; email: string }
      | null;
    const name = profile?.full_name || profile?.email || m.invited_email;
    const mine = tasks.filter((t) => t.assignee_id === m.user_id);
    return { name, total: mine.length, done: mine.filter((t) => t.status === "done").length };
  });

  // Workload: active (assigned, not done) tasks per member, classified against
  // the team average.
  const activeByMember = members.map((m) => {
    const profile = m.profile as unknown as
      | { full_name: string | null; email: string }
      | null;
    const name = profile?.full_name || profile?.email || m.invited_email;
    const mine = tasks.filter((t) => t.assignee_id === m.user_id);
    return {
      userId: m.user_id,
      name,
      active: mine.filter((t) => t.status !== "done").length,
      total: mine.length,
    };
  });
  const avgActive =
    activeByMember.length > 0
      ? activeByMember.reduce((s, m) => s + m.active, 0) / activeByMember.length
      : 0;
  const workload: WorkloadRow[] = activeByMember.map((m) => ({
    ...m,
    load:
      m.active > Math.max(3, avgActive * 1.5)
        ? "overloaded"
        : m.active < avgActive * 0.5
          ? "underloaded"
          : "balanced",
  }));

  // Productivity score: completion rate minus a penalty for overdue work.
  const baseRate = total ? (completed / total) * 100 : 0;
  const overduePenalty = total ? (overdueCount / total) * 40 : 0;
  const productivityScore = Math.max(0, Math.round(baseRate - overduePenalty));

  return {
    totalTasks: total,
    completedTasks: completed,
    activeTasks: total - completed,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    productivityScore,
    overdueCount,
    byStatus,
    projectProgress,
    teamActivity,
    workload,
  };
}
