import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

// Standalone authed route (outside the app shell) for first-run onboarding.
// New users are routed here by the app layout; once onboarded they're bounced
// straight to the dashboard.
export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarded")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded) redirect("/dashboard");

  return <OnboardingWizard initialName={profile?.full_name ?? ""} />;
}
