import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { ArticleCard } from "@/components/article-card";
import { getLatestArticles } from "@/lib/content.functions";

const qo = queryOptions({ queryKey: ["latest"], queryFn: () => getLatestArticles() });

export const Route = createFileRoute("/popular")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  head: () => ({ meta: [{ title: "Popular — Diplomacy Lens" }] }),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(qo);
  const featured = data.filter((a) => a.badge_type === "exclusive" || a.badge_type === "breaking");
  const list = featured.length ? featured : data.slice(0, 12);
  return (
    <SiteShell>
      <div className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-[1400px] px-4 py-10">
          <div className="eyebrow text-crimson">Popular</div>
          <h1 className="mt-1 font-serif text-5xl text-ink">Most read this week</h1>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
