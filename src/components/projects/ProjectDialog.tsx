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
import Alert from "@mui/material/Alert";
import { useCreateProject, useUpdateProject } from "@/hooks/useProjects";
import type { Project, ProjectStatus } from "@/lib/database.types";

// Single dialog for both create and edit. Pass `initial` to edit.
export function ProjectDialog({
  open,
  onClose,
  workspaceId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
  initial?: Project | null;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");

  const createProject = useCreateProject(workspaceId);
  const updateProject = useUpdateProject(workspaceId);
  const pending = createProject.isPending || updateProject.isPending;
  const error = (createProject.error || updateProject.error) as Error | null;

  useEffect(() => {
    if (!open) return;
    createProject.reset();
    updateProject.reset();
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setStatus(initial?.status ?? "active");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) return;
    if (isEdit && initial) {
      await updateProject.mutateAsync({
        projectId: initial.id,
        patch: { name: name.trim(), description: description.trim() || null, status },
      });
    } else {
      await createProject.mutateAsync({ name, description, status });
    }
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit project" : "Create project"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error.message}</Alert>}
          <TextField
            autoFocus
            label="Project name"
            placeholder="Website redesign"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            fullWidth
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="on_hold">On Hold</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim() || pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create project"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
