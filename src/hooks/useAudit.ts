"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/services/audit";

export function useAuditLogs(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["audit", workspaceId],
    queryFn: () => fetchAuditLogs(workspaceId!),
    enabled: !!workspaceId && enabled,
  });
}
