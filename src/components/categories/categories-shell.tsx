import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Menu, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES_MORE_ITEMS,
  CATEGORIES_PRIMARY_TABS,
  isCategoriesNavActive,
} from "@/components/categories/nav";
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

export function CategoriesLayout() {
  return (
    <CategoriesShell>
      <Outlet />
    </CategoriesShell>
  );
}

function CategoriesShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, staleTime: 60_000 });
  const roles = me.data?.roles;
  const [mobileOpen, setMobileOpen] = useState(false);
  const canManage = hasPermission(roles, "categories:manage");
  const inProfile = /\/admin\/categories\/[^/]+(\/|$)/.test(location.pathname) &&
    !["all", "create", "import-export", "activity"].some((s) => location.pathname.includes(`/categories/${s}`));

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const primary = useMemo(
    () => CATEGORIES_PRIMARY_TABS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const more = useMemo(
    () => CATEGORIES_MORE_ITEMS.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const moreActive = more.some((item) => isCategoriesNavActive(location.pathname, item));

  if (inProfile) {
    return <div className="space-y-6">{children}</div>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
              Categories
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize your newsroom taxonomy, SEO, and publishing structure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage ? (
              <Link to="/admin/categories/create" className={cmsButton}>
                <Plus className="h-4 w-4" /> New category
              </Link>
            ) : null}
            <button
              type="button"
              className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Toggle categories menu"
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
          aria-label="Categories"
        >
          {primary.map((item) => {
            const active = isCategoriesNavActive(location.pathname, item);
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
