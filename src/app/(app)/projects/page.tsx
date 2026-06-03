"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import AddIcon from "@mui/icons-material/Add";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNewOutlined";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { useCan } from "@/hooks/useRole";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { ProjectTemplatesDialog } from "@/components/projects/ProjectTemplatesDialog";
import { ProjectStatusChip } from "@/components/projects/ProjectStatusChip";
import { formatDate } from "@/lib/utils";
import type { Project } from "@/lib/database.types";

export default function ProjectsPage() {
  const router = useRouter();
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: projects, isLoading } = useProjects(activeId);
  const deleteProject = useDeleteProject(activeId);
  const canCreate = useCan("create_project");
  const canDelete = useCan("delete_project");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; project: Project } | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(project: Project) {
    setEditing(project);
    setDialogOpen(true);
    setMenu(null);
  }
  async function handleDelete(project: Project) {
    setMenu(null);
    if (confirm(`Delete project "${project.name}" and all its tasks?`)) {
      await deleteProject.mutateAsync(project.id);
    }
  }

  const newButton = canCreate ? (
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" onClick={() => setTemplatesOpen(true)}>
        From template
      </Button>
      <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
        New project
      </Button>
    </Stack>
  ) : undefined;

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Projects group related tasks inside this workspace."
        action={newButton}
      />

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      ) : projects && projects.length > 0 ? (
        <Grid container spacing={2}>
          {projects.map((p) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
              <Card sx={{ height: "100%", position: "relative" }}>
                <IconButton
                  size="small"
                  onClick={(e) => setMenu({ anchor: e.currentTarget, project: p })}
                  sx={{ position: "absolute", top: 6, right: 6, zIndex: 1 }}
                  aria-label="project actions"
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <CardContent
                  sx={{ cursor: "pointer" }}
                  onClick={() => router.push(`/projects/${p.id}`)}
                >
                  <Box sx={{ mb: 1 }}>
                    <ProjectStatusChip status={p.status} />
                  </Box>
                  <Typography variant="h4" noWrap sx={{ pr: 3 }}>
                    {p.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mt: 0.5,
                      minHeight: 40,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {p.description || "No description"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Created {formatDate(p.created_at)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start adding tasks."
          action={newButton}
        />
      )}

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => menu && router.push(`/projects/${menu.project.id}`)}>
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          Open
        </MenuItem>
        <MenuItem onClick={() => menu && openEdit(menu.project)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        {canDelete && (
          <MenuItem onClick={() => menu && handleDelete(menu.project)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            Delete
          </MenuItem>
        )}
      </Menu>

      <ProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        workspaceId={activeId}
        initial={editing}
      />

      <ProjectTemplatesDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        workspaceId={activeId}
      />
    </>
  );
}
