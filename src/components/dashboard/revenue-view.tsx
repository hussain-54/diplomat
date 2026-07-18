import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { CmsPanel, cmsSecondaryButton } from "@/components/cms-ui";
import { MetricCard, RoleGuard, StatusBadge } from "@/components/cms";
import { SectionHeader } from "@/components/dashboard/primitives";
import {
  AreaTrendChart,
  BarMetricChart,
  ChartCard,
} from "@/components/dashboard/chart-card";

export function RevenueView({
  adManagerCode,
  totalViews,
  published,
  dailyRows,
  topStories,
  sectionCounts,
}: {
  adManagerCode?: string | null;
  totalViews: number;
  published: number;
  dailyRows: Array<[string, number]>;
  topStories: Array<{ title: string; views: number }>;
  sectionCounts: Array<[string, number]>;
}) {
  const configured = Boolean(adManagerCode?.trim());
  const inventoryIndex = totalViews;
  const trend = dailyRows.map(([label, value]) => ({
    label: new Date(`${label}T00:00:00Z`).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    inventory: value,
  }));
  const byCategory = sectionCounts.slice(0, 6).map(([label, value]) => ({
    label,
    value: Math.round(value * Math.max(totalViews / Math.max(published, 1), 1)),
  }));
  const byArticle = topStories.slice(0, 6).map((story) => ({
    label: story.title.length > 24 ? `${story.title.slice(0, 24)}…` : story.title,
    value: story.views,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Revenue readiness"
        description="Currency metrics stay blank until Ad Manager reporting connects — inventory signals are for planning only"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Total revenue" value="—" detail="Awaiting GAM reports" />
        <MetricCard label="Ad revenue" value="—" detail="Connect reporting API" />
        <MetricCard label="Sponsored revenue" value="—" detail="Manual deals module" />
        <MetricCard label="Subscription revenue" value="—" detail="Not enabled" />
        <MetricCard label="RPM" value="—" detail="Revenue per mille" />
        <MetricCard label="CPM" value="—" detail="Cost per mille" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ad Manager"
          value={configured ? "Connected" : "Not set"}
          detail={configured ? adManagerCode! : "Add network code in Settings"}
          trend={configured ? "up" : "neutral"}
        />
        <MetricCard
          label="Inventory signal"
          value={inventoryIndex.toLocaleString()}
          detail="30-day pageviews"
          trend={inventoryIndex ? "up" : "neutral"}
        />
        <MetricCard label="Monetizable stories" value={published} detail="Published inventory" />
        <MetricCard
          label="Forecast"
          value={configured ? "Ready" : "Blocked"}
          detail={configured ? "Awaiting report sync" : "Configure GAM first"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Inventory trend"
          description="Pageview proxy until currency reports sync"
          empty={!totalViews}
        >
          <AreaTrendChart
            data={trend}
            dataKey="inventory"
            config={{ inventory: { label: "Inventory", color: "var(--color-cat-amber)" } }}
          />
        </ChartCard>
        <ChartCard
          title="Inventory by category"
          description="View-weighted desk mix"
          empty={!byCategory.length}
        >
          <BarMetricChart data={byCategory} layout="vertical" />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Top inventory articles" description="By traffic" empty={!byArticle.length}>
          <BarMetricChart
            data={byArticle}
            layout="vertical"
            config={{ value: { label: "Views", color: "var(--color-cat-green)" } }}
          />
        </ChartCard>
        <CmsPanel title="Revenue forecast" description="Integration checklist">
          <div className="space-y-3 p-5 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3">
              <span>Google Ad Manager network</span>
              <StatusBadge tone={configured ? "success" : "warning"}>
                {configured ? "Configured" : "Missing"}
              </StatusBadge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3">
              <span>Currency revenue API</span>
              <StatusBadge tone="neutral">Pending</StatusBadge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3">
              <span>Sponsored / subscription ledgers</span>
              <StatusBadge tone="neutral">Not enabled</StatusBadge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/80 px-4 py-3">
              <span>Ad unit reporting</span>
              <StatusBadge tone="neutral">Not instrumented</StatusBadge>
            </div>
            <RoleGuard permission="settings:manage">
              <Link to="/admin/settings" className={cmsSecondaryButton}>
                <Settings className="h-4 w-4" /> Open integrations
              </Link>
            </RoleGuard>
          </div>
        </CmsPanel>
      </div>
    </div>
  );
}
