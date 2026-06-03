// Uploads an image to the public bucket via the server route and returns its
// public URL. Used for workspace logos and user avatars.
export async function uploadImage(input: {
  file: File;
  kind: "logo" | "avatar";
  workspaceId?: string;
}): Promise<string> {
  const form = new FormData();
  form.append("file", input.file);
  form.append("kind", input.kind);
  if (input.workspaceId) form.append("workspaceId", input.workspaceId);

  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Upload failed.");
  return json.url as string;
}
