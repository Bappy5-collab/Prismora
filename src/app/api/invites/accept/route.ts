import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";

// POST /api/invites/accept
//
// Claims any pending workspace invitations that match the signed-in user's
// email. Invites are created as rows in `workspace_members` with status
// 'pending' and a null user_id (the invitee may not have an account yet). When
// that person signs up / logs in, this endpoint links the rows to their user id
// and flips them to 'accepted', so they join every workspace they were invited
// to. Runs with the service role because a pending invite is not yet visible to
// the user under RLS (they aren't a member). Returns the number claimed.
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const email = user.email.toLowerCase();

  // Make sure a profile row exists (defensive; the signup trigger normally does this).
  await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email,
        full_name: (user.user_metadata?.full_name as string) ?? null,
      },
      { onConflict: "id" }
    );

  const { data, error } = await admin
    .from("workspace_members")
    .update({ user_id: user.id, status: "accepted" })
    .eq("invited_email", email)
    .neq("status", "accepted")
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ claimed: data?.length ?? 0 });
}
