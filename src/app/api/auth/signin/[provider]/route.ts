import { NextResponse, type NextRequest } from "next/server";
import { buildAuthorizeUrl, getBaseUrl, getCredentials, isOAuthProvider } from "@/lib/oauth";

// GET /api/auth/signin/:provider  — starts the custom OAuth flow.
//
// Generates a CSRF `state`, stores it (plus where to land afterwards) in
// short-lived httpOnly cookies, then redirects the browser to the provider's
// consent screen. The provider sends the user back to
// /api/auth/callback/:provider.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const base = getBaseUrl(request);
  const { searchParams } = new URL(request.url);

  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent("Unknown sign-in provider.")}`);
  }

  try {
    getCredentials(provider); // throws if env vars are missing
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OAuth is not configured.";
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(msg)}`);
  }

  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const redirectUri = `${base}/api/auth/callback/${provider}`;
  const state = crypto.randomUUID();

  const response = NextResponse.redirect(buildAuthorizeUrl(provider, redirectUri, state));
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: base.startsWith("https://"),
    path: "/",
    maxAge: 600, // 10 minutes to complete the consent flow
  };
  response.cookies.set("oauth_state", state, cookieOpts);
  response.cookies.set("oauth_redirect", redirectTo, cookieOpts);
  return response;
}
