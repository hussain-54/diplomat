import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Menu, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  TAGS_MORE_ITEMS,
  TAGS_PRIMARY_TABS,
  TAGS_STATIC_SEGMENTS,
  isTagsNavActive,
} from "@/components/tags/nav";
import { cmsButton } from "@/components/cms";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMe } from "@/lib/admin.functions";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function TagsLayout() {
  return (
    <TagsShell>
      <Outlet />
    </TagsShell>
  );
}

function TagsShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 60_000 });
  const roles = me.data?.roles;
  const [mobileOpen, setMobileOpen] = useState(false);
  const canManage = hasPermission(roles, "tags:manage");

  const pathParts = location.pathname.replace(/\/$/, "").split("/");
  const lastSeg = pathParts[pathParts.length - 1] ?? "";
  const idCandidate = pathParts[3];
  const inProfile =
    location.pathname.startsWith("/admin/tags/") &&
    Boolean(idCandidate) &&
    !TAGS_STATIC_SEGMENTS.has(idCandidate) &&
    (lastSeg === idCandidate || lastSeg === "edit" || lastSeg === "analytics");

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const primary = useMemo(
    () => TAGS_PRIMARY_TABS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const more = useMemo(
    () => TAGS_MORE_ITEMS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const moreActive = more.some((item) => isTagsNavActive(location.pathname, item));

  if (inProfile) {
    return <div className="space-y-6">{children}</div>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
              Tags
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Newsroom tag taxonomy, SEO health, and publishing workflow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <Link to="/admin/tags/create" className={cmsButton}>
                <Plus className="h-4 w-4" /> New tag
              </Link>
            ) : null}
            <button
              type="button"
              className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle tags menu"
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
          aria-label="Tags"
        >
          {primary.map((item) => {
            const active = isTagsNavActive(location.pathname, item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
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
                    moreActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  More <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {more.map((item) => (
                  <DropdownMenuItem key={item.to} asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </nav>
      </header>
      {children}
    </div>
  );
}
