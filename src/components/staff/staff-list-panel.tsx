import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, KeyRound, MoreHorizontal, Pencil, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  APP_ROLES,
  ROLE_LABELS,
  type AppRole,
} from "@/lib/permissions";
import {
  bulkStaffAction,
  exportStaffCsv,
  listDepartments,
  listStaffTable,
  listTeams,
  resetStaffPassword,
  suspendStaffUser,
  type StaffListFilters,
} from "@/lib/staff.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsStatus,
  cmsButton,
  cmsGhostButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import { DataTable, DataTableCell, DataTableRow } from "@/components/cms/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function StaffListPanel({
  forcedStatus,
  title = "All users",
  description = "Directory of newsroom staff, roles, and access.",
}: {
  forcedStatus?: StaffListFilters["status"];
  title?: string;
  description?: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<StaffListFilters>({
    page: 1,
    pageSize: 20,
    sort: "name",
    sortDir: "asc",
    status: forcedStatus ?? "all",
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const deptsQ = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });
  const tableQ = useQuery({
    queryKey: ["staff-table", filters],
    queryFn: () => listStaffTable({ data: filters }),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["staff-table"] });
    void qc.invalidateQueries({ queryKey: ["staff-dashboard"] });
    void qc.invalidateQueries({ queryKey: ["staff-library-counts"] });
  };

  const suspend = useMutation({
    mutationFn: (p: { user_id: string; suspended: boolean }) => suspendStaffUser({ data: p }),
    onSuccess: () => {
      toast.success("User status updated");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: (email: string) => resetStaffPassword({ data: { email } }),
    onSuccess: () => toast.success("Password reset email sent"),
    onError: (e) => toast.error(e.message),
  });
  const bulk = useMutation({
    mutationFn: (action: "activate" | "suspend") =>
      bulkStaffAction({ data: { ids: [...selected], action } }),
    onSuccess: () => {
      toast.success("Bulk action completed");
      setSelected(new Set());
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const exportMut = useMutation({
    mutationFn: exportStaffCsv,
    onSuccess: (file) => {
      const blob = new Blob([file.content], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    },
    onError: (e) => toast.error(e.message),
  });

  if (tableQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  const rows = tableQ.data?.items ?? [];
  const totalPages = tableQ.data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <CmsPageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={cmsSecondaryButton} onClick={() => exportMut.mutate()}>
              Export
            </button>
            <Link to="/admin/staff/create" className={cmsButton}>
              Invite user
            </Link>
          </div>
        }
      />

      {tableQ.error ? <CmsAlert>{tableQ.error.message}</CmsAlert> : null}

      <div className="sticky top-14 z-20 flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-background/95 p-3 backdrop-blur-sm">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Search
          </label>
          <input
            className={cmsInput}
            placeholder="Name, email, username…"
            value={filters.search ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          />
        </div>
        <FilterSelect
          label="Role"
          value={filters.role ?? ""}
          onChange={(v) => setFilters((f) => ({ ...f, role: (v || null) as AppRole | null, page: 1 }))}
          options={[
            { value: "", label: "All roles" },
            ...APP_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
          ]}
        />
        {!forcedStatus ? (
          <FilterSelect
            label="Status"
            value={filters.status ?? "all"}
            onChange={(v) =>
              setFilters((f) => ({ ...f, status: v as StaffListFilters["status"], page: 1 }))
            }
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "invited", label: "Invited" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
        ) : null}
        <FilterSelect
          label="Department"
          value={filters.department_id ?? ""}
          onChange={(v) => setFilters((f) => ({ ...f, department_id: v || null, page: 1 }))}
          options={[
            { value: "", label: "All departments" },
            ...(deptsQ.data ?? []).map((d) => ({ value: d.id, label: d.name })),
          ]}
        />
        <FilterSelect
          label="Team"
          value={filters.team_id ?? ""}
          onChange={(v) => setFilters((f) => ({ ...f, team_id: v || null, page: 1 }))}
          options={[
            { value: "", label: "All teams" },
            ...(teamsQ.data ?? []).map((t) => ({ value: t.id, label: t.name })),
          ]}
        />
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <button type="button" className={cmsGhostButton} onClick={() => bulk.mutate("activate")}>
            Activate
          </button>
          <button type="button" className={cmsGhostButton} onClick={() => bulk.mutate("suspend")}>
            Suspend
          </button>
          <button type="button" className={cmsGhostButton} onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      ) : null}

      <DataTable
        columns={[
          { key: "sel", header: "", width: "40px" },
          { key: "user", header: "User" },
          { key: "role", header: "Role" },
          { key: "dept", header: "Department" },
          { key: "team", header: "Team" },
          { key: "status", header: "Status" },
          { key: "login", header: "Last login" },
          { key: "activity", header: "Activity", align: "right" },
          { key: "actions", header: "", align: "right", width: "48px" },
        ]}
        empty={<CmsEmptyState title="No users match" description="Adjust filters or invite someone." />}
        footer={
          totalPages > 1 ? (
            <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
              <span className="text-muted-foreground">
                Page {filters.page} of {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={cmsGhostButton}
                  disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className={cmsGhostButton}
                  disabled={(filters.page ?? 1) >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Next
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {rows.map((row) => (
          <DataTableRow key={row.id}>
            <DataTableCell>
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={(e) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(row.id);
                    else next.delete(row.id);
                    return next;
                  });
                }}
              />
            </DataTableCell>
            <DataTableCell>
              <div className="flex items-center gap-2">
                {row.avatar_url ? (
                  <img src={row.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {(row.name ?? "?").slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <Link
                    to="/admin/staff/$id"
                    params={{ id: row.id }}
                    className="block truncate font-medium hover:text-primary"
                  >
                    {row.name ?? "Untitled"}
                  </Link>
                  <div className="truncate text-xs text-muted-foreground">{row.email}</div>
                </div>
              </div>
            </DataTableCell>
            <DataTableCell className="text-xs">
              {row.roles.map((r) => ROLE_LABELS[r]).join(", ") || "—"}
            </DataTableCell>
            <DataTableCell className="text-muted-foreground">{row.department_name ?? "—"}</DataTableCell>
            <DataTableCell className="text-muted-foreground">{row.team_name ?? "—"}</DataTableCell>
            <DataTableCell>
              <CmsStatus
                tone={
                  row.status === "active" ? "success" : row.status === "invited" ? "warning" : "danger"
                }
              >
                {row.status}
              </CmsStatus>
            </DataTableCell>
            <DataTableCell className="text-xs text-muted-foreground">
              {row.last_login_at ? new Date(row.last_login_at).toLocaleDateString() : "—"}
            </DataTableCell>
            <DataTableCell align="right" className="tabular-nums">
              {row.activity_score}
            </DataTableCell>
            <DataTableCell align="right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={cmsGhostButton} aria-label="Actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => navigate({ to: "/admin/staff/$id", params: { id: row.id } })}>
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => navigate({ to: "/admin/staff/$id/edit", params: { id: row.id } })}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      suspend.mutate({ user_id: row.id, suspended: row.status !== "suspended" })
                    }
                  >
                    {row.status === "suspended" ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" /> Activate
                      </>
                    ) : (
                      <>
                        <Ban className="h-3.5 w-3.5" /> Suspend
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {row.email ? (
                    <DropdownMenuItem onSelect={() => reset.mutate(row.email!)}>
                      <KeyRound className="h-3.5 w-3.5" /> Reset password
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTable>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="min-w-[130px]">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <select className={cmsInput} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
