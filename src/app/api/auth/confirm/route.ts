import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { getBaseUrl } from "@/lib/oauth";
import { welcomeEmail, sendMail } from "@/lib/email";

// GET /api/auth/confirm?token_hash=...&type=signup&redirectTo=/dashboard
//
// Target of the link in our custom confirmation email. Verifies the one-time
// token, which confirms the email AND establishes a session, then sends the
// branded welcome email and drops the user into the app (which routes first-run
// users through onboarding).
export async function GET(request: NextRequest) {
  const base = getBaseUrl(request);
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "signup") as EmailOtpType;
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const fail = (message: string) =>
    NextResponse.redirect(`${base}/login?error=${encodeURIComponent(message)}`);

  if (!tokenHash) return fail("Invalid or missing confirmation link.");

  const cookieStore = await cookies();
  const response = NextResponse.redirect(`${base}${redirectTo}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    return fail("This confirmation link is invalid or has expired. Please sign up again.");
  }

  const user = data.user;
  if (user?.email) {
    const admin = createSupabaseAdminClient();
    const email = user.email.toLowerCase();

    // Best-effort: link any pending workspace invites for this email.
    await admin
      .from("workspace_members")
      .update({ user_id: user.id, status: "accepted" })
      .eq("invited_email", email)
      .neq("status", "accepted")
      .then(() => {}, () => {});

    // Branded welcome email now that the account is active.
    const name =
      (user.user_metadata?.full_name as string | undefined)?.trim() || email.split("@")[0];
    const { subject, html } = welcomeEmail({ name, appUrl: `${base}/dashboard` });
    await sendMail({ to: email, subject, html }).catch(() => {});
  }

  return response;
}
