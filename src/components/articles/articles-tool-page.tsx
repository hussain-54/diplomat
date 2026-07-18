import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { CmsEmptyState, CmsPageHeader, CmsPanel, cmsButton } from "@/components/cms";

export function ArticlesToolPage({
  eyebrow = "Articles",
  title,
  description,
  icon: Icon,
  phaseHint,
  primaryAction,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  phaseHint?: string;
  primaryAction?: { label: string; to: string; params?: Record<string, string> };
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          primaryAction ? (
            <Link to={primaryAction.to} params={primaryAction.params} className={cmsButton}>
              {primaryAction.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null
        }
      />
      {children ?? (
        <CmsPanel>
          <CmsEmptyState
            title={phaseHint ? `${title} workspace` : title}
            description={
              phaseHint
                ? `This route is live and permission-gated. Full ${title.toLowerCase()} capabilities ship in ${phaseHint}. Use All Articles or the editor meanwhile.`
                : "Select an article from All Articles to continue, or create a new draft."
            }
            icon={Icon ? <Icon className="h-5 w-5" /> : undefined}
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/admin/articles/all" className={cmsButton}>
                  All Articles
                </Link>
                <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
                  Create Article
                </Link>
              </div>
            }
          />
        </CmsPanel>
      )}
    </div>
  );
}
