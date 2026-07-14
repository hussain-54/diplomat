import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/epaper")({
  head: () => ({
    meta: [
      { title: "E-Paper — Diplomacy Lens" },
      { name: "description", content: "Read today's edition in the classic print layout." },
      { property: "og:title", content: "Diplomacy Lens E-Paper" },
      { property: "og:description", content: "Read today's edition in the classic print layout." },
    ],
  }),
  component: EpaperPage,
});

function EpaperPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-crimson">Today's Edition</p>
            <h1 className="font-serif text-4xl font-bold text-ink md:text-5xl">E-Paper</h1>
            <p className="mt-1 text-sm text-muted-foreground">{today}</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-sm border border-input px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent">
              Download PDF
            </button>
            <button className="rounded-sm bg-crimson px-4 py-2 text-xs font-semibold uppercase tracking-wider text-crimson-foreground hover:opacity-90">
              Read Full Edition
            </button>
          </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="group cursor-pointer">
              <div className="relative aspect-[3/4] overflow-hidden border border-border bg-muted">
                <div className="absolute inset-0 flex flex-col p-6">
                  <div className="border-b-2 border-ink pb-2 text-center">
                    <p className="font-serif text-sm font-bold text-ink">DIPLOMACY LENS</p>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Page {n}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-3/4 bg-ink/80" />
                    <div className="h-2 w-full bg-muted-foreground/40" />
                    <div className="h-2 w-full bg-muted-foreground/40" />
                    <div className="h-2 w-5/6 bg-muted-foreground/40" />
                    <div className="mt-4 h-20 w-full bg-muted-foreground/20" />
                    <div className="h-2 w-full bg-muted-foreground/40" />
                    <div className="h-2 w-4/6 bg-muted-foreground/40" />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Page {n}
              </p>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
