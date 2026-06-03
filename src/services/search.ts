import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";

// Global search across the ACTIVE workspace only. Supports two modes:
//  1. Plain text → ilike match on names/titles.
//  2. Smart queries → natural-language intents like "my overdue tasks",
//     "important pending work", "high priority", "in progress".
// RLS already restricts to the user's workspaces; the explicit workspace_id
// filter scopes to the active tenant.
export interface SearchResults {
  projects: { id: string; name: string }[];
  tasks: { id: string; title: string; project_id: string }[];
  members: { id: string; name: string; email: string }[];
  smart?: string; // human-readable description of an interpreted smart query
}

interface Intent {
  mine?: boolean;
  overdue?: boolean;
  status?: TaskStatus;
  priority?: TaskPriority;
}

// Parse a query into a structured intent. Returns null if it's just plain text.
function parseIntent(q: string): { intent: Intent; label: string } | null {
  const s = q.toLowerCase();
  const intent: Intent = {};
  const parts: string[] = [];

  if (/\bmy\b|assigned to me|mine\b/.test(s)) {
    intent.mine = true;
    parts.push("assigned to me");
  }
  if (/overdue|late|past due/.test(s)) {
    intent.overdue = true;
    parts.push("overdue");
  }
  if (/important|urgent|high priority|high\b/.test(s)) {
    intent.priority = "high";
    parts.push("high priority");
  }
  if (/in progress|doing|ongoing/.test(s)) {
    intent.status = "in_progress";
    parts.push("in progress");
  } else if (/pending|todo|to do|to-do|not started/.test(s)) {
    intent.status = "todo";
    parts.push("pending");
  } else if (/completed|finished|\bdone\b/.test(s)) {
    intent.status = "done";
    parts.push("completed");
  }

  if (Object.keys(intent).length === 0) return null;
  return { intent, label: parts.join(" · ") };
}

export async function globalSearch(
  workspaceId: string,
  query: string
): Promise<SearchResults> {
  const supabase = getSupabaseBrowserClient();
  const q = query.trim();
  if (!q) return { projects: [], tasks: [], members: [] };

  const smart = parseIntent(q);

  // ── Smart query: filter tasks structurally ──────────────────────
  if (smart) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, project_id, status, priority, assignee_id, due_date")
      .eq("workspace_id", workspaceId);
    if (error) throw error;

    const now = Date.now();
    const tasks = (data ?? [])
      .filter((t) => {
        if (smart.intent.mine && t.assignee_id !== user?.id) return false;
        if (smart.intent.status && t.status !== smart.intent.status) return false;
        if (smart.intent.priority && t.priority !== smart.intent.priority) return false;
        if (smart.intent.overdue) {
          if (t.status === "done" || !t.due_date || new Date(t.due_date).getTime() >= now)
            return false;
        }
        return true;
      })
      .slice(0, 12)
      .map((t) => ({ id: t.id, title: t.title, project_id: t.project_id }));

    return { projects: [], tasks, members: [], smart: smart.label };
  }

  // ── Plain text search ───────────────────────────────────────────
  const like = `%${q}%`;
  const [projects, tasks, members] = await Promise.all([
    supabase.from("projects").select("id, name").eq("workspace_id", workspaceId).ilike("name", like).limit(5),
    supabase
      .from("tasks")
      .select("id, title, project_id")
      .eq("workspace_id", workspaceId)
      .ilike("title", like)
      .limit(8),
    supabase
      .from("workspace_members")
      .select("id, invited_email, profile:profiles(id, full_name, email)")
      .eq("workspace_id", workspaceId)
      .limit(20),
  ]);

  if (projects.error) throw projects.error;
  if (tasks.error) throw tasks.error;
  if (members.error) throw members.error;

  const memberMatches = (members.data ?? [])
    .map((m) => {
      const profile = m.profile as unknown as
        | { id: string; full_name: string | null; email: string }
        | null;
      const name = profile?.full_name || profile?.email || m.invited_email;
      const email = profile?.email || m.invited_email;
      return { id: profile?.id ?? m.id, name, email };
    })
    .filter(
      (m) =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.email.toLowerCase().includes(q.toLowerCase())
    )
    .slice(0, 5);

  return { projects: projects.data ?? [], tasks: tasks.data ?? [], members: memberMatches };
}
