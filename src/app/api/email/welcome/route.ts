import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";
import { welcomeEmail, sendMail, SITE_URL } from "@/lib/email";

// POST /api/email/welcome
// Sends the branded welcome email to the signed-in user. Called once when
// onboarding completes, so it naturally fires a single time per account.
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

  const name = profile?.full_name || (profile?.email ?? user.email).split("@")[0];
  const { subject, html } = welcomeEmail({ name, appUrl: `${SITE_URL}/dashboard` });

  const result = await sendMail({ to: profile?.email ?? user.email, subject, html });
  return NextResponse.json(result);
}
