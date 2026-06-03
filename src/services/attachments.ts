import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { FileAttachment } from "@/lib/database.types";

export async function fetchAttachments(taskId: string): Promise<FileAttachment[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("file_attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadAttachment(input: {
  workspaceId: string;
  taskId: string;
  file: File;
}): Promise<FileAttachment> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("workspaceId", input.workspaceId);
  form.append("taskId", input.taskId);

  const res = await fetch("/api/attachments", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Upload failed.");
  return json as FileAttachment;
}

export async function getAttachmentUrl(id: string): Promise<string> {
  const res = await fetch(`/api/attachments?id=${encodeURIComponent(id)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Could not get file URL.");
  return json.url as string;
}

export async function deleteAttachment(id: string): Promise<void> {
  const res = await fetch(`/api/attachments?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? "Delete failed.");
  }
}
