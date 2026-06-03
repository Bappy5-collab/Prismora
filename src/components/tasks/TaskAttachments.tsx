"use client";

import { useRef, useState } from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import UploadIcon from "@mui/icons-material/UploadFileOutlined";
import DescriptionIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import {
  useAttachments,
  useDeleteAttachment,
  useUploadAttachment,
} from "@/hooks/useAttachments";
import { getAttachmentUrl } from "@/services/attachments";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({
  taskId,
  workspaceId,
}: {
  taskId: string;
  workspaceId: string;
}) {
  const { data: files, isLoading } = useAttachments(taskId);
  const upload = useUploadAttachment(taskId);
  const remove = useDeleteAttachment(taskId);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await upload.mutateAsync({ workspaceId, file });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function open(id: string) {
    const url = await getAttachmentUrl(id);
    window.open(url, "_blank", "noopener");
  }

  return (
    <Stack spacing={2}>
      <Box>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*,application/pdf,.doc,.docx,.txt"
          onChange={onPick}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={upload.isPending ? <CircularProgress size={14} /> : <UploadIcon fontSize="small" />}
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? "Uploading…" : "Upload file"}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          Images, PDF, docs — up to 10 MB
        </Typography>
      </Box>

      {upload.isError && <Alert severity="error">{(upload.error as Error).message}</Alert>}

      {isLoading ? (
        <Typography variant="body2" color="text.secondary">
          Loading files…
        </Typography>
      ) : (files ?? []).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No attachments yet.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {(files ?? []).map((f) => (
            <Box
              key={f.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1.5,
                p: 1,
              }}
            >
              <DescriptionIcon fontSize="small" color="action" />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Link
                  component="button"
                  underline="hover"
                  onClick={() => open(f.id)}
                  sx={{ display: "block", textAlign: "left", color: "primary.main", fontWeight: 600 }}
                  noWrap
                >
                  {f.name}
                </Link>
                <Typography variant="caption" color="text.secondary">
                  {formatSize(f.size)}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => remove.mutate(f.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
