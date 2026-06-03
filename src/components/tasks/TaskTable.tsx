"use client";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { StatusChip, PriorityChip } from "./TaskChips";
import { formatDate } from "@/lib/utils";
import type { TaskWithAssignee } from "@/lib/database.types";

// Accepts the per-project shape, optionally enriched with a project label.
type Row = TaskWithAssignee & { project?: { id: string; name: string } | null };

export function TaskTable({
  tasks,
  onEdit,
  onDelete,
  showProject = false,
  labelsByTask,
  blockedIds,
}: {
  tasks: Row[];
  onEdit: (task: Row) => void;
  onDelete: (task: Row) => void;
  showProject?: boolean;
  labelsByTask?: Record<string, string[]>;
  blockedIds?: Set<string>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table sx={{ minWidth: showProject ? 880 : 760 }}>
        <TableHead>
          <TableRow>
            <TableCell>Task</TableCell>
            {showProject && <TableCell>Project</TableCell>}
            <TableCell>Status</TableCell>
            <TableCell>Priority</TableCell>
            <TableCell>Assignee</TableCell>
            <TableCell>Due</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.map((task) => {
            const overdue =
              task.due_date && task.status !== "done" && new Date(task.due_date) < today;
            return (
              <TableRow key={task.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {task.title}
                  </Typography>
                  {task.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {task.description}
                    </Typography>
                  )}
                  {labelsByTask?.[task.id]?.length ? (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                      {labelsByTask[task.id].map((name) => (
                        <Chip key={name} size="small" variant="outlined" label={name} />
                      ))}
                    </Box>
                  ) : null}
                </TableCell>
                {showProject && (
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {task.project?.name ?? "—"}
                    </Typography>
                  </TableCell>
                )}
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <StatusChip status={task.status} />
                    {blockedIds?.has(task.id) && task.status !== "done" && (
                      <Chip size="small" variant="outlined" color="warning" label="Blocked" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <PriorityChip priority={task.priority} />
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color={task.assignee ? "text.primary" : "text.secondary"}
                  >
                    {task.assignee?.full_name || task.assignee?.email || "Unassigned"}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color={overdue ? "error.main" : "text.secondary"}
                    fontWeight={overdue ? 700 : 400}
                  >
                    {task.due_date ? formatDate(task.due_date) : "—"}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(task)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete(task)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
