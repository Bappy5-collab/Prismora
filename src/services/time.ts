import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { TimeLog } from "@/lib/database.types";

async function currentUserId(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return user.id;
}

// The user's single active (running) timer, if any.
export async function fetchActiveTimer(): Promise<TimeLog | null> {
  const supabase = getSupabaseBrowserClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("time_logs")
    .select("*")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function startTimer(workspaceId: string, taskId: string): Promise<TimeLog> {
  const supabase = getSupabaseBrowserClient();
  const userId = await currentUserId();

  // Only one running timer at a time — stop any existing one first.
  const active = await fetchActiveTimer();
  if (active) await stopTimer(active.id);

  const { data, error } = await supabase
    .from("time_logs")
    .insert({ workspace_id: workspaceId, task_id: taskId, user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function stopTimer(timeLogId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: log, error: e1 } = await supabase
    .from("time_logs")
    .select("started_at")
    .eq("id", timeLogId)
    .single();
  if (e1) throw e1;

  const ended = new Date();
  const seconds = Math.max(
    0,
    Math.round((ended.getTime() - new Date(log.started_at).getTime()) / 1000)
  );
  const { error } = await supabase
    .from("time_logs")
    .update({ ended_at: ended.toISOString(), duration_seconds: seconds })
    .eq("id", timeLogId);
  if (error) throw error;
}

export async function fetchTaskTimeSeconds(taskId: string): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("time_logs")
    .select("duration_seconds")
    .eq("task_id", taskId)
    .not("duration_seconds", "is", null);
  if (error) throw error;
  return (data ?? []).reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0);
}

export interface WeeklyTimeRow {
  userId: string;
  name: string;
  seconds: number;
}

// Weekly report: total tracked seconds per member over the last 7 days.
export async function fetchWeeklyReport(workspaceId: string): Promise<WeeklyTimeRow[]> {
  const supabase = getSupabaseBrowserClient();
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data, error } = await supabase
    .from("time_logs")
    .select("user_id, duration_seconds, user:profiles(id, full_name, email)")
    .eq("workspace_id", workspaceId)
    .gte("started_at", since.toISOString());
  if (error) throw error;

  const totals = new Map<string, WeeklyTimeRow>();
  for (const row of data ?? []) {
    const profile = row.user as unknown as
      | { full_name: string | null; email: string }
      | null;
    const name = profile?.full_name || profile?.email || "Member";
    const existing = totals.get(row.user_id) ?? { userId: row.user_id, name, seconds: 0 };
    existing.seconds += row.duration_seconds ?? 0;
    totals.set(row.user_id, existing);
  }
  return Array.from(totals.values()).sort((a, b) => b.seconds - a.seconds);
}
