"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDependency,
  fetchBlockedTaskIds,
  fetchDependencies,
  removeDependency,
} from "@/services/dependencies";

export const dependencyKeys = {
  task: (taskId: string) => ["dependencies", taskId] as const,
  blocked: (workspaceId: string) => ["blocked-tasks", workspaceId] as const,
};

export function useDependencies(taskId: string | null) {
  return useQuery({
    queryKey: dependencyKeys.task(taskId ?? "none"),
    queryFn: () => fetchDependencies(taskId!),
    enabled: !!taskId,
  });
}

export function useBlockedTaskIds(workspaceId: string | null) {
  return useQuery({
    queryKey: dependencyKeys.blocked(workspaceId ?? "none"),
    queryFn: () => fetchBlockedTaskIds(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useAddDependency(taskId: string, workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dependsOnTaskId: string) =>
      addDependency({ workspaceId: workspaceId!, taskId, dependsOnTaskId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dependencyKeys.task(taskId) });
      qc.invalidateQueries({ queryKey: dependencyKeys.blocked(workspaceId ?? "none") });
    },
  });
}

export function useRemoveDependency(taskId: string, workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dependencyId: string) => removeDependency(dependencyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dependencyKeys.task(taskId) });
      qc.invalidateQueries({ queryKey: dependencyKeys.blocked(workspaceId ?? "none") });
    },
  });
}
