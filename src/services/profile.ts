import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { Profile } from "@/lib/database.types";

export async function fetchMyProfile(): Promise<Profile | null> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(
  patch: Partial<Pick<Profile, "full_name" | "avatar_url">>
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) throw error;
}

/**
 * Mark onboarding complete and fire the branded welcome email (best-effort).
 * Called once at the end of the onboarding wizard.
 */
export async function completeOnboarding(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded: true })
    .eq("id", user.id);
  if (error) throw error;

  void fetch("/api/email/onboarding-complete", { method: "POST" }).catch(() => {});
}

/** Change the signed-in user's password via Supabase Auth. */
export async function changePassword(newPassword: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;

  // Best-effort security notification email.
  void fetch("/api/email/password-changed", { method: "POST" }).catch(() => {});
}
