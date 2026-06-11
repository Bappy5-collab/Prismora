import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";
import { slugify } from "@/lib/utils";
import { workspaceCreatedEmail, sendMail, SITE_URL } from "@/lib/email";

// POST /api/workspaces  { name: string }
//
// Creating a workspace (a tenant) is a privileged operation, so we perform it
// server-side with the service-role client. We still authenticate the caller
// via their session cookie and force owner_id = the logged-in user, so this is
// secure: a user can only ever create a workspace owned by themselves.
//
// This also sidesteps environments where the `workspaces` INSERT RLS policy is
// missing/misapplied — the service role bypasses RLS, the DB trigger still adds
// the creator as an `owner` member.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }
  if (name.length > 80) {
    return NextResponse.json({ error: "Workspace name is too long." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .insert({ name, slug: slugify(name), owner_id: user.id })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort confirmation email to the owner. Never block workspace creation.
  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const to = profile?.email ?? user.email;
    if (to) {
      const { subject, html } = workspaceCreatedEmail({
        name: profile?.full_name || to.split("@")[0],
        workspaceName: data.name,
        appUrl: `${SITE_URL}/dashboard`,
      });
      await sendMail({ to, subject, html });
    }
  } catch {
    /* ignore — the workspace was created successfully */
  }

  return NextResponse.json(data, { status: 201 });
}
