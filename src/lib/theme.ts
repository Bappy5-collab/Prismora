"use client";

import { createTheme } from "@mui/material/styles";

// ─────────────────────────────────────────────────────────────
// Prismora theme — STRICT two-color system.
//   Primary   #2563eb (blue)
//   Secondary #111827 (dark gray)
// No gradients, no glass, minimal elevation. Stripe/Linear/Vercel-ish.
// ─────────────────────────────────────────────────────────────

const PRIMARY = "#2563eb";
const PRIMARY_DARK = "#1d4ed8";
const SECONDARY = "#111827";

// Neutral grayscale ramp (Tailwind-compatible) used for borders/bg/text.
const GREY = {
  50: "#f9fafb",
  100: "#f3f4f6",
  200: "#e5e7eb",
  300: "#d1d5db",
  400: "#9ca3af",
  500: "#6b7280",
  600: "#4b5563",
  700: "#374151",
  900: "#111827",
};

// Two soft, restrained shadows. Used only for floating surfaces (menus,
// dialogs, popovers) — never on cards or static content.
const SHADOW_SM = "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)";
const SHADOW_MD = "0 4px 12px rgba(16, 24, 40, 0.08), 0 2px 4px rgba(16, 24, 40, 0.06)";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: PRIMARY, dark: PRIMARY_DARK, contrastText: "#ffffff" },
    secondary: { main: SECONDARY, contrastText: "#ffffff" },
    background: { default: GREY[50], paper: "#ffffff" },
    text: { primary: SECONDARY, secondary: GREY[500] },
    divider: GREY[200],
    grey: GREY,
    success: { main: "#16a34a" },
    warning: { main: "#d97706" },
    error: { main: "#dc2626" },
    action: {
      hover: "rgba(17, 24, 39, 0.04)",
      selected: "rgba(37, 99, 235, 0.08)",
      focus: "rgba(37, 99, 235, 0.12)",
    },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily:
      'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    // Tighter tracking on large headings reads as "product UI", not "marketing".
    h1: { fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25, color: SECONDARY },
    h2: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3, color: SECONDARY },
    h3: { fontSize: "1.25rem", fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.35, color: SECONDARY },
    h4: { fontSize: "1.0625rem", fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4, color: SECONDARY },
    h5: { fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.4, color: SECONDARY },
    h6: { fontSize: "0.875rem", fontWeight: 600, lineHeight: 1.4, color: SECONDARY },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem", lineHeight: 1.55 },
    caption: { fontSize: "0.75rem", lineHeight: 1.45, color: GREY[500] },
    overline: { fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.06em", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    // Global baseline: smoother text, accessible focus ring on ANY focusable
    // element (including non-MUI clickables), and a quiet custom scrollbar.
    MuiCssBaseline: {
      styleOverrides: {
        "*, *::before, *::after": { boxSizing: "border-box" },
        body: {
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
        },
        "::selection": { backgroundColor: "rgba(37, 99, 235, 0.16)" },
        ":focus-visible": { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 },
        "*::-webkit-scrollbar": { width: 10, height: 10 },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: GREY[300],
          borderRadius: 8,
          border: "2px solid transparent",
          backgroundClip: "content-box",
        },
        "*::-webkit-scrollbar-thumb:hover": { backgroundColor: GREY[400] },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingTop: 6,
          paddingBottom: 6,
          transition: "background-color 160ms ease, border-color 160ms ease, color 160ms ease",
          "&.Mui-focusVisible": { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 },
        },
        sizeSmall: { paddingTop: 4, paddingBottom: 4 },
        containedPrimary: { "&:hover": { backgroundColor: PRIMARY_DARK } },
        outlined: { borderColor: GREY[300], "&:hover": { borderColor: GREY[400], backgroundColor: GREY[50] } },
        text: { "&:hover": { backgroundColor: GREY[100] } },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "background-color 160ms ease, color 160ms ease",
          "&.Mui-focusVisible": { outline: `2px solid ${PRIMARY}`, outlineOffset: 2 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" }, // kill MUI's default gradient overlay
        outlined: { borderColor: GREY[200] },
      },
    },
    MuiCard: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          borderColor: GREY[200],
          boxShadow: "none",
          borderRadius: 10,
          transition: "border-color 160ms ease",
        },
      },
    },
    MuiAppBar: {
      defaultProps: { color: "inherit", elevation: 0 },
      styleOverrides: {
        root: { borderBottom: `1px solid ${GREY[200]}`, backgroundImage: "none" },
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: 60, "@media (min-width:600px)": { minHeight: 60 } } },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: GREY[300], transition: "border-color 160ms ease" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: GREY[400] },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: PRIMARY, borderWidth: 2 },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": { borderColor: "#dc2626" },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontSize: "0.875rem", "&.Mui-focused": { color: PRIMARY } } },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 2, fontSize: "0.75rem" } },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 6 },
        sizeSmall: { height: 22, fontSize: "0.75rem" },
        outlined: { borderColor: GREY[300] },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: GREY[200], paddingTop: 12, paddingBottom: 12 },
        head: {
          fontWeight: 600,
          color: GREY[500],
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          backgroundColor: GREY[50],
          paddingTop: 10,
          paddingBottom: 10,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 140ms ease",
          "&:last-of-type td": { borderBottom: 0 },
          "&.MuiTableRow-hover:hover": { backgroundColor: GREY[50] },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: { transition: "background-color 150ms ease, color 150ms ease" },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "0.8125rem",
          color: GREY[600],
          borderColor: GREY[300],
          paddingTop: 5,
          paddingBottom: 5,
          "&.Mui-selected": {
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            color: PRIMARY,
            borderColor: "rgba(37, 99, 235, 0.40)",
            "&:hover": { backgroundColor: "rgba(37, 99, 235, 0.12)" },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 999, backgroundColor: GREY[200] },
        bar: { borderRadius: 999 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: SECONDARY,
          fontSize: "0.75rem",
          fontWeight: 500,
          padding: "6px 10px",
          borderRadius: 6,
        },
        arrow: { color: SECONDARY },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1px solid ${GREY[200]}`, boxShadow: SHADOW_MD, borderRadius: 10, marginTop: 4 },
        list: { paddingTop: 4, paddingBottom: 4 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
          borderRadius: 6,
          marginLeft: 4,
          marginRight: 4,
          "&:hover": { backgroundColor: GREY[100] },
        },
      },
    },
    MuiPopover: {
      styleOverrides: { paper: { borderRadius: 10, boxShadow: SHADOW_MD } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12, border: `1px solid ${GREY[200]}`, boxShadow: SHADOW_MD },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.01em" } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { paddingTop: 8 } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: "12px 24px 20px" } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 8, fontSize: "0.875rem" } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundImage: "none" } },
    },
    MuiSkeleton: {
      styleOverrides: { root: { borderRadius: 8 } },
      defaultProps: { animation: "wave" },
    },
  },
});

export default theme;
