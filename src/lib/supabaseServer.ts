import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client bound to the request cookies.
 * Use inside Server Components, Route Handlers and Server Actions.
 * Respects RLS because it carries the user's session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Most common cause: the dev server was started before .env(.local) was
    // created/edited. Env files are only read at startup — restart `npm run dev`.
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
        "If they are set in your .env file, restart the dev server so Next.js reloads them."
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` is called from a Server Component where cookies are
            // read-only. Safe to ignore — middleware refreshes the session.
          }
        },
      },
  });
}

/**
 * Privileged client using the service-role key. BYPASSES RLS.
 * SERVER ONLY. Use sparingly — e.g. resolving invites across tenants.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
