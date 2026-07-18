import type { LucideIcon } from "lucide-react";
import { CmsStat } from "@/components/cms-ui";

export function MetricCard({
  label,
  value,
  detail,
  trend,
  icon,
  changePercent,
  className,
}: {
  label: string;
  value: string | number;
  detail?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  changePercent?: number | null;
  className?: string;
}) {
  return (
    <CmsStat
      label={label}
      value={value}
      detail={detail}
      trend={trend}
      icon={icon}
      changePercent={changePercent}
      className={className}
    />
  );
}
