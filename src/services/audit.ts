import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { AuditLogWithActor } from "@/lib/database.types";

// Security audit trail. logAudit is best-effort — it must never break the action
// that triggered it. Distinct from the activity feed (activity_logs): this is
// the admin-only security log of sensitive events.
export async function logAudit(input: {
  workspaceId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      workspace_id: input.workspaceId,
      user_id: user?.id ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    /* ignore */
  }
}

export async function fetchAuditLogs(workspaceId: string): Promise<AuditLogWithActor[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, actor:profiles(id, full_name, email)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as AuditLogWithActor[];
}
