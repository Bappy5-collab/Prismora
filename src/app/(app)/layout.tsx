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

  return <AppShell>{children}</AppShell>;
}
