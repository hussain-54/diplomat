import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { ArticleCard } from "@/components/article-card";
import { getSectionWithArticles } from "@/lib/content.functions";
import { absoluteUrl } from "@/lib/seo";

const qo = (slug: string) =>
  queryOptions({
    queryKey: ["section", slug],
    queryFn: () => getSectionWithArticles({ data: { slug } }),
  });

export const Route = createFileRoute("/section/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.slug));
    if (!data.section) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.section?.name ?? "Section";
    const title = `${name} — Diplomacy Lens`;
    const description = `Latest ${name} coverage from Diplomacy Lens.`;
    const canonical = absoluteUrl(`/section/${loaderData?.section?.slug ?? ""}`);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index,follow" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(qo(slug));
  const section = data.section!;
  return (
    <SiteShell>
      <div className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-[1400px] px-4 py-10">
          <div className="eyebrow text-crimson">Section</div>
          <h1 className="mt-1 font-serif text-5xl text-ink">{section.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.articles.length} published stories
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 py-10">
        {data.articles.length === 0 ? (
          <p className="text-muted-foreground">No articles published in this section yet.</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {data.articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
