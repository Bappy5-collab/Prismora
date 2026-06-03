"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import { Sidebar, SIDEBAR_WIDTH } from "./Sidebar";
import { Topbar } from "./Topbar";
import { GlobalSearch } from "@/components/search/GlobalSearch";

// Two-pane SaaS layout: fixed sidebar + topbar + scrollable content.
// The sidebar collapses into a temporary drawer on small screens.
export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <GlobalSearch />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, width: "100%", mx: "auto" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
