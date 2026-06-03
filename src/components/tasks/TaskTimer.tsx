"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import PlayIcon from "@mui/icons-material/PlayArrowRounded";
import StopIcon from "@mui/icons-material/StopRounded";
import { useActiveTimer, useStartTimer, useStopTimer, useTaskTime } from "@/hooks/useTime";
import { formatDuration } from "@/lib/utils";

// Per-task time tracking. One running timer per user at a time.
export function TaskTimer({ taskId, workspaceId }: { taskId: string; workspaceId: string }) {
  const { data: active } = useActiveTimer();
  const { data: totalSeconds } = useTaskTime(taskId);
  const start = useStartTimer();
  const stop = useStopTimer();

  const runningHere = active?.task_id === taskId ? active : null;
  const runningElsewhere = active && active.task_id !== taskId;

  // Live elapsed counter for the running timer.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!runningHere) return;
    const startMs = new Date(runningHere.started_at).getTime();
    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - startMs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [runningHere]);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1.5,
        p: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
      }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          TIME TRACKED
        </Typography>
        <Typography variant="body1" fontWeight={600}>
          {formatDuration((totalSeconds ?? 0) + (runningHere ? elapsed : 0))}
        </Typography>
      </Box>
      {runningHere ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="primary.main" fontWeight={600}>
            {formatDuration(elapsed)}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<StopIcon />}
            onClick={() => stop.mutate(runningHere.id)}
            disabled={stop.isPending}
          >
            Stop
          </Button>
        </Stack>
      ) : (
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayIcon />}
          onClick={() => start.mutate({ workspaceId, taskId })}
          disabled={start.isPending}
        >
          {runningElsewhere ? "Switch timer here" : "Start timer"}
        </Button>
      )}
    </Box>
  );
}
