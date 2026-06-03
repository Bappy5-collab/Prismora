import { NextResponse } from "next/server";
import {
  extractTasksFromNotes,
  generateAutopilot,
  generateDailyPlan,
  generateDocumentation,
  generatePredictions,
  generateProductivityCoach,
  generateProjectFromGoal,
  generateProjectPlan,
  generateStandupSummary,
  generateTaskBreakdown,
  parseVoiceTask,
} from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const HANDLERS: Record<string, (input: string) => Promise<unknown>> = {
  breakdown: generateTaskBreakdown,
  plan: generateProjectPlan,
  generate_project: generateProjectFromGoal,
  daily_plan: generateDailyPlan,
  standup: generateStandupSummary,
  extract_tasks: extractTasksFromNotes,
  autopilot: generateAutopilot,
  coach: generateProductivityCoach,
  documentation: generateDocumentation,
  voice_task: parseVoiceTask,
  predictions: generatePredictions,
};

// POST /api/ai
// Body: { action?: "breakdown" | "plan", input: string }
//   - "breakdown" (default) → { subtasks, priority, estimatedTime }
//   - "plan"                → { summary, phases: [{ name, durationEstimate, tasks }] }
//
// Auth-gated so only signed-in users spend AI credits. The OpenAI key stays on
// the server; clients call this via the useAi hooks.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { action?: string; input?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // `description` kept for backwards-compatibility with the original endpoint.
  const input = (body.input ?? body.description ?? "").trim();
  const action = body.action ?? "breakdown";
  if (!input) {
    return NextResponse.json({ error: "input is required." }, { status: 400 });
  }

  const handler = HANDLERS[action] ?? HANDLERS.breakdown;

  try {
    return NextResponse.json(await handler(input));
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed.";
    const status = message.includes("OPENAI_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
