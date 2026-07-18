import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, RotateCcw } from "lucide-react";
import {
  getAdminArticle,
  getArticleRevisions,
  restoreArticleRevision,
} from "@/lib/admin.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { requirePermissionRoute } from "@/lib/route-guards";
import { ARTICLES_STATIC_SEGMENTS } from "@/components/articles/nav";

export const Route = createFileRoute("/_authenticated/admin/articles/revisions/$articleId")({
  beforeLoad: ({ context, params }) => {
    requirePermissionRoute(context.roles, "articles:view");
    if (ARTICLES_STATIC_SEGMENTS.has(params.articleId) || params.articleId === "new") {
      throw redirect({ to: "/admin/articles/revisions" });
    }
  },
  component: ArticleRevisionsPage,
});

function ArticleRevisionsPage() {
  const { articleId } = Route.useParams();
  const qc = useQueryClient();
  const article = useQuery({
    queryKey: ["admin-article", articleId],
    queryFn: () => getAdminArticle({ data: { id: articleId } }),
  });
  const revisions = useQuery({
    queryKey: ["article-revisions", articleId],
    queryFn: () => getArticleRevisions({ data: { article_id: articleId } }),
  });
  const restore = useMutation({
    mutationFn: (revisionId: string) =>
      restoreArticleRevision({ data: { article_id: articleId, revision_id: revisionId } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-article", articleId] });
      void qc.invalidateQueries({ queryKey: ["article-revisions", articleId] });
    },
  });

  if (article.isLoading || revisions.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading revisions…</div>;
  }
  if (article.error || !article.data) {
    return <CmsAlert>{article.error?.message ?? "Article not found."}</CmsAlert>;
  }

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Articles · Revisions"
        title={article.data.title}
        description="Version snapshots. Compare-diff UI deepens in Phase 18."
        actions={
          <Link to="/admin/articles/$id" params={{ id: articleId }} className={cmsButton}>
            Edit article
          </Link>
        }
      />

      {revisions.error ? <CmsAlert>{revisions.error.message}</CmsAlert> : null}
      {restore.error ? <CmsAlert>{restore.error.message}</CmsAlert> : null}

      <CmsPanel
        title="Version history"
        description={`${revisions.data?.length ?? 0} snapshots`}
        action={<History className="h-4 w-4 text-muted-foreground" />}
      >
        {!revisions.data?.length ? (
          <CmsEmptyState
            title="No revisions yet"
            description="Save the article to create the first snapshot."
          />
        ) : (
          <div className="divide-y divide-border">
            {revisions.data.map((revision) => {
              const changer = Array.isArray(revision.changer)
                ? revision.changer[0]
                : revision.changer;
              return (
                <div
                  key={revision.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      Version {revision.version}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {changer?.name ?? "Unknown editor"} ·{" "}
                      <span className="cms-metric">
                        {new Date(revision.changed_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={cmsSecondaryButton}
                    disabled={restore.isPending}
                    onClick={() => {
                      if (window.confirm(`Restore version ${revision.version}?`)) {
                        restore.mutate(revision.id);
                      }
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}
