import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { createProject } from "./projects";
import { createTask } from "./tasks";
import type { ProjectTemplate, ProjectTemplateTask } from "@/lib/database.types";

// Built-in templates ship in code (no DB rows needed). They appear alongside
// any workspace-defined templates.
export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  tasks: ProjectTemplateTask[];
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "builtin-saas",
    name: "SaaS Project",
    description: "Standard plan for shipping a SaaS product.",
    tasks: [
      { title: "Define product scope & MVP", priority: "high" },
      { title: "Set up auth & multi-tenant database", priority: "high" },
      { title: "Build core dashboard", priority: "medium" },
      { title: "Integrate billing", priority: "medium" },
      { title: "Write onboarding flow", priority: "medium" },
      { title: "Launch landing page", priority: "low" },
    ],
  },
  {
    id: "builtin-ecommerce",
    name: "E-commerce",
    description: "Build an online store end to end.",
    tasks: [
      { title: "Set up product catalog", priority: "high" },
      { title: "Implement cart & checkout", priority: "high" },
      { title: "Integrate payment gateway", priority: "high" },
      { title: "Configure shipping & tax", priority: "medium" },
      { title: "Add order management", priority: "medium" },
      { title: "Launch marketing storefront", priority: "low" },
    ],
  },
  {
    id: "builtin-marketing",
    name: "Marketing Campaign",
    description: "Plan and run a marketing campaign.",
    tasks: [
      { title: "Define campaign goals & KPIs", priority: "high" },
      { title: "Audience research", priority: "medium" },
      { title: "Create content calendar", priority: "medium" },
      { title: "Design creatives", priority: "medium" },
      { title: "Schedule & publish posts", priority: "low" },
      { title: "Measure & report results", priority: "low" },
    ],
  },
];

export async function fetchTemplates(workspaceId: string): Promise<ProjectTemplate[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("project_templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ProjectTemplate[];
}

export async function saveTemplate(input: {
  workspaceId: string;
  name: string;
  description?: string;
  tasks: ProjectTemplateTask[];
}): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  const { error } = await supabase.from("project_templates").insert({
    workspace_id: input.workspaceId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    tasks: input.tasks,
    created_by: user.id,
  });
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("project_templates").delete().eq("id", id);
  if (error) throw error;
}

// Create a project from a template: makes the project, then seeds its tasks.
export async function createProjectFromTemplate(input: {
  workspaceId: string;
  name: string;
  description?: string;
  tasks: ProjectTemplateTask[];
}): Promise<string> {
  const project = await createProject({
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description,
  });
  for (const t of input.tasks) {
    await createTask({
      workspaceId: input.workspaceId,
      projectId: project.id,
      title: t.title,
      priority: t.priority,
    });
  }
  return project.id;
}
