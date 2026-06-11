import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";
import { onboardingCompleteEmail, sendMail, SITE_URL } from "@/lib/email";

// POST /api/email/onboarding-complete
// Sends the "you're all set" email when a user finishes the onboarding wizard.
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
  const { subject, html } = onboardingCompleteEmail({ name, appUrl: `${SITE_URL}/dashboard` });

  const result = await sendMail({ to, subject, html });
  return NextResponse.json(result);
}
