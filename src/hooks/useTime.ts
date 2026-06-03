"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchActiveTimer,
  fetchTaskTimeSeconds,
  fetchWeeklyReport,
  startTimer,
  stopTimer,
} from "@/services/time";

export const timeKeys = {
  active: ["time", "active"] as const,
  task: (taskId: string) => ["time", "task", taskId] as const,
  weekly: (workspaceId: string) => ["time", "weekly", workspaceId] as const,
};

export function useActiveTimer() {
  return useQuery({ queryKey: timeKeys.active, queryFn: fetchActiveTimer });
}

export function useTaskTime(taskId: string | null) {
  return useQuery({
    queryKey: timeKeys.task(taskId ?? "none"),
    queryFn: () => fetchTaskTimeSeconds(taskId!),
    enabled: !!taskId,
  });
}

export function useWeeklyReport(workspaceId: string | null) {
  return useQuery({
    queryKey: timeKeys.weekly(workspaceId ?? "none"),
    queryFn: () => fetchWeeklyReport(workspaceId!),
    enabled: !!workspaceId,
  });
}

function useInvalidateTime() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["time"] });
}

export function useStartTimer() {
  const invalidate = useInvalidateTime();
  return useMutation({
    mutationFn: (input: { workspaceId: string; taskId: string }) =>
      startTimer(input.workspaceId, input.taskId),
    onSuccess: invalidate,
  });
}

export function useStopTimer() {
  const invalidate = useInvalidateTime();
  return useMutation({
    mutationFn: (timeLogId: string) => stopTimer(timeLogId),
    onSuccess: invalidate,
  });
}
