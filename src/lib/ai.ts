import "server-only";

import OpenAI from "openai";
import type { TaskPriority } from "./database.types";

/**
 * Prismora AI module.
 *
 * Reusable server-side service that turns a free-text task description into a
 * structured plan. Designed to be the single integration point for future AI
 * features (estimation, summarisation, etc.).
 *
 * IMPORTANT: server-only. Never import this into a client component — it reads
 * OPENAI_API_KEY. It is consumed through the /api/ai route handler.
 */

export interface AiTaskBreakdown {
  subtasks: string[];
  priority: TaskPriority;
  estimatedTime: string;
}

export interface AiProjectPlanPhase {
  name: string;
  durationEstimate: string;
  tasks: string[];
}

export interface AiProjectPlan {
  summary: string;
  phases: AiProjectPlanPhase[];
}

export interface AiGeneratedProject {
  name: string;
  description: string;
  tasks: { title: string; priority: TaskPriority }[];
}

export interface AiDailyPlan {
  focus: string;
  schedule: { slot: string; task: string }[];
}

export interface AiStandup {
  yesterday: string[];
  today: string[];
  blockers: string[];
}

export interface AiExtractedTasks {
  tasks: { title: string; priority: TaskPriority }[];
}

export interface AiAutopilot {
  summary: string;
  health: "on_track" | "at_risk" | "blocked";
  stuckTasks: string[];
  nextActions: string[];
  priorityChanges: { task: string; suggestedPriority: TaskPriority; reason: string }[];
  alerts: string[];
}

export interface AiProductivityCoach {
  score: number; // 0..100
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface AiDocumentation {
  title: string;
  markdown: string;
}

export interface AiVoiceTask {
  title: string;
  priority: TaskPriority;
  dueDate: string | null; // ISO date or null
}

export interface AiPredictions {
  delayRisk: "low" | "medium" | "high";
  successProbability: number; // 0..100
  overloadedMembers: string[];
  risks: string[];
  recommendations: string[];
}

const SYSTEM_PROMPT = `You are a senior project manager assistant inside a SaaS tool called Prismora.
Given a task description, break it into a small, concrete set of actionable subtasks,
choose a priority, and estimate the effort.

Rules:
- Return 2 to 6 subtasks, each a short imperative phrase (no numbering).
- "priority" MUST be exactly one of: "low", "medium", "high".
- "estimatedTime" is a short human string like "2h", "1d", "3d".
- Respond with STRICT JSON only, matching this shape:
  { "subtasks": string[], "priority": "low"|"medium"|"high", "estimatedTime": string }`;

let openaiSingleton: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (openaiSingleton) return openaiSingleton;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env.local.");
  }
  openaiSingleton = new OpenAI({ apiKey });
  return openaiSingleton;
}

const VALID_PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

/** Coerce arbitrary model output into a safe, well-typed breakdown. */
function normalize(raw: unknown): AiTaskBreakdown {
  const obj = (raw ?? {}) as Record<string, unknown>;

  const subtasks = Array.isArray(obj.subtasks)
    ? obj.subtasks
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 6)
    : [];

  const priorityRaw = String(obj.priority ?? "medium").toLowerCase() as TaskPriority;
  const priority = VALID_PRIORITIES.includes(priorityRaw) ? priorityRaw : "medium";

  const estimatedTime = String(obj.estimatedTime ?? "").trim() || "1d";

  return { subtasks, priority, estimatedTime };
}

/**
 * Generate a structured breakdown for a task description.
 * Always resolves to a valid AiTaskBreakdown (throws only on missing key /
 * network/auth failure, which the route handler maps to an HTTP error).
 */
export async function generateTaskBreakdown(
  description: string
): Promise<AiTaskBreakdown> {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error("Task description is required.");
  }

  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Task description:\n${trimmed}` },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned malformed JSON.");
  }

  return normalize(parsed);
}

const PLAN_SYSTEM_PROMPT = `You are a senior project manager inside a SaaS tool called Prismora.
Given a project goal/description, produce an execution plan broken into phases.

Rules:
- 3 to 5 phases, ordered logically.
- Each phase has a short "name", a "durationEstimate" (e.g. "1w", "3d"),
  and 2 to 5 concrete "tasks" (short imperative phrases).
- Provide a one-sentence "summary".
- Respond with STRICT JSON only, matching this shape:
  { "summary": string, "phases": [ { "name": string, "durationEstimate": string, "tasks": string[] } ] }`;

function normalizePlan(raw: unknown): AiProjectPlan {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const summary = String(obj.summary ?? "").trim() || "Project execution plan.";
  const phasesRaw = Array.isArray(obj.phases) ? obj.phases : [];
  const phases: AiProjectPlanPhase[] = phasesRaw.slice(0, 6).map((p) => {
    const ph = (p ?? {}) as Record<string, unknown>;
    return {
      name: String(ph.name ?? "Phase").trim() || "Phase",
      durationEstimate: String(ph.durationEstimate ?? "").trim() || "1w",
      tasks: Array.isArray(ph.tasks)
        ? ph.tasks.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
        : [],
    };
  });
  return { summary, phases };
}

/** Generate a phased execution plan for a project goal. */
export async function generateProjectPlan(description: string): Promise<AiProjectPlan> {
  const trimmed = description.trim();
  if (!trimmed) throw new Error("Project description is required.");

  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: `Project goal:\n${trimmed}` },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned malformed JSON.");
  }
  return normalizePlan(parsed);
}

// ── Shared helper for the lighter generators ────────────────────────────────
async function chatJson(system: string, user: string): Promise<Record<string, unknown>> {
  const trimmed = user.trim();
  if (!trimmed) throw new Error("Input is required.");
  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await openai.chat.completions.create({
    model,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: trimmed },
    ],
  });
  try {
    return JSON.parse(completion.choices[0]?.message?.content ?? "{}");
  } catch {
    throw new Error("AI returned malformed JSON.");
  }
}

const asStrings = (v: unknown, max = 8): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : [];

const asTasks = (v: unknown): { title: string; priority: TaskPriority }[] =>
  Array.isArray(v)
    ? v
        .map((t) => {
          const o = (t ?? {}) as Record<string, unknown>;
          const p = String(o.priority ?? "medium").toLowerCase() as TaskPriority;
          return {
            title: String(o.title ?? "").trim(),
            priority: VALID_PRIORITIES.includes(p) ? p : "medium",
          };
        })
        .filter((t) => t.title)
        .slice(0, 20)
    : [];

/** AI Project Generator → a ready-to-create project with seed tasks. */
export async function generateProjectFromGoal(goal: string): Promise<AiGeneratedProject> {
  const raw = await chatJson(
    `You generate a project from a goal for a PM tool called Prismora.
Return STRICT JSON: { "name": string, "description": string,
  "tasks": [ { "title": string, "priority": "low"|"medium"|"high" } ] }.
Provide 4-8 tasks. Keep name under 60 chars.`,
    goal
  );
  return {
    name: String(raw.name ?? "").trim() || "New project",
    description: String(raw.description ?? "").trim(),
    tasks: asTasks(raw.tasks),
  };
}

/** AI Daily Planner → an ordered focus schedule from a list of tasks/notes. */
export async function generateDailyPlan(input: string): Promise<AiDailyPlan> {
  const raw = await chatJson(
    `You are a daily planner. Given the user's tasks/notes, produce a focused plan.
Return STRICT JSON: { "focus": string, "schedule": [ { "slot": string, "task": string } ] }.
"slot" is a short label like "9:00–10:30" or "Morning". 4-6 items.`,
    input
  );
  const schedule = Array.isArray(raw.schedule)
    ? raw.schedule
        .map((s) => {
          const o = (s ?? {}) as Record<string, unknown>;
          return { slot: String(o.slot ?? "").trim(), task: String(o.task ?? "").trim() };
        })
        .filter((s) => s.task)
        .slice(0, 8)
    : [];
  return { focus: String(raw.focus ?? "").trim() || "Top priorities for today", schedule };
}

/** AI Standup Summary → yesterday/today/blockers from free text. */
export async function generateStandupSummary(input: string): Promise<AiStandup> {
  const raw = await chatJson(
    `You write a concise daily standup from the user's update.
Return STRICT JSON: { "yesterday": string[], "today": string[], "blockers": string[] }.
Each item is one short bullet. Blockers may be empty.`,
    input
  );
  return {
    yesterday: asStrings(raw.yesterday),
    today: asStrings(raw.today),
    blockers: asStrings(raw.blockers),
  };
}

/** Meeting Notes → Tasks extractor. */
export async function extractTasksFromNotes(notes: string): Promise<AiExtractedTasks> {
  const raw = await chatJson(
    `Extract actionable tasks from meeting notes.
Return STRICT JSON: { "tasks": [ { "title": string, "priority": "low"|"medium"|"high" } ] }.
Only concrete action items. Up to 15.`,
    notes
  );
  return { tasks: asTasks(raw.tasks) };
}

/**
 * AI Autopilot — given a JSON snapshot of a workspace's projects/tasks, analyse
 * status, detect stuck work, suggest next actions and priority changes, and
 * produce short smart alerts. `input` is a JSON string built by the caller.
 */
export async function generateAutopilot(input: string): Promise<AiAutopilot> {
  const raw = await chatJson(
    `You are Prismora Autopilot, an AI project chief-of-staff.
Given a JSON snapshot of tasks (title, status, priority, assignee, dueDate, overdue, blocked),
analyse the workspace and respond with STRICT JSON:
{
  "summary": string,                       // 1-2 sentences on overall status
  "health": "on_track" | "at_risk" | "blocked",
  "stuckTasks": string[],                   // titles that appear stalled/blocked/overdue
  "nextActions": string[],                  // 3-5 concrete recommended next actions
  "priorityChanges": [ { "task": string, "suggestedPriority": "low"|"medium"|"high", "reason": string } ],
  "alerts": string[]                        // short smart alerts e.g. "3 tasks waiting on you", "Deadline risk detected"
}
Keep arrays short (max 6). Be specific and reference real task titles from the input.`,
    input
  );

  const health = String(raw.health ?? "on_track");
  const priorityChanges = Array.isArray(raw.priorityChanges)
    ? raw.priorityChanges
        .map((p) => {
          const o = (p ?? {}) as Record<string, unknown>;
          const pr = String(o.suggestedPriority ?? "medium").toLowerCase() as TaskPriority;
          return {
            task: String(o.task ?? "").trim(),
            suggestedPriority: VALID_PRIORITIES.includes(pr) ? pr : "medium",
            reason: String(o.reason ?? "").trim(),
          };
        })
        .filter((p) => p.task)
        .slice(0, 6)
    : [];

  return {
    summary: String(raw.summary ?? "").trim() || "No summary available.",
    health:
      health === "at_risk" || health === "blocked" ? (health as AiAutopilot["health"]) : "on_track",
    stuckTasks: asStrings(raw.stuckTasks, 6),
    nextActions: asStrings(raw.nextActions, 6),
    priorityChanges,
    alerts: asStrings(raw.alerts, 6),
  };
}

const clampScore = (v: unknown): number => {
  const n = Math.round(Number(v) || 0);
  return Math.max(0, Math.min(100, n));
};

/** AI Productivity Coach — weekly performance report, score and suggestions. */
export async function generateProductivityCoach(input: string): Promise<AiProductivityCoach> {
  const raw = await chatJson(
    `You are a productivity coach. Given a JSON snapshot of a person's tasks and
activity this week, write an encouraging but honest review.
Return STRICT JSON: { "score": number(0-100), "summary": string,
  "strengths": string[], "improvements": string[] }. Keep arrays to 2-4 items.`,
    input
  );
  return {
    score: clampScore(raw.score),
    summary: String(raw.summary ?? "").trim() || "Keep going.",
    strengths: asStrings(raw.strengths, 4),
    improvements: asStrings(raw.improvements, 4),
  };
}

/** AI Documentation Generator — project docs / README / sprint report (Markdown). */
export async function generateDocumentation(input: string): Promise<AiDocumentation> {
  const raw = await chatJson(
    `You generate clean technical documentation in Markdown from a JSON snapshot
of a project and its tasks. Cover: overview, scope, current status (by task
status), and next steps. Return STRICT JSON: { "title": string, "markdown": string }.
The markdown should be well-structured with headings and lists.`,
    input
  );
  return {
    title: String(raw.title ?? "Project documentation").trim(),
    markdown: String(raw.markdown ?? "").trim() || "_No content generated._",
  };
}

/** Voice/text → structured task. `input` should include today's date for context. */
export async function parseVoiceTask(input: string): Promise<AiVoiceTask> {
  const raw = await chatJson(
    `Convert a natural-language instruction into ONE structured task.
Return STRICT JSON: { "title": string, "priority": "low"|"medium"|"high",
  "dueDate": string|null }. "dueDate" is an ISO date (YYYY-MM-DD) if the text
implies a date (e.g. today, tomorrow, Friday), else null. Use the provided
"Today" date to resolve relative dates. Keep the title concise.`,
    input
  );
  const p = String(raw.priority ?? "medium").toLowerCase() as TaskPriority;
  const dueRaw = raw.dueDate ? String(raw.dueDate).trim() : "";
  return {
    title: String(raw.title ?? "").trim() || "New task",
    priority: VALID_PRIORITIES.includes(p) ? p : "medium",
    dueDate: /^\d{4}-\d{2}-\d{2}/.test(dueRaw) ? dueRaw.slice(0, 10) : null,
  };
}

/** Predictive analytics — delay risk, overload, success probability. */
export async function generatePredictions(input: string): Promise<AiPredictions> {
  const raw = await chatJson(
    `You are a predictive project analyst. Given a JSON snapshot of tasks
(status, priority, assignee, dueDate, overdue, blocked), predict outcomes.
Return STRICT JSON: { "delayRisk": "low"|"medium"|"high",
  "successProbability": number(0-100), "overloadedMembers": string[],
  "risks": string[], "recommendations": string[] }. Arrays max 5 items.`,
    input
  );
  const risk = String(raw.delayRisk ?? "low").toLowerCase();
  return {
    delayRisk: risk === "high" || risk === "medium" ? (risk as AiPredictions["delayRisk"]) : "low",
    successProbability: clampScore(raw.successProbability),
    overloadedMembers: asStrings(raw.overloadedMembers, 5),
    risks: asStrings(raw.risks, 5),
    recommendations: asStrings(raw.recommendations, 5),
  };
}
