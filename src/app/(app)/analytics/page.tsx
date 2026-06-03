"use client";

import Grid from "@mui/material/Grid2";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useWeeklyReport } from "@/hooks/useTime";
import { useRealtimeWorkspaceTasks } from "@/hooks/useRealtime";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { AutopilotPanel } from "@/components/analytics/AutopilotPanel";
import { CoachPanel, PredictionsPanel } from "@/components/analytics/AiInsightPanels";
import { formatDuration } from "@/lib/utils";

const LOAD_COLOR = {
  overloaded: "error",
  balanced: "primary",
  underloaded: "default",
} as const;

export default function AnalyticsPage() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: a, isLoading } = useAnalytics(activeId);
  const { data: weekly } = useWeeklyReport(activeId);
  // Live-sync metrics as tasks change anywhere.
  useRealtimeWorkspaceTasks(activeId);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Advanced insights for this workspace." />

      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Completion rate" value={`${a?.completionRate ?? 0}%`} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Productivity score" value={a?.productivityScore ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Active tasks" value={a?.activeTasks ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Overdue" value={a?.overdueCount ?? 0} loading={isLoading} />
        </Grid>
      </Grid>

      {/* AI Autopilot */}
      <Box sx={{ mt: 3 }}>{activeId && <AutopilotPanel workspaceId={activeId} />}</Box>

      {/* AI Productivity Coach + Predictive Analytics */}
      {activeId && (
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <CoachPanel workspaceId={activeId} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <PredictionsPanel workspaceId={activeId} />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2} sx={{ mt: 0 }}>
        {/* Project progress */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="h5" sx={{ mb: 1.5 }}>
              Project progress
            </Typography>
            {isLoading ? (
              <Skeleton height={120} />
            ) : (a?.projectProgress ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No projects yet.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {a!.projectProgress.map((p) => (
                  <Box key={p.id}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                        {p.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {p.done}/{p.total} · {p.pct}%
                      </Typography>
                    </Stack>
                    <LinearProgress variant="determinate" value={p.pct} sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Workload distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="h5" sx={{ mb: 1.5 }}>
              Workload distribution
            </Typography>
            {isLoading ? (
              <Skeleton height={120} />
            ) : (a?.workload ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No members yet.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {a!.workload.map((w, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                      {w.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {w.active} active
                      </Typography>
                      <Chip size="small" variant="outlined" color={LOAD_COLOR[w.load]} label={w.load} />
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Weekly time report */}
        <Grid size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="h5" sx={{ mb: 1.5 }}>
              Weekly time report
            </Typography>
            {(weekly ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No time tracked in the last 7 days. Start a timer on a task to begin.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {(weekly ?? []).map((r) => (
                  <Stack key={r.userId} direction="row" justifyContent="space-between">
                    <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                      {r.name}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {formatDuration(r.seconds)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
