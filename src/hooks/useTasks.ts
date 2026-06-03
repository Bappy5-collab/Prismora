"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTask,
  deleteTask,
  fetchTasks,
  fetchWorkspaceTasks,
  updateTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from "@/services/tasks";

export const taskKeys = {
  list: (projectId: string) => ["tasks", projectId] as const,
  workspace: (workspaceId: string) => ["tasks", "workspace", workspaceId] as const,
};

export function useTasks(projectId: string) {
  return useQuery({
    queryKey: taskKeys.list(projectId),
    queryFn: () => fetchTasks(projectId),
    enabled: !!projectId,
  });
}

// All tasks across the active workspace (Tasks page + Calendar).
export function useWorkspaceTasks(workspaceId: string | null) {
  return useQuery({
    queryKey: taskKeys.workspace(workspaceId ?? "none"),
    queryFn: () => fetchWorkspaceTasks(workspaceId!),
    enabled: !!workspaceId,
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    // Invalidate the whole "tasks" tree so both the project view and the
    // workspace-wide Tasks/Calendar views refresh.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { taskId: string; patch: UpdateTaskInput }) =>
      updateTask(input.taskId, input.patch),
    // Invalidate the whole "tasks" tree so both the project view and the
    // workspace-wide Tasks/Calendar views refresh.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => deleteTask(taskId),
    // Invalidate the whole "tasks" tree so both the project view and the
    // workspace-wide Tasks/Calendar views refresh.
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
