"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { useCreateWorkspace } from "@/hooks/useWorkspaces";

export function CreateWorkspaceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const createWorkspace = useCreateWorkspace();

  function handleClose() {
    setName("");
    createWorkspace.reset();
    onClose();
  }

  async function handleCreate() {
    if (!name.trim()) return;
    await createWorkspace.mutateAsync(name);
    handleClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Create workspace</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {createWorkspace.isError && (
            <Alert severity="error">
              {(createWorkspace.error as Error).message}
            </Alert>
          )}
          <TextField
            autoFocus
            label="Workspace name"
            placeholder="Acme Inc."
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleCreate}
          disabled={!name.trim() || createWorkspace.isPending}
        >
          {createWorkspace.isPending ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
