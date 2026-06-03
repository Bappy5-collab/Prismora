"use client";

import { useMemo } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAiAutopilot } from "@/hooks/useAi";
import { useWorkspaceTasks } from "@/hooks/useTasks";
import { useBlockedTaskIds } from "@/hooks/useDependencies";
import { createNotification } from "@/services/notifications";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { PRIORITY_LABELS } from "@/lib/utils";

// AI Autopilot: builds a compact snapshot of the workspace's tasks and asks the
// AI to analyse status, detect stuck work, suggest next actions + priority
// changes, and emit smart alerts (which can be pushed to notifications).
export function AutopilotPanel({ workspaceId }: { workspaceId: string }) {
  const { data: tasks } = useWorkspaceTasks(workspaceId);
  const { data: blocked } = useBlockedTaskIds(workspaceId);
  const autopilot = useAiAutopilot();

  const snapshot = useMemo(() => {
    const now = Date.now();
    const rows = (tasks ?? []).slice(0, 80).map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assignee?.full_name || t.assignee?.email || "unassigned",
      dueDate: t.due_date,
      overdue: !!t.due_date && t.status !== "done" && new Date(t.due_date).getTime() < now,
      blocked: blocked?.has(t.id) ?? false,
    }));
    return JSON.stringify({ taskCount: rows.length, tasks: rows });
  }, [tasks, blocked]);

  async function pushAlerts() {
    if (!autopilot.data) return;
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    for (const alert of autopilot.data.alerts) {
      await createNotification({
        workspaceId,
        userId: user.id,
        title: "Autopilot",
        body: alert,
      }).catch(() => {});
    }
  }

  const healthColor =
    autopilot.data?.health === "blocked"
      ? "error"
      : autopilot.data?.health === "at_risk"
        ? "warning"
        : "success";

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="h4">AI Autopilot</Typography>
          <Typography variant="body2" color="text.secondary">
            Analyse status, detect stuck tasks, and get next actions.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={
            autopilot.isPending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon fontSize="small" />
          }
          onClick={() => autopilot.mutate(snapshot)}
          disabled={autopilot.isPending || !tasks || tasks.length === 0}
        >
          {autopilot.isPending ? "Analyzing…" : "Run autopilot"}
        </Button>
      </Stack>

      {!tasks || tasks.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Add some tasks first, then run autopilot.
        </Typography>
      ) : autopilot.isError ? (
        <Alert severity="error">{(autopilot.error as Error).message}</Alert>
      ) : autopilot.data ? (
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip
              size="small"
              color={healthColor}
              label={autopilot.data.health.replace("_", " ")}
            />
            <Typography variant="body2">{autopilot.data.summary}</Typography>
          </Stack>

          {autopilot.data.alerts.length > 0 && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  SMART ALERTS
                </Typography>
                <Button size="small" onClick={pushAlerts}>
                  Send to notifications
                </Button>
              </Stack>
              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {autopilot.data.alerts.map((a, i) => (
                  <Alert key={i} severity="info" sx={{ py: 0 }}>
                    {a}
                  </Alert>
                ))}
              </Stack>
            </Box>
          )}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                STUCK TASKS
              </Typography>
              {autopilot.data.stuckTasks.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  None detected.
                </Typography>
              ) : (
                <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
                  {autopilot.data.stuckTasks.map((t, i) => (
                    <Typography key={i} component="li" variant="body2">
                      {t}
                    </Typography>
                  ))}
                </Stack>
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                NEXT ACTIONS
              </Typography>
              <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
                {autopilot.data.nextActions.map((a, i) => (
                  <Typography key={i} component="li" variant="body2">
                    {a}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Box>

          {autopilot.data.priorityChanges.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                SUGGESTED PRIORITY CHANGES
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                {autopilot.data.priorityChanges.map((p, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" variant="outlined" label={PRIORITY_LABELS[p.suggestedPriority]} />
                    <Typography variant="body2" fontWeight={600}>
                      {p.task}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      — {p.reason}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Run autopilot to get an AI analysis of this workspace.
        </Typography>
      )}
    </Paper>
  );
}
