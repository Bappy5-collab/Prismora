import "server-only";

// Custom server-side OAuth for Google and GitHub.
//
// Unlike Supabase's built-in `signInWithOAuth` (which reads provider config from
// the Supabase dashboard), this flow reads the client id/secret straight from the
// app's environment (.env) and performs the OAuth code exchange itself. After
// verifying the provider profile we mint a real Supabase session in the callback
// route via the admin API, so the rest of the app (middleware, RLS) keeps working.

export type OAuthProvider = "google" | "github";

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

/**
 * Resolves the app's public origin (e.g. https://prismora-nu.vercel.app or
 * http://localhost:3000). On hosted platforms like Vercel the real public host
 * arrives in `x-forwarded-host`; locally we fall back to the request origin.
 * The OAuth `redirect_uri` MUST be built from this so it matches what you
 * registered with Google/GitHub.
 */
export function getBaseUrl(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export type OAuthProfile = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

type ProviderConfig = {
  clientId: string | undefined;
  clientSecret: string | undefined;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  // Extra params appended to the authorize redirect.
  authorizeParams?: Record<string, string>;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
};

function getConfig(provider: OAuthProvider): ProviderConfig {
  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      authorizeParams: { access_type: "online", prompt: "select_account" },
      fetchProfile: fetchGoogleProfile,
    };
  }
  return {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    fetchProfile: fetchGithubProfile,
  };
}

/** Throws if the provider's credentials are missing from the environment. */
export function getCredentials(provider: OAuthProvider): { clientId: string; clientSecret: string } {
  const { clientId, clientSecret } = getConfig(provider);
  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing ${provider} OAuth credentials. Set ${provider.toUpperCase()}_CLIENT_ID and ` +
        `${provider.toUpperCase()}_CLIENT_SECRET in your .env, then restart the dev server.`
    );
  }
  return { clientId, clientSecret };
}

/** Builds the provider authorize URL the user is redirected to. */
export function buildAuthorizeUrl(
  provider: OAuthProvider,
  redirectUri: string,
  state: string
): string {
  const cfg = getConfig(provider);
  const { clientId } = getCredentials(provider);
  const url = new URL(cfg.authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", cfg.scope);
  url.searchParams.set("state", state);
  for (const [k, v] of Object.entries(cfg.authorizeParams ?? {})) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

/** Exchanges an authorization code for an access token. */
export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string,
  redirectUri: string
): Promise<string> {
  const cfg = getConfig(provider);
  const { clientId, clientSecret } = getCredentials(provider);

  const res = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "OAuth token exchange failed.");
  }
  return json.access_token;
}

/** Loads the user's profile from the provider given an access token. */
export function fetchProfile(provider: OAuthProvider, accessToken: string): Promise<OAuthProfile> {
  return getConfig(provider).fetchProfile(accessToken);
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load Google profile.");
  const j = (await res.json()) as { email?: string; name?: string; picture?: string };
  if (!j.email) throw new Error("Google account did not return an email.");
  return { email: j.email, fullName: j.name ?? null, avatarUrl: j.picture ?? null };
}

async function fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "Prismora",
  };

  const res = await fetch("https://api.github.com/user", { headers });
  if (!res.ok) throw new Error("Failed to load GitHub profile.");
  const j = (await res.json()) as {
    email?: string | null;
    name?: string | null;
    login?: string | null;
    avatar_url?: string | null;
  };

  // GitHub omits the email when it's marked private — fetch it explicitly.
  let email = j.email ?? null;
  if (!email) {
    const er = await fetch("https://api.github.com/user/emails", { headers });
    if (er.ok) {
      const emails = (await er.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const chosen = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
      email = chosen?.email ?? null;
    }
  }
  if (!email) throw new Error("No verified email found on the GitHub account.");

  return { email, fullName: j.name ?? j.login ?? null, avatarUrl: j.avatar_url ?? null };
}
