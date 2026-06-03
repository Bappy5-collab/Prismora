"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { StatusChip } from "./TaskChips";
import {
  useAddDependency,
  useDependencies,
  useRemoveDependency,
} from "@/hooks/useDependencies";
import { useWorkspaceTasks } from "@/hooks/useTasks";

// "This task is blocked by …" — manage prerequisite tasks. A task can't be
// marked done until all its blockers are done (enforced in the task service).
export function TaskDependencies({
  taskId,
  workspaceId,
}: {
  taskId: string;
  workspaceId: string;
}) {
  const { data: blockers } = useDependencies(taskId);
  const { data: allTasks } = useWorkspaceTasks(workspaceId);
  const add = useAddDependency(taskId, workspaceId);
  const remove = useRemoveDependency(taskId, workspaceId);
  const [picked, setPicked] = useState<{ id: string; title: string } | null>(null);

  const existingIds = new Set((blockers ?? []).map((b) => b.taskId));
  const options = (allTasks ?? [])
    .filter((t) => t.id !== taskId && !existingIds.has(t.id))
    .map((t) => ({ id: t.id, title: t.title }));

  const incomplete = (blockers ?? []).filter((b) => b.status !== "done");

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        BLOCKED BY (DEPENDENCIES)
      </Typography>

      {incomplete.length > 0 && (
        <Alert severity="warning" sx={{ my: 1, py: 0 }}>
          Can&apos;t be completed until {incomplete.length} blocker
          {incomplete.length > 1 ? "s are" : " is"} done.
        </Alert>
      )}

      <Stack spacing={1} sx={{ mt: 1 }}>
        {(blockers ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No dependencies.
          </Typography>
        ) : (
          (blockers ?? []).map((b) => (
            <Stack key={b.dependencyId} direction="row" spacing={1} alignItems="center">
              <StatusChip status={b.status} />
              <Typography variant="body2" sx={{ flex: 1 }} noWrap>
                {b.title}
              </Typography>
              <IconButton size="small" onClick={() => remove.mutate(b.dependencyId)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))
        )}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
        <Autocomplete
          size="small"
          sx={{ flex: 1 }}
          options={options}
          value={picked}
          getOptionLabel={(o) => o.title}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          onChange={async (_e, value) => {
            if (value) {
              await add.mutateAsync(value.id);
              setPicked(null);
            }
          }}
          renderInput={(params) => <TextField {...params} placeholder="Add a blocking task…" />}
        />
      </Stack>
      {add.isError && (
        <Typography variant="caption" color="error">
          {(add.error as Error).message}
        </Typography>
      )}
      {(blockers ?? []).length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} flexWrap="wrap">
          <Chip
            size="small"
            variant="outlined"
            color={incomplete.length > 0 ? "warning" : "success"}
            label={incomplete.length > 0 ? "Blocked" : "Unblocked"}
          />
        </Stack>
      )}
    </Box>
  );
}
