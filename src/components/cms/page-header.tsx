import type { ReactNode } from "react";
import { CmsPageHeader } from "@/components/cms-ui";

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: ReactNode;
}) {
  return (
    <CmsPageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      actions={actions}
    />
  );
}
