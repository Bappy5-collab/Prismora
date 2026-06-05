import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";
import { inviteEmail, sendMail, SITE_URL } from "@/lib/email";

// POST /api/email/invite  { workspaceId, email }
// Sends a branded invitation email. The membership row itself is created
// client-side (RLS-enforced); this route is a best-effort notification, so it
// re-verifies the caller is a member of the workspace before sending.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: { workspaceId?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const workspaceId = body.workspaceId?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!workspaceId || !email) {
    return NextResponse.json({ error: "workspaceId and email are required." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Verify the caller is an accepted member of the workspace.
  const { data: membership } = await admin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace." }, { status: 403 });
  }

  const [{ data: workspace }, { data: inviterProfile }] = await Promise.all([
    admin.from("workspaces").select("name").eq("id", workspaceId).maybeSingle(),
    admin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
  ]);

  const inviterName = inviterProfile?.full_name || inviterProfile?.email || "A teammate";
  const { subject, html } = inviteEmail({
    inviterName,
    workspaceName: workspace?.name || "a workspace",
    acceptUrl: `${SITE_URL}/signup`,
  });

  const result = await sendMail({ to: email, subject, html });
  return NextResponse.json(result);
}
