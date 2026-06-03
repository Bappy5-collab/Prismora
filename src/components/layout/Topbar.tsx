"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Badge from "@mui/material/Badge";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { useAuth, signOut } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtime";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useMyProfile } from "@/hooks/useProfile";
import { useAvatarSrc } from "@/lib/avatar";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  // Badge reflects ONLY the active workspace's unread notifications.
  const unread = useUnreadCount(activeWorkspaceId);
  // Live-update the notification badge across the whole app shell.
  useRealtimeNotifications(user?.id);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const email = user?.email ?? "";
  const initial = email.charAt(0).toUpperCase() || "U";
  // Profile picture if uploaded, otherwise Gravatar derived from the email.
  const avatarSrc = useAvatarSrc(email, profile?.avatar_url, 64);

  async function handleSignOut() {
    setAnchor(null);
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { md: "none" } }}
          aria-label="open navigation"
        >
          <MenuIcon />
        </IconButton>

        <WorkspaceSwitcher />

        <Button
          onClick={() => window.dispatchEvent(new Event("prismora:open-search"))}
          startIcon={<SearchIcon fontSize="small" />}
          sx={{
            ml: 1,
            color: "text.secondary",
            border: "1px solid",
            borderColor: "divider",
            px: 1.25,
            display: { xs: "none", sm: "inline-flex" },
          }}
        >
          Search
          <Box
            component="span"
            sx={{
              ml: 1.5,
              fontSize: 11,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              px: 0.5,
              color: "text.secondary",
            }}
          >
            Ctrl K
          </Box>
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        <IconButton onClick={() => router.push("/notifications")} aria-label="notifications">
          <Badge badgeContent={unread} color="primary">
            <NotificationsIcon />
          </Badge>
        </IconButton>

        <IconButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ p: 0.5 }} aria-label="account">
          <Avatar src={avatarSrc} sx={{ width: 32, height: 32, bgcolor: "secondary.main", fontSize: 14 }}>
            {initial}
          </Avatar>
        </IconButton>

        <Menu
          anchorEl={anchor}
          open={!!anchor}
          onClose={() => setAnchor(null)}
          slotProps={{ paper: { sx: { minWidth: 220, mt: 0.5 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              Signed in as
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleSignOut}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
