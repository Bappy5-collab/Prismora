"use client";

import { useState } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  useAiBreakdown,
  useAiDailyPlan,
  useAiDocumentation,
  useAiExtractTasks,
  useAiProjectGenerator,
  useAiProjectPlan,
  useAiStandup,
} from "@/hooks/useAi";
import { PageHeader } from "@/components/ui/PageHeader";
import { VoiceToTask } from "@/components/ai/VoiceToTask";
import { PRIORITY_LABELS } from "@/lib/utils";

// Small reusable input+run block for the lighter generators.
function AiTool({
  label,
  placeholder,
  runLabel,
  pending,
  onRun,
  children,
}: {
  label: string;
  placeholder: string;
  runLabel: string;
  pending: boolean;
  onRun: (input: string) => void;
  children?: React.ReactNode;
}) {
  const [input, setInput] = useState("");
  return (
    <Stack spacing={2}>
      <TextField
        label={label}
        placeholder={placeholder}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        fullWidth
        multiline
        minRows={3}
      />
      <Box>
        <Button
          variant="contained"
          startIcon={
            pending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon fontSize="small" />
          }
          onClick={() => onRun(input)}
          disabled={!input.trim() || pending}
        >
          {pending ? "Working…" : runLabel}
        </Button>
      </Box>
      {children}
    </Stack>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h4">{title}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        {description}
      </Typography>
      {children}
    </Paper>
  );
}

export default function AssistantPage() {
  const [taskInput, setTaskInput] = useState("");
  const [planInput, setPlanInput] = useState("");
  const breakdown = useAiBreakdown();
  const plan = useAiProjectPlan();
  const generator = useAiProjectGenerator();
  const daily = useAiDailyPlan();
  const standup = useAiStandup();
  const extract = useAiExtractTasks();
  const docs = useAiDocumentation();

  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle="Turn descriptions into structured plans. Powered by OpenAI."
      />

      <Stack spacing={3}>
        {/* Voice / text → task */}
        <VoiceToTask />

        {/* Task breakdown + priority + time estimate (single call) */}
        <SectionCard
          title="Task analysis"
          description="Break a task into subtasks, recommend a priority, and estimate completion time."
        >
          <Stack spacing={2}>
            <TextField
              label="Task description"
              placeholder="e.g. Build a marketing landing page with a contact form"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
            <Box>
              <Button
                variant="contained"
                startIcon={
                  breakdown.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <AutoAwesomeIcon fontSize="small" />
                  )
                }
                onClick={() => breakdown.mutate(taskInput)}
                disabled={!taskInput.trim() || breakdown.isPending}
              >
                {breakdown.isPending ? "Analyzing…" : "Analyze task"}
              </Button>
            </Box>

            {breakdown.isError && (
              <Alert severity="error">{(breakdown.error as Error).message}</Alert>
            )}

            {breakdown.data && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      PRIORITY
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        color={
                          breakdown.data.priority === "high"
                            ? "error"
                            : breakdown.data.priority === "medium"
                              ? "warning"
                              : "default"
                        }
                        variant="outlined"
                        label={PRIORITY_LABELS[breakdown.data.priority]}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      ESTIMATED TIME
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {breakdown.data.estimatedTime}
                    </Typography>
                  </Box>
                </Stack>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    SUBTASKS
                  </Typography>
                  <Stack component="ul" sx={{ m: 0, pl: 2.5, mt: 0.5 }} spacing={0.25}>
                    {breakdown.data.subtasks.map((s, i) => (
                      <Typography key={i} component="li" variant="body2">
                        {s}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            )}
          </Stack>
        </SectionCard>

        {/* Project planning */}
        <SectionCard
          title="Project planning"
          description="Generate a phased execution plan for a project goal."
        >
          <Stack spacing={2}>
            <TextField
              label="Project goal"
              placeholder="e.g. Launch a mobile app MVP for habit tracking in 6 weeks"
              value={planInput}
              onChange={(e) => setPlanInput(e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
            <Box>
              <Button
                variant="contained"
                startIcon={
                  plan.isPending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <AutoAwesomeIcon fontSize="small" />
                  )
                }
                onClick={() => plan.mutate(planInput)}
                disabled={!planInput.trim() || plan.isPending}
              >
                {plan.isPending ? "Planning…" : "Generate plan"}
              </Button>
            </Box>

            {plan.isError && <Alert severity="error">{(plan.error as Error).message}</Alert>}

            {plan.data && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {plan.data.summary}
                </Typography>
                {plan.data.phases.map((phase, i) => (
                  <Box
                    key={i}
                    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        {i + 1}. {phase.name}
                      </Typography>
                      <Chip size="small" variant="outlined" label={phase.durationEstimate} />
                    </Stack>
                    <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
                      {phase.tasks.map((t, j) => (
                        <Typography key={j} component="li" variant="body2">
                          {t}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </SectionCard>

        {/* AI Project Generator */}
        <SectionCard
          title="Project generator"
          description="Generate a ready-to-create project (name, description, seed tasks) from a goal."
        >
          <AiTool
            label="Project goal"
            placeholder="e.g. Migrate our blog to a headless CMS"
            runLabel="Generate project"
            pending={generator.isPending}
            onRun={(input) => generator.mutate(input)}
          >
            {generator.isError && <Alert severity="error">{(generator.error as Error).message}</Alert>}
            {generator.data && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {generator.data.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {generator.data.description}
                </Typography>
                <Stack spacing={0.5}>
                  {generator.data.tasks.map((t, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <Chip size="small" variant="outlined" label={PRIORITY_LABELS[t.priority]} />
                      <Typography variant="body2">{t.title}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </AiTool>
        </SectionCard>

        {/* AI Daily Planner */}
        <SectionCard
          title="Daily planner"
          description="Turn your tasks/notes into a focused schedule for today."
        >
          <AiTool
            label="Today's tasks or notes"
            placeholder="Paste your todos or a brain dump…"
            runLabel="Plan my day"
            pending={daily.isPending}
            onRun={(input) => daily.mutate(input)}
          >
            {daily.isError && <Alert severity="error">{(daily.error as Error).message}</Alert>}
            {daily.data && (
              <Box sx={{ pt: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                  {daily.data.focus}
                </Typography>
                <Stack spacing={0.5}>
                  {daily.data.schedule.map((s, i) => (
                    <Stack key={i} direction="row" spacing={1}>
                      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 110 }}>
                        {s.slot}
                      </Typography>
                      <Typography variant="body2">{s.task}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}
          </AiTool>
        </SectionCard>

        {/* AI Standup Summary */}
        <SectionCard
          title="Standup summary"
          description="Summarise your update into yesterday / today / blockers."
        >
          <AiTool
            label="Your update"
            placeholder="What did you do, what's next, any blockers…"
            runLabel="Summarise"
            pending={standup.isPending}
            onRun={(input) => standup.mutate(input)}
          >
            {standup.isError && <Alert severity="error">{(standup.error as Error).message}</Alert>}
            {standup.data && (
              <Stack spacing={1.5} sx={{ pt: 1 }}>
                {(
                  [
                    ["Yesterday", standup.data.yesterday],
                    ["Today", standup.data.today],
                    ["Blockers", standup.data.blockers],
                  ] as const
                ).map(([title, items]) => (
                  <Box key={title}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {title.toUpperCase()}
                    </Typography>
                    {items.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    ) : (
                      <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
                        {items.map((it, i) => (
                          <Typography key={i} component="li" variant="body2">
                            {it}
                          </Typography>
                        ))}
                      </Stack>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </AiTool>
        </SectionCard>

        {/* Meeting Notes → Tasks */}
        <SectionCard
          title="Meeting notes → tasks"
          description="Extract actionable tasks from meeting notes."
        >
          <AiTool
            label="Meeting notes"
            placeholder="Paste raw meeting notes…"
            runLabel="Extract tasks"
            pending={extract.isPending}
            onRun={(input) => extract.mutate(input)}
          >
            {extract.isError && <Alert severity="error">{(extract.error as Error).message}</Alert>}
            {extract.data && (
              <Stack spacing={0.5} sx={{ pt: 1 }}>
                {extract.data.tasks.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No action items found.
                  </Typography>
                ) : (
                  extract.data.tasks.map((t, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center">
                      <Chip size="small" variant="outlined" label={PRIORITY_LABELS[t.priority]} />
                      <Typography variant="body2">{t.title}</Typography>
                    </Stack>
                  ))
                )}
              </Stack>
            )}
          </AiTool>
        </SectionCard>

        {/* AI Documentation Generator */}
        <SectionCard
          title="Documentation generator"
          description="Generate project docs, a README, or a sprint report in Markdown."
        >
          <AiTool
            label="Project / sprint context"
            placeholder="Describe the project, its goals and current tasks…"
            runLabel="Generate docs"
            pending={docs.isPending}
            onRun={(input) => docs.mutate(input)}
          >
            {docs.isError && <Alert severity="error">{(docs.error as Error).message}</Alert>}
            {docs.data && (
              <Box sx={{ pt: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {docs.data.title}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => navigator.clipboard?.writeText(docs.data!.markdown)}
                  >
                    Copy markdown
                  </Button>
                </Stack>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    p: 2,
                    bgcolor: "background.default",
                    maxHeight: 360,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: 13,
                  }}
                >
                  {docs.data.markdown}
                </Box>
              </Box>
            )}
          </AiTool>
        </SectionCard>
      </Stack>
    </>
  );
}
