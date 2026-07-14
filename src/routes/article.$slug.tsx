import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { ArticleCard, BadgePill } from "@/components/article-card";
import { getArticle } from "@/lib/content.functions";
import { formatDate } from "@/lib/format";

const qo = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: () => getArticle({ data: { slug } }),
  });

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.slug));
    if (!data.article) throw notFound();
  },
  head: ({ loaderData: _ld, params }) => ({
    meta: [
      { title: `${params.slug} — Diplomacy Lens` },
    ],
  }),
  component: ArticlePage,
  notFoundComponent: () => (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-serif text-4xl text-ink">Article not found</h1>
        <p className="mt-3 text-muted-foreground">This story may have been unpublished.</p>
        <Link to="/" className="mt-6 inline-block text-crimson underline">Return home</Link>
      </div>
    </SiteShell>
  ),
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(qo(slug));
  const a = data.article!;
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-4 flex items-center gap-3">
          <BadgePill type={a.badge_type} />
          {a.region && <span className="eyebrow text-muted-foreground">{a.region}</span>}
          {a.sections && (
            <Link
              to="/section/$slug"
              params={{ slug: a.sections.slug }}
              className="eyebrow text-navy hover:text-crimson"
            >
              {a.sections.name}
            </Link>
          )}
        </div>
        <h1 className="headline-serif text-4xl md:text-5xl">{a.title}</h1>
        {a.deck && (
          <p className="mt-4 font-serif text-xl leading-relaxed text-muted-foreground">{a.deck}</p>
        )}
        <div className="mt-6 border-y border-border py-3 text-xs text-muted-foreground">
          Published {formatDate(a.published_at)}
        </div>
        {a.hero_image_url && (
          <img
            src={a.hero_image_url}
            alt=""
            width={1600}
            height={900}
            className="mt-6 aspect-[16/9] w-full object-cover"
          />
        )}
        <div className="article-body mt-8">
          {(a.body ?? "").split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>

      {data.related.length > 0 && (
        <section className="border-t border-border bg-secondary">
          <div className="mx-auto max-w-[1400px] px-4 py-12">
            <h2 className="rule-top mb-6 pt-3 font-serif text-2xl text-ink">Related coverage</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {data.related.map((r) => (
                <ArticleCard key={r.id} article={r} size="sm" />
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteShell>
  );
}
