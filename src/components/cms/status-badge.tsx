import type { ReactNode } from "react";
import { CmsStatus } from "@/components/cms-ui";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

const WORKFLOW_TONES: Record<string, StatusTone> = {
  published: "success",
  approved: "success",
  active: "success",
  verified: "success",
  review: "warning",
  pending: "warning",
  scheduled: "info",
  flagged: "info",
  invited: "info",
  draft: "neutral",
  rejected: "neutral",
  archived: "danger",
  spam: "danger",
  suspended: "danger",
  failed: "danger",
};

export function statusToneFor(status: string): StatusTone {
  return WORKFLOW_TONES[status.toLowerCase()] ?? "neutral";
}

export function StatusBadge({
  children,
  tone,
  status,
}: {
  children?: ReactNode;
  tone?: StatusTone;
  status?: string;
}) {
  const resolved = tone ?? (status ? statusToneFor(status) : "neutral");
  return <CmsStatus tone={resolved}>{children ?? status}</CmsStatus>;
}
