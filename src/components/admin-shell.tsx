import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderTree,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { ArticlesSidebarMenu } from "@/components/articles/articles-sidebar-menu";
import { CategoriesSidebarMenu } from "@/components/categories/categories-sidebar-menu";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardMetrics, getMe } from "@/lib/admin.functions";
import {
  hasPermission,
  ROLE_LABELS,
  type Permission,
  type AppRole,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { FloatingQuickActions } from "@/components/dashboard/primitives";
import { FLOATING_QUICK_ACTIONS } from "@/components/dashboard/quick-actions-view";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    to: string;
    label: string;
    icon: ComponentType<{ className?: string }>;
    permission: Permission;
    exact?: boolean;
    badgeKey?: "review" | "comments";
    /** Rendered as expandable Articles accordion instead of a flat link */
    expandableArticles?: boolean;
    /** Rendered as expandable Categories accordion */
    expandableCategories?: boolean;
  }>;
}> = [
  {
    label: "Content",
    items: [
      {
        to: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        permission: "dashboard:view",
        exact: true,
      },
      {
        to: "/admin/articles",
        label: "Articles",
        icon: FileText,
        permission: "articles:view",
        badgeKey: "review",
        expandableArticles: true,
      },
      {
        to: "/admin/media",
        label: "Media",
        icon: ImagePlus,
        permission: "media:view",
      },
      {
        to: "/admin/comments",
        label: "Comments",
        icon: MessageSquareText,
        permission: "comments:moderate",
        badgeKey: "comments",
      },
    ],
  },
  {
    label: "Organize",
    items: [
      {
        to: "/admin/categories",
        label: "Categories",
        icon: FolderTree,
        permission: "categories:manage",
        expandableCategories: true,
      },
      {
        to: "/admin/staff",
        label: "Staff",
        icon: Users,
        permission: "staff:manage",
      },
      {
        to: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        permission: "analytics:view",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        to: "/admin/settings",
        label: "Settings",
        icon: Settings,
        permission: "settings:manage",
      },
    ],
  },
];

const FLAT_NAV = NAV_GROUPS.flatMap((group) => group.items);
const PAGE_NAMES = [...FLAT_NAV].sort((a, b) => b.to.length - a.to.length);
const COLLAPSE_KEY = "newsroom-sidebar-collapsed";

function initialTheme() {
  if (typeof window === "undefined") return false;
  const saved = window.localStorage.getItem("newsroom-theme");
  if (saved) return saved === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function initialCollapsed() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(COLLAPSE_KEY) === "1";
}

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe(), staleTime: 60_000 });
  const metricsQ = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: getDashboardMetrics,
    staleTime: 30_000,
    enabled: hasPermission(meQ.data?.roles, "dashboard:view"),
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(initialTheme);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [fabOpen, setFabOpen] = useState(false);
  const roles = meQ.data?.roles ?? [];
  const canCreate = hasPermission(roles, "articles:create");

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => hasPermission(roles, item.permission)),
      })).filter((group) => group.items.length > 0),
    [roles],
  );

  const pageName =
    PAGE_NAMES.find((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to),
    )?.label ?? "Newsroom";

  const badges = {
    review: metricsQ.data?.pendingReview ?? 0,
    comments: (metricsQ.data?.pendingComments ?? 0) + (metricsQ.data?.flaggedComments ?? 0),
  };
  const notifyCount = badges.review + badges.comments;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("newsroom-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: "/admin" }, replace: true });
  };

  const sidebarWidth = collapsed ? "w-[76px]" : "w-[260px]";

  const sidebar = (
    <aside
      className={cn(
        "flex h-full flex-col border-r cms-transition",
        sidebarWidth,
      )}
      style={{
        background: "var(--cms-sidebar)",
        borderColor: "var(--cms-sidebar-border)",
      }}
    >
      {/* Brand / workspace */}
      <div
        className={cn(
          "flex h-14 items-center border-b",
          collapsed ? "justify-center px-2" : "gap-2 px-3",
        )}
        style={{ borderColor: "var(--cms-sidebar-border)" }}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left cms-transition hover:bg-accent/80",
                collapsed && "justify-center px-1.5",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shadow-[0_0_0_1px_var(--cms-glow)]">
                DL
              </div>
              {!collapsed ? (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold tracking-tight">
                      Diplomacy Lens
                    </div>
                    <div className="truncate text-[10px] text-muted-foreground">Newsroom</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </>
              ) : null}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Workspace
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin">Diplomacy Lens Newsroom</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/" target="_blank" rel="noreferrer">
                Open public site
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quick create */}
      {canCreate ? (
        <div className={cn("px-3 pt-3", collapsed && "px-2")}>
          <Link
            to="/admin/articles/$id"
            params={{ id: "new" }}
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-sm cms-transition hover:opacity-95",
              collapsed && "px-0",
            )}
          >
            <Plus className="h-4 w-4" />
            {!collapsed ? "New article" : null}
          </Link>
        </div>
      ) : null}

      <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4" aria-label="Newsroom navigation">
        {visibleGroups.map((group) => (
          <div key={group.label}>
            {!collapsed ? (
              <div className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                {group.label}
              </div>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                if (item.expandableArticles) {
                  return (
                    <ArticlesSidebarMenu
                      key={item.to}
                      collapsed={collapsed}
                      roles={roles}
                    />
                  );
                }
                if (item.expandableCategories) {
                  return (
                    <CategoriesSidebarMenu
                      key={item.to}
                      collapsed={collapsed}
                      roles={roles}
                    />
                  );
                }

                const active = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                const Icon = item.icon;
                const badge = item.badgeKey ? badges[item.badgeKey] : 0;
                const link = (
                  <Link
                    to={item.to}
                    className={cn(
                      "group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium cms-transition",
                      collapsed && "justify-center px-0",
                      active
                        ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--cms-glow),0_6px_16px_var(--cms-glow)]"
                        : "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary-foreground" : "opacity-75 group-hover:opacity-100",
                      )}
                    />
                    {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                    {!collapsed && badge > 0 ? (
                      <span
                        className={cn(
                          "cms-metric min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold",
                          active ? "bg-white/20 text-primary-foreground" : "bg-cat-rose text-white",
                        )}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                    {collapsed && badge > 0 ? (
                      <span className="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-cat-rose" />
                    ) : null}
                  </Link>
                );
                return (
                  <li key={item.to}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className="space-y-2 border-t p-2.5"
        style={{ borderColor: "var(--cms-sidebar-border)" }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden h-8 w-full items-center justify-center gap-2 rounded-lg text-xs text-muted-foreground cms-transition hover:bg-accent hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" /> Collapse
            </>
          )}
        </button>

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl bg-card/60 p-2 ring-1 ring-border/60",
            collapsed && "justify-center",
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cat-indigo text-xs font-bold text-primary-foreground">
            {(meQ.data?.profile?.name ?? "E").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">
                  {meQ.isLoading ? "Loading…" : meQ.data?.profile?.name ?? "Newsroom user"}
                </div>
                <div className="truncate text-[10px] capitalize text-muted-foreground">
                  {roles[0]
                    ? ROLE_LABELS[roles[0] as AppRole] ?? roles[0].replaceAll("_", " ")
                    : "No role"}
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-cat-rose/10 hover:text-cat-rose"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-cat-rose/10 hover:text-cat-rose"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="cms-app min-h-screen bg-background text-foreground">
        <div className={cn("fixed inset-y-0 left-0 z-40 hidden lg:block", sidebarWidth)}>
          {sidebar}
        </div>
        {menuOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation overlay"
            />
            <div className="relative h-full w-[260px] max-w-[85vw] shadow-2xl">{sidebar}</div>
          </div>
        ) : null}

        <div className={cn("cms-transition", collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]")}>
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/70">
                  Newsroom
                </div>
                <div className="text-sm font-semibold tracking-tight">{pageName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
                {new Intl.DateTimeFormat("en", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                }).format(new Date())}
              </span>
              <button
                type="button"
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 text-muted-foreground cms-transition hover:border-primary/30 hover:bg-accent hover:text-foreground"
                aria-label="Notifications"
                title={
                  notifyCount > 0
                    ? `${notifyCount} items need attention`
                    : "No notifications"
                }
              >
                <Bell className="h-3.5 w-3.5" />
                {notifyCount > 0 ? (
                  <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cat-rose" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 text-muted-foreground cms-transition hover:border-primary/30 hover:bg-accent hover:text-foreground"
                aria-label={dark ? "Use light mode" : "Use dark mode"}
              >
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </header>
          <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-[1680px] p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>

        <FloatingQuickActions open={fabOpen} onToggle={() => setFabOpen((v) => !v)}>
          {FLOATING_QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            if (!hasPermission(roles, action.permission)) return null;
            return (
              <Link
                key={action.title}
                to={action.href}
                params={"params" in action ? action.params : undefined}
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold cms-transition hover:border-primary/25 hover:bg-accent"
              >
                <Icon className="h-4 w-4 text-primary" />
                {action.title}
              </Link>
            );
          })}
        </FloatingQuickActions>
      </div>
    </TooltipProvider>
  );
}

export function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
      <Toaster />
    </AdminShell>
  );
}
