"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteAttachment,
  fetchAttachments,
  uploadAttachment,
} from "@/services/attachments";

export const attachmentKeys = {
  list: (taskId: string) => ["attachments", taskId] as const,
};

export function useAttachments(taskId: string | null) {
  return useQuery({
    queryKey: attachmentKeys.list(taskId ?? "none"),
    queryFn: () => fetchAttachments(taskId!),
    enabled: !!taskId,
  });
}

export function useUploadAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { workspaceId: string; file: File }) =>
      uploadAttachment({ taskId, ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: attachmentKeys.list(taskId) }),
  });
}

export function useDeleteAttachment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAttachment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: attachmentKeys.list(taskId) }),
  });
}
