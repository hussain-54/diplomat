import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { listAdminArticles } from "@/lib/admin.functions";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { CmsPanel, cmsButton } from "@/components/cms";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/preview/")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: PreviewHubPage,
});

function PreviewHubPage() {
  const articles = useQuery({ queryKey: ["admin-articles"], queryFn: listAdminArticles });
  const recent = (articles.data ?? []).slice(0, 12);

  return (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Preview"
      description="Device, SERP, and social preview modes deepen in Phase 10. Open a story to preview now."
      icon={Eye}
      phaseHint="Phase 10"
    >
      <CmsPanel title="Preview an article" description="Select from recent desk activity">
        <div className="divide-y divide-border">
          {recent.map((article) => (
            <div key={article.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0 truncate text-sm font-semibold">{article.title}</div>
              <Link
                to="/admin/articles/preview/$articleId"
                params={{ articleId: article.id }}
                className={cmsButton}
              >
                Preview
              </Link>
            </div>
          ))}
        </div>
      </CmsPanel>
    </ArticlesToolPage>
  );
}
