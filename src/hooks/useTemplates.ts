"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProjectFromTemplate,
  deleteTemplate,
  fetchTemplates,
  saveTemplate,
} from "@/services/templates";
import { projectKeys } from "./useProjects";
import type { ProjectTemplateTask } from "@/lib/database.types";

export const templateKeys = {
  list: (workspaceId: string) => ["templates", workspaceId] as const,
};

export function useTemplates(workspaceId: string | null) {
  return useQuery({
    queryKey: templateKeys.list(workspaceId ?? "none"),
    queryFn: () => fetchTemplates(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useSaveTemplate(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; tasks: ProjectTemplateTask[] }) =>
      saveTemplate({ workspaceId: workspaceId!, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.list(workspaceId ?? "none") }),
  });
}

export function useDeleteTemplate(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.list(workspaceId ?? "none") }),
  });
}

export function useCreateFromTemplate(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; tasks: ProjectTemplateTask[] }) =>
      createProjectFromTemplate({ workspaceId: workspaceId!, ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId ?? "none") });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
