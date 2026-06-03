"use client";

import { useState } from "react";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import {
  useChangeMemberRole,
  useInviteMember,
  useRemoveMember,
  useWorkspaceMembers,
} from "@/hooks/useWorkspaces";
import { useCan } from "@/hooks/useRole";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/rbac";
import type { MemberRole } from "@/lib/database.types";

export default function MembersPage() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: members, isLoading } = useWorkspaceMembers(activeId);
  const invite = useInviteMember(activeId);
  const remove = useRemoveMember(activeId);
  const changeRole = useChangeMemberRole(activeId);

  const canInvite = useCan("invite_member");
  const canManage = useCan("manage_members");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<MemberRole, "owner">>("member");

  async function handleInvite() {
    if (!email.trim()) return;
    await invite.mutateAsync({ email, role });
    setEmail("");
  }

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Invite teammates and manage role-based access to this workspace."
      />

      {canInvite ? (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField
              label="Invite by email"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as Exclude<MemberRole, "owner">)}
              sx={{ minWidth: { sm: 150 } }}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              onClick={handleInvite}
              disabled={!email.trim() || invite.isPending}
              sx={{ whiteSpace: "nowrap" }}
            >
              {invite.isPending ? "Inviting…" : "Send invite"}
            </Button>
          </Stack>
          {invite.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {(invite.error as Error).message}
            </Alert>
          )}
          {invite.isSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              Invite sent. They’ll get access when they sign in with that email.
            </Alert>
          )}
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          You don’t have permission to invite or manage members.
        </Alert>
      )}

      <Paper variant="outlined">
        {isLoading ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            <Skeleton height={48} />
            <Skeleton height={48} />
          </Stack>
        ) : (members ?? []).length === 0 ? (
          <EmptyState title="No members yet" />
        ) : (
          <List disablePadding>
            {(members ?? []).map((m) => {
              const name = m.profile?.full_name || m.profile?.email || m.invited_email;
              const isOwner = m.role === "owner";
              return (
                <ListItem
                  key={m.id}
                  divider
                  secondaryAction={
                    canManage && !isOwner ? (
                      <IconButton
                        edge="end"
                        aria-label="remove member"
                        onClick={() => remove.mutate(m.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    ) : undefined
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "secondary.main" }}>
                      {name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={name}
                    secondary={m.invited_email}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: { sm: 6 } }}>
                    {canManage && !isOwner ? (
                      <TextField
                        select
                        size="small"
                        value={m.role}
                        onChange={(e) =>
                          changeRole.mutate({
                            memberId: m.id,
                            role: e.target.value as MemberRole,
                            email: m.invited_email,
                          })
                        }
                        sx={{ minWidth: 120 }}
                      >
                        {ASSIGNABLE_ROLES.map((r) => (
                          <MenuItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Chip size="small" label={ROLE_LABELS[m.role]} variant="outlined" />
                    )}
                    <Chip
                      size="small"
                      label={m.status}
                      color={m.status === "accepted" ? "primary" : "default"}
                      variant={m.status === "accepted" ? "filled" : "outlined"}
                    />
                  </Stack>
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </>
  );
}
