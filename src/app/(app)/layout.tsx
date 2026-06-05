import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { AppShell } from "@/components/layout/AppShell";

// Server-side guard for the whole authenticated area. Middleware also guards,
// but this is a defense-in-depth check that runs before any page renders.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // First-run gate: route users who haven't finished onboarding to the wizard.
  // Existing users were marked onboarded by migration 0009, so they pass through.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .maybeSingle();
  if (profile && profile.onboarded === false) redirect("/onboarding");

  return <AppShell>{children}</AppShell>;
}
