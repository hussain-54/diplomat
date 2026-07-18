import { Link } from "@tanstack/react-router";
import { CmsEmptyState, CmsPanel, CmsStatus } from "@/components/cms-ui";
import { MetricCard, StatusBadge } from "@/components/cms";
import { SectionHeader } from "@/components/dashboard/primitives";
import { ChartCard, DonutChart } from "@/components/dashboard/chart-card";
import type { DashboardArticle } from "@/components/dashboard/types";

function seoScore(article: DashboardArticle) {
  let score = 0;
  if (article.seo_title?.trim()) score += 25;
  if (article.meta_description?.trim()) score += 25;
  if (article.focus_keyword?.trim()) score += 25;
  if (article.canonical_url?.trim()) score += 10;
  if (article.robots_index !== false) score += 15;
  return score;
}

export function SeoView({
  articles,
  canViewArticles,
  monthlyViews,
}: {
  articles: DashboardArticle[];
  canViewArticles: boolean;
  monthlyViews: number;
}) {
  const scored = articles.map((a) => ({ article: a, score: seoScore(a) }));
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, row) => sum + row.score, 0) / scored.length)
    : 0;
  const missingMeta = articles.filter(
    (a) => !a.seo_title?.trim() || !a.meta_description?.trim(),
  );
  const missingKeyword = articles.filter((a) => !a.focus_keyword?.trim());
  const noindex = articles.filter((a) => a.robots_index === false);
  const missingCanonical = articles.filter((a) => !a.canonical_url?.trim());
  // Alt tags / internal links are not stored on articles yet — surface as instrumented gaps.
  const missingAlt = "—";
  const missingLinks = "—";
  const healthy = scored.filter((row) => row.score >= 75).length;
  const opportunities = scored
    .filter((row) => row.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);
  const topRanking = [...scored]
    .filter((row) => row.article.status === "published")
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const healthMix = [
    { label: "Strong (75+)", value: scored.filter((r) => r.score >= 75).length },
    { label: "Fair (50–74)", value: scored.filter((r) => r.score >= 50 && r.score < 75).length },
    { label: "Weak (<50)", value: scored.filter((r) => r.score < 50).length },
  ];

  const suggestions = [
    missingMeta.length
      ? `${missingMeta.length} stories missing title or meta description`
      : null,
    missingKeyword.length ? `${missingKeyword.length} stories without a focus keyword` : null,
    noindex.length ? `${noindex.length} pages set to noindex` : null,
    missingCanonical.length ? `${missingCanonical.length} stories without canonical URL` : null,
    "Image alt coverage requires DAM metadata pass (not yet instrumented)",
    "Internal link graph requires body-link crawl (not yet instrumented)",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="SEO operations"
        description="Monitor metadata health, index readiness, and optimization opportunities"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <MetricCard
          label="SEO health score"
          value={`${avgScore}`}
          detail={`${healthy}/${articles.length} strong`}
          trend={avgScore >= 70 ? "up" : "down"}
        />
        <MetricCard
          label="Missing metadata"
          value={missingMeta.length}
          detail="Title or description"
          trend={missingMeta.length ? "down" : "up"}
        />
        <MetricCard label="Missing alt tags" value={missingAlt} detail="Needs DAM scan" />
        <MetricCard label="Missing internal links" value={missingLinks} detail="Needs body crawl" />
        <MetricCard
          label="Keyword coverage"
          value={articles.length - missingKeyword.length}
          detail={`${missingKeyword.length} missing`}
        />
        <MetricCard
          label="Organic traffic"
          value={monthlyViews.toLocaleString()}
          detail="Pageviews · 30d proxy"
          trend={monthlyViews ? "up" : "neutral"}
        />
        <MetricCard label="Sitemap status" value="Live" detail="/sitemap.xml" trend="up" />
        <MetricCard
          label="Index coverage"
          value={articles.length - noindex.length}
          detail={`${noindex.length} noindex`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <CmsPanel title="SEO opportunities" description="Stories below optimization threshold">
          {!opportunities.length ? (
            <CmsEmptyState
              title="SEO looks healthy"
              description="Recent stories clear the 75-point metadata bar."
            />
          ) : (
            <div className="divide-y divide-border">
              {opportunities.map(({ article, score }) => {
                const gaps = [
                  !article.seo_title?.trim() && "title",
                  !article.meta_description?.trim() && "description",
                  !article.focus_keyword?.trim() && "keyword",
                  !article.canonical_url?.trim() && "canonical",
                  article.robots_index === false && "noindex",
                ].filter(Boolean);
                return (
                  <div key={article.id} className="flex items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      {canViewArticles ? (
                        <Link
                          to="/admin/articles/$id"
                          params={{ id: article.id }}
                          className="truncate text-sm font-semibold hover:text-cat-blue"
                        >
                          {article.title}
                        </Link>
                      ) : (
                        <div className="truncate text-sm font-semibold">{article.title}</div>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {gaps.map((gap) => (
                          <CmsStatus key={String(gap)} tone="warning">
                            {gap}
                          </CmsStatus>
                        ))}
                      </div>
                    </div>
                    <div className="cms-metric text-sm font-semibold">{score}</div>
                    <StatusBadge status={article.status}>{article.status}</StatusBadge>
                  </div>
                );
              })}
            </div>
          )}
        </CmsPanel>

        <ChartCard title="SEO health mix" description="Score distribution">
          <DonutChart data={healthMix} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CmsPanel title="Content optimization suggestions" description="Desk checklist">
          <ul className="space-y-2 p-5 text-sm text-muted-foreground">
            {suggestions.map((item) => (
              <li key={item} className="border border-border px-3 py-2 text-foreground/90">
                {item}
              </li>
            ))}
          </ul>
        </CmsPanel>

        <CmsPanel title="Top ranking articles" description="Highest SEO scores among published">
          {!topRanking.length ? (
            <CmsEmptyState title="No published SEO leaders" description="Publish optimized stories." />
          ) : (
            <div className="divide-y divide-border">
              {topRanking.map(({ article, score }, index) => (
                <div key={article.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      #{index + 1} {article.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {article.focus_keyword || "No focus keyword"}
                    </div>
                  </div>
                  <div className="cms-metric font-semibold">{score}</div>
                </div>
              ))}
            </div>
          )}
        </CmsPanel>
      </div>
    </div>
  );
}
