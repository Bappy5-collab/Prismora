"use client";

import { useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useProjects } from "@/hooks/useProjects";
import { useWorkspaceMembers } from "@/hooks/useWorkspaces";
import { useLabels, useWorkspaceLabelLinks } from "@/hooks/useLabels";
import { useBlockedTaskIds } from "@/hooks/useDependencies";
import { useRealtimeWorkspaceTasks } from "@/hooks/useRealtime";
import { useCan } from "@/hooks/useRole";
import {
  useCreateTask,
  useDeleteTask,
  useUpdateTask,
  useWorkspaceTasks,
} from "@/hooks/useTasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskDialog, type TaskFormValues } from "@/components/tasks/TaskDialog";
import type { TaskStatus, TaskPriority } from "@/lib/database.types";
import type { TaskWithContext } from "@/services/tasks";

type StatusFilter = "all" | TaskStatus;
type PriorityFilter = "all" | TaskPriority;

export default function TasksPage() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: tasks, isLoading } = useWorkspaceTasks(activeId);
  const { data: projects } = useProjects(activeId);
  const { data: members } = useWorkspaceMembers(activeId);
  const { data: labels } = useLabels(activeId);
  const { data: labelLinks } = useWorkspaceLabelLinks(activeId);
  const { data: blockedIds } = useBlockedTaskIds(activeId);
  const canCreateTask = useCan("create_task");
  // Instant project sync — live task updates with no reload.
  useRealtimeWorkspaceTasks(activeId);

  const createTask = useCreateTask("");
  const updateTask = useUpdateTask("");
  const deleteTask = useDeleteTask("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithContext | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [priority, setPriority] = useState<PriorityFilter>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");

  // taskId -> [label names] for chips, and taskId -> Set(labelId) for filtering.
  const { labelsByTask, labelIdsByTask } = useMemo(() => {
    const names: Record<string, string[]> = {};
    const ids: Record<string, Set<string>> = {};
    for (const link of labelLinks ?? []) {
      (names[link.task_id] ??= []).push(link.label.name);
      (ids[link.task_id] ??= new Set()).add(link.label.id);
    }
    return { labelsByTask: names, labelIdsByTask: ids };
  }, [labelLinks]);

  const filtered = useMemo(() => {
    let list = tasks ?? [];
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (priority !== "all") list = list.filter((t) => t.priority === priority);
    if (labelFilter !== "all")
      list = list.filter((t) => labelIdsByTask[t.id]?.has(labelFilter));
    return list;
  }, [tasks, status, priority, labelFilter, labelIdsByTask]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: TaskFormValues) {
    if (!activeId) return;
    const dueIso = values.dueDate ? new Date(values.dueDate).toISOString() : null;
    if (editing) {
      await updateTask.mutateAsync({
        taskId: editing.id,
        patch: {
          title: values.title,
          description: values.description || null,
          status: values.status,
          priority: values.priority,
          assignee_id: values.assigneeId,
          estimated_time: values.estimatedTime || null,
          due_date: dueIso,
        },
      });
    } else {
      await createTask.mutateAsync({
        workspaceId: activeId,
        projectId: values.projectId,
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId,
        estimatedTime: values.estimatedTime || null,
        dueDate: dueIso,
      });
    }
    setDialogOpen(false);
  }

  async function handleDelete(task: TaskWithContext) {
    if (confirm(`Delete task "${task.title}"?`)) {
      await deleteTask.mutateAsync(task.id);
    }
  }

  const newButton = canCreateTask ? (
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={openCreate}
      disabled={!projects || projects.length === 0}
    >
      New task
    </Button>
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Every task across this workspace."
        action={newButton}
      />

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2 }}
        alignItems={{ sm: "center" }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={status}
          onChange={(_, v) => v && setStatus(v)}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="todo">Todo</ToggleButton>
          <ToggleButton value="in_progress">In Progress</ToggleButton>
          <ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          select
          size="small"
          label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as PriorityFilter)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All priorities</MenuItem>
          <MenuItem value="low">Low</MenuItem>
          <MenuItem value="medium">Medium</MenuItem>
          <MenuItem value="high">High</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Label"
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All labels</MenuItem>
          {(labels ?? []).map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? (
        <Skeleton variant="rounded" height={240} />
      ) : filtered.length > 0 ? (
        <TaskTable
          tasks={filtered}
          showProject
          labelsByTask={labelsByTask}
          blockedIds={blockedIds}
          onEdit={(t) => {
            setEditing(t as TaskWithContext);
            setDialogOpen(true);
          }}
          onDelete={(t) => handleDelete(t as TaskWithContext)}
        />
      ) : (
        <EmptyState
          title={tasks && tasks.length > 0 ? "No tasks match these filters" : "No tasks yet"}
          description={
            !projects || projects.length === 0
              ? "Create a project first, then add tasks to it."
              : tasks && tasks.length > 0
                ? "Try different filters."
                : "Create your first task for this workspace."
          }
          action={projects && projects.length > 0 ? newButton : undefined}
        />
      )}

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        members={members ?? []}
        initial={editing}
        workspaceId={activeId}
        projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))}
        submitting={createTask.isPending || updateTask.isPending}
      />
    </>
  );
}
