import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { Notification } from "@/lib/database.types";

// Notifications are tenant data: always scoped to the active workspace.
// (RLS additionally guarantees a user only ever sees their OWN notifications.)
export async function fetchNotifications(workspaceId: string): Promise<Notification[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function createNotification(input: {
  workspaceId: string;
  userId: string;
  title: string;
  body?: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("notifications").insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    title: input.title,
    body: input.body ?? null,
  });
  if (error) throw error;
}

/**
 * Fan-out a notification to every accepted member of a workspace, optionally
 * skipping one user (usually the actor). Used for "Project created" and
 * "Member joined" events. RLS permits a member to insert notifications for
 * their workspace.
 */
export async function notifyWorkspaceMembers(input: {
  workspaceId: string;
  exceptUserId?: string;
  title: string;
  body?: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", input.workspaceId)
    .eq("status", "accepted")
    .not("user_id", "is", null);
  if (error) throw error;

  const rows = (members ?? [])
    .map((m) => m.user_id)
    .filter((id): id is string => !!id && id !== input.exceptUserId)
    .map((userId) => ({
      workspace_id: input.workspaceId,
      user_id: userId,
      title: input.title,
      body: input.body ?? null,
    }));

  if (rows.length === 0) return;
  const { error: insertError } = await supabase.from("notifications").insert(rows);
  if (insertError) throw insertError;
}

export async function markNotificationRead(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(workspaceId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("workspace_id", workspaceId)
    .eq("read", false);
  if (error) throw error;
}
