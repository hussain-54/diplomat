import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";
import { getAdminArticle } from "@/lib/admin.functions";
import { CmsAlert, CmsPageHeader, CmsPanel, cmsButton, cmsSecondaryButton } from "@/components/cms";
import { requirePermissionRoute } from "@/lib/route-guards";
import { ARTICLES_STATIC_SEGMENTS } from "@/components/articles/nav";
import { redirect } from "@tanstack/react-router";

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
        description="Desktop / tablet / mobile chrome. Full SERP & social modes deepen in Phase 10."
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

      <div className="flex flex-wrap gap-2">
        {[
          { icon: Monitor, label: "Desktop" },
          { icon: Tablet, label: "Tablet" },
          { icon: Smartphone, label: "Mobile" },
        ].map((mode) => {
          const Icon = mode.icon;
          return (
            <span
              key={mode.label}
              className="inline-flex items-center gap-2 border border-border bg-card px-3 py-1.5 text-xs font-semibold"
            >
              <Icon className="h-3.5 w-3.5" />
              {mode.label}
            </span>
          );
        })}
      </div>

      <CmsPanel title="Article preview" description="Reader-facing snapshot">
        <div className="space-y-4 p-6">
          {a.hero_image_url ? (
            <img
              src={a.hero_image_url}
              alt=""
              className="max-h-72 w-full object-cover border border-border"
            />
          ) : null}
          <div className="eyebrow">{a.status}</div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            {a.title}
          </h1>
          {a.deck ? <p className="text-lg text-muted-foreground">{a.deck}</p> : null}
          <div className="border-t border-border pt-4 text-sm text-muted-foreground">
            Slug <span className="font-mono text-foreground">/article/{a.slug}</span>
            {a.published_at
              ? ` · Published ${new Date(a.published_at).toLocaleString()}`
              : " · Not published"}
          </div>
        </div>
      </CmsPanel>
    </div>
  );
}
