import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TAGS_SIDEBAR_ITEMS, isTagsNavActive } from "@/components/tags/nav";
import { getTagsLibraryCounts } from "@/lib/admin.functions";
import { hasPermission, type AppRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const EXPAND_KEY = "newsroom-tags-nav-expanded";

function initialExpanded() {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(EXPAND_KEY);
  if (saved === null) return true;
  return saved === "1";
}

export function TagsSidebarMenu({
  collapsed,
  roles,
}: {
  collapsed: boolean;
  roles: AppRole[] | string[];
}) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(initialExpanded);
  const inTags = location.pathname.startsWith("/admin/tags");

  const countsQ = useQuery({
    queryKey: ["tags-library-counts"],
    queryFn: getTagsLibraryCounts,
    staleTime: 30_000,
    enabled: hasPermission(roles, "tags:manage"),
  });

  const items = useMemo(
    () => TAGS_SIDEBAR_ITEMS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );

  const counts = countsQ.data ?? { all: 0, published: 0, draft: 0, seoReady: 0 };

  useEffect(() => {
    window.localStorage.setItem(EXPAND_KEY, expanded ? "1" : "0");
  }, [expanded]);

  if (collapsed) {
    const link = (
      <Link
        to="/admin/tags"
        className={cn(
          "relative flex h-9 items-center justify-center rounded-lg cms-transition",
          inTags
            ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--cms-glow),0_6px_16px_var(--cms-glow)]"
            : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
        )}
        aria-label="Tags"
      >
        <Tag className="h-4 w-4" />
      </Link>
    );
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">Tags</TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium cms-transition",
          inTags
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
        )}
      >
        <Tag className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">Tags</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <ul className="mt-0.5 space-y-0.5 border-l border-border/60 ml-4 pl-2">
          {items.map((item) => {
            const active = isTagsNavActive(location.pathname, item);
            const badge =
              item.countKey && counts[item.countKey] > 0 ? counts[item.countKey] : null;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium cms-transition",
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {badge ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
