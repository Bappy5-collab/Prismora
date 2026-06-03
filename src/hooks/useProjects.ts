"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  deleteProject,
  fetchProject,
  fetchProjects,
  updateProject,
  type UpdateProjectInput,
} from "@/services/projects";
import type { ProjectStatus } from "@/lib/database.types";

export const projectKeys = {
  list: (workspaceId: string) => ["projects", workspaceId] as const,
  detail: (projectId: string) => ["project", projectId] as const,
};

export function useProjects(workspaceId: string | null) {
  return useQuery({
    queryKey: projectKeys.list(workspaceId ?? "none"),
    queryFn: () => fetchProjects(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; status?: ProjectStatus }) =>
      createProject({ workspaceId: workspaceId!, ...input }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId ?? "none") }),
  });
}

export function useUpdateProject(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { projectId: string; patch: UpdateProjectInput }) =>
      updateProject(input.projectId, input.patch),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId ?? "none") });
      qc.invalidateQueries({ queryKey: projectKeys.detail(project.id) });
    },
  });
}

export function useDeleteProject(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => deleteProject(projectId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: projectKeys.list(workspaceId ?? "none") }),
  });
}
