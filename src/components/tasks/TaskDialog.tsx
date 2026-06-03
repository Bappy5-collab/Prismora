"use client";

import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAiBreakdown } from "@/hooks/useAi";
import { TaskComments } from "./TaskComments";
import { TaskAttachments } from "./TaskAttachments";
import { TaskLabelsField } from "./TaskLabelsField";
import { TaskTimer } from "./TaskTimer";
import { TaskDependencies } from "./TaskDependencies";
import type {
  TaskPriority,
  TaskStatus,
  TaskWithAssignee,
  WorkspaceMemberWithProfile,
} from "@/lib/database.types";

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  estimatedTime: string;
  dueDate: string; // yyyy-mm-dd or ""
  projectId: string;
}

const EMPTY: TaskFormValues = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  assigneeId: null,
  estimatedTime: "",
  dueDate: "",
  projectId: "",
};

// Convert an ISO timestamp to the yyyy-mm-dd a <input type="date"> expects.
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function TaskDialog({
  open,
  onClose,
  onSubmit,
  members,
  initial,
  submitting,
  projects,
  defaultProjectId,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues) => Promise<void> | void;
  members: WorkspaceMemberWithProfile[];
  initial?: (TaskWithAssignee & { project_id?: string }) | null;
  submitting?: boolean;
  // When provided, a Project selector is shown (used by the workspace Tasks page).
  projects?: { id: string; name: string }[];
  defaultProjectId?: string;
  // Enables labels/comments/attachments (task detail) when editing.
  workspaceId?: string | null;
}) {
  const [values, setValues] = useState<TaskFormValues>(EMPTY);
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [tab, setTab] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const ai = useAiBreakdown();

  const isEdit = !!initial;

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setSubmitError(null);
    setSuggestedSubtasks([]);
    ai.reset();
    setValues(
      initial
        ? {
            title: initial.title,
            description: initial.description ?? "",
            status: initial.status,
            priority: initial.priority,
            assigneeId: initial.assignee_id,
            estimatedTime: initial.estimated_time ?? "",
            dueDate: toDateInput(initial.due_date),
            projectId: initial.project_id ?? defaultProjectId ?? "",
          }
        : { ...EMPTY, projectId: defaultProjectId ?? "" }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultProjectId]);

  function set<K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleAi() {
    const source = values.description.trim() || values.title.trim();
    if (!source) return;
    const result = await ai.mutateAsync(source);
    // Apply AI suggestions: priority + estimate auto-fill; subtasks offered.
    setValues((v) => ({
      ...v,
      priority: result.priority,
      estimatedTime: result.estimatedTime || v.estimatedTime,
    }));
    setSuggestedSubtasks(result.subtasks);
  }

  function appendSubtasksToDescription() {
    if (suggestedSubtasks.length === 0) return;
    const bullets = suggestedSubtasks.map((s) => `- ${s}`).join("\n");
    setValues((v) => ({
      ...v,
      description: v.description.trim()
        ? `${v.description.trim()}\n\nSubtasks:\n${bullets}`
        : `Subtasks:\n${bullets}`,
    }));
    setSuggestedSubtasks([]);
  }

  const needsProject = !!projects && !isEdit;
  const canSubmit = !!values.title.trim() && (!needsProject || !!values.projectId);

  // Labels/comments/attachments need a workspace id and an existing task.
  const collabWorkspaceId = workspaceId ?? initial?.workspace_id ?? null;
  const showCollab = isEdit && !!collabWorkspaceId;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      // e.g. dependency gate: "Blocked by unfinished task: …"
      setSubmitError(err instanceof Error ? err.message : "Could not save the task.");
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: showCollab ? 0 : undefined }}>
        {isEdit ? "Edit task" : "New task"}
      </DialogTitle>
      {showCollab && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 3, borderBottom: "1px solid", borderColor: "divider", minHeight: 40 }}
        >
          <Tab label="Details" sx={{ minHeight: 40 }} />
          <Tab label="Comments" sx={{ minHeight: 40 }} />
          <Tab label="Files" sx={{ minHeight: 40 }} />
        </Tabs>
      )}
      <DialogContent>
        {showCollab && tab === 1 && initial && collabWorkspaceId && (
          <Box sx={{ pt: 1 }}>
            <TaskComments
              taskId={initial.id}
              workspaceId={collabWorkspaceId}
              taskTitle={initial.title}
              taskCreatedBy={initial.created_by}
            />
          </Box>
        )}
        {showCollab && tab === 2 && initial && collabWorkspaceId && (
          <Box sx={{ pt: 1 }}>
            <TaskAttachments taskId={initial.id} workspaceId={collabWorkspaceId} />
          </Box>
        )}
        <Stack spacing={2} sx={{ pt: 1, display: tab === 0 ? "flex" : "none" }}>
          {submitError && <Alert severity="error">{submitError}</Alert>}
          {needsProject && (
            <TextField
              select
              label="Project"
              value={values.projectId}
              onChange={(e) => set("projectId", e.target.value)}
              fullWidth
              helperText={projects!.length === 0 ? "Create a project first." : undefined}
            >
              {projects!.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            autoFocus
            label="Title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            fullWidth
          />

          <Box>
            <TextField
              label="Description"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  ai.isPending ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />
                }
                onClick={handleAi}
                disabled={ai.isPending || (!values.description.trim() && !values.title.trim())}
              >
                {ai.isPending ? "Analyzing…" : "AI breakdown"}
              </Button>
              <Typography variant="caption" color="text.secondary">
                Suggest subtasks, priority & estimate
              </Typography>
            </Stack>
          </Box>

          {ai.isError && (
            <Alert severity="error">{(ai.error as Error).message}</Alert>
          )}

          {suggestedSubtasks.length > 0 && (
            <Alert
              severity="info"
              action={
                <Button color="inherit" size="small" onClick={appendSubtasksToDescription}>
                  Add to description
                </Button>
              }
            >
              <Typography variant="body2" fontWeight={600} gutterBottom>
                Suggested subtasks
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {suggestedSubtasks.map((s, i) => (
                  <Chip key={i} size="small" label={s} />
                ))}
              </Stack>
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Status"
              value={values.status}
              onChange={(e) => set("status", e.target.value as TaskStatus)}
              fullWidth
            >
              <MenuItem value="todo">Todo</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="done">Done</MenuItem>
            </TextField>
            <TextField
              select
              label="Priority"
              value={values.priority}
              onChange={(e) => set("priority", e.target.value as TaskPriority)}
              fullWidth
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Assignee"
              value={values.assigneeId ?? ""}
              onChange={(e) => set("assigneeId", e.target.value || null)}
              fullWidth
            >
              <MenuItem value="">Unassigned</MenuItem>
              {members
                .filter((m) => m.user_id)
                .map((m) => (
                  <MenuItem key={m.user_id} value={m.user_id!}>
                    {m.profile?.full_name || m.profile?.email || m.invited_email}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              label="Estimated time"
              placeholder="2h, 1d…"
              value={values.estimatedTime}
              onChange={(e) => set("estimatedTime", e.target.value)}
              fullWidth
            />
          </Stack>

          <TextField
            type="date"
            label="Due date"
            value={values.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          {showCollab && initial && collabWorkspaceId && (
            <>
              <TaskLabelsField taskId={initial.id} workspaceId={collabWorkspaceId} />
              <TaskTimer taskId={initial.id} workspaceId={collabWorkspaceId} />
              <TaskDependencies taskId={initial.id} workspaceId={collabWorkspaceId} />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {tab === 0 ? "Cancel" : "Close"}
        </Button>
        {tab === 0 && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create task"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
