"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchActivity } from "@/services/activity";

export const activityKeys = {
  list: (workspaceId: string) => ["activity", workspaceId] as const,
};

export function useActivity(workspaceId: string | null) {
  return useQuery({
    queryKey: activityKeys.list(workspaceId ?? "none"),
    queryFn: () => fetchActivity(workspaceId!),
    enabled: !!workspaceId,
  });
}
