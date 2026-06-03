"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";

export const notificationKeys = {
  // Prefix used by Realtime/invalidation to match every workspace's list.
  all: ["notifications"] as const,
  list: (workspaceId: string) => ["notifications", workspaceId] as const,
};

export function useNotifications(workspaceId: string | null) {
  return useQuery({
    queryKey: notificationKeys.list(workspaceId ?? "none"),
    queryFn: () => fetchNotifications(workspaceId!),
    enabled: !!workspaceId,
    refetchInterval: 30_000, // light polling; Realtime pushes also invalidate
  });
}

export function useUnreadCount(workspaceId: string | null) {
  const { data } = useNotifications(workspaceId);
  return (data ?? []).filter((n) => !n.read).length;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(workspaceId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
