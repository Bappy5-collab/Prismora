"use client";

import { useMemo } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAiCoach, useAiPredictions } from "@/hooks/useAi";
import { useWorkspaceTasks } from "@/hooks/useTasks";
import { useBlockedTaskIds } from "@/hooks/useDependencies";
import { useAuth } from "@/hooks/useAuth";

function bullets(items: string[]) {
  return (
    <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
      {items.map((t, i) => (
        <Typography key={i} component="li" variant="body2">
          {t}
        </Typography>
      ))}
    </Stack>
  );
}

/** AI Productivity Coach — scores the current user's week and suggests improvements. */
export function CoachPanel({ workspaceId }: { workspaceId: string }) {
  const { user } = useAuth();
  const { data: tasks } = useWorkspaceTasks(workspaceId);
  const coach = useAiCoach();

  const snapshot = useMemo(() => {
    const mine = (tasks ?? []).filter((t) => t.assignee_id === user?.id);
    const now = Date.now();
    return JSON.stringify({
      assignedToMe: mine.length,
      completed: mine.filter((t) => t.status === "done").length,
      inProgress: mine.filter((t) => t.status === "in_progress").length,
      overdue: mine.filter(
        (t) => t.status !== "done" && t.due_date && new Date(t.due_date).getTime() < now
      ).length,
      tasks: mine.slice(0, 40).map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.due_date,
      })),
    });
  }, [tasks, user?.id]);

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">Productivity coach</Typography>
        <Button
          size="small"
          startIcon={coach.isPending ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
          onClick={() => coach.mutate(snapshot)}
          disabled={coach.isPending}
        >
          {coach.isPending ? "…" : "Generate"}
        </Button>
      </Stack>
      {coach.isError ? (
        <Alert severity="error">{(coach.error as Error).message}</Alert>
      ) : coach.data ? (
        <Stack spacing={1.5}>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              SCORE
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 700 }}>{coach.data.score}</Typography>
            <LinearProgress
              variant="determinate"
              value={coach.data.score}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
          <Typography variant="body2">{coach.data.summary}</Typography>
          {coach.data.strengths.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                STRENGTHS
              </Typography>
              {bullets(coach.data.strengths)}
            </Box>
          )}
          {coach.data.improvements.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                IMPROVE
              </Typography>
              {bullets(coach.data.improvements)}
            </Box>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Generate an AI review of your week.
        </Typography>
      )}
    </Paper>
  );
}

/** Predictive analytics — delay risk, overload, success probability. */
export function PredictionsPanel({ workspaceId }: { workspaceId: string }) {
  const { data: tasks } = useWorkspaceTasks(workspaceId);
  const { data: blocked } = useBlockedTaskIds(workspaceId);
  const predict = useAiPredictions();

  const snapshot = useMemo(() => {
    const now = Date.now();
    return JSON.stringify({
      tasks: (tasks ?? []).slice(0, 80).map((t) => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee?.full_name || t.assignee?.email || "unassigned",
        dueDate: t.due_date,
        overdue: !!t.due_date && t.status !== "done" && new Date(t.due_date).getTime() < now,
        blocked: blocked?.has(t.id) ?? false,
      })),
    });
  }, [tasks, blocked]);

  const riskColor =
    predict.data?.delayRisk === "high"
      ? "error"
      : predict.data?.delayRisk === "medium"
        ? "warning"
        : "success";

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="h5">Predictive analytics</Typography>
        <Button
          size="small"
          startIcon={predict.isPending ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />}
          onClick={() => predict.mutate(snapshot)}
          disabled={predict.isPending || !tasks || tasks.length === 0}
        >
          {predict.isPending ? "…" : "Predict"}
        </Button>
      </Stack>
      {predict.isError ? (
        <Alert severity="error">{(predict.error as Error).message}</Alert>
      ) : predict.data ? (
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip size="small" color={riskColor} label={`${predict.data.delayRisk} delay risk`} />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Success probability
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {predict.data.successProbability}%
              </Typography>
            </Box>
          </Stack>
          {predict.data.overloadedMembers.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                OVERLOADED
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                {predict.data.overloadedMembers.map((m, i) => (
                  <Chip key={i} size="small" variant="outlined" label={m} />
                ))}
              </Stack>
            </Box>
          )}
          {predict.data.risks.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                RISKS
              </Typography>
              {bullets(predict.data.risks)}
            </Box>
          )}
          {predict.data.recommendations.length > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                RECOMMENDATIONS
              </Typography>
              {bullets(predict.data.recommendations)}
            </Box>
          )}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Predict delays, overload and success probability.
        </Typography>
      )}
    </Paper>
  );
}
