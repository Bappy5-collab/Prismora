"use client";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useAuditLogs } from "@/hooks/useAudit";
import { useCan } from "@/hooks/useRole";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";

export default function AuditPage() {
  const activeId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const canView = useCan("view_audit");
  const { data: logs, isLoading } = useAuditLogs(activeId, canView);

  if (!canView) {
    return (
      <>
        <PageHeader title="Audit Log" />
        <EmptyState
          title="Restricted"
          description="Only workspace owners and admins can view the security audit log."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Audit Log"
        subtitle="Security trail of sensitive actions in this workspace."
      />
      {isLoading ? (
        <Skeleton variant="rounded" height={300} />
      ) : logs && logs.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell>Actor</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>When</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={l.action} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {l.actor?.full_name || l.actor?.email || "System"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {Object.keys(l.metadata || {}).length
                        ? JSON.stringify(l.metadata)
                        : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(l.created_at)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          title="No audit events yet"
          description="Sensitive actions like deletions, member changes and role changes will appear here."
        />
      )}
    </>
  );
}
