"use client";

import { useRef, useState } from "react";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import MicIcon from "@mui/icons-material/MicNoneOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAiVoiceTask } from "@/hooks/useAi";
import { useProjects } from "@/hooks/useProjects";
import { useCreateTask } from "@/hooks/useTasks";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { PRIORITY_LABELS } from "@/lib/utils";

// Voice/text → structured task. Uses the browser SpeechRecognition API when
// available (Chrome/Edge); always supports typed input as a fallback.
export function VoiceToTask() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: projects } = useProjects(activeId);
  const createTask = useCreateTask("");
  const voice = useAiVoiceTask();

  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState("");
  const [listening, setListening] = useState(false);
  const [created, setCreated] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  function toggleMic() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser. Please type instead.");
      return;
    }
    if (listening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any)?.stop();
      setListening(false);
      return;
    }
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  async function convert() {
    setCreated(false);
    const today = new Date().toISOString().slice(0, 10);
    await voice.mutateAsync(`Today: ${today}\nInstruction: ${text.trim()}`);
  }

  async function create() {
    if (!voice.data || !activeId || !projectId) return;
    await createTask.mutateAsync({
      workspaceId: activeId,
      projectId,
      title: voice.data.title,
      priority: voice.data.priority,
      dueDate: voice.data.dueDate ? new Date(voice.data.dueDate).toISOString() : null,
    });
    setCreated(true);
    setText("");
    voice.reset();
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h4">Voice to task</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
        Speak or type an instruction like “Fix login bug tomorrow”, and AI turns it into a task.
      </Typography>

      <Stack spacing={2}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="e.g. Prepare release notes by Friday, high priority"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <IconButton
            onClick={toggleMic}
            color={listening ? "primary" : "default"}
            sx={{ border: "1px solid", borderColor: "divider", mt: 0.5 }}
            aria-label="voice input"
          >
            <MicIcon />
          </IconButton>
        </Box>

        <Box>
          <Button
            variant="contained"
            startIcon={
              voice.isPending ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon fontSize="small" />
            }
            onClick={convert}
            disabled={!text.trim() || voice.isPending}
          >
            {voice.isPending ? "Converting…" : "Convert to task"}
          </Button>
        </Box>

        {voice.isError && <Alert severity="error">{(voice.error as Error).message}</Alert>}
        {created && <Alert severity="success">Task created.</Alert>}

        {voice.data && (
          <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body1" fontWeight={600}>
                {voice.data.title}
              </Typography>
              <Chip size="small" variant="outlined" label={PRIORITY_LABELS[voice.data.priority]} />
              {voice.data.dueDate && (
                <Chip size="small" variant="outlined" label={`Due ${voice.data.dueDate}`} />
              )}
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                select
                size="small"
                label="Project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                sx={{ minWidth: 200 }}
                helperText={!projects?.length ? "Create a project first." : undefined}
              >
                {(projects ?? []).map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Button
                  variant="outlined"
                  onClick={create}
                  disabled={!projectId || createTask.isPending}
                >
                  {createTask.isPending ? "Creating…" : "Create task"}
                </Button>
              </Box>
            </Stack>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
