import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMe } from "@/lib/admin.functions";
import { hasPermission } from "@/lib/permissions";
import { ARTICLES_NAV } from "@/components/articles/nav";
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

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const groups = useMemo(
    () =>
      ARTICLES_NAV.map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(roles, item.permission)),
      })).filter((group) => group.items.length > 0),
    [roles],
  );

  const nav = (
    <nav className="space-y-5" aria-label="Articles navigation">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {group.label}
          </div>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact
                ? location.pathname === "/admin/articles" ||
                  location.pathname === "/admin/articles/"
                : item.params
                  ? location.pathname.includes("/new") && item.label === "Create Article"
                  : location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`);
              const Icon = item.icon;
              return (
                <li key={`${item.to}-${item.label}`}>
                  <Link
                    to={item.to}
                    params={item.params}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 text-[13px] font-medium cms-transition",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.phaseHint ? (
                      <span
                        className={cn(
                          "text-[9px] font-semibold uppercase tracking-wide",
                          active ? "text-background/70" : "text-muted-foreground/70",
                        )}
                      >
                        soon
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border border-border bg-card px-4 py-3 lg:hidden">
        <div>
          <div className="eyebrow text-[9px]">Content</div>
          <div className="text-sm font-semibold">Articles</div>
        </div>
        <button
          type="button"
          className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label="Toggle articles menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border border-border bg-card p-3 lg:hidden">{nav}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border border-border bg-card p-3 lg:block lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <div className="mb-4 border-b border-border px-2 pb-3">
            <div className="eyebrow text-[9px]">Content</div>
            <div className="text-sm font-semibold tracking-tight">Articles</div>
          </div>
          {nav}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
