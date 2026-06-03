"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaceStore } from "@/store/workspaceStore";

// Every query key that is scoped to a single workspace (tenant). When the user
// switches workspace we drop these from the cache so no stale tenant data can
// flash before the new tenant's data loads. Workspace-list/auth queries are NOT
// here — they are user-scoped, not workspace-scoped.
const WORKSPACE_SCOPED_KEYS = [
  ["projects"],
  ["project"],
  ["tasks"],
  ["workspace-members"],
  ["notifications"],
  ["dashboard-stats"],
] as const;

/**
 * Returns `switchWorkspace(id)` — the single, correct way to change tenant.
 * It updates the active workspace and invalidates all workspace-scoped caches
 * so dashboard, projects, tasks, members and notifications all refetch for the
 * newly selected workspace.
 */
export function useSwitchWorkspace() {
  const qc = useQueryClient();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  return useCallback(
    (id: string | null) => {
      if (id === activeId) return;
      setActiveWorkspace(id);
      // Remove (not just invalidate) so the UI can never render the previous
      // tenant's rows; the new keys then fetch fresh data on mount.
      WORKSPACE_SCOPED_KEYS.forEach((key) => qc.removeQueries({ queryKey: key }));
    },
    [activeId, qc, setActiveWorkspace]
  );
}
