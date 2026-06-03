"use client";

import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default function NotificationsPage() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: notifications, isLoading } = useNotifications(activeWorkspaceId);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead(activeWorkspaceId);

  const hasUnread = (notifications ?? []).some((n) => !n.read);

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="In-app activity from this workspace."
        action={
          <Button
            variant="outlined"
            disabled={!hasUnread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton variant="rounded" height={200} />
      ) : notifications && notifications.length > 0 ? (
        <Paper variant="outlined">
          <List disablePadding>
            {notifications.map((n) => (
              <ListItemButton
                key={n.id}
                divider
                onClick={() => !n.read && markRead.mutate(n.id)}
                sx={{ alignItems: "flex-start", py: 1.5 }}
              >
                {!n.read && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "primary.main",
                      mt: 1,
                      mr: 1.5,
                      flexShrink: 0,
                    }}
                  />
                )}
                <ListItemText
                  inset={n.read}
                  primary={n.title}
                  secondary={n.body}
                  primaryTypographyProps={{ fontWeight: n.read ? 500 : 700 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2, mt: 0.5 }}>
                  {formatDate(n.created_at)}
                </Typography>
              </ListItemButton>
            ))}
          </List>
        </Paper>
      ) : (
        <EmptyState
          title="You’re all caught up"
          description="Notifications about task assignments and workspace activity will show up here."
        />
      )}
    </>
  );
}
