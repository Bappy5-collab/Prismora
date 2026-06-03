"use client";

import { useQuery } from "@tanstack/react-query";
import Grid from "@mui/material/Grid2";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { useState } from "react";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { fetchDashboardStats } from "@/services/stats";
import { useAnalytics } from "@/hooks/useAnalytics";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateWorkspaceDialog } from "@/components/workspace/CreateWorkspaceDialog";

export default function DashboardPage() {
  const { data: workspaces } = useWorkspaces();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", activeId],
    queryFn: () => fetchDashboardStats(activeId!),
    enabled: !!activeId,
  });

  const { data: analytics } = useAnalytics(activeId);

  if (workspaces && workspaces.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <EmptyState
          title="Create your first workspace"
          description="Workspaces keep your projects, tasks and team isolated. Create one to get started."
          action={
            <Button variant="contained" onClick={() => setCreateOpen(true)}>
              Create workspace
            </Button>
          }
        />
        <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle="An overview of your active workspace." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard label="Total Projects" value={stats?.projects ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard label="Total Tasks" value={stats?.tasks ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard
            label="Completed Tasks"
            value={stats?.completedTasks ?? 0}
            loading={isLoading}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 6 }}>
          <StatCard label="Pending Tasks" value={stats?.pendingTasks ?? 0} loading={isLoading} />
        </Grid>
        <Grid size={{ xs: 6, md: 6 }}>
          <StatCard label="Team Members" value={stats?.members ?? 0} loading={isLoading} />
        </Grid>
      </Grid>

      {/* Analytics ------------------------------------------------------ */}
      <Typography variant="h3" sx={{ mt: 4, mb: 2 }}>
        Analytics
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Task completion rate
            </Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 700, mt: 0.5 }}>
              {analytics?.completionRate ?? 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={analytics?.completionRate ?? 0}
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {analytics?.completedTasks ?? 0} of {analytics?.totalTasks ?? 0} tasks done
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              Active vs completed
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Active</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {analytics?.activeTasks ?? 0}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Completed</Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {analytics?.completedTasks ?? 0}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Todo
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics?.byStatus.todo ?? 0}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    In progress
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {analytics?.byStatus.in_progress ?? 0}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
              Team activity
            </Typography>
            {(analytics?.teamActivity ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No members yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {(analytics?.teamActivity ?? []).map((m, i) => (
                  <Stack key={i} direction="row" justifyContent="space-between">
                    <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                      {m.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {m.done}/{m.total}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1.5 }}>
              Project progress
            </Typography>
            {(analytics?.projectProgress ?? []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No projects yet.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {(analytics?.projectProgress ?? []).map((p) => (
                  <Box key={p.id}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 300 }}>
                        {p.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {p.done}/{p.total} · {p.pct}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={p.pct}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
