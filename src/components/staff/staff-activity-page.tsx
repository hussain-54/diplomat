import { useQuery } from "@tanstack/react-query";
import { listStaffActivity, listStaffAudit, getStaffAnalytics } from "@/lib/staff.functions";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  MetricCard,
} from "@/components/cms";
import { DataTable, DataTableCell, DataTableRow } from "@/components/cms/data-table";
import { BarMetricChart, ChartCard, DonutChart, LineTrendChart } from "@/components/dashboard/chart-card";

export function StaffActivityPage() {
  const logsQ = useQuery({
    queryKey: ["staff-activity"],
    queryFn: () => listStaffActivity({ data: {} }),
  });

  if (logsQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  return (
    <div className="space-y-4">
      <CmsPageHeader
        title="Activity logs"
        description="Staff invites, role changes, suspensions, and profile updates."
      />
      <CmsPanel>
        <DataTable
          columns={[
            { key: "action", header: "Action" },
            { key: "details", header: "Details" },
            { key: "date", header: "Date & time" },
          ]}
          empty={<CmsEmptyState title="No activity yet" description="Staff actions will appear here." />}
        >
          {(logsQ.data?.items ?? []).map((row) => (
            <DataTableRow key={row.id}>
              <DataTableCell className="font-medium">{row.action}</DataTableCell>
              <DataTableCell className="text-muted-foreground">{row.details ?? "—"}</DataTableCell>
              <DataTableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      </CmsPanel>
    </div>
  );
}

export function StaffAuditPage() {
  const logsQ = useQuery({
    queryKey: ["staff-audit"],
    queryFn: () => listStaffAudit({ data: {} }),
  });

  if (logsQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;

  return (
    <div className="space-y-4">
      <CmsPageHeader
        title="Audit logs"
        description="Combined admin and staff-sensitive actions for compliance review."
      />
      <CmsPanel>
        <DataTable
          columns={[
            { key: "source", header: "Source" },
            { key: "action", header: "Action" },
            { key: "details", header: "Details" },
            { key: "actor", header: "Actor" },
            { key: "date", header: "Date" },
          ]}
          empty={<CmsEmptyState title="No audit events" description="Admin and staff-sensitive actions will appear here." />}
        >
          {(logsQ.data?.items ?? []).map((row) => (
            <DataTableRow key={`${row.source}-${row.id}`}>
              <DataTableCell className="text-xs uppercase text-muted-foreground">{row.source}</DataTableCell>
              <DataTableCell className="font-medium">{row.action}</DataTableCell>
              <DataTableCell className="text-muted-foreground">{row.details ?? "—"}</DataTableCell>
              <DataTableCell>{row.actor_name ?? "—"}</DataTableCell>
              <DataTableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()}
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      </CmsPanel>
    </div>
  );
}

export function StaffAnalyticsPage() {
  const analyticsQ = useQuery({
    queryKey: ["staff-analytics"],
    queryFn: getStaffAnalytics,
  });

  if (analyticsQ.isLoading) return <CmsPageSkeleton metrics={4} panels={3} />;
  const data = analyticsQ.data;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="User analytics"
        description="Publishing performance and workforce growth. Login heatmaps require Auth telemetry."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Publishing activity" value={data?.metrics.publishingActivity ?? 0} />
        <MetricCard label="Login activity" value="—" detail="Not connected" />
        <MetricCard label="User growth" value={`${data?.metrics.userGrowth ?? 0}%`} />
        <MetricCard label="Engagement" value="—" detail="Coming soon" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="User growth trend">
          <LineTrendChart data={data?.growthTrend ?? []} />
        </ChartCard>
        <ChartCard title="Users by role">
          <DonutChart data={data?.byRole ?? []} />
        </ChartCard>
        <ChartCard title="Department performance">
          {(data?.deptBreakdown?.length ?? 0) ? (
            <BarMetricChart data={data?.deptBreakdown ?? []} />
          ) : (
            <CmsEmptyState title="No department data" description="Assign users to departments to see breakdown." />
          )}
        </ChartCard>
        <ChartCard title="Login activity" empty emptyTitle="Not connected">
          <CmsEmptyState
            title="Login telemetry unavailable"
            description="Connect Auth last-sign-in tracking to populate this chart."
          />
        </ChartCard>
      </div>
    </div>
  );
}
