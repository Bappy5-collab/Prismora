import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";
import { passwordChangedEmail, sendMail, SITE_URL } from "@/lib/email";

// POST /api/email/password-changed
// Security notification sent after the signed-in user changes their password.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const to = profile?.email ?? user.email;
  const name = profile?.full_name || to.split("@")[0];
  const { subject, html } = passwordChangedEmail({ name, appUrl: `${SITE_URL}/settings` });

  const result = await sendMail({ to, subject, html });
  return NextResponse.json(result);
}
