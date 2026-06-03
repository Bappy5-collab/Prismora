import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { notifyWorkspaceMembers } from "./notifications";
import { logActivity } from "./activity";
import { logAudit } from "./audit";
import type { Project, ProjectStatus } from "@/lib/database.types";

export async function fetchProjects(workspaceId: string): Promise<Project[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProject(projectId: string): Promise<Project> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function createProject(input: {
  workspaceId: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
}): Promise<Project> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "active",
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;

  // "Project created" notification to the rest of the workspace.
  await notifyWorkspaceMembers({
    workspaceId: input.workspaceId,
    exceptUserId: user.id,
    title: "Project created",
    body: `New project "${data.name}" was created.`,
  }).catch(() => {});

  await logActivity({
    workspaceId: input.workspaceId,
    action: "project_created",
    summary: `created project "${data.name}"`,
    entityType: "project",
    entityId: data.id,
  });
  return data;
}

export type UpdateProjectInput = Partial<
  Pick<Project, "name" | "description" | "status">
>;

export async function updateProject(
  projectId: string,
  patch: UpdateProjectInput
): Promise<Project> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id, name")
    .eq("id", projectId)
    .maybeSingle();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
  if (project) {
    await logAudit({
      workspaceId: project.workspace_id,
      action: "project.deleted",
      entityType: "project",
      entityId: projectId,
      metadata: { name: project.name },
    });
  }
}
