import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import { confirmEmail, sendMail, SITE_URL } from "@/lib/email";

// POST /api/auth/signup  { fullName, email, password }
//
// Custom email + password signup. Instead of supabase.auth.signUp (which would
// send Supabase's own confirmation email), we generate a signup link via the
// admin API and email our own branded "Confirm your account" message. The user
// is created but unconfirmed until they click the link (-> /api/auth/confirm).
export async function POST(request: NextRequest) {
  let body: { fullName?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Creates the (unconfirmed) user and returns a one-time confirmation token.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    const already = /already|registered|exists/i.test(error.message);
    return NextResponse.json(
      {
        error: already
          ? "An account with this email already exists. Try signing in instead."
          : error.message,
      },
      { status: already ? 409 : 500 }
    );
  }

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) {
    return NextResponse.json({ error: "Could not start signup. Please try again." }, { status: 500 });
  }

  // Point the confirmation link at our own confirm route. Always use the
  // canonical SITE_URL (not the request origin) so the link works no matter
  // where the recipient opens the email — e.g. signing up locally must still
  // produce a clickable production link.
  const confirmUrl =
    `${SITE_URL}/api/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}` +
    `&type=signup&redirectTo=${encodeURIComponent("/dashboard")}`;

  const { subject, html } = confirmEmail({
    name: fullName || email.split("@")[0],
    confirmUrl,
  });
  const result = await sendMail({ to: email, subject, html });

  // If SMTP isn't configured the email is skipped — surface that clearly so the
  // user isn't left waiting for a mail that will never arrive.
  if (result.skipped) {
    return NextResponse.json({
      ok: true,
      emailSent: false,
      message:
        "Account created, but confirmation email could not be sent (email is not configured). Contact the administrator.",
    });
  }
  if (!result.sent) {
    return NextResponse.json(
      { error: result.error ?? "Could not send the confirmation email." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, emailSent: true });
}
