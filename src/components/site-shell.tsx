import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { getTicker, getSections } from "@/lib/content.functions";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/latest", label: "Latest" },
  { to: "/popular", label: "Popular" },
  { section: "war", label: "War" },
  { section: "ambassadors", label: "Ambassadors" },
  { section: "embassy-watch", label: "Embassy Watch" },
  { section: "pakistan", label: "Pakistan" },
  { section: "uae", label: "UAE" },
  { section: "india", label: "India" },
  { section: "world", label: "World" },
  { section: "business", label: "Business" },
  { section: "sports", label: "Sports" },
  { section: "lifestyle", label: "Lifestyle" },
  { section: "opinion", label: "Opinion" },
  { section: "sci-tech", label: "Sci-Tech" },
  { to: "/video", label: "Video" },
  { to: "/programs", label: "Programs" },
] as const;

const tickerQO = queryOptions({ queryKey: ["ticker"], queryFn: () => getTicker() });

function TopStrip() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    setNow(fmt());
    const t = setInterval(() => setNow(fmt()), 60_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="border-b border-border bg-background text-foreground">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-1.5 text-xs">
        <div className="flex items-center gap-4">
          <span className="live-dot eyebrow text-crimson">Live</span>
          <span className="hidden text-muted-foreground md:inline">{now}</span>
          <span className="hidden text-muted-foreground md:inline">· Global Diplomatic Bureau</span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <Link to="/newsletter" className="hover:text-foreground">Newsletter</Link>
          <Link to="/podcast" className="hover:text-foreground">Podcast</Link>
          <Link to="/epaper" className="hover:text-foreground">E-Paper</Link>
          <Link to="/about" className="hover:text-foreground">About</Link>
        </div>
      </div>
    </div>
  );
}

function AccountMenu() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  if (loading) return <div className="h-8 w-20" />;
  if (!user) {
    return (
      <Link
        to="/newsletter"
        className="rounded-sm bg-crimson px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-crimson-foreground hover:opacity-90"
      >
        Subscribe
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/admin"
        className="rounded-sm bg-navy px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-navy-foreground hover:opacity-90"
      >
        Newsroom
      </Link>
      <button
        onClick={async () => {
          await queryClient.cancelQueries();
          queryClient.clear();
          await supabase.auth.signOut();
          navigate({ to: "/", replace: true });
        }}
        className="rounded-sm border border-input px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-accent"
      >
        Sign out
      </button>
    </div>
  );
}

function Masthead() {
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-5">
        <Link to="/" className="flex items-baseline gap-2">
          <span className="font-serif text-3xl font-bold tracking-tight text-ink">Diplomacy</span>
          <span className="rounded-sm bg-crimson px-1.5 py-0.5 font-serif text-3xl font-bold leading-none text-crimson-foreground">
            Lens
          </span>
        </Link>
        <div className="hidden max-w-md flex-1 md:block">
          <input
            type="search"
            placeholder="Search news, ambassadors, embassies…"
            className="w-full rounded-sm border border-input bg-background px-3 py-2 text-sm outline-none focus:border-navy"
          />
        </div>
        <AccountMenu />
      </div>
    </div>
  );
}

function MainNav() {
  return (
    <nav className="sticky top-0 z-40 border-b-2 border-ink bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-[1400px] overflow-x-auto px-4">
        <ul className="flex items-center gap-1 whitespace-nowrap py-2 text-[11px] font-semibold uppercase tracking-[0.14em]">
          {NAV.map((item) => {
            if ("to" in item) {
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.to === "/" }}
                    className="px-3 py-1.5 text-foreground hover:text-crimson"
                    activeProps={{ className: "px-3 py-1.5 text-crimson" }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.section}>
                <Link
                  to="/section/$slug"
                  params={{ slug: item.section }}
                  className="px-3 py-1.5 text-foreground hover:text-crimson"
                  activeProps={{ className: "px-3 py-1.5 text-crimson" }}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

function Ticker() {
  const { data = [] } = useQuery(tickerQO);
  if (!data.length) return null;
  const items = [...data, ...data];
  return (
    <div className="border-b border-border bg-navy text-navy-foreground">
      <div className="mx-auto flex max-w-[1400px] items-stretch overflow-hidden">
        <div className="flex items-center gap-2 bg-crimson px-4 py-2 text-xs font-bold uppercase tracking-widest text-crimson-foreground">
          <span className="live-dot">Breaking</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="ticker-track flex gap-10 whitespace-nowrap py-2 pl-6 text-sm">
            {items.map((it, i) => (
              <span key={i} className="flex items-center gap-3">
                {it.tag && (
                  <span className="rounded-sm bg-navy-foreground/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                    {it.tag}
                  </span>
                )}
                <span className="text-navy-foreground/90">{it.text}</span>
                <span className="text-navy-foreground/30">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const sectionsQO = queryOptions({ queryKey: ["sections"], queryFn: () => getSections() });

function Footer() {
  const { data: sections = [] } = useQuery(sectionsQO);
  return (
    <footer className="mt-16 border-t border-border bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold">Diplomacy</span>
            <span className="rounded-sm bg-crimson px-1.5 py-0.5 font-serif text-2xl font-bold leading-none">
              Lens
            </span>
          </Link>
          <p className="mt-3 text-sm text-navy-foreground/70">
            Diplomatic intelligence and world news, from a global bureau desk.
          </p>
        </div>
        <div>
          <h4 className="eyebrow mb-3 text-navy-foreground/60">Sections</h4>
          <ul className="space-y-2 text-sm">
            {sections.slice(0, 8).map((s) => (
              <li key={s.id}>
                <Link
                  to="/section/$slug"
                  params={{ slug: s.slug }}
                  className="text-navy-foreground/80 hover:text-navy-foreground"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="eyebrow mb-3 text-navy-foreground/60">More</h4>
          <ul className="space-y-2 text-sm text-navy-foreground/80">
            <li><Link to="/video">Video</Link></li>
            <li><Link to="/programs">Programs</Link></li>
            <li><Link to="/podcast">Podcast</Link></li>
            <li><Link to="/newsletter">Newsletter</Link></li>
            <li><Link to="/epaper">E-Paper</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow mb-3 text-navy-foreground/60">Company</h4>
          <ul className="space-y-2 text-sm text-navy-foreground/80">
            <li><Link to="/about">About</Link></li>
            <li><a href="#">Careers</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">Ethics</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-foreground/10">
        <div className="mx-auto max-w-[1400px] px-4 py-4 text-xs text-navy-foreground/60">
          © {new Date().getFullYear()} Diplomacy Lens. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopStrip />
      <Masthead />
      <MainNav />
      <Ticker />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
