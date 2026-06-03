"use client";

import Paper from "@mui/material/Paper";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useActivity } from "@/hooks/useActivity";
import { useRealtimeActivity } from "@/hooks/useRealtime";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import type { ActivityAction } from "@/lib/database.types";

const ACTION_LABEL: Record<ActivityAction, string> = {
  task_created: "Task created",
  task_updated: "Task updated",
  task_completed: "Task completed",
  project_created: "Project created",
  member_invited: "Member invited",
  comment_added: "Comment added",
};

export default function ActivityPage() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: activity, isLoading } = useActivity(activeId);
  useRealtimeActivity(activeId);

  return (
    <>
      <PageHeader
        title="Activity Log"
        subtitle="Everything that happened in this workspace."
      />

      {isLoading ? (
        <Skeleton variant="rounded" height={300} />
      ) : activity && activity.length > 0 ? (
        <Paper variant="outlined">
          <List disablePadding>
            {activity.map((a) => {
              const name = a.actor?.full_name || a.actor?.email || "Someone";
              return (
                <ListItem key={a.id} divider alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "secondary.main", width: 36, height: 36, fontSize: 14 }}>
                      {name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2">
                        <strong>{name}</strong> {a.summary}
                      </Typography>
                    }
                    secondary={formatDate(a.created_at)}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={ACTION_LABEL[a.action] ?? a.action}
                    sx={{ ml: 1, flexShrink: 0 }}
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      ) : (
        <EmptyState
          title="No activity yet"
          description="Actions like creating tasks, completing them, and inviting members will appear here."
        />
      )}
    </>
  );
}
