import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/admin.functions";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const NAV = [
  { to: "/admin", label: "Overview", exact: true },
  { to: "/admin/articles", label: "Articles" },
  { to: "/admin/ambassadors", label: "Ambassadors" },
  { to: "/admin/embassies", label: "Embassies" },
  { to: "/admin/war-monitor", label: "War Monitor" },
  { to: "/admin/ticker", label: "Ticker" },
  { to: "/admin/videos", label: "Videos" },
  { to: "/admin/access", label: "Manage Access", role: "super_admin" as const },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const me = meQ.data;
  const isSA = me?.roles.includes("super_admin");

  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b border-border bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
          <div className="flex items-baseline gap-3">
            <Link to="/" className="flex items-baseline gap-1">
              <span className="font-serif text-xl font-bold">Diplomacy</span>
              <span className="rounded-sm bg-crimson px-1 font-serif text-xl font-bold leading-none">Lens</span>
            </Link>
            <span className="text-xs uppercase tracking-widest text-navy-foreground/60">Newsroom</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-navy-foreground/70">
              {meQ.isLoading
                ? "Loading…"
                : `${me?.profile?.name ?? me?.userId?.slice(0, 8) ?? "Editor"} · ${me?.roles.join(", ") || "no role"}`}
            </span>
            <button
              onClick={async () => {
                await queryClient.cancelQueries();
                queryClient.clear();
                await supabase.auth.signOut();
                navigate({ to: "/auth", replace: true });
              }}
              className="rounded-sm border border-navy-foreground/30 px-2 py-1 uppercase tracking-widest hover:bg-navy-foreground/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1600px] gap-6 px-6 py-6">
        <aside className="w-56 flex-shrink-0">
          <nav className="space-y-1 text-sm">
            {NAV.map((n) => {
              if (n.role === "super_admin" && !isSA) return null;
              const active = n.exact
                ? location.pathname === n.to
                : location.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`block rounded-sm px-3 py-2 ${
                    active ? "bg-navy text-navy-foreground" : "text-foreground hover:bg-accent"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
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
