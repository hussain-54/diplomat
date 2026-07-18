import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderTree,
  ImagePlus,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV: Array<{
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: Permission;
  exact?: boolean;
  badgeKey?: "review" | "comments";
}> = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, permission: "dashboard:view", exact: true },
  { to: "/admin/articles", label: "Articles", icon: FileText, permission: "articles:view", badgeKey: "review" },
  { to: "/admin/categories", label: "Categories", icon: FolderTree, permission: "categories:manage" },
  { to: "/admin/staff", label: "Authors & Staff", icon: Users, permission: "staff:manage" },
  { to: "/admin/media", label: "Media Library", icon: ImagePlus, permission: "media:view" },
  {
    to: "/admin/comments",
    label: "Comments",
    icon: MessageSquareText,
    permission: "comments:moderate",
    badgeKey: "comments",
  },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:view" },
  { to: "/admin/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
];

const PAGE_NAMES = [...NAV].sort((a, b) => b.to.length - a.to.length);
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
  const visibleNav = useMemo(
    () => NAV.filter((item) => hasPermission(roles, item.permission)),
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

  const sidebarWidth = collapsed ? "w-[72px]" : "w-64";

  const sidebar = (
    <aside className={cn("flex h-full flex-col border-r border-border bg-card cms-transition", sidebarWidth)}>
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center px-2" : "justify-between px-4")}>
        <Link to="/" className="flex items-center gap-2.5" aria-label="Diplomacy Lens home">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-foreground font-mono text-[11px] font-bold text-background">
            DL
          </div>
          {!collapsed ? (
            <div>
              <div className="text-[13px] font-bold tracking-tight text-foreground">Diplomacy Lens</div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Newsroom CMS
              </div>
            </div>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="p-1.5 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!collapsed ? (
        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-cat-green" />
            Desk online
          </div>
        </div>
      ) : null}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3" aria-label="Newsroom navigation">
        {visibleNav.map((item) => {
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          const badge = item.badgeKey ? badges[item.badgeKey] : 0;
          const link = (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group relative flex h-9 items-center gap-2.5 px-2.5 text-[13px] font-medium cms-transition",
                collapsed && "justify-center px-0",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
              {!collapsed && active ? <ChevronRight className="h-3.5 w-3.5 opacity-70" /> : null}
              {badge > 0 ? (
                <span
                  className={cn(
                    "cms-metric absolute right-1.5 top-1 min-w-4 rounded-sm bg-crimson px-1 text-[9px] font-bold text-crimson-foreground",
                    collapsed && "right-1 top-1",
                    active && "bg-background text-foreground",
                  )}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
          if (!collapsed) return link;
          return (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="border-t border-border p-2.5">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="mb-2 hidden h-8 w-full items-center justify-center gap-2 border border-input text-xs text-muted-foreground cms-transition hover:bg-accent hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" /> Collapse
            </>
          )}
        </button>
        <div className={cn("flex items-center gap-2.5 py-2", collapsed ? "justify-center" : "px-2")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-muted font-mono text-xs font-bold text-foreground">
            {(meQ.data?.profile?.name ?? "E").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-foreground">
                  {meQ.isLoading ? "Loading…" : meQ.data?.profile?.name ?? "Newsroom user"}
                </div>
                <div className="truncate text-[10px] capitalize text-muted-foreground">
                  {roles[0] ? ROLE_LABELS[roles[0] as AppRole] ?? roles[0].replaceAll("_", " ") : "No role"}
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="p-2 text-muted-foreground cms-transition hover:bg-crimson/10 hover:text-crimson"
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
                  className="p-2 text-muted-foreground cms-transition hover:bg-crimson/10 hover:text-crimson"
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
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation overlay"
            />
            <div className="relative h-full w-64 max-w-[85vw] shadow-2xl">{sidebar}</div>
          </div>
        ) : null}

        <div className={cn("cms-transition", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="p-2 text-muted-foreground cms-transition hover:bg-accent hover:text-foreground lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <div className="eyebrow text-[9px]">Newsroom</div>
                <div className="text-sm font-semibold tracking-tight text-foreground">{pageName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden border-r border-border pr-3 font-mono text-[11px] text-muted-foreground sm:inline">
                {new Intl.DateTimeFormat("en", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date())}
              </span>
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="flex h-8 w-8 items-center justify-center border border-input text-muted-foreground cms-transition hover:border-foreground/25 hover:bg-accent hover:text-foreground"
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
            const link = (
              <Link
                key={action.title}
                to={action.href}
                params={"params" in action ? action.params : undefined}
                onClick={() => setFabOpen(false)}
                className="flex items-center gap-2 border border-border px-3 py-2.5 text-xs font-semibold cms-transition hover:bg-accent"
              >
                <Icon className="h-4 w-4" />
                {action.title}
              </Link>
            );
            if (!hasPermission(roles, action.permission)) return null;
            return link;
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
    </AdminShell>
  );
}
