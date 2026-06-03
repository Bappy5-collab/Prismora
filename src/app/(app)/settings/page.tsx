"use client";

import { useEffect, useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import PhotoCameraIcon from "@mui/icons-material/PhotoCameraOutlined";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useWorkspaces, useUpdateWorkspace } from "@/hooks/useWorkspaces";
import { useMyProfile, useUpdateProfile, useChangePassword } from "@/hooks/useProfile";
import { PageHeader } from "@/components/ui/PageHeader";
import { uploadImage } from "@/services/upload";
import { useAvatarSrc } from "@/lib/avatar";

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h4">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          {description}
        </Typography>
      )}
      <Box sx={{ mt: description ? 0 : 2 }}>{children}</Box>
    </Paper>
  );
}

export default function SettingsPage() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: workspaces } = useWorkspaces();
  const active = workspaces?.find((w) => w.id === activeId);
  const updateWorkspace = useUpdateWorkspace();

  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  // ── Workspace form ──────────────────────────────────────────────
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [wsLogo, setWsLogo] = useState("");
  useEffect(() => {
    setWsName(active?.name ?? "");
    setWsDesc(active?.description ?? "");
    setWsLogo(active?.logo_url ?? "");
  }, [active]);

  // ── Profile form ────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile]);

  // Avatar to show: uploaded picture if present, else Gravatar from the email.
  const avatarSrc = useAvatarSrc(profile?.email, avatarUrl);

  // ── Image uploads ───────────────────────────────────────────────
  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file || !activeId) return;
    setUploadError(null);
    setLogoUploading(true);
    try {
      const url = await uploadImage({ file, kind: "logo", workspaceId: activeId });
      setWsLogo(url);
      // Persist immediately so the new logo is saved without an extra click.
      await updateWorkspace.mutateAsync({ workspaceId: activeId, patch: { logo_url: url } });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setAvatarUploading(true);
    try {
      const url = await uploadImage({ file, kind: "avatar" });
      setAvatarUrl(url);
      await updateProfile.mutateAsync({ avatar_url: url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function useEmailPicture() {
    // Clear the custom picture → falls back to the Gravatar derived from email.
    setAvatarUrl(null);
    await updateProfile.mutateAsync({ avatar_url: null });
  }

  // ── Password form ───────────────────────────────────────────────
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const pwMismatch = pw1.length > 0 && pw2.length > 0 && pw1 !== pw2;

  async function saveWorkspace() {
    if (!activeId) return;
    await updateWorkspace.mutateAsync({
      workspaceId: activeId,
      patch: { name: wsName.trim(), description: wsDesc.trim() || null, logo_url: wsLogo.trim() || null },
    });
  }

  async function saveProfile() {
    await updateProfile.mutateAsync({ full_name: fullName.trim() });
  }

  async function savePassword() {
    if (pwMismatch || pw1.length < 6) return;
    await changePassword.mutateAsync(pw1);
    setPw1("");
    setPw2("");
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your workspace and account." />

      <Stack spacing={3}>
        {/* Workspace settings */}
        <SettingsCard
          title="Workspace"
          description="Visible to all members. Only owners/admins can save changes."
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={wsLogo || undefined}
                variant="rounded"
                sx={{ width: 56, height: 56, bgcolor: "primary.main", fontWeight: 700 }}
              >
                {(wsName || "W").charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <input
                  ref={logoInputRef}
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onPickLogo}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      logoUploading ? <CircularProgress size={14} /> : <PhotoCameraIcon fontSize="small" />
                    }
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? "Uploading…" : "Upload logo"}
                  </Button>
                  {wsLogo && (
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => {
                        setWsLogo("");
                        if (activeId)
                          updateWorkspace.mutate({ workspaceId: activeId, patch: { logo_url: null } });
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  PNG, JPG, WEBP or GIF — up to 5 MB
                </Typography>
              </Box>
            </Stack>
            <TextField
              label="Workspace name"
              value={wsName}
              onChange={(e) => setWsName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={wsDesc}
              onChange={(e) => setWsDesc(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
            {updateWorkspace.isError && (
              <Alert severity="error">{(updateWorkspace.error as Error).message}</Alert>
            )}
            {updateWorkspace.isSuccess && <Alert severity="success">Workspace updated.</Alert>}
            <Box>
              <Button
                variant="contained"
                onClick={saveWorkspace}
                disabled={!wsName.trim() || updateWorkspace.isPending}
              >
                {updateWorkspace.isPending ? "Saving…" : "Save workspace"}
              </Button>
            </Box>
          </Stack>
        </SettingsCard>

        {/* Profile settings */}
        <SettingsCard title="Profile" description="Your personal account information.">
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={avatarSrc} sx={{ width: 64, height: 64, bgcolor: "secondary.main" }}>
                {(profile?.full_name || profile?.email || "U").charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <input
                  ref={avatarInputRef}
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={onPickAvatar}
                />
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={
                      avatarUploading ? <CircularProgress size={14} /> : <PhotoCameraIcon fontSize="small" />
                    }
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? "Uploading…" : "Upload picture"}
                  </Button>
                  {avatarUrl ? (
                    <Button size="small" color="inherit" onClick={useEmailPicture}>
                      Use email picture
                    </Button>
                  ) : null}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {avatarUrl
                    ? "Custom picture. PNG, JPG, WEBP or GIF — up to 5 MB."
                    : "Using your email picture (Gravatar). Upload to override."}
                </Typography>
              </Box>
            </Stack>
            <TextField label="Email" value={profile?.email ?? ""} fullWidth disabled />
            <TextField
              label="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              fullWidth
            />
            {updateProfile.isSuccess && <Alert severity="success">Profile updated.</Alert>}
            <Box>
              <Button
                variant="contained"
                onClick={saveProfile}
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? "Saving…" : "Save profile"}
              </Button>
            </Box>
          </Stack>
        </SettingsCard>

        {/* Change password */}
        <SettingsCard title="Change password" description="Use at least 6 characters.">
          <Stack spacing={2}>
            <TextField
              type="password"
              label="New password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              fullWidth
              autoComplete="new-password"
            />
            <TextField
              type="password"
              label="Confirm new password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              fullWidth
              autoComplete="new-password"
              error={pwMismatch}
              helperText={pwMismatch ? "Passwords do not match." : undefined}
            />
            {changePassword.isError && (
              <Alert severity="error">{(changePassword.error as Error).message}</Alert>
            )}
            {changePassword.isSuccess && <Alert severity="success">Password changed.</Alert>}
            <Divider />
            <Box>
              <Button
                variant="contained"
                onClick={savePassword}
                disabled={pw1.length < 6 || pwMismatch || changePassword.isPending}
              >
                {changePassword.isPending ? "Updating…" : "Update password"}
              </Button>
            </Box>
          </Stack>
        </SettingsCard>
      </Stack>
    </>
  );
}
