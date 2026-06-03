import { create } from "zustand";
import { persist } from "zustand/middleware";

// Holds the *selected* workspace id only. The list of workspaces and all server
// data live in React Query — Zustand here is just lightweight client UI state,
// persisted to localStorage so the choice survives reloads.
//
// Multi-tenancy: this id is the single source of truth for "which tenant am I
// looking at". Every workspace-scoped query keys off it, so changing it swaps
// the entire dataset (projects, tasks, members, notifications, dashboard).
interface WorkspaceState {
  activeWorkspaceId: string | null;
  setActiveWorkspace: (id: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
    }),
    { name: "prismora.active-workspace" }
  )
);
