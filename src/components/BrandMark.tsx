"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Simple, flat wordmark. Square chip in primary blue + "Prismora" in dark gray.
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1.5,
          bgcolor: "primary.main",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        P
      </Box>
      {!compact && (
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.2 }}>
          Prismora
        </Typography>
      )}
    </Box>
  );
}
