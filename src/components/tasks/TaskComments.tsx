"use client";

import { useState } from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import {
  useAddComment,
  useComments,
  useDeleteComment,
} from "@/hooks/useComments";
import { useRealtimeComments } from "@/hooks/useRealtime";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";

// Comments inside a task. @mentions are basic UI only: typing "@" shows a hint;
// mentions are stored as plain text.
export function TaskComments({
  taskId,
  workspaceId,
  taskTitle,
  taskCreatedBy,
}: {
  taskId: string;
  workspaceId: string;
  taskTitle?: string;
  taskCreatedBy?: string | null;
}) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useComments(taskId);
  useRealtimeComments(taskId);
  const addComment = useAddComment(taskId);
  const deleteComment = useDeleteComment(taskId);
  const [body, setBody] = useState("");

  async function submit() {
    if (!body.trim()) return;
    await addComment.mutateAsync({ workspaceId, body, taskTitle, taskCreatedBy });
    setBody("");
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={2}>
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading comments…
          </Typography>
        ) : (comments ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No comments yet. Start the discussion.
          </Typography>
        ) : (
          (comments ?? []).map((c) => {
            const name = c.author?.full_name || c.author?.email || "User";
            const mine = c.author_id === user?.id;
            return (
              <Box key={c.id} sx={{ display: "flex", gap: 1.5 }}>
                <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: "secondary.main" }}>
                  {name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(c.created_at)}
                    </Typography>
                    {mine && (
                      <IconButton
                        size="small"
                        sx={{ ml: "auto" }}
                        onClick={() => deleteComment.mutate(c.id)}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {c.body}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Stack>

      <Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Write a comment… use @ to mention"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            size="small"
            onClick={submit}
            disabled={!body.trim() || addComment.isPending}
          >
            {addComment.isPending ? "Posting…" : "Comment"}
          </Button>
        </Box>
      </Box>
    </Stack>
  );
}
