import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { getAdminArticle } from "@/lib/admin.functions";
import { ArticlePreviewStudio } from "@/components/articles/article-preview-studio";
import { CmsAlert, CmsPageHeader, cmsButton, cmsSecondaryButton } from "@/components/cms";
import { requirePermissionRoute } from "@/lib/route-guards";
import { ARTICLES_STATIC_SEGMENTS } from "@/components/articles/nav";

export const Route = createFileRoute("/_authenticated/admin/articles/preview/$articleId")({
  beforeLoad: ({ context, params }) => {
    requirePermissionRoute(context.roles, "articles:view");
    if (ARTICLES_STATIC_SEGMENTS.has(params.articleId) || params.articleId === "new") {
      throw redirect({ to: "/admin/articles/preview" });
    }
  },
  component: ArticlePreviewPage,
});

function ArticlePreviewPage() {
  const { articleId } = Route.useParams();
  const article = useQuery({
    queryKey: ["admin-article", articleId],
    queryFn: () => getAdminArticle({ data: { id: articleId } }),
  });

  if (article.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading preview…</div>;
  }
  if (article.error || !article.data) {
    return <CmsAlert>{article.error?.message ?? "Article not found."}</CmsAlert>;
  }

  const a = article.data;
  const publicHref = a.status === "published" ? `/article/${a.slug}` : null;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Articles · Preview"
        title={a.title}
        description="Desktop, tablet, mobile, Google Search, social cards, and Google News."
        actions={
          <>
            <Link to="/admin/articles/$id" params={{ id: articleId }} className={cmsSecondaryButton}>
              Edit
            </Link>
            {publicHref ? (
              <a href={publicHref} target="_blank" rel="noreferrer" className={cmsButton}>
                <ExternalLink className="h-4 w-4" /> Live page
              </a>
            ) : null}
          </>
        }
      />

      <ArticlePreviewStudio article={a} />
    </div>
  );
}
