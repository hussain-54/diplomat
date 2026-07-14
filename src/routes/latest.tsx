import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { ArticleCard } from "@/components/article-card";
import { getLatestArticles } from "@/lib/content.functions";

const qo = queryOptions({ queryKey: ["latest"], queryFn: () => getLatestArticles() });

export const Route = createFileRoute("/latest")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  head: () => ({ meta: [{ title: "Latest — Diplomacy Lens" }] }),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(qo);
  return (
    <SiteShell>
      <div className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-[1400px] px-4 py-10">
          <div className="eyebrow text-crimson">Latest</div>
          <h1 className="mt-1 font-serif text-5xl text-ink">Latest coverage</h1>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {data.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      </div>
    </SiteShell>
  );
}
