import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Eye, Monitor, Search, Share2 } from "lucide-react";
import { listAdminArticles } from "@/lib/admin.functions";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import {
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/preview/")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: PreviewHubPage,
});

function PreviewHubPage() {
  const articles = useQuery({ queryKey: ["admin-articles"], queryFn: listAdminArticles });
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = articles.data ?? [];
    if (!needle) return rows.slice(0, 24);
    return rows
      .filter(
        (article) =>
          article.title.toLowerCase().includes(needle) ||
          article.slug.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [articles.data, q]);

  return (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Preview system"
      description="Device frames, Google Search, Open Graph / Twitter, and Google News cards for any story."
      icon={Eye}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <HintCard
          icon={Monitor}
          title="Device"
          body="Desktop, tablet, and mobile reader chrome with full body blocks."
        />
        <HintCard
          icon={Search}
          title="Search"
          body="Google SERP title, URL, and meta description with keyword emphasis."
        />
        <HintCard
          icon={Share2}
          title="Social & News"
          body="Open Graph, Twitter/X cards, and a Google News headline pack."
        />
      </div>

      <CmsPanel
        title="Open a preview"
        description="Search the desk library, then open device and distribution modes"
        action={
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search title or slug…"
            className={`${cmsInput} h-8 w-48 text-xs`}
            aria-label="Search articles to preview"
          />
        }
      >
        {articles.isLoading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading articles…</div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No articles match. Try another search or create a story first.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((article) => (
              <div
                key={article.id}
                className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{article.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">/{article.slug}</span>
                    <CmsStatus
                      tone={
                        article.status === "published"
                          ? "success"
                          : article.status === "review"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {article.status}
                    </CmsStatus>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    to="/admin/articles/$id"
                    params={{ id: article.id }}
                    className={cmsSecondaryButton}
                  >
                    Edit
                  </Link>
                  <Link
                    to="/admin/articles/preview/$articleId"
                    params={{ articleId: article.id }}
                    className={cmsButton}
                  >
                    Preview
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CmsPanel>
    </ArticlesToolPage>
  );
}

function HintCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Monitor;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
