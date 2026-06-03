import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { ActivityAction, ActivityLogWithActor } from "@/lib/database.types";

// Append-only activity feed. logActivity is best-effort: a failed log must never
// break the user action that triggered it.
export async function logActivity(input: {
  workspaceId: string;
  action: ActivityAction;
  summary: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert({
      workspace_id: input.workspaceId,
      actor_id: user?.id ?? null,
      action: input.action,
      summary: input.summary,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
    });
  } catch {
    /* ignore */
  }
}

export async function fetchActivity(workspaceId: string): Promise<ActivityLogWithActor[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*, actor:profiles(id, full_name, email)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as ActivityLogWithActor[];
}
