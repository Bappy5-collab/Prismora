import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { LandingPage } from "@/components/landing/LandingPage";

// Root: authenticated users go straight to the dashboard; everyone else sees
// the marketing landing page (which links to sign in / sign up).
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}
