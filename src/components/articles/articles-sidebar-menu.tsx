import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ARTICLES_SIDEBAR_ITEMS,
  isArticlesNavActive,
} from "@/components/articles/nav";
import { getArticlesLibraryCounts } from "@/lib/admin.functions";
import { hasPermission, type AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const EXPAND_KEY = "newsroom-articles-nav-expanded";

function initialExpanded() {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(EXPAND_KEY);
  if (saved === null) return true;
  return saved === "1";
}

function formatCount(value: number) {
  if (value >= 10_000) {
    const k = value / 1000;
    const rounded = k >= 100 ? Math.round(k) : Math.round(k * 10) / 10;
    return `${rounded}K`.replace(/\.0K$/, "K");
  }
  if (value >= 1000) return `${Math.round((value / 1000) * 10) / 10}K`;
  return String(value);
}

export function ArticlesSidebarMenu({
  collapsed,
  roles,
}: {
  collapsed: boolean;
  roles: AppRole[] | string[];
}) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(initialExpanded);
  const inArticles = location.pathname.startsWith("/admin/articles");

  const countsQ = useQuery({
    queryKey: ["articles-library-counts"],
    queryFn: getArticlesLibraryCounts,
    staleTime: 30_000,
    enabled: hasPermission(roles, "articles:view"),
  });

  const items = useMemo(
    () => ARTICLES_SIDEBAR_ITEMS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );

  const counts = useMemo(() => {
    const data = countsQ.data;
    return {
      all: data?.all ?? 0,
      draft: data?.draft ?? 0,
      review: data?.review ?? 0,
      approved: data?.approved ?? 0,
      scheduled: data?.scheduled ?? 0,
      published: data?.published ?? 0,
      archived: data?.archived ?? 0,
      trash: data?.trash ?? 0,
    };
  }, [countsQ.data]);

  useEffect(() => {
    window.localStorage.setItem(EXPAND_KEY, expanded ? "1" : "0");
  }, [expanded]);

  if (collapsed) {
    const link = (
      <Link
        to="/admin/articles"
        className={cn(
          "relative flex h-9 items-center justify-center rounded-lg cms-transition",
          inArticles
            ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--cms-glow),0_6px_16px_var(--cms-glow)]"
            : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
        )}
        aria-label="Articles"
      >
        <FileText className="h-4 w-4" />
        {(counts.review > 0 || counts.draft > 0) && !inArticles ? (
          <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-cat-rose" />
        ) : null}
      </Link>
    );
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">Articles</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className={cn(
          "group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium cms-transition",
          inArticles && !expanded
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
        )}
      >
        <FileText
          className={cn(
            "h-4 w-4 shrink-0",
            inArticles ? "text-primary" : "opacity-75 group-hover:opacity-100",
          )}
        />
        <span className="flex-1 truncate text-left">Articles</span>
        {counts.review > 0 ? (
          <span className="cms-metric rounded-full bg-foreground/[0.08] px-1.5 py-0.5 text-[10px] font-bold text-foreground/75">
            {formatCount(counts.review)}
          </span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-70 cms-transition",
            expanded && "rotate-180",
          )}
        />
      </button>

      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-200 ease-[var(--cms-ease)]",
          expanded ? "mt-1 max-h-[480px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <ul className="relative ml-3 space-y-0.5 border-l border-border/60 pl-3.5" role="list">
          {items.map((item) => {
            const active = isArticlesNavActive(location.pathname, item);
            const Icon = item.icon;
            const count = item.countKey != null ? counts[item.countKey] : undefined;

            return (
              <li key={item.to} className="relative">
                <span
                  className={cn(
                    "absolute -left-[17px] top-1/2 z-[1] h-1.5 w-1.5 -translate-y-1/2 rounded-full border border-border/80 bg-background cms-transition",
                    active && "border-primary bg-primary shadow-[0_0_0_3px_var(--cms-glow)]",
                  )}
                  aria-hidden
                />
                <Link
                  to={item.to}
                  className={cn(
                    "group/item flex h-8 items-center gap-2 rounded-lg px-2 text-[12.5px] font-medium cms-transition",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--cms-glow),0_6px_18px_var(--cms-glow)]"
                      : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      active
                        ? "text-primary-foreground"
                        : "opacity-70 group-hover/item:opacity-100",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {count != null && item.countKey ? (
                    <span
                      className={cn(
                        "cms-metric shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        active
                          ? "bg-white/20 text-primary-foreground"
                          : "bg-foreground/[0.08] text-muted-foreground",
                      )}
                    >
                      {formatCount(count)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}
