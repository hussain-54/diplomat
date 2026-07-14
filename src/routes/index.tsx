import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { ArticleCard, BadgePill } from "@/components/article-card";
import { getHomeData } from "@/lib/content.functions";
import { timeAgo } from "@/lib/format";

const qo = queryOptions({ queryKey: ["home"], queryFn: () => getHomeData() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  component: Home,
});

function warBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-crimson text-crimson-foreground",
    ceasefire: "bg-cat-green text-white",
    tension: "bg-cat-amber text-white",
  };
  return map[status] ?? "bg-muted";
}

function embassyBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-cat-green text-white",
    limited: "bg-cat-amber text-white",
    closed: "bg-muted text-foreground",
    alert: "bg-crimson text-crimson-foreground",
  };
  return map[status] ?? "bg-muted";
}

function Home() {
  const { data } = useSuspenseQuery(qo);
  const [lead, ...rest] = data.articles;
  const secondaryStack = rest.slice(0, 4);
  const grid = rest.slice(4, 13);
  const opinion = data.articles.filter((a) => a.badge_type === "opinion").slice(0, 3);
  const sports = data.articles.filter((a) => {
    const s = data.sections.find((x) => x.id === a.section_id);
    return s?.slug === "sports";
  });

  return (
    <SiteShell>
      {/* HERO */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-[1400px] px-4 py-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {lead && (
                <Link to="/article/$slug" params={{ slug: lead.slug }} className="group block">
                  {lead.hero_image_url && (
                    <div className="mb-4 aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={lead.hero_image_url}
                        alt=""
                        width={1600}
                        height={900}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <BadgePill type={lead.badge_type} />
                    {lead.region && <span className="eyebrow text-muted-foreground">{lead.region}</span>}
                  </div>
                  <h1 className="headline-serif mt-3 text-4xl md:text-5xl lg:text-6xl group-hover:text-crimson">
                    {lead.title}
                  </h1>
                  {lead.deck && (
                    <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                      {lead.deck}
                    </p>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">{timeAgo(lead.published_at)}</div>
                </Link>
              )}
            </div>
            <aside className="space-y-5 border-l border-border pl-6">
              <h2 className="eyebrow rule-top pt-3">Also making news</h2>
              {secondaryStack.map((a) => (
                <Link
                  key={a.id}
                  to="/article/$slug"
                  params={{ slug: a.slug }}
                  className="group block border-b border-border pb-4 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <BadgePill type={a.badge_type} />
                    {a.region && <span className="eyebrow text-muted-foreground">{a.region}</span>}
                  </div>
                  <h3 className="headline-serif mt-1 text-lg group-hover:text-crimson">{a.title}</h3>
                  <div className="mt-1 text-xs text-muted-foreground">{timeAgo(a.published_at)}</div>
                </Link>
              ))}
            </aside>
          </div>
        </div>
      </section>

      {/* WAR MONITOR */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto max-w-[1400px] px-4 py-10">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <div className="eyebrow text-navy-foreground/60">Global Conflict Desk</div>
              <h2 className="mt-1 font-serif text-3xl">War Monitor</h2>
            </div>
            <Link
              to="/section/$slug"
              params={{ slug: "war" }}
              className="text-xs font-semibold uppercase tracking-widest text-navy-foreground/70 hover:text-navy-foreground"
            >
              Full Coverage →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.war.map((w) => (
              <div key={w.id} className="border border-navy-foreground/15 bg-navy-foreground/[.03] p-5">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${warBadge(w.status)}`}>
                    {w.status === "active" ? "Active" : w.status === "ceasefire" ? "Ceasefire" : "Tension"}
                  </span>
                  <span className="text-[11px] text-navy-foreground/50">{timeAgo(w.updated_at)}</span>
                </div>
                <h3 className="mt-3 font-serif text-xl">{w.conflict_name}</h3>
                <div className="mt-1 text-xs text-navy-foreground/60">
                  {(w.countries ?? []).join(" · ")}
                </div>
                <p className="mt-3 text-sm text-navy-foreground/80">{w.headline}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AMBASSADORS + EMBASSY WATCH */}
      <section className="bg-background">
        <div className="mx-auto max-w-[1400px] px-4 py-12">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <div className="eyebrow text-muted-foreground">Voices from the Missions</div>
                  <h2 className="mt-1 font-serif text-3xl text-ink">Ambassadors</h2>
                </div>
                <Link to="/section/$slug" params={{ slug: "ambassadors" }} className="text-xs font-semibold uppercase tracking-widest text-navy hover:text-crimson">
                  All ambassadors →
                </Link>
              </div>
              <div className="space-y-6">
                {data.ambassadors.filter((a) => a.featured).slice(0, 2).map((a) => (
                  <Link
                    to="/ambassador/$id"
                    params={{ id: a.id }}
                    key={a.id}
                    className="group flex gap-4 border-b border-border pb-6 last:border-0"
                  >
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-sm bg-muted">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt={a.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">
                          {a.flag_emoji ?? "🌐"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="eyebrow text-muted-foreground">
                        {a.flag_emoji} {a.country}
                      </div>
                      <h3 className="mt-1 font-serif text-lg text-ink group-hover:text-crimson">{a.name}</h3>
                      <div className="text-xs text-muted-foreground">{a.position}</div>
                      {a.quote && (
                        <blockquote className="mt-2 border-l-2 border-gold pl-3 font-serif text-sm italic text-ink/80">
                          "{a.quote}"
                        </blockquote>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(a.tags ?? []).slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-5 flex items-end justify-between">
                <div>
                  <div className="eyebrow text-muted-foreground">Missions & Consulates</div>
                  <h2 className="mt-1 font-serif text-3xl text-ink">Embassy Watch</h2>
                </div>
                <Link to="/section/$slug" params={{ slug: "embassy-watch" }} className="text-xs font-semibold uppercase tracking-widest text-navy hover:text-crimson">
                  All missions →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.embassies.map((e) => (
                  <Link
                    to="/embassy/$id"
                    params={{ id: e.id }}
                    key={e.id}
                    className="group block border border-border p-4 hover:border-navy"
                  >
                    <div className="flex items-center justify-between">
                      <span className="eyebrow text-muted-foreground">{e.country}</span>
                      <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${embassyBadge(e.status)}`}>
                        {e.status}
                      </span>
                    </div>
                    <p className="mt-2 font-serif text-sm text-ink group-hover:text-crimson">{e.headline}</p>
                    <div className="mt-2 text-[11px] text-muted-foreground">Updated {timeAgo(e.updated_at)}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LATEST GRID */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto max-w-[1400px] px-4 py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="rule-top pt-3 font-serif text-3xl text-ink">Latest</h2>
            <Link to="/latest" className="text-xs font-semibold uppercase tracking-widest text-navy hover:text-crimson">
              More stories →
            </Link>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {grid.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </div>
      </section>

      {/* OPINION */}
      {opinion.length > 0 && (
        <section className="border-t border-border bg-secondary">
          <div className="mx-auto max-w-[1400px] px-4 py-12">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <div className="eyebrow text-gold">Column</div>
                <h2 className="mt-1 font-serif text-3xl text-ink">Opinion</h2>
              </div>
              <Link to="/section/$slug" params={{ slug: "opinion" }} className="text-xs font-semibold uppercase tracking-widest text-navy hover:text-crimson">
                All columns →
              </Link>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {opinion.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SPORTS ROW + VIDEO */}
      <section className="border-t border-border bg-background">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="rule-top mb-6 pt-3 font-serif text-2xl text-ink">Sports</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {sports.slice(0, 2).map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="rule-top mb-6 pt-3 font-serif text-2xl text-ink">Video Spotlight</h2>
            <div className="space-y-4">
              {data.videos.slice(0, 3).map((v) => (
                <div key={v.id} className="flex gap-3 border-b border-border pb-4 last:border-0">
                  <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center bg-navy text-navy-foreground">
                    <span className="text-xs font-semibold">▶ {v.duration}</span>
                  </div>
                  <div>
                    <div className="eyebrow text-muted-foreground">{v.category}</div>
                    <h3 className="mt-1 font-serif text-sm text-ink">{v.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
