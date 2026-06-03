import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabaseServer";

const BUCKET = "task-attachments";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

// Authorise the caller for a workspace using their session (RLS-backed RPC).
async function assertMember(workspaceId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized.", status: 401 as const, user: null };
  const { data: isMember } = await supabase.rpc("is_workspace_member", {
    ws_id: workspaceId,
  });
  if (!isMember) return { error: "Forbidden.", status: 403 as const, user: null };
  return { error: null, status: 200 as const, user };
}

// POST — upload a file to a task. multipart/form-data: file, workspaceId, taskId
export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const workspaceId = String(form.get("workspaceId") ?? "");
  const taskId = String(form.get("taskId") ?? "");

  if (!(file instanceof File) || !workspaceId || !taskId) {
    return NextResponse.json({ error: "file, workspaceId and taskId are required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB." }, { status: 400 });
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }

  const auth = await assertMember(workspaceId);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdminClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${workspaceId}/${taskId}/${crypto.randomUUID()}-${safeName}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const up = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (up.error) {
    return NextResponse.json({ error: up.error.message }, { status: 500 });
  }

  const { data, error } = await admin
    .from("file_attachments")
    .insert({
      workspace_id: workspaceId,
      task_id: taskId,
      uploaded_by: auth.user!.id,
      name: file.name,
      path,
      mime_type: file.type || null,
      size: file.size,
    })
    .select("*")
    .single();
  if (error) {
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

// GET ?id= — return a short-lived signed URL for downloading.
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("file_attachments")
    .select("workspace_id, path")
    .eq("id", id)
    .single();
  if (error || !row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const auth = await assertMember(row.workspace_id);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const signed = await admin.storage.from(BUCKET).createSignedUrl(row.path, 60);
  if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 500 });
  return NextResponse.json({ url: signed.data.signedUrl });
}

// DELETE ?id= — remove the object and its metadata row.
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("file_attachments")
    .select("workspace_id, path")
    .eq("id", id)
    .single();
  if (error || !row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const auth = await assertMember(row.workspace_id);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  await admin.storage.from(BUCKET).remove([row.path]);
  await admin.from("file_attachments").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
