"use client";

import { createTheme } from "@mui/material/styles";

// ─────────────────────────────────────────────────────────────
// Prismora theme — STRICT two-color system.
//   Primary   #2563eb (blue)
//   Secondary #111827 (dark gray)
// No gradients, no glass, minimal elevation. Stripe/Linear-ish.
// ─────────────────────────────────────────────────────────────

const PRIMARY = "#2563eb";
const SECONDARY = "#111827";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: PRIMARY, contrastText: "#ffffff" },
    secondary: { main: SECONDARY, contrastText: "#ffffff" },
    background: { default: "#f9fafb", paper: "#ffffff" },
    text: { primary: SECONDARY, secondary: "#6b7280" },
    divider: "#e5e7eb",
    success: { main: "#16a34a" },
    warning: { main: "#d97706" },
    error: { main: "#dc2626" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: { fontSize: "1.75rem", fontWeight: 700, color: SECONDARY },
    h2: { fontSize: "1.5rem", fontWeight: 700, color: SECONDARY },
    h3: { fontSize: "1.25rem", fontWeight: 600, color: SECONDARY },
    h4: { fontSize: "1.125rem", fontWeight: 600, color: SECONDARY },
    h5: { fontSize: "1rem", fontWeight: 600, color: SECONDARY },
    h6: { fontSize: "0.9375rem", fontWeight: 600, color: SECONDARY },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" }, // kill MUI's default gradient overlay
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: { borderColor: "#e5e7eb", boxShadow: "none" },
      },
    },
    MuiAppBar: {
      defaultProps: { color: "inherit", elevation: 0 },
      styleOverrides: {
        root: { borderBottom: "1px solid #e5e7eb", backgroundImage: "none" },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: "#6b7280", fontSize: "0.8125rem" },
      },
    },
  },
});

export default theme;
