"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { taskKeys } from "./useTasks";
import { notificationKeys } from "./useNotifications";
import { commentKeys } from "./useComments";
import { activityKeys } from "./useActivity";

// Supabase Realtime subscriptions. The `tasks` and `notifications` tables are
// added to the `supabase_realtime` publication in schema.sql. These hooks listen
// for Postgres changes and invalidate the matching React Query cache so the UI
// updates live without manual refetching. Realtime respects RLS, so users only
// receive changes for rows they're allowed to read.

/** Live-update the task list for a project as teammates add/edit/delete tasks. */
export function useRealtimeTasks(projectId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!projectId) return;
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`realtime:tasks:${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `project_id=eq.${projectId}` },
        () => qc.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, qc]);
}

/**
 * Live-sync every task in the active workspace (Tasks page, Calendar, Analytics).
 * Invalidates the whole "tasks" tree on any change so status updates appear
 * instantly with no reload.
 */
export function useRealtimeWorkspaceTasks(workspaceId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`realtime:ws-tasks:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["tasks"] });
          qc.invalidateQueries({ queryKey: ["analytics", workspaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}

/** Live-update the notification list/badge when new notifications arrive. */
export function useRealtimeNotifications(userId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`realtime:notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: notificationKeys.all })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);
}

/** Live-update comments on a task as teammates post them. */
export function useRealtimeComments(taskId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!taskId) return;
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`realtime:comments:${taskId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` },
        () => qc.invalidateQueries({ queryKey: commentKeys.list(taskId) })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, qc]);
}

/** Live-update the activity feed for a workspace. */
export function useRealtimeActivity(workspaceId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`realtime:activity:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => qc.invalidateQueries({ queryKey: activityKeys.list(workspaceId) })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, qc]);
}
