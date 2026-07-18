import type { ReactNode } from "react";
import { CmsPageHeader } from "@/components/cms-ui";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <CmsPageHeader
      eyebrow={eyebrow}
      title={title}
      description={description}
      actions={actions}
    />
  );
}
