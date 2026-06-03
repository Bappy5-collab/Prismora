"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLabel,
  deleteLabel,
  fetchLabels,
  fetchTaskLabelIds,
  fetchWorkspaceLabelLinks,
  setTaskLabels,
} from "@/services/labels";

export const labelKeys = {
  list: (workspaceId: string) => ["labels", workspaceId] as const,
  links: (workspaceId: string) => ["label-links", workspaceId] as const,
  task: (taskId: string) => ["task-labels", taskId] as const,
};

export function useLabels(workspaceId: string | null) {
  return useQuery({
    queryKey: labelKeys.list(workspaceId ?? "none"),
    queryFn: () => fetchLabels(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useCreateLabel(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createLabel(workspaceId!, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: labelKeys.list(workspaceId ?? "none") }),
  });
}

export function useDeleteLabel(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLabel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: labelKeys.list(workspaceId ?? "none") });
      qc.invalidateQueries({ queryKey: labelKeys.links(workspaceId ?? "none") });
    },
  });
}

export function useWorkspaceLabelLinks(workspaceId: string | null) {
  return useQuery({
    queryKey: labelKeys.links(workspaceId ?? "none"),
    queryFn: () => fetchWorkspaceLabelLinks(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useTaskLabelIds(taskId: string | null) {
  return useQuery({
    queryKey: labelKeys.task(taskId ?? "none"),
    queryFn: () => fetchTaskLabelIds(taskId!),
    enabled: !!taskId,
  });
}

export function useSetTaskLabels(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; labelIds: string[] }) =>
      setTaskLabels({ workspaceId: workspaceId!, ...input }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: labelKeys.task(vars.taskId) });
      qc.invalidateQueries({ queryKey: labelKeys.links(workspaceId ?? "none") });
    },
  });
}
