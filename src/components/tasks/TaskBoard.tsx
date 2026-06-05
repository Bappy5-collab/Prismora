"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { PriorityChip } from "./TaskChips";
import { useCommentCounts } from "@/hooks/useComments";
import { formatDate } from "@/lib/utils";
import type { TaskStatus, TaskWithAssignee } from "@/lib/database.types";

// Column definitions. The accent color drives the header dot, the count chip
// and the drop highlight so each lane reads at a glance.
const COLUMNS: {
  status: TaskStatus;
  title: string;
  accent: string;
}[] = [
  { status: "todo", title: "To do", accent: "#94a3b8" },
  { status: "in_progress", title: "In progress", accent: "#3b82f6" },
  { status: "done", title: "Done", accent: "#22c55e" },
];

export function TaskBoard({
  tasks,
  projectId,
  onMove,
  onEdit,
  onDelete,
}: {
  tasks: TaskWithAssignee[];
  projectId: string;
  onMove: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: TaskWithAssignee) => void;
  onDelete: (task: TaskWithAssignee) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);

  // Stable #number per task: oldest task is #1. `tasks` arrives newest-first, so
  // count from the end to keep numbers from shuffling as new tasks appear.
  const numberById = useMemo(() => {
    const map: Record<string, number> = {};
    const total = tasks.length;
    tasks.forEach((t, i) => {
      map[t.id] = total - i;
    });
    return map;
  }, [tasks]);

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const { data: commentCounts } = useCommentCounts(projectId, taskIds);

  const byStatus = useMemo(() => {
    const groups: Record<TaskStatus, TaskWithAssignee[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const t of tasks) groups[t.status].push(t);
    return groups;
  }, [tasks]);

  function handleDrop(status: TaskStatus) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== status) onMove(id, status);
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        gap: 2,
        alignItems: "start",
      }}
    >
      {COLUMNS.map((col) => {
        const items = byStatus[col.status];
        const isOver = overCol === col.status;
        return (
          <Paper
            key={col.status}
            variant="outlined"
            onDragOver={(e) => {
              e.preventDefault();
              if (overCol !== col.status) setOverCol(col.status);
            }}
            onDragLeave={(e) => {
              // Only clear when the pointer actually leaves the column box.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setOverCol((c) => (c === col.status ? null : c));
              }
            }}
            onDrop={() => handleDrop(col.status)}
            sx={{
              p: 1.5,
              borderRadius: 3,
              bgcolor: isOver ? "action.hover" : "grey.50",
              borderColor: isOver ? col.accent : "divider",
              borderStyle: isOver ? "dashed" : "solid",
              transition: "background-color .15s, border-color .15s",
              minHeight: 120,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ px: 0.5, mb: 1.5 }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: col.accent,
                }}
              />
              <Typography variant="subtitle2" fontWeight={700}>
                {col.title}
              </Typography>
              <Chip
                label={items.length}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: "background.paper",
                }}
              />
            </Stack>

            <Stack spacing={1.25}>
              {items.map((task) => (
                <BoardCard
                  key={task.id}
                  task={task}
                  number={numberById[task.id]}
                  comments={commentCounts?.[task.id] ?? 0}
                  dragging={dragId === task.id}
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                  onEdit={() => onEdit(task)}
                  onDelete={() => onDelete(task)}
                />
              ))}
              {items.length === 0 && (
                <Box
                  sx={{
                    py: 3,
                    textAlign: "center",
                    color: "text.disabled",
                    fontSize: 13,
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  Drop tasks here
                </Box>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}

function BoardCard({
  task,
  number,
  comments,
  dragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
}: {
  task: TaskWithAssignee;
  number: number;
  comments: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue =
    task.due_date && task.status !== "done" && new Date(task.due_date) < today;
  const assigneeName = task.assignee?.full_name || task.assignee?.email || "";

  return (
    <Paper
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        cursor: "grab",
        bgcolor: "background.paper",
        opacity: dragging ? 0.4 : 1,
        boxShadow: dragging
          ? "none"
          : "0 1px 2px rgba(16,24,40,.06)",
        transition: "box-shadow .15s, transform .15s, opacity .15s",
        "&:hover": {
          boxShadow: "0 6px 16px rgba(16,24,40,.12)",
          transform: "translateY(-1px)",
          borderColor: "grey.300",
        },
        "& .card-actions": { opacity: 0 },
        "&:hover .card-actions": { opacity: 1 },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: "text.secondary", fontFamily: "monospace" }}
        >
          #{number}
        </Typography>
        <PriorityChip priority={task.priority} />
        <Box sx={{ flex: 1 }} />
        <Box className="card-actions" sx={{ transition: "opacity .15s", whiteSpace: "nowrap" }}>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Stack>

      <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.35 }}>
        {task.title}
      </Typography>
      {task.description && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 0.5,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {task.description}
        </Typography>
      )}

      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ mt: 1.25, color: "text.secondary" }}
      >
        {assigneeName ? (
          <Tooltip title={assigneeName}>
            <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: "secondary.main" }}>
              {assigneeName.charAt(0).toUpperCase()}
            </Avatar>
          </Tooltip>
        ) : (
          <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: "grey.300" }}>?</Avatar>
        )}

        {task.due_date && (
          <Typography
            variant="caption"
            sx={{ color: overdue ? "error.main" : "text.secondary", fontWeight: overdue ? 700 : 400 }}
          >
            {formatDate(task.due_date)}
          </Typography>
        )}

        <Box sx={{ flex: 1 }} />

        <Tooltip title={`${comments} comment${comments === 1 ? "" : "s"}`}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption" fontWeight={600}>
              {comments}
            </Typography>
          </Stack>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
