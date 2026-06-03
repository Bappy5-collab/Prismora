"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useSwitchWorkspace } from "@/hooks/useWorkspaceSwitch";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";

export function WorkspaceSwitcher() {
  const { data: workspaces, isLoading } = useWorkspaces();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const switchWorkspace = useSwitchWorkspace();

  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const active = workspaces?.find((w) => w.id === activeId);

  if (isLoading) {
    return <CircularProgress size={18} />;
  }

  return (
    <>
      <Button
        onClick={(e) => setAnchor(e.currentTarget)}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
          color: "text.primary",
          border: "1px solid",
          borderColor: "divider",
          px: 1.5,
          maxWidth: 220,
          justifyContent: "space-between",
        }}
      >
        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {active?.name ?? "Select workspace"}
        </Box>
      </Button>

      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 0.5 } } }}
      >
        {(workspaces ?? []).map((w) => (
          <MenuItem
            key={w.id}
            selected={w.id === activeId}
            onClick={() => {
              switchWorkspace(w.id);
              setAnchor(null);
            }}
          >
            <ListItemIcon>{w.id === activeId ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            {w.name}
          </MenuItem>
        ))}
        {(workspaces ?? []).length > 0 && <Divider />}
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setCreateOpen(true);
          }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          New workspace
        </MenuItem>
      </Menu>

      <CreateWorkspaceDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
