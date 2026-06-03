"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { can, type Permission } from "@/lib/rbac";
import type { MemberRole } from "@/lib/database.types";

async function fetchMyRole(workspaceId: string): Promise<MemberRole | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as MemberRole) ?? null;
}

export function useMyRole() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  return useQuery({
    queryKey: ["my-role", activeId],
    queryFn: () => fetchMyRole(activeId!),
    enabled: !!activeId,
  });
}

/** Returns whether the current user has a permission in the active workspace. */
export function useCan(permission: Permission): boolean {
  const { data: role } = useMyRole();
  return can(role, permission);
}
