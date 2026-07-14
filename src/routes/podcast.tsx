import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/podcast")({
  head: () => ({
    meta: [
      { title: "Podcast — Diplomacy Lens" },
      { name: "description", content: "Conversations with diplomats, correspondents and analysts." },
      { property: "og:title", content: "Diplomacy Lens Podcast" },
      { property: "og:description", content: "Conversations with diplomats, correspondents and analysts." },
    ],
  }),
  component: PodcastPage,
});

const EPISODES = [
  { n: 42, t: "Backchannels: A Week Inside Doha", d: "45 min", date: "Jul 12, 2026" },
  { n: 41, t: "The New Non-Aligned Movement", d: "38 min", date: "Jul 05, 2026" },
  { n: 40, t: "Ambassadors on the Record: Islamabad", d: "52 min", date: "Jun 28, 2026" },
  { n: 39, t: "Sanctions, Six Months In", d: "41 min", date: "Jun 21, 2026" },
  { n: 38, t: "Reading Beijing's White Paper", d: "47 min", date: "Jun 14, 2026" },
];

function PodcastPage() {
  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-4 py-12">
        <p className="eyebrow text-crimson">The Podcast</p>
        <h1 className="font-serif text-4xl font-bold text-ink md:text-5xl">Diplomatic Frequencies</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Weekly long-form interviews with ambassadors, foreign correspondents and policy analysts.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {["Apple Podcasts", "Spotify", "YouTube", "RSS"].map((p) => (
            <a
              key={p}
              href="#"
              className="rounded-sm border border-input px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent"
            >
              {p}
            </a>
          ))}
        </div>
        <ul className="mt-10 divide-y divide-border border-t border-border">
          {EPISODES.map((ep) => (
            <li key={ep.n} className="flex items-center justify-between gap-4 py-5">
              <div>
                <p className="eyebrow text-muted-foreground">Episode {ep.n} · {ep.date}</p>
                <h3 className="mt-1 font-serif text-xl font-bold text-ink">{ep.t}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-muted-foreground sm:inline">{ep.d}</span>
                <button className="rounded-sm bg-navy px-4 py-2 text-xs font-semibold uppercase tracking-wider text-navy-foreground hover:opacity-90">
                  Play
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
