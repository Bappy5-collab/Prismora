import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { notifyWorkspaceMembers } from "./notifications";
import { logActivity } from "./activity";
import { logAudit } from "./audit";
import type { MemberRole, Workspace, WorkspaceMemberWithProfile } from "@/lib/database.types";

// Data-access for workspaces + membership. Pure functions returning data;
// React Query hooks (src/hooks) wrap these for caching/mutations.

export async function fetchMyWorkspaces(): Promise<Workspace[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createWorkspace(name: string): Promise<Workspace> {
  // Goes through the privileged server route (/api/workspaces). Creating a
  // tenant is a server-side concern; the route authenticates the session and
  // forces owner_id = the current user.
  const res = await fetch("/api/workspaces", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim() }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "Failed to create workspace.");
  }
  return json as Workspace;
}

export type UpdateWorkspaceInput = Partial<
  Pick<Workspace, "name" | "description" | "logo_url">
>;

export async function updateWorkspace(
  workspaceId: string,
  patch: UpdateWorkspaceInput
): Promise<Workspace> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update(patch)
    .eq("id", workspaceId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMemberWithProfile[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, profile:profiles(id, full_name, email, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as WorkspaceMemberWithProfile[];
}

/**
 * Invite a member by email. Creates a pending membership row. If the invitee
 * already has a Prismora account we also link their user_id so RLS lets them in
 * immediately; otherwise the row is claimed when they sign up & accept.
 */
export async function inviteMember(
  workspaceId: string,
  email: string,
  role: Exclude<MemberRole, "owner">
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const normalized = email.trim().toLowerCase();

  // Best-effort: resolve an existing profile to pre-link the membership.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  const { error } = await supabase.from("workspace_members").insert({
    workspace_id: workspaceId,
    invited_email: normalized,
    user_id: profile?.id ?? null,
    role,
    status: profile ? "accepted" : "pending",
  });
  if (error) throw error;

  // "Member joined" notification when an existing user was added immediately.
  if (profile) {
    await notifyWorkspaceMembers({
      workspaceId,
      exceptUserId: profile.id,
      title: "Member joined",
      body: `${normalized} joined the workspace.`,
    }).catch(() => {});
  }

  await logActivity({
    workspaceId,
    action: "member_invited",
    summary: `invited ${normalized}`,
    entityType: "member",
  });
  await logAudit({
    workspaceId,
    action: "member.invited",
    entityType: "member",
    metadata: { email: normalized, role },
  });
}

export async function changeMemberRole(input: {
  workspaceId: string;
  memberId: string;
  role: MemberRole;
  email?: string;
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role: input.role })
    .eq("id", input.memberId);
  if (error) throw error;
  await logAudit({
    workspaceId: input.workspaceId,
    action: "member.role_changed",
    entityType: "member",
    entityId: input.memberId,
    metadata: { role: input.role, email: input.email },
  });
}

export async function removeMember(memberId: string, workspaceId?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("workspace_members").delete().eq("id", memberId);
  if (error) throw error;
  if (workspaceId) {
    await logAudit({
      workspaceId,
      action: "member.removed",
      entityType: "member",
      entityId: memberId,
    });
  }
}
