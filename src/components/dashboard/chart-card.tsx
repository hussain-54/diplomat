import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { CmsEmptyState, CmsPanel } from "@/components/cms-ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const DEFAULT_COLORS = [
  "var(--color-cat-blue)",
  "var(--color-gold)",
  "var(--color-cat-teal)",
  "var(--color-cat-green)",
  "var(--color-cat-amber)",
  "var(--color-crimson)",
];

export function ChartCard({
  title,
  description,
  action,
  loading,
  empty,
  emptyTitle = "No data yet",
  emptyDescription = "Charts populate as metrics arrive.",
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <CmsPanel title={title} description={description} action={action} className={className}>
      {loading ? (
        <div className="space-y-3 p-5" aria-busy="true">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : empty ? (
        <CmsEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        children
      )}
    </CmsPanel>
  );
}

export function LineTrendChart({
  data,
  dataKey = "value",
  xKey = "label",
  config,
  className,
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  xKey?: string;
  config?: ChartConfig;
  className?: string;
}) {
  const chartConfig = config ?? {
    [dataKey]: { label: "Value", color: "var(--color-foreground)" },
  };
  return (
    <ChartContainer config={chartConfig} className={cn("aspect-auto h-56 w-full p-4", className)}>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={`var(--color-${dataKey})`}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

export function AreaTrendChart({
  data,
  dataKey = "value",
  xKey = "label",
  config,
  className,
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  xKey?: string;
  config?: ChartConfig;
  className?: string;
}) {
  const chartConfig = config ?? {
    [dataKey]: { label: "Value", color: "var(--color-cat-blue)" },
  };
  return (
    <ChartContainer config={chartConfig} className={cn("aspect-auto h-56 w-full p-4", className)}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={`var(--color-${dataKey})`}
          fill={`var(--color-${dataKey})`}
          fillOpacity={0.18}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function BarMetricChart({
  data,
  dataKey = "value",
  xKey = "label",
  config,
  className,
  layout = "horizontal",
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  xKey?: string;
  config?: ChartConfig;
  className?: string;
  layout?: "horizontal" | "vertical";
}) {
  const chartConfig = config ?? {
    [dataKey]: { label: "Value", color: "var(--color-gold)" },
  };
  return (
    <ChartContainer config={chartConfig} className={cn("aspect-auto h-56 w-full p-4", className)}>
      <BarChart
        data={data}
        layout={layout === "vertical" ? "vertical" : "horizontal"}
        margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        {layout === "vertical" ? (
          <>
            <XAxis type="number" hide />
            <YAxis dataKey={xKey} type="category" width={88} tickLine={false} axisLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={36} />
          </>
        )}
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={0} />
      </BarChart>
    </ChartContainer>
  );
}

export function DonutChart({
  data,
  dataKey = "value",
  nameKey = "label",
  className,
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
  className?: string;
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((row, index) => [
      String(row[nameKey]),
      {
        label: String(row[nameKey]),
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      },
    ]),
  );
  return (
    <ChartContainer config={config} className={cn("aspect-auto mx-auto h-56 w-full p-4", className)}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey={nameKey} />} />
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          innerRadius={52}
          outerRadius={78}
          strokeWidth={2}
          stroke="var(--color-card)"
        >
          {data.map((entry, index) => (
            <Cell
              key={String(entry[nameKey])}
              fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export type { ChartConfig };
