"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/CheckCircle";
import { BrandMark } from "@/components/BrandMark";
import { useUpdateProfile } from "@/hooks/useProfile";
import { useCreateWorkspace } from "@/hooks/useWorkspaces";
import { inviteMember } from "@/services/workspaces";
import { createProject } from "@/services/projects";
import { completeOnboarding } from "@/services/profile";
import type { MemberRole } from "@/lib/database.types";

const STEPS = ["Profile", "Workspace", "Team", "Project"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OnboardingWizard({ initialName }: { initialName: string }) {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const createWorkspace = useCreateWorkspace();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(initialName);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [inviteRole, setInviteRole] = useState<Exclude<MemberRole, "owner">>("member");

  const [projectName, setProjectName] = useState("");

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding();
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not finish onboarding.");
      setBusy(false);
    }
  }

  // Step 0 — name
  async function handleProfile() {
    setBusy(true);
    setError(null);
    try {
      if (name.trim() && name.trim() !== initialName) {
        await updateProfile.mutateAsync({ full_name: name.trim() });
      }
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your name.");
    } finally {
      setBusy(false);
    }
  }

  // Step 1 — workspace (required)
  async function handleWorkspace() {
    if (!workspaceName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const ws = await createWorkspace.mutateAsync(workspaceName.trim());
      setWorkspaceId(ws.id);
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the workspace.");
    } finally {
      setBusy(false);
    }
  }

  function addInvite() {
    const email = inviteInput.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || invites.includes(email)) return;
    setInvites((v) => [...v, email]);
    setInviteInput("");
  }

  // Step 2 — invites (optional)
  async function handleInvites(sendThenNext: boolean) {
    if (!sendThenNext || invites.length === 0 || !workspaceId) {
      next();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await Promise.allSettled(invites.map((email) => inviteMember(workspaceId, email, inviteRole)));
      next();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send some invites.");
    } finally {
      setBusy(false);
    }
  }

  // Step 3 — first project (optional) → finish
  async function handleProject(createIt: boolean) {
    if (!createIt || !projectName.trim() || !workspaceId) {
      await finish();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProject({ workspaceId, name: projectName.trim() });
      await finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the project.");
      setBusy(false);
    }
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", p: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, width: "100%", maxWidth: 460 }}>
        <Stack spacing={3}>
          <Stack spacing={2}>
            <BrandMark />
            {/* progress dots */}
            <Stack direction="row" spacing={1} alignItems="center">
              {STEPS.map((label, i) => (
                <Stack key={label} direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      bgcolor: i < step ? "primary.main" : i === step ? "rgba(37,99,235,0.10)" : "grey.100",
                      color: i < step ? "#fff" : i === step ? "primary.main" : "text.secondary",
                      border: i === step ? "1px solid" : "none",
                      borderColor: "primary.main",
                    }}
                  >
                    {i < step ? <CheckIcon sx={{ fontSize: 15 }} /> : i + 1}
                  </Box>
                  {i < STEPS.length - 1 && (
                    <Box sx={{ flex: 1, height: 2, borderRadius: 1, bgcolor: i < step ? "primary.main" : "grey.200" }} />
                  )}
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </Typography>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {/* ── Step 0: Profile ──────────────────────────────────────────── */}
          {step === 0 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h3">Welcome to Prismora 👋</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Let's set up your workspace in a few quick steps. First, what should we call you?
                </Typography>
              </Box>
              <TextField label="Full name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
              <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={handleProfile} disabled={busy}>
                Continue
              </Button>
            </Stack>
          )}

          {/* ── Step 1: Workspace ────────────────────────────────────────── */}
          {step === 1 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h3">Create your workspace</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  A workspace holds your projects, tasks and team. You can create more later.
                </Typography>
              </Box>
              <TextField
                label="Workspace name"
                placeholder="Acme Inc."
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                fullWidth
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleWorkspace()}
              />
              <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />} onClick={handleWorkspace} disabled={busy || !workspaceName.trim()}>
                {busy ? "Creating…" : "Create workspace"}
              </Button>
            </Stack>
          )}

          {/* ── Step 2: Team ─────────────────────────────────────────────── */}
          {step === 2 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h3">Invite your team</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Add teammates by email — they'll get an invite to join {workspaceName || "your workspace"}.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Teammate email"
                  type="email"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInvite();
                    }
                  }}
                  fullWidth
                />
                <TextField select label="Role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Exclude<MemberRole, "owner">)} sx={{ minWidth: 120 }}>
                  <MenuItem value="member">Member</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="viewer">Viewer</MenuItem>
                </TextField>
                <IconButton onClick={addInvite} aria-label="add" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                  <AddIcon />
                </IconButton>
              </Stack>
              {invites.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {invites.map((email) => (
                    <Chip key={email} label={email} onDelete={() => setInvites((v) => v.filter((x) => x !== email))} />
                  ))}
                </Box>
              )}
              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Button color="inherit" onClick={() => handleInvites(false)} disabled={busy} sx={{ color: "text.secondary" }}>
                  Skip for now
                </Button>
                <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => handleInvites(true)} disabled={busy}>
                  {busy ? "Sending…" : invites.length > 0 ? `Send ${invites.length} invite${invites.length > 1 ? "s" : ""}` : "Continue"}
                </Button>
              </Stack>
            </Stack>
          )}

          {/* ── Step 3: Project ──────────────────────────────────────────── */}
          {step === 3 && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h3">Create your first project</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Projects group related tasks. Give your first one a name to get started.
                </Typography>
              </Box>
              <TextField
                label="Project name"
                placeholder="Website redesign"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                fullWidth
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && projectName.trim() && handleProject(true)}
              />
              <Stack direction="row" spacing={1} justifyContent="space-between">
                <Button color="inherit" onClick={() => handleProject(false)} disabled={busy} sx={{ color: "text.secondary" }}>
                  Skip & finish
                </Button>
                <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => handleProject(true)} disabled={busy || !projectName.trim()}>
                  {busy ? "Finishing…" : "Create & finish"}
                </Button>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
