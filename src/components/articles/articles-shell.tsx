import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Menu, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/admin.functions";
import { hasPermission } from "@/lib/permissions";
import {
  ARTICLES_MORE_ITEMS,
  ARTICLES_PRIMARY_TABS,
  isArticlesNavActive,
} from "@/components/articles/nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cmsButton } from "@/components/cms";
import { cn } from "@/lib/utils";

export function ArticlesLayout() {
  return (
    <ArticlesShell>
      <Outlet />
    </ArticlesShell>
  );
}

function ArticlesShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 60_000 });
  const roles = me.data?.roles;
  const [mobileOpen, setMobileOpen] = useState(false);
  const canCreate = hasPermission(roles, "articles:create");

  useEffect(() => setMobileOpen(false), [location.pathname]);

  // Full-bleed newsroom workspace — hide library chrome on create/edit.
  const pathSeg = location.pathname.replace(/\/$/, "").split("/").pop() ?? "";
  const staticSegs = new Set([
    "all",
    "drafts",
    "review",
    "approved",
    "published",
    "scheduled",
    "archived",
    "trash",
    "create",
    "workflow",
    "settings",
    "ai-writing",
    "ai-seo",
    "content-score",
    "internal-linking",
    "related",
    "revisions",
    "preview",
  ]);
  const isCreateOrEdit =
    pathSeg === "new" ||
    pathSeg === "create" ||
    (!staticSegs.has(pathSeg) &&
      location.pathname.startsWith("/admin/articles/") &&
      !location.pathname.includes("/preview/") &&
      !location.pathname.includes("/revisions/"));

  const primary = useMemo(
    () => ARTICLES_PRIMARY_TABS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const more = useMemo(
    () => ARTICLES_MORE_ITEMS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const moreActive = more.some((item) => isArticlesNavActive(location.pathname, item));

  if (isCreateOrEdit) {
    return <div className="min-h-[calc(100vh-3.5rem)] bg-[#f8fafc]">{children}</div>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
              Articles
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Write, review, and publish — without the clutter.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCreate ? (
              <Link to="/admin/articles/$id" params={{ id: "new" }} className={cmsButton}>
                <Plus className="h-4 w-4" /> New article
              </Link>
            ) : null}
            <button
              type="button"
              className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle articles menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <nav
          className={cn(
            "flex flex-wrap items-center gap-1 border-b border-border/60 pb-px",
            mobileOpen ? "flex" : "hidden lg:flex",
          )}
          aria-label="Articles"
        >
          {primary.map((item) => {
            const active = isArticlesNavActive(location.pathname, item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 bg-foreground" aria-hidden />
                ) : null}
              </Link>
            );
          })}

          {more.length ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "relative inline-flex items-center gap-1 px-3 py-2.5 text-sm font-medium transition-colors outline-none",
                    moreActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  More <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  {moreActive ? (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 bg-foreground" aria-hidden />
                  ) : null}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {more.map((item, index) => {
                  const Icon = item.icon;
                  const active = isArticlesNavActive(location.pathname, item);
                  return (
                    <div key={`${item.to}-${item.label}`}>
                      {index === 3 ? <DropdownMenuSeparator /> : null}
                      <DropdownMenuItem asChild>
                        <Link
                          to={item.to}
                          params={item.params}
                          className={cn(
                            "flex cursor-pointer items-center gap-2",
                            active && "bg-accent",
                          )}
                        >
                          <Icon className="h-4 w-4 opacity-70" />
                          <span className="flex-1">{item.label}</span>
                          {item.phaseHint ? (
                            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                              soon
                            </span>
                          ) : null}
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </nav>
      </header>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
