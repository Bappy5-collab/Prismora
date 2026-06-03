"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useWorkspaceTasks } from "@/hooks/useTasks";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { PriorityChip, StatusChip } from "@/components/tasks/TaskChips";
import type { TaskWithContext } from "@/services/tasks";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: tasks, isLoading } = useWorkspaceTasks(activeId);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(ymd(today));

  // Group tasks (with a due date) by yyyy-mm-dd.
  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskWithContext[]>();
    for (const t of tasks ?? []) {
      if (!t.due_date) continue;
      const key = ymd(new Date(t.due_date));
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const overdue = useMemo(
    () =>
      (tasks ?? []).filter(
        (t) => t.due_date && t.status !== "done" && new Date(t.due_date) < today
      ),
    [tasks, today]
  );

  const upcoming = useMemo(() => {
    const in7 = new Date(today);
    in7.setDate(in7.getDate() + 7);
    return (tasks ?? []).filter((t) => {
      if (!t.due_date || t.status === "done") return false;
      const d = new Date(t.due_date);
      return d >= today && d <= in7;
    });
  }, [tasks, today]);

  // Build the 6-week grid for the current month.
  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(start.getDate() - first.getDay()); // back to Sunday
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const selectedTasks = tasksByDay.get(selected) ?? [];
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Calendar" subtitle="Task deadlines across this workspace." />

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <StatCard label="Overdue" value={overdue.length} loading={isLoading} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <StatCard label="Due in next 7 days" value={upcoming.length} loading={isLoading} />
        </Box>
      </Stack>

      {isLoading ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
          {/* Month grid */}
          <Paper variant="outlined" sx={{ p: 2, flex: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="h4">{monthLabel}</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Button
                  size="small"
                  onClick={() => {
                    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelected(ymd(today));
                  }}
                >
                  Today
                </Button>
                <IconButton
                  size="small"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0.5 }}>
              {WEEKDAYS.map((w) => (
                <Typography
                  key={w}
                  variant="caption"
                  align="center"
                  sx={{ color: "text.secondary", fontWeight: 700, py: 0.5 }}
                >
                  {w}
                </Typography>
              ))}

              {cells.map((d) => {
                const key = ymd(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = key === ymd(today);
                const isSelected = key === selected;
                const dayTasks = tasksByDay.get(key) ?? [];
                const hasOverdue = dayTasks.some(
                  (t) => t.status !== "done" && new Date(t.due_date!) < today
                );
                return (
                  <Box
                    key={key}
                    onClick={() => setSelected(key)}
                    sx={{
                      cursor: "pointer",
                      minHeight: 56,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "rgba(37,99,235,0.06)" : "background.paper",
                      opacity: inMonth ? 1 : 0.4,
                      p: 0.75,
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: isToday ? 700 : 500,
                          color: isToday ? "primary.main" : "text.primary",
                        }}
                      >
                        {d.getDate()}
                      </Typography>
                      {dayTasks.length > 0 && (
                        <Box
                          sx={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#fff",
                            bgcolor: hasOverdue ? "error.main" : "primary.main",
                            borderRadius: 999,
                            minWidth: 16,
                            height: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            px: 0.5,
                          }}
                        >
                          {dayTasks.length}
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          {/* Selected-day tasks */}
          <Paper variant="outlined" sx={{ p: 2, flex: 1, minWidth: { md: 280 } }}>
            <Typography variant="h5" sx={{ mb: 1.5 }}>
              {new Date(selected + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </Typography>
            {selectedTasks.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No tasks due on this day.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {selectedTasks.map((t) => (
                  <Box key={t.id} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {t.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.project?.name ?? "—"}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                      <StatusChip status={t.status} />
                      <PriorityChip priority={t.priority} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Stack>
      )}
    </>
  );
}
