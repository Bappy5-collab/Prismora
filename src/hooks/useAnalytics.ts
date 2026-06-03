"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAnalytics } from "@/services/analytics";

export function useAnalytics(workspaceId: string | null) {
  return useQuery({
    queryKey: ["analytics", workspaceId],
    queryFn: () => fetchAnalytics(workspaceId!),
    enabled: !!workspaceId,
  });
}
