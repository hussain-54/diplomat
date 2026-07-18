import { CmsStat } from "@/components/cms-ui";

export function MetricCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string | number;
  detail?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return <CmsStat label={label} value={value} detail={detail} trend={trend} />;
}
