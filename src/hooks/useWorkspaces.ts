"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeMemberRole,
  createWorkspace,
  fetchMyWorkspaces,
  fetchWorkspaceMembers,
  inviteMember,
  removeMember,
  updateWorkspace,
  type UpdateWorkspaceInput,
} from "@/services/workspaces";
import type { MemberRole } from "@/lib/database.types";
import { useWorkspaceStore } from "@/store/workspaceStore";

export const workspaceKeys = {
  all: ["workspaces"] as const,
  members: (id: string) => ["workspace-members", id] as const,
};

export function useWorkspaces() {
  const query = useQuery({
    queryKey: workspaceKeys.all,
    queryFn: fetchMyWorkspaces,
  });

  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  // Auto-select the first workspace if none is chosen, or fix a stale id.
  useEffect(() => {
    if (!query.data) return;
    const ids = query.data.map((w) => w.id);
    if (query.data.length === 0) {
      if (activeWorkspaceId !== null) setActiveWorkspace(null);
    } else if (!activeWorkspaceId || !ids.includes(activeWorkspaceId)) {
      setActiveWorkspace(query.data[0].id);
    }
  }, [query.data, activeWorkspaceId, setActiveWorkspace]);

  return query;
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);
  return useMutation({
    mutationFn: (name: string) => createWorkspace(name),
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: workspaceKeys.all });
      setActiveWorkspace(ws.id);
    },
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { workspaceId: string; patch: UpdateWorkspaceInput }) =>
      updateWorkspace(input.workspaceId, input.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.all }),
  });
}

export function useWorkspaceMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId ?? "none"),
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useInviteMember(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: Exclude<MemberRole, "owner"> }) =>
      inviteMember(workspaceId!, input.email, input.role),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId ?? "none") }),
  });
}

export function useRemoveMember(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId, workspaceId ?? undefined),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId ?? "none") }),
  });
}

export function useChangeMemberRole(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { memberId: string; role: MemberRole; email?: string }) =>
      changeMemberRole({ workspaceId: workspaceId!, ...input }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId ?? "none") }),
  });
}
