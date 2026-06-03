import type { MemberRole } from "./database.types";

// RBAC 2.0 — permission matrix. Mirrors the DB-level enforcement
// (has_workspace_write): Viewers are read-only; managers can run projects but
// not manage members/billing; admins/owners manage everything.
export type Permission =
  | "create_project"
  | "edit_project"
  | "delete_project"
  | "create_task"
  | "edit_task"
  | "delete_task"
  | "invite_member"
  | "manage_members" // change roles / remove
  | "view_analytics"
  | "view_audit"
  | "manage_billing"
  | "manage_workspace";

const OWNER_ADMIN: Permission[] = [
  "create_project",
  "edit_project",
  "delete_project",
  "create_task",
  "edit_task",
  "delete_task",
  "invite_member",
  "manage_members",
  "view_analytics",
  "view_audit",
  "manage_billing",
  "manage_workspace",
];

export const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: OWNER_ADMIN,
  admin: OWNER_ADMIN,
  manager: [
    "create_project",
    "edit_project",
    "create_task",
    "edit_task",
    "delete_task",
    "invite_member",
    "view_analytics",
  ],
  member: ["create_project", "create_task", "edit_task", "view_analytics"],
  viewer: ["view_analytics"], // read-only
};

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  viewer: "Viewer",
};

// Roles an admin can assign (owner is transfer-only, handled separately).
export const ASSIGNABLE_ROLES: MemberRole[] = ["admin", "manager", "member", "viewer"];

export function can(role: MemberRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
