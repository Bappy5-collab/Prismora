"use client";

import { usePathname, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import DashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import FolderIcon from "@mui/icons-material/FolderOutlined";
import TaskIcon from "@mui/icons-material/TaskAltOutlined";
import GroupIcon from "@mui/icons-material/GroupOutlined";
import CalendarIcon from "@mui/icons-material/CalendarMonthOutlined";
import AnalyticsIcon from "@mui/icons-material/InsightsOutlined";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneOutlined";
import AssistantIcon from "@mui/icons-material/AutoAwesomeOutlined";
import ActivityIcon from "@mui/icons-material/HistoryOutlined";
import AuditIcon from "@mui/icons-material/ShieldOutlined";
import SettingsIcon from "@mui/icons-material/SettingsOutlined";
import ListSubheader from "@mui/material/ListSubheader";
import { BrandMark } from "@/components/BrandMark";

export const SIDEBAR_WIDTH = 240;

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
  { label: "Projects", href: "/projects", icon: FolderIcon },
  { label: "Tasks", href: "/tasks", icon: TaskIcon },
  { label: "Analytics", href: "/analytics", icon: AnalyticsIcon },
  { label: "Members", href: "/members", icon: GroupIcon },
  { label: "Calendar", href: "/calendar", icon: CalendarIcon },
  { label: "Notifications", href: "/notifications", icon: NotificationsIcon },
  { label: "Activity Log", href: "/activity", icon: ActivityIcon },
  { label: "Audit Log", href: "/audit", icon: AuditIcon },
  { label: "AI Assistant", href: "/assistant", icon: AssistantIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ px: 2.5 }}>
        <BrandMark />
      </Toolbar>
      <List
        sx={{ px: 1.5, py: 1 }}
        subheader={
          <ListSubheader
            disableSticky
            sx={{
              bgcolor: "transparent",
              color: "text.secondary",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.6,
              lineHeight: "32px",
              px: 1.5,
            }}
          >
            MAIN
          </ListSubheader>
        }
      >
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <ListItemButton
              key={href}
              selected={active}
              onClick={() => {
                router.push(href);
                onNavigate?.();
              }}
              sx={{
                position: "relative",
                borderRadius: 2,
                mb: 0.25,
                py: 0.85,
                color: "text.secondary",
                "& .MuiListItemIcon-root": { color: "text.secondary" },
                "&:hover": { bgcolor: "action.hover", color: "text.primary" },
                "&:hover .MuiListItemIcon-root": { color: "text.primary" },
                "&.Mui-selected": {
                  bgcolor: "rgba(37, 99, 235, 0.08)",
                  color: "primary.main",
                  "& .MuiListItemIcon-root": { color: "primary.main" },
                  "& .MuiListItemText-primary": { fontWeight: 600 },
                  "&:hover": { bgcolor: "rgba(37, 99, 235, 0.12)" },
                  // Left accent rail — the Linear/Vercel active marker.
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    height: 18,
                    width: 3,
                    borderRadius: 999,
                    backgroundColor: "primary.main",
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}>
                {label}
              </ListItemText>
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <Box component="nav" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
      {/* Mobile temporary drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: SIDEBAR_WIDTH, boxSizing: "border-box" },
        }}
      >
        <NavContent onNavigate={onMobileClose} />
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <NavContent />
      </Drawer>
    </Box>
  );
}
