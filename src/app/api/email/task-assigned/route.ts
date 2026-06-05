import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";
import { taskAssignedEmail, sendMail, SITE_URL } from "@/lib/email";

// POST /api/email/task-assigned  { taskId }
// Emails the task's current assignee. All data is looked up server-side from
// the taskId (never trusted from the client). Skips self-assignment.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { taskId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const taskId = body.taskId?.trim();
  if (!taskId) return NextResponse.json({ error: "taskId is required." }, { status: 400 });

  const admin = createSupabaseAdminClient();

  const { data: task } = await admin
    .from("tasks")
    .select("title, project_id, workspace_id, assignee_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  // Caller must belong to the task's workspace.
  const { data: membership } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", task.workspace_id)
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace." }, { status: 403 });
  }

  // No assignee, or assigned to self → nothing to send.
  if (!task.assignee_id || task.assignee_id === user.id) {
    return NextResponse.json({ sent: false, skipped: true });
  }

  const [{ data: assignee }, { data: project }, { data: workspace }] = await Promise.all([
    admin.from("profiles").select("email, full_name").eq("id", task.assignee_id).maybeSingle(),
    admin.from("projects").select("name").eq("id", task.project_id).maybeSingle(),
    admin.from("workspaces").select("name").eq("id", task.workspace_id).maybeSingle(),
  ]);
  if (!assignee?.email) {
    return NextResponse.json({ sent: false, skipped: true });
  }

  const { subject, html } = taskAssignedEmail({
    assigneeName: assignee.full_name || assignee.email.split("@")[0],
    taskTitle: task.title,
    projectName: project?.name || "a project",
    workspaceName: workspace?.name || "your workspace",
    taskUrl: `${SITE_URL}/tasks`,
  });

  const result = await sendMail({ to: assignee.email, subject, html });
  return NextResponse.json(result);
}
