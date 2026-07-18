import type { ReactNode } from "react";
import { CmsStatus, type CmsStatusTone } from "@/components/cms-ui";

export type StatusTone = CmsStatusTone;

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
  archived: "accent",
  spam: "danger",
  suspended: "danger",
  failed: "danger",
  breaking: "danger",
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
  const key = status?.toLowerCase();
  const resolved = tone ?? (key ? statusToneFor(key) : "neutral");
  return (
    <CmsStatus tone={resolved} status={key}>
      {children ?? status}
    </CmsStatus>
  );
}
