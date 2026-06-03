"use client";

import { useMutation } from "@tanstack/react-query";
import type {
  AiAutopilot,
  AiDailyPlan,
  AiDocumentation,
  AiExtractedTasks,
  AiGeneratedProject,
  AiPredictions,
  AiProductivityCoach,
  AiProjectPlan,
  AiStandup,
  AiTaskBreakdown,
  AiVoiceTask,
} from "@/lib/ai";

type AiAction =
  | "breakdown"
  | "plan"
  | "generate_project"
  | "daily_plan"
  | "standup"
  | "extract_tasks"
  | "autopilot"
  | "coach"
  | "documentation"
  | "voice_task"
  | "predictions";

// Calls the server-side /api/ai route (which uses /lib/ai.ts). Keeps the OpenAI
// key on the server. Reusable for any AI feature.
async function callAi<T>(action: AiAction, input: string): Promise<T> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, input }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error ?? "AI request failed.");
  }
  return json as T;
}

/** Task breakdown → subtasks + priority recommendation + time estimate. */
export function useAiBreakdown() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiTaskBreakdown>("breakdown", input),
  });
}

/** Project planning → phased execution plan. */
export function useAiProjectPlan() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiProjectPlan>("plan", input),
  });
}

/** AI Project Generator → project name + description + seed tasks. */
export function useAiProjectGenerator() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiGeneratedProject>("generate_project", input),
  });
}

/** AI Daily Planner → focus + schedule. */
export function useAiDailyPlan() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiDailyPlan>("daily_plan", input),
  });
}

/** AI Standup Summary → yesterday/today/blockers. */
export function useAiStandup() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiStandup>("standup", input),
  });
}

/** Meeting Notes → Tasks extractor. */
export function useAiExtractTasks() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiExtractedTasks>("extract_tasks", input),
  });
}

/** AI Autopilot → analyse workspace, detect stuck work, suggest actions + alerts. */
export function useAiAutopilot() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiAutopilot>("autopilot", input),
  });
}

/** AI Productivity Coach → weekly report, score, suggestions. */
export function useAiCoach() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiProductivityCoach>("coach", input),
  });
}

/** AI Documentation Generator → Markdown docs. */
export function useAiDocumentation() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiDocumentation>("documentation", input),
  });
}

/** Voice/text → structured task. */
export function useAiVoiceTask() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiVoiceTask>("voice_task", input),
  });
}

/** Predictive analytics → delay risk, overload, success probability. */
export function useAiPredictions() {
  return useMutation({
    mutationFn: (input: string) => callAi<AiPredictions>("predictions", input),
  });
}
