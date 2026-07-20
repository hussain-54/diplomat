import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Pencil } from "lucide-react";
import { CATEGORIES_PROFILE_TABS } from "@/components/categories/nav";
import {
  CmsAlert,
  CmsPageSkeleton,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { getCategoryDetail } from "@/lib/admin.functions";
import { siteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

export function CategoryProfileShell({
  categoryId,
  children,
}: {
  categoryId: string;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const detailQ = useQuery({
    queryKey: ["category-detail", categoryId],
    queryFn: () => getCategoryDetail({ data: { id: categoryId } }),
  });

  if (detailQ.isLoading) return <CmsPageSkeleton metrics={4} panels={2} />;
  if (detailQ.error) return <CmsAlert>{detailQ.error.message}</CmsAlert>;

  const cat = detailQ.data?.category;
  if (!cat) return <CmsAlert>Category not found.</CmsAlert>;

  const liveUrl = `${siteUrl()}/section/${cat.slug}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex min-w-0 items-start gap-4">
          {cat.icon_url ? (
            <img src={cat.icon_url} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border/60" />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
              style={{ background: cat.color ?? "var(--primary)" }}
            >
              {cat.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold tracking-tight">{cat.name}</h1>
              <CmsStatus tone={cat.visibility === "public" ? "success" : "neutral"}>
                {cat.visibility === "public" ? "Active" : "Hidden"}
              </CmsStatus>
              {cat.featured ? <CmsStatus tone="warning">Featured</CmsStatus> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{cat.short_description || cat.description || "No description"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/categories/$id/edit" params={{ id: categoryId }} className={cmsSecondaryButton}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <a href={liveUrl} target="_blank" rel="noopener noreferrer" className={cmsButton}>
            <ExternalLink className="h-4 w-4" /> View category
          </a>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border/60 pb-px">
        {CATEGORIES_PROFILE_TABS.map((tab) => {
          const to =
            tab.to === "profile"
              ? "/admin/categories/$id"
              : tab.to === "articles"
                ? "/admin/categories/$id/articles"
                : tab.to === "analytics"
                  ? "/admin/categories/$id/analytics"
                  : "/admin/categories/$id/settings";
          const active =
            tab.to === "profile"
              ? location.pathname === `/admin/categories/${categoryId}` ||
                location.pathname === `/admin/categories/${categoryId}/`
              : location.pathname.startsWith(`/admin/categories/${categoryId}${tab.suffix}`);
          return (
            <Link
              key={tab.to}
              to={to}
              params={{ id: categoryId }}
              className={cn(
                "relative px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-foreground" /> : null}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

export function CategoryProfileOverview({ categoryId }: { categoryId: string }) {
  const detailQ = useQuery({
    queryKey: ["category-detail", categoryId],
    queryFn: () => getCategoryDetail({ data: { id: categoryId } }),
  });

  if (detailQ.isLoading) return <CmsPageSkeleton metrics={4} panels={2} />;
  const data = detailQ.data;
  const cat = data?.category;
  if (!cat) return null;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <CmsPanel title="Information" className="xl:col-span-2">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <Info label="Parent" value={data.parent?.name ?? "Top level"} />
          <Info label="Type" value={cat.category_type ?? "standard"} />
          <Info label="Created by" value="—" />
          <Info label="Created" value={new Date(cat.created_at).toLocaleString()} />
          <Info label="Slug" value={`/section/${cat.slug}`} />
          <Info label="Language" value={cat.language ?? "en"} />
          <Info label="Country" value={cat.country ?? "—"} />
          <Info label="Updated" value={new Date(cat.updated_at ?? cat.created_at).toLocaleString()} />
        </dl>
      </CmsPanel>

      <CmsPanel title="Statistics">
        <dl className="space-y-2 text-sm">
          <Stat label="Total articles" value={data.stats.totalArticles} />
          <Stat label="Published" value={data.stats.publishedArticles} />
          <Stat label="Drafts" value={data.stats.draftArticles} />
          <Stat label="Total views" value="—" muted />
          <Stat label="SEO score" value={data.stats.seoScore} />
          <Stat label="AI score" value={data.stats.aiScore} />
        </dl>
      </CmsPanel>

      <CmsPanel title="Top keywords">
        {data.topKeywords.length ? (
          <ul className="space-y-1 text-sm">
            {data.topKeywords.map((k) => (
              <li key={k.keyword} className="flex justify-between gap-2">
                <span>{k.keyword}</span>
                <span className="text-muted-foreground">—</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No focus keywords set.</p>
        )}
      </CmsPanel>

      <CmsPanel title="Top authors">
        {data.topAuthors.length ? (
          <ul className="space-y-2 text-sm">
            {data.topAuthors.map((a) => (
              <li key={a.name} className="flex justify-between">
                <span>{a.name}</span>
                <span className="tabular-nums text-muted-foreground">{a.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No articles yet.</p>
        )}
      </CmsPanel>

      {cat.cover_image_url ? (
        <CmsPanel title="Cover image" className="xl:col-span-2">
          <img src={cat.cover_image_url} alt="" className="max-h-48 w-full rounded-lg object-cover" />
        </CmsPanel>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}
