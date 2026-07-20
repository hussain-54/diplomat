import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listInvitations,
  resendInvitation,
  revokeInvitation,
} from "@/lib/staff.functions";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  CmsStatus,
  cmsGhostButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { DataTable, DataTableCell, DataTableRow } from "@/components/cms/data-table";
import { Link } from "@tanstack/react-router";
import { cmsButton } from "@/components/cms";

export function StaffInvitationsPage() {
  const qc = useQueryClient();
  const invitesQ = useQuery({
    queryKey: ["staff-invitations"],
    queryFn: () => listInvitations({ data: {} }),
  });

  const resend = useMutation({
    mutationFn: (id: string) => resendInvitation({ data: { id } }),
    onSuccess: () => {
      toast.success("Invitation resent");
      void qc.invalidateQueries({ queryKey: ["staff-invitations"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokeInvitation({ data: { id } }),
    onSuccess: () => {
      toast.success("Invitation revoked");
      void qc.invalidateQueries({ queryKey: ["staff-invitations"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (invitesQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  const rows = invitesQ.data?.items ?? [];

  return (
    <div className="space-y-4">
      <CmsPageHeader
        title="Invitations"
        description="Track invite status, resend, or revoke pending invites."
        actions={
          <Link to="/admin/staff/create" className={cmsButton}>
            New invite
          </Link>
        }
      />
      <CmsPanel>
        <DataTable
          columns={[
            { key: "email", header: "Email" },
            { key: "roles", header: "Roles" },
            { key: "status", header: "Status" },
            { key: "expires", header: "Expires" },
            { key: "actions", header: "", align: "right" },
          ]}
          empty={
            <CmsEmptyState
              title="No invitations yet"
              description="Apply the staff migration and send invites from Create User."
            />
          }
        >
          {rows.map((row) => (
            <DataTableRow key={row.id}>
              <DataTableCell>
                <div className="font-medium">{row.email}</div>
                <div className="text-xs text-muted-foreground">{row.name}</div>
              </DataTableCell>
              <DataTableCell className="text-xs">{(row.roles ?? []).join(", ") || "—"}</DataTableCell>
              <DataTableCell>
                <CmsStatus
                  tone={
                    row.status === "pending"
                      ? "warning"
                      : row.status === "accepted"
                        ? "success"
                        : "neutral"
                  }
                >
                  {row.status}
                </CmsStatus>
              </DataTableCell>
              <DataTableCell className="text-xs text-muted-foreground">
                {new Date(row.expires_at).toLocaleDateString()}
              </DataTableCell>
              <DataTableCell align="right">
                <div className="flex justify-end gap-1">
                  {row.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        className={cmsSecondaryButton}
                        onClick={() => resend.mutate(row.id)}
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        className={cmsGhostButton}
                        onClick={() => revoke.mutate(row.id)}
                      >
                        Revoke
                      </button>
                    </>
                  ) : null}
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      </CmsPanel>
    </div>
  );
}
