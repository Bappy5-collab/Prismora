"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dialog from "@mui/material/Dialog";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import FolderIcon from "@mui/icons-material/FolderOutlined";
import TaskIcon from "@mui/icons-material/TaskAltOutlined";
import PersonIcon from "@mui/icons-material/PersonOutline";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useSearch } from "@/hooks/useSearch";

// Global command-palette search (Ctrl/Cmd + K). Results are scoped to the
// active workspace. Mounted once in the AppShell.
export function GlobalSearch() {
  const router = useRouter();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");

  // Keyboard shortcut: Ctrl+K / Cmd+K toggles the palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("prismora:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("prismora:open-search", onOpen);
    };
  }, []);

  // Debounce the query.
  useEffect(() => {
    const t = setTimeout(() => setQuery(raw), 200);
    return () => clearTimeout(t);
  }, [raw]);

  const { data, isFetching } = useSearch(activeId, query);

  function go(path: string) {
    setOpen(false);
    setRaw("");
    setQuery("");
    router.push(path);
  }

  const hasResults =
    data && (data.projects.length || data.tasks.length || data.members.length);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { position: "fixed", top: 80, m: 0 } } }}
    >
      <Box sx={{ p: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
        <TextField
          autoFocus
          fullWidth
          variant="standard"
          placeholder="Search projects, tasks, members…"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: isFetching ? <CircularProgress size={16} /> : null,
          }}
        />
      </Box>

      <Box sx={{ maxHeight: 360, overflowY: "auto" }}>
        {!query.trim() ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Search the current workspace.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Try smart queries: “my overdue tasks”, “important pending work”, “in progress”.
            </Typography>
          </Box>
        ) : !hasResults && !isFetching ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: "center" }}>
            No results for “{query}”.
          </Typography>
        ) : (
          <List dense>
            {data?.smart && (
              <ListSubheader disableSticky>
                Smart results · {data.smart}
              </ListSubheader>
            )}
            {data && data.projects.length > 0 && (
              <>
                <ListSubheader disableSticky>Projects</ListSubheader>
                {data.projects.map((p) => (
                  <ListItemButton key={p.id} onClick={() => go(`/projects/${p.id}`)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <FolderIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={p.name} />
                  </ListItemButton>
                ))}
              </>
            )}
            {data && data.tasks.length > 0 && (
              <>
                <ListSubheader disableSticky>Tasks</ListSubheader>
                {data.tasks.map((t) => (
                  <ListItemButton key={t.id} onClick={() => go(`/projects/${t.project_id}`)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <TaskIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={t.title} />
                  </ListItemButton>
                ))}
              </>
            )}
            {data && data.members.length > 0 && (
              <>
                <ListSubheader disableSticky>Members</ListSubheader>
                {data.members.map((m) => (
                  <ListItemButton key={m.id} onClick={() => go("/members")}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={m.name} secondary={m.email} />
                  </ListItemButton>
                ))}
              </>
            )}
          </List>
        )}
      </Box>
    </Dialog>
  );
}
