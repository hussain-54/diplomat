import { Link } from "@tanstack/react-router";
import { timeAgo } from "@/lib/format";

type Badge = "none" | "breaking" | "live" | "exclusive" | "opinion" | "premium" | "alert";

export function BadgePill({ type }: { type: Badge }) {
  if (!type || type === "none") return null;
  const styles: Record<string, string> = {
    breaking: "bg-crimson text-crimson-foreground",
    live: "bg-crimson text-crimson-foreground live-dot",
    alert: "bg-crimson text-crimson-foreground",
    exclusive: "bg-navy text-navy-foreground",
    opinion: "bg-gold text-gold-foreground",
    premium: "bg-gold text-gold-foreground",
  };
  const label: Record<string, string> = {
    breaking: "Breaking",
    live: "Live",
    alert: "Alert",
    exclusive: "Exclusive",
    opinion: "Opinion",
    premium: "Premium",
  };
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${styles[type]}`}
    >
      {label[type]}
    </span>
  );
}

export interface ArticleCardArticle {
  slug: string;
  title: string;
  deck?: string | null;
  hero_image_url?: string | null;
  badge_type: Badge;
  region?: string | null;
  published_at?: string | null;
}

export function ArticleCard({
  article,
  size = "md",
}: {
  article: ArticleCardArticle;
  size?: "sm" | "md" | "lg";
}) {
  const titleClass =
    size === "lg"
      ? "text-3xl md:text-4xl"
      : size === "sm"
      ? "text-base"
      : "text-xl";
  return (
    <Link
      to="/article/$slug"
      params={{ slug: article.slug }}
      className="group block"
    >
      {article.hero_image_url && (
        <div className="mb-3 aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={article.hero_image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <BadgePill type={article.badge_type} />
        {article.region && (
          <span className="eyebrow text-muted-foreground">{article.region}</span>
        )}
      </div>
      <h3 className={`headline-serif mt-2 ${titleClass} group-hover:text-crimson`}>
        {article.title}
      </h3>
      {size !== "sm" && article.deck && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{article.deck}</p>
      )}
      <div className="mt-2 text-xs text-muted-foreground">{timeAgo(article.published_at)}</div>
    </Link>
  );
}
