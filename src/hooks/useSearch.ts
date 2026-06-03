"use client";

import { useQuery } from "@tanstack/react-query";
import { globalSearch } from "@/services/search";

export function useSearch(workspaceId: string | null, query: string) {
  return useQuery({
    queryKey: ["search", workspaceId, query],
    queryFn: () => globalSearch(workspaceId!, query),
    enabled: !!workspaceId && query.trim().length > 0,
    staleTime: 10_000,
  });
}
