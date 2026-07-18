import { useMemo, useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Search,
  Share2,
  Newspaper,
} from "lucide-react";
import { ArticleBody } from "@/components/article-body";
import { CmsPanel, CmsStatus, SegmentedControl, SegmentedItem } from "@/components/cms";
import { SITE_NAME, absoluteUrl, articleSeo, siteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ArticleRow = Database["public"]["Tables"]["articles"]["Row"] & {
  author?: { id?: string; name?: string | null; avatar_url?: string | null } | null;
  sections?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
};

export type PreviewMode =
  | "desktop"
  | "tablet"
  | "mobile"
  | "serp"
  | "social"
  | "google_news";

const DEVICE_WIDTH: Record<"desktop" | "tablet" | "mobile", number> = {
  desktop: 1120,
  tablet: 768,
  mobile: 390,
};

const MODES: Array<{ id: PreviewMode; label: string; icon: typeof Monitor }> = [
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "serp", label: "Google Search", icon: Search },
  { id: "social", label: "Social", icon: Share2 },
  { id: "google_news", label: "Google News", icon: Newspaper },
];

export function ArticlePreviewStudio({ article }: { article: ArticleRow }) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const seo = useMemo(() => articleSeo(article as Parameters<typeof articleSeo>[0]), [article]);
  const author = Array.isArray(article.author) ? article.author[0] : article.author;
  const section = Array.isArray(article.sections) ? article.sections[0] : article.sections;
  const host = (() => {
    try {
      return new URL(seo.canonical).hostname.replace(/^www\./, "");
    } catch {
      return "diplomacylens.com";
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl className="flex-wrap">
          {MODES.map((item) => {
            const Icon = item.icon;
            return (
              <SegmentedItem
                key={item.id}
                active={mode === item.id}
                onClick={() => setMode(item.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </SegmentedItem>
            );
          })}
        </SegmentedControl>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          {mode in DEVICE_WIDTH ? (
            <span className="font-mono">{DEVICE_WIDTH[mode as keyof typeof DEVICE_WIDTH]}px</span>
          ) : (
            <span>Distribution preview</span>
          )}
        </div>
      </div>

      {mode === "desktop" || mode === "tablet" || mode === "mobile" ? (
        <DeviceFrame width={DEVICE_WIDTH[mode]} label={mode}>
          <ArticleReaderPreview
            article={article}
            authorName={author?.name}
            sectionName={section?.name}
            compact={mode === "mobile"}
          />
        </DeviceFrame>
      ) : null}

      {mode === "serp" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CmsPanel title="SEO preview" description="How this story may appear in Google Search">
            <div className="p-5">
              <GoogleSerpCard
                title={seo.title}
                description={seo.description}
                url={seo.canonical}
                keyword={article.focus_keyword ?? ""}
                publicationName={SITE_NAME}
              />
            </div>
          </CmsPanel>
          <CmsPanel title="SEO checklist" description="Signals used for this preview">
            <ul className="divide-y divide-border text-sm">
              <CheckRow ok={Boolean(article.seo_title?.trim())} label="Custom SEO title" />
              <CheckRow ok={Boolean(article.meta_description?.trim())} label="Meta description" />
              <CheckRow ok={Boolean(article.focus_keyword?.trim())} label="Focus keyword" />
              <CheckRow ok={article.robots_index !== false} label="Indexable (robots)" />
              <CheckRow ok={Boolean(seo.image)} label="Share / OG image" />
              <CheckRow
                ok={(article.seo_title || article.title).length >= 50 && (article.seo_title || article.title).length <= 60}
                label="Title length 50–60"
              />
            </ul>
          </CmsPanel>
        </div>
      ) : null}

      {mode === "social" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CmsPanel title="Open Graph preview" description="Facebook / LinkedIn-style card">
            <div className="p-5">
              <OpenGraphCard
                host={host}
                title={seo.ogTitle}
                description={seo.ogDescription}
                image={seo.image}
              />
            </div>
          </CmsPanel>
          <CmsPanel title="Twitter / X preview" description={`${seo.twitterCard} card`}>
            <div className="p-5">
              <TwitterCard
                host={host}
                title={seo.twitterTitle}
                description={seo.twitterDescription}
                image={seo.twitterImage}
                large={seo.twitterCard === "summary_large_image"}
              />
            </div>
          </CmsPanel>
        </div>
      ) : null}

      {mode === "google_news" ? (
        <CmsPanel title="Google News preview" description="Headline pack style (approximate)">
          <div className="space-y-4 p-5">
            <GoogleNewsCard
              title={seo.title}
              source={SITE_NAME}
              image={seo.image}
              publishedAt={article.published_at}
              section={section?.name}
            />
            <p className="text-xs text-muted-foreground">
              Inclusion depends on Google News policies and feed signals
              {article.google_news ? " · marked for Google News in desk flags" : " · not flagged for Google News"}.
              Canonical: {seo.canonical || absoluteUrl(`/article/${article.slug}`, siteUrl())}
            </p>
          </div>
        </CmsPanel>
      ) : null}
    </div>
  );
}

function DeviceFrame({
  width,
  label,
  children,
}: {
  width: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto border border-border bg-muted/30 p-4 sm:p-6">
      <div
        className="mx-auto overflow-hidden border border-border bg-background shadow-sm"
        style={{ width: `min(100%, ${width}px)` }}
      >
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-2 truncate font-mono text-[10px] text-muted-foreground capitalize">
            {label} · reader chrome
          </span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ArticleReaderPreview({
  article,
  authorName,
  sectionName,
  compact,
}: {
  article: ArticleRow;
  authorName?: string | null;
  sectionName?: string | null;
  compact?: boolean;
}) {
  return (
    <article className={cn("bg-background", compact ? "px-4 py-5" : "px-8 py-8 sm:px-12")}>
      {sectionName ? (
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-crimson">
          {sectionName}
        </div>
      ) : null}
      <h1
        className={cn(
          "mt-2 font-serif font-semibold tracking-tight text-foreground",
          compact ? "text-2xl leading-snug" : "text-4xl leading-tight",
        )}
      >
        {article.title}
      </h1>
      {article.deck ? (
        <p
          className={cn(
            "mt-3 text-muted-foreground",
            compact ? "text-sm leading-relaxed" : "text-lg leading-relaxed",
          )}
        >
          {article.deck}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-b border-border pb-4 text-xs text-muted-foreground">
        <span>{authorName ?? "Staff"}</span>
        {article.published_at ? (
          <span>{new Date(article.published_at).toLocaleString()}</span>
        ) : (
          <span>Not published</span>
        )}
        <span className="font-mono">/article/{article.slug}</span>
      </div>
      {article.hero_image_url ? (
        <img
          src={article.hero_image_url}
          alt=""
          className={cn("mt-6 w-full object-cover", compact ? "max-h-48" : "max-h-96")}
        />
      ) : null}
      <ArticleBody body={article.body} />
    </article>
  );
}

function GoogleSerpCard({
  title,
  description,
  url,
  keyword,
  publicationName,
}: {
  title: string;
  description: string;
  url: string;
  keyword: string;
  publicationName: string;
}) {
  const emphasize = (text: string) => {
    if (!keyword.trim()) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "ig"));
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <strong key={index}>{part}</strong>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="overflow-hidden border border-border bg-white p-4 text-[#202124]">
      <div className="flex items-center gap-2 text-xs">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f1f3f4] font-bold text-[#3c4043]">
          {publicationName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="text-[#202124]">{publicationName}</div>
          <div className="max-w-full truncate text-[10px] text-[#4d5156]">{url}</div>
        </div>
      </div>
      <div className="mt-2 line-clamp-1 font-sans text-lg leading-6 text-[#1a0dab]">
        {emphasize(title || "Headline appears here")}
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#4d5156]">
        {emphasize(
          description || "Add a meta description to explain what readers will find on this page.",
        )}
      </p>
    </div>
  );
}

function OpenGraphCard({
  host,
  title,
  description,
  image,
}: {
  host: string;
  title: string;
  description: string;
  image: string | null;
}) {
  return (
    <div className="overflow-hidden border border-border bg-background">
      {image ? (
        <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
      ) : (
        <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-xs text-muted-foreground">
          No Open Graph image
        </div>
      )}
      <div className="border-t border-border p-3">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{host}</div>
        <div className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">
          {title || "Article title"}
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {description || "Article description"}
        </p>
      </div>
    </div>
  );
}

function TwitterCard({
  host,
  title,
  description,
  image,
  large,
}: {
  host: string;
  title: string;
  description: string;
  image: string | null;
  large: boolean;
}) {
  if (!large) {
    return (
      <div className="flex overflow-hidden border border-border bg-background">
        {image ? (
          <img src={image} alt="" className="h-28 w-28 shrink-0 object-cover" />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center bg-muted text-[10px] text-muted-foreground">
            Image
          </div>
        )}
        <div className="min-w-0 p-3">
          <div className="text-[10px] text-muted-foreground">{host}</div>
          <div className="mt-1 line-clamp-2 text-sm font-semibold">{title}</div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      {image ? (
        <img src={image} alt="" className="aspect-[1.91/1] w-full object-cover" />
      ) : (
        <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-xs text-muted-foreground">
          No Twitter image
        </div>
      )}
      <div className="border-t border-border p-3">
        <div className="line-clamp-2 text-sm font-semibold">{title}</div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
        <div className="mt-2 text-[10px] text-muted-foreground">{host}</div>
      </div>
    </div>
  );
}

function GoogleNewsCard({
  title,
  source,
  image,
  publishedAt,
  section,
}: {
  title: string;
  source: string;
  image: string | null;
  publishedAt: string | null;
  section?: string | null;
}) {
  const when = publishedAt
    ? relativeTime(publishedAt)
    : "Draft — not in News yet";

  return (
    <div className="flex gap-4 border border-border bg-white p-4 text-[#202124]">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-[#5f6368]">
          {source}
          {section ? ` · ${section}` : ""}
        </div>
        <div className="mt-1 font-serif text-xl font-semibold leading-snug tracking-tight">
          {title}
        </div>
        <div className="mt-2 text-xs text-[#5f6368]">{when}</div>
      </div>
      {image ? (
        <img src={image} alt="" className="h-24 w-24 shrink-0 object-cover" />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-[#f1f3f4] text-[10px] text-[#5f6368]">
          No image
        </div>
      )}
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <span>{label}</span>
      <CmsStatus tone={ok ? "success" : "warning"}>{ok ? "Ready" : "Missing"}</CmsStatus>
    </li>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hours ago`;
  return new Date(iso).toLocaleDateString();
}
