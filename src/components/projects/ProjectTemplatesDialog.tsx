"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { useTemplates, useCreateFromTemplate } from "@/hooks/useTemplates";
import { BUILT_IN_TEMPLATES } from "@/services/templates";
import type { ProjectTemplateTask } from "@/lib/database.types";

interface PickableTemplate {
  id: string;
  name: string;
  description: string | null;
  tasks: ProjectTemplateTask[];
}

export function ProjectTemplatesDialog({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string | null;
}) {
  const router = useRouter();
  const { data: saved } = useTemplates(workspaceId);
  const create = useCreateFromTemplate(workspaceId);

  const [selected, setSelected] = useState<PickableTemplate | null>(null);
  const [name, setName] = useState("");

  const templates: PickableTemplate[] = [
    ...BUILT_IN_TEMPLATES,
    ...((saved ?? []) as unknown as PickableTemplate[]),
  ];

  function pick(t: PickableTemplate) {
    setSelected(t);
    setName(t.name);
  }

  function reset() {
    setSelected(null);
    setName("");
    create.reset();
  }

  async function handleCreate() {
    if (!selected || !name.trim()) return;
    const projectId = await create.mutateAsync({
      name: name.trim(),
      description: selected.description ?? undefined,
      tasks: selected.tasks,
    });
    reset();
    onClose();
    router.push(`/projects/${projectId}`);
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>New project from template</DialogTitle>
      <DialogContent>
        {!selected ? (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {templates.map((t) => (
              <Box
                key={t.id}
                onClick={() => pick(t)}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  p: 2,
                  cursor: "pointer",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {t.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t.description || "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.tasks.length} starter task{t.tasks.length === 1 ? "" : "s"}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            {create.isError && <Alert severity="error">{(create.error as Error).message}</Alert>}
            <TextField
              label="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
            />
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                STARTER TASKS
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {selected.tasks.map((t, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" variant="outlined" label={t.priority} />
                    <Typography variant="body2">{t.title}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {selected && (
          <Button color="inherit" onClick={() => setSelected(null)}>
            Back
          </Button>
        )}
        <Button
          color="inherit"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Cancel
        </Button>
        {selected && (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!name.trim() || create.isPending}
          >
            {create.isPending ? "Creating…" : "Create project"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
