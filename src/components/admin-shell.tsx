import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
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
import { getMe } from "@/lib/admin.functions";
import {
  hasPermission,
  ROLE_LABELS,
  type Permission,
  type AppRole,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

const NAV: Array<{
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  permission: Permission;
  exact?: boolean;
}> = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, permission: "dashboard:view", exact: true },
  { to: "/admin/articles", label: "Articles", icon: FileText, permission: "articles:view" },
  { to: "/admin/categories", label: "Categories", icon: FolderTree, permission: "categories:manage" },
  { to: "/admin/staff", label: "Authors & Staff", icon: Users, permission: "staff:manage" },
  { to: "/admin/media", label: "Media Library", icon: ImagePlus, permission: "media:view" },
  { to: "/admin/comments", label: "Comments", icon: MessageSquareText, permission: "comments:moderate" },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics:view" },
  { to: "/admin/settings", label: "Settings", icon: Settings, permission: "settings:manage" },
];

const PAGE_NAMES = [...NAV].sort((a, b) => b.to.length - a.to.length);

function initialTheme() {
  if (typeof window === "undefined") return false;
  const saved = window.localStorage.getItem("newsroom-theme");
  if (saved) return saved === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(initialTheme);
  const roles = meQ.data?.roles ?? [];
  const visibleNav = useMemo(
    () => NAV.filter((item) => hasPermission(roles, item.permission)),
    [roles],
  );
  const pageName =
    PAGE_NAMES.find((item) =>
      item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to),
    )?.label ?? "Newsroom";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("newsroom-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: "/admin" }, replace: true });
  };

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Diplomacy Lens home">
          <div className="flex h-8 w-8 items-center justify-center bg-foreground font-mono text-[11px] font-bold text-background">
            DL
          </div>
          <div>
            <div className="text-[13px] font-bold tracking-tight text-foreground">Diplomacy Lens</div>
            <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Newsroom CMS
            </div>
          </div>
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

      <div className="border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-cat-green" />
          Desk online
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3" aria-label="Newsroom navigation">
        {visibleNav.map((item) => {
          const active = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex h-9 items-center gap-2.5 px-2.5 text-[13px] font-medium cms-transition",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 opacity-80" />
              <span className="flex-1">{item.label}</span>
              {active ? <ChevronRight className="h-3.5 w-3.5 opacity-70" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2.5">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center bg-muted font-mono text-xs font-bold text-foreground">
            {(meQ.data?.profile?.name ?? "E").slice(0, 1).toUpperCase()}
          </div>
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
        </div>
      </div>
    </aside>
  );

  return (
    <div className="cms-app min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
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

      <div className="lg:pl-64">
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
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
