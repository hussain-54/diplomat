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
    const section = loaderData?.section;
    const name = section?.name ?? "Section";
    const title = section?.seo_title || `${name} — Diplomacy Lens`;
    const description =
      section?.meta_description ||
      section?.short_description ||
      `Latest ${name} coverage from Diplomacy Lens.`;
    const canonical = section?.canonical_url || absoluteUrl(`/section/${section?.slug ?? ""}`);
    const ogTitle = section?.og_title || title;
    const ogDescription = section?.og_description || description;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index,follow" },
        { property: "og:type", content: "website" },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDescription },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: section?.twitter_title || ogTitle },
        { name: "twitter:description", content: section?.twitter_description || ogDescription },
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
