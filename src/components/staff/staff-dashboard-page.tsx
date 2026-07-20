import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Ban,
  Clock,
  FilePenLine,
  Newspaper,
  Shield,
  UserCheck,
  Users,
  UserPlus,
} from "lucide-react";
import { getStaffDashboard } from "@/lib/staff.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  MetricCard,
  StatusBadge,
} from "@/components/cms";
import { BarMetricChart, ChartCard, DonutChart, LineTrendChart } from "@/components/dashboard/chart-card";

export function StaffDashboardPage() {
  const snapshot = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: getStaffDashboard,
    staleTime: 20_000,
  });

  if (snapshot.isLoading) return <CmsPageSkeleton metrics={8} panels={4} />;

  const data = snapshot.data;
  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Organize · Users & Staff"
        title="Workforce dashboard"
        description="Headcount, roles, invitations, and publishing output across the newsroom."
        actions={
          <Link to="/admin/staff/create" className="text-sm font-semibold text-primary hover:underline">
            Invite user
          </Link>
        }
      />

      {snapshot.error ? <CmsAlert>{snapshot.error.message}</CmsAlert> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Users" value={kpis?.total ?? 0} icon={Users} changePercent={kpis?.growthPct} />
        <MetricCard label="Active Users" value={kpis?.active ?? 0} icon={UserCheck} detail="Ready to work" />
        <MetricCard label="Pending Approvals" value={kpis?.pending ?? 0} icon={Clock} detail="Invited" />
        <MetricCard label="Blocked Users" value={kpis?.blocked ?? 0} icon={Ban} detail="Suspended" />
        <MetricCard label="Journalists" value={kpis?.journalists ?? 0} icon={Newspaper} detail="Reporter role" />
        <MetricCard label="Editors" value={kpis?.editors ?? 0} icon={Shield} detail="Editorial leadership" />
        <MetricCard label="Contributors" value={kpis?.contributors ?? 0} icon={FilePenLine} />
        <MetricCard label="Subscribers" value="—" icon={UserPlus} detail="Not tracked as staff roles" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Users by role" description="Assigned app roles">
          <DonutChart data={data?.byRole ?? []} />
        </ChartCard>
        <ChartCard title="Status distribution">
          <DonutChart data={data?.statusDistribution ?? []} />
        </ChartCard>
        <ChartCard title="User growth" description="New profiles per month">
          <LineTrendChart data={data?.growthTrend ?? []} />
        </ChartCard>
        <ChartCard title="Department breakdown">
          {(data?.deptBreakdown?.length ?? 0) ? (
            <BarMetricChart data={data?.deptBreakdown ?? []} />
          ) : (
            <CmsEmptyState title="No departments assigned" description="Assign users to departments in Teams." />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Recent registrations">
          {(data?.recentRegistrations?.length ?? 0) === 0 ? (
            <CmsEmptyState title="No users yet" description="Invite staff to populate the directory." />
          ) : (
            <ul className="space-y-2 text-sm">
              {data?.recentRegistrations.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 border-b border-border/40 py-2 last:border-0">
                  <Link to="/admin/staff/$id" params={{ id: u.id }} className="font-medium hover:text-primary">
                    {u.name}
                  </Link>
                  <StatusBadge tone={u.status === "active" ? "success" : u.status === "invited" ? "warning" : "danger"}>
                    {u.status}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </CmsPanel>
        <CmsPanel title="Most published authors">
          {(data?.topAuthors?.length ?? 0) === 0 ? (
            <CmsEmptyState title="No publishing data" description="Authors appear here once articles are published." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="py-2 text-left">Author</th>
                  <th className="py-2 text-right">Published</th>
                  <th className="py-2 text-right">Activity</th>
                </tr>
              </thead>
              <tbody>
                {data?.topAuthors.map((a) => (
                  <tr key={a.id} className="border-b border-border/40">
                    <td className="py-2">
                      <Link to="/admin/staff/$id" params={{ id: a.id }} className="font-medium hover:text-primary">
                        {a.name}
                      </Link>
                    </td>
                    <td className="py-2 text-right tabular-nums">{a.published}</td>
                    <td className="py-2 text-right tabular-nums">{a.activity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CmsPanel>
      </div>
    </div>
  );
}
