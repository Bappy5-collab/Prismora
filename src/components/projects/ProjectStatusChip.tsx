"use client";

import Chip from "@mui/material/Chip";
import type { ProjectStatus } from "@/lib/database.types";
import { PROJECT_STATUS_LABELS } from "@/lib/utils";

const COLOR: Record<ProjectStatus, "primary" | "warning" | "success" | "default"> = {
  active: "primary",
  on_hold: "warning",
  completed: "success",
  archived: "default",
};

export function ProjectStatusChip({ status }: { status: ProjectStatus }) {
  return (
    <Chip
      size="small"
      variant={status === "archived" ? "outlined" : "filled"}
      color={COLOR[status]}
      label={PROJECT_STATUS_LABELS[status]}
    />
  );
}
