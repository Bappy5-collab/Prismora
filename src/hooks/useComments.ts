"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addComment,
  deleteComment,
  fetchComments,
  updateComment,
} from "@/services/comments";

export const commentKeys = {
  list: (taskId: string) => ["comments", taskId] as const,
};

export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: commentKeys.list(taskId ?? "none"),
    queryFn: () => fetchComments(taskId!),
    enabled: !!taskId,
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      workspaceId: string;
      body: string;
      taskTitle?: string;
      taskCreatedBy?: string | null;
    }) => addComment({ taskId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentKeys.list(taskId) }),
  });
}

export function useUpdateComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; body: string }) => updateComment(input.id, input.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentKeys.list(taskId) }),
  });
}

export function useDeleteComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentKeys.list(taskId) }),
  });
}
