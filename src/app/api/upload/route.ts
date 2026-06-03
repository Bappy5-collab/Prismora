import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";

const BUCKET = "public-images";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

// POST /api/upload — multipart/form-data: file, kind ('logo'|'avatar'), workspaceId?
// Uploads an image to the public bucket and returns its public URL. The caller
// then persists the URL (workspaces.logo_url / profiles.avatar_url).
//   - kind=avatar  → only the signed-in user; path avatars/{userId}/...
//   - kind=logo    → a workspace member; path logos/{workspaceId}/...
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  const workspaceId = String(form.get("workspaceId") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 5 MB." }, { status: 400 });
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only PNG, JPEG, WEBP or GIF images." }, { status: 400 });
  }

  let folder: string;
  if (kind === "avatar") {
    folder = `avatars/${user.id}`;
  } else if (kind === "logo") {
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required for logos." }, { status: 400 });
    }
    const { data: isMember } = await supabase.rpc("is_workspace_member", { ws_id: workspaceId });
    if (!isMember) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    folder = `logos/${workspaceId}`;
  } else {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const admin = createSupabaseAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const up = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
