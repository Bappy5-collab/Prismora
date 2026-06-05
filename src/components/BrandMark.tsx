"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PrismoraMark } from "./PrismoraMark";

// Brand lockup: a rounded blue chip holding the custom prism glyph, plus the
// "Prismora" wordmark. Pass `compact` to render the chip alone (collapsed nav,
// avatars). This is the single source of truth for the logo across the app.
export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1.75,
          bgcolor: "primary.main",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(37,99,235,0.35)",
        }}
      >
        <PrismoraMark size={17} />
      </Box>
      {!compact && (
        <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: -0.3 }}>
          Prismora
        </Typography>
      )}
    </Box>
  );
}
