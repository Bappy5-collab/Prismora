"use client";

import Chip from "@mui/material/Chip";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/utils";

// Color tokens stay within the brand: primary blue + neutral grays, plus the
// theme's semantic success/warning/error for status/priority signalling.
const STATUS_COLOR: Record<TaskStatus, "default" | "primary" | "success"> = {
  todo: "default",
  in_progress: "primary",
  done: "success",
};

const PRIORITY_COLOR: Record<TaskPriority, "default" | "warning" | "error"> = {
  low: "default",
  medium: "warning",
  high: "error",
};

export function StatusChip({ status }: { status: TaskStatus }) {
  return (
    <Chip
      size="small"
      variant={status === "todo" ? "outlined" : "filled"}
      color={STATUS_COLOR[status]}
      label={STATUS_LABELS[status]}
    />
  );
}

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={PRIORITY_COLOR[priority]}
      label={PRIORITY_LABELS[priority]}
    />
  );
}
