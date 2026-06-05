"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Skeleton from "@mui/material/Skeleton";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AddIcon from "@mui/icons-material/Add";
import ViewKanbanIcon from "@mui/icons-material/ViewKanbanOutlined";
import TableRowsIcon from "@mui/icons-material/TableRowsOutlined";
import { useProject } from "@/hooks/useProjects";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useRealtimeTasks } from "@/hooks/useRealtime";
import { useWorkspaceMembers } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskDialog, type TaskFormValues } from "@/components/tasks/TaskDialog";
import { ProjectStatusChip } from "@/components/projects/ProjectStatusChip";
import type { TaskStatus, TaskWithAssignee } from "@/lib/database.types";

type StatusFilter = "all" | TaskStatus;

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: tasks, isLoading: tasksLoading } = useTasks(projectId);
  const { data: members } = useWorkspaceMembers(activeId);

  // Live task updates from teammates (Supabase Realtime).
  useRealtimeTasks(projectId);

  const createTask = useCreateTask(projectId);
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithAssignee | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<"board" | "table">("board");

  const filtered = useMemo(() => {
    const list = tasks ?? [];
    return filter === "all" ? list : list.filter((t) => t.status === filter);
  }, [tasks, filter]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: TaskWithAssignee) {
    setEditing(task);
    setDialogOpen(true);
  }

  async function handleSubmit(values: TaskFormValues) {
    if (!activeId) return;
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
          due_date: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        },
      });
    } else {
      await createTask.mutateAsync({
        workspaceId: activeId,
        projectId,
        title: values.title,
        description: values.description,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId,
        estimatedTime: values.estimatedTime || null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      });
    }
    setDialogOpen(false);
  }

  async function handleDelete(task: TaskWithAssignee) {
    if (confirm(`Delete task "${task.title}"?`)) {
      await deleteTask.mutateAsync(task.id);
    }
  }

  // Drag-and-drop on the board: move a card to a new status column. The update
  // service enforces the dependency gate (can't be "done" while blocked), so
  // surface that message if the move is rejected.
  async function handleMove(taskId: string, status: TaskStatus) {
    try {
      await updateTask.mutateAsync({ taskId, patch: { status } });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not move the task.");
    }
  }

  const newButton = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      New task
    </Button>
  );

  return (
    <>
      <Breadcrumbs sx={{ mb: 1 }}>
        <Link
          component="button"
          underline="hover"
          color="text.secondary"
          onClick={() => router.push("/projects")}
        >
          Projects
        </Link>
        <Typography color="text.primary">{project?.name ?? "…"}</Typography>
      </Breadcrumbs>

      {projectLoading ? (
        <Skeleton width={240} height={40} />
      ) : (
        <PageHeader
          title={project?.name ?? "Project"}
          subtitle={project?.description ?? undefined}
          action={
            <Stack direction="row" spacing={1.5} alignItems="center">
              {project && <ProjectStatusChip status={project.status} />}
              {newButton}
            </Stack>
          }
        />
      )}

      <Stack
        direction="row"
        sx={{ mb: 2 }}
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, v) => v && setFilter(v)}
          sx={{ visibility: view === "table" ? "visible" : "hidden" }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="todo">Todo</ToggleButton>
          <ToggleButton value="in_progress">In Progress</ToggleButton>
          <ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, v) => v && setView(v)}
        >
          <ToggleButton value="board">
            <ViewKanbanIcon fontSize="small" sx={{ mr: 0.5 }} />
            Board
          </ToggleButton>
          <ToggleButton value="table">
            <TableRowsIcon fontSize="small" sx={{ mr: 0.5 }} />
            Table
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {tasksLoading ? (
        <Skeleton variant="rounded" height={200} />
      ) : (tasks?.length ?? 0) > 0 && view === "board" ? (
        <TaskBoard
          tasks={tasks ?? []}
          projectId={projectId}
          onMove={handleMove}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : filtered.length > 0 ? (
        <TaskTable tasks={filtered} onEdit={openEdit} onDelete={handleDelete} />
      ) : (
        <EmptyState
          title={tasks && tasks.length > 0 ? "No tasks match this filter" : "No tasks yet"}
          description={
            tasks && tasks.length > 0
              ? "Try a different status filter."
              : "Create a task, or use AI to break work down automatically."
          }
          action={tasks && tasks.length === 0 ? newButton : undefined}
        />
      )}

      <TaskDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSubmit}
        members={members ?? []}
        initial={editing}
        workspaceId={activeId}
        submitting={createTask.isPending || updateTask.isPending}
      />
    </>
  );
}
