import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { listAdminArticles } from "@/lib/admin.functions";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { CmsPanel, cmsButton } from "@/components/cms";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/revisions/")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: RevisionsHubPage,
});

function RevisionsHubPage() {
  const articles = useQuery({ queryKey: ["admin-articles"], queryFn: listAdminArticles });
  const recent = (articles.data ?? []).slice(0, 12);

  return (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Revision History"
      description="Open an article to compare and restore versions. Diff UI deepens in Phase 18."
      icon={History}
      phaseHint="Phase 18"
    >
      <CmsPanel title="Recent articles" description="Jump into per-article revision history">
        <div className="divide-y divide-border">
          {recent.map((article) => (
            <div key={article.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{article.title}</div>
                <div className="mt-0.5 text-[11px] capitalize text-muted-foreground">
                  {article.status}
                </div>
              </div>
              <Link
                to="/admin/articles/revisions/$articleId"
                params={{ articleId: article.id }}
                className={cmsButton}
              >
                History
              </Link>
            </div>
          ))}
        </div>
      </CmsPanel>
    </ArticlesToolPage>
  );
}
