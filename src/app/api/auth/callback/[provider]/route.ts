import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabaseServer";
import {
  exchangeCodeForToken,
  fetchProfile,
  getBaseUrl,
  isOAuthProvider,
  type OAuthProfile,
} from "@/lib/oauth";

// GET /api/auth/callback/:provider  — completes the custom OAuth flow.
//
// 1. Verify the CSRF state matches the cookie we set when starting.
// 2. Exchange the code for an access token and load the provider profile.
// 3. Find-or-create the matching Supabase auth user (service role).
// 4. Mint a real Supabase session for them and set the session cookies.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const base = getBaseUrl(request);
  const { searchParams } = new URL(request.url);

  const fail = (message: string) =>
    NextResponse.redirect(`${base}/login?error=${encodeURIComponent(message)}`);

  if (!isOAuthProvider(provider)) return fail("Unknown sign-in provider.");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("oauth_state")?.value;
  const redirectTo = cookieStore.get("oauth_redirect")?.value || "/dashboard";

  // The user denied consent, or the provider returned an error.
  const providerError = searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return fail(providerError);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || !savedState || state !== savedState) {
    return fail("Sign-in could not be verified. Please try again.");
  }

  try {
    const redirectUri = `${base}/api/auth/callback/${provider}`;
    const accessToken = await exchangeCodeForToken(provider, code, redirectUri);
    const profile = await fetchProfile(provider, accessToken);

    const admin = createSupabaseAdminClient();
    const userId = await findOrCreateUser(profile);

    // Mint a session: generate a one-time magic-link token for this user, then
    // verify it through a cookie-bound server client so the session is written
    // onto our redirect response.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      throw linkError ?? new Error("Could not start a session for this account.");
    }

    const response = NextResponse.redirect(`${base}${redirectTo}`);
    response.cookies.delete("oauth_state");
    response.cookies.delete("oauth_redirect");

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

    // The OTP `type` for a magic-link token is "magiclink" on most versions but
    // "email" on others — try the matching one first, then fall back.
    let verifyError = (
      await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" })
    ).error;
    if (verifyError) {
      verifyError = (
        await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" })
      ).error;
    }
    if (verifyError) throw verifyError;

    // Best-effort: link any pending workspace invites to this user (mirrors the
    // /api/invites/accept behaviour after a password login).
    await admin
      .from("workspace_members")
      .update({ user_id: userId, status: "accepted" })
      .eq("invited_email", profile.email.toLowerCase())
      .neq("status", "accepted");

    return response;
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Sign-in failed. Please try again.");
  }
}

/**
 * Returns the Supabase auth user id for this email, creating the user (with a
 * confirmed email) if they don't exist yet. The `handle_new_user` trigger
 * populates the matching `profiles` row from `full_name`.
 */
async function findOrCreateUser(profile: OAuthProfile): Promise<string> {
  const admin = createSupabaseAdminClient();
  const email = profile.email;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: profile.fullName ?? "",
      avatar_url: profile.avatarUrl ?? "",
    },
  });

  if (!error && created?.user) {
    if (profile.avatarUrl) {
      await admin
        .from("profiles")
        .update({ avatar_url: profile.avatarUrl })
        .eq("id", created.user.id);
    }
    return created.user.id;
  }

  // The user already exists — look them up by email.
  for (let page = 1; page <= 50; page++) {
    const { data: list, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listError) throw listError;
    const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (list.users.length < 200) break;
  }

  throw new Error("Could not locate the account after sign-in.");
}
