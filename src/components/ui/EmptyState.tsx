"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: { xs: 6, sm: 8 },
        px: 3,
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2.5,
        bgcolor: "background.paper",
      }}
    >
      <Typography variant="h4" sx={{ mb: 0.75 }}>
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: action ? 2.5 : 0, maxWidth: 420, mx: "auto" }}
        >
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
