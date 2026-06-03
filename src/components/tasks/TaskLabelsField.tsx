"use client";

import { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Typography from "@mui/material/Typography";
import {
  useCreateLabel,
  useLabels,
  useSetTaskLabels,
  useTaskLabelIds,
} from "@/hooks/useLabels";

// Edit-mode label assignment. Persists immediately on change (decoupled from
// the task form submit). Labels render as neutral outlined chips to respect the
// strict two-color system.
export function TaskLabelsField({
  taskId,
  workspaceId,
}: {
  taskId: string;
  workspaceId: string;
}) {
  const { data: labels } = useLabels(workspaceId);
  const { data: assignedIds } = useTaskLabelIds(taskId);
  const setLabels = useSetTaskLabels(workspaceId);
  const createLabel = useCreateLabel(workspaceId);

  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (assignedIds) setSelected(assignedIds);
  }, [assignedIds]);

  const options = labels ?? [];
  const valueObjects = options.filter((l) => selected.includes(l.id));

  async function commit(ids: string[]) {
    setSelected(ids);
    await setLabels.mutateAsync({ taskId, labelIds: ids });
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        LABELS
      </Typography>
      <Autocomplete
        multiple
        size="small"
        options={options}
        value={valueObjects}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        onChange={async (_e, value) => {
          await commit(value.map((v) => v.id));
        }}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              size="small"
              variant="outlined"
              label={option.name}
              {...getTagProps({ index })}
              key={option.id}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Add labels…"
            onKeyDown={async (e) => {
              const input = (e.target as HTMLInputElement).value.trim();
              if (e.key === "Enter" && input && !options.some((o) => o.name === input)) {
                e.preventDefault();
                const created = await createLabel.mutateAsync(input);
                await commit([...selected, created.id]);
              }
            }}
          />
        )}
        sx={{ mt: 0.5 }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Type a new label and press Enter to create it.
        </Typography>
      </Stack>
    </Box>
  );
}
