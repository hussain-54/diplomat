import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteShell } from "@/components/site-shell";
import { ArticleCard, BadgePill } from "@/components/article-card";
import { ArticleBody } from "@/components/article-body";
import {
  getArticle,
  getArticleComments,
  getPublicNewsroomSettings,
  submitArticleComment,
  trackArticleView,
} from "@/lib/content.functions";
import { formatDate } from "@/lib/format";
import { articleSeo } from "@/lib/seo";

const qo = (slug: string) =>
  queryOptions({
    queryKey: ["article", slug],
    queryFn: () => getArticle({ data: { slug } }),
  });

export const Route = createFileRoute("/article/$slug")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.slug));
    if (!data.article) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    if (!article) return {};
    const seo = articleSeo(article);
    return {
      meta: [
        { title: seo.documentTitle },
        { name: "description", content: seo.description },
        { name: "robots", content: seo.robots },
        { property: "og:type", content: "article" },
        { property: "og:title", content: seo.ogTitle },
        { property: "og:description", content: seo.ogDescription },
        { property: "og:url", content: seo.canonical },
        ...(seo.image
          ? [
              { property: "og:image", content: seo.image },
              { property: "og:image:alt", content: article.title },
            ]
          : []),
        ...(article.published_at
          ? [{ property: "article:published_time", content: article.published_at }]
          : []),
        { property: "article:modified_time", content: article.updated_at },
        { name: "twitter:card", content: seo.twitterCard },
        { name: "twitter:title", content: seo.twitterTitle },
        { name: "twitter:description", content: seo.twitterDescription },
        ...(seo.twitterImage
          ? [{ name: "twitter:image", content: seo.twitterImage }]
          : []),
      ],
      links: [
        { rel: "canonical", href: seo.canonical },
        ...Object.entries(seo.hreflang).map(([hrefLang, href]) => ({
          rel: "alternate",
          hrefLang,
          href,
        })),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c"),
        },
      ],
    };
  },
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
  useEffect(() => {
    const key = `viewed:${a.id}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    void trackArticleView({ data: { articleId: a.id } });
  }, [a.id]);

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
            alt={a.title}
            width={1600}
            height={900}
            className="mt-6 aspect-[16/9] w-full object-cover"
          />
        )}
        <ArticleBody body={a.body} />
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
      <CommentsSection articleId={a.id} />
    </SiteShell>
  );
}

function CommentsSection({ articleId }: { articleId: string }) {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["public-newsroom-settings"], queryFn: getPublicNewsroomSettings });
  const comments = useQuery({
    queryKey: ["article-comments", articleId],
    queryFn: () => getArticleComments({ data: { articleId } }),
  });
  const [form, setForm] = useState({ authorName: "", authorEmail: "", body: "" });
  const [submitted, setSubmitted] = useState(false);
  const submit = useMutation({
    mutationFn: () => submitArticleComment({ data: { articleId, ...form } }),
    onSuccess: async () => {
      setSubmitted(true);
      setForm({ authorName: "", authorEmail: "", body: "" });
      await queryClient.invalidateQueries({ queryKey: ["article-comments", articleId] });
    },
  });

  if (settings.data?.comments_enabled === false) return null;

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="eyebrow text-crimson">Reader discussion</div>
          <h2 className="mt-2 font-serif text-3xl text-ink">Comments</h2>
          <div className="mt-6 divide-y divide-border">
            {comments.isLoading ? (
              <p className="py-6 text-sm text-muted-foreground">Loading comments…</p>
            ) : !comments.data?.length ? (
              <p className="py-6 text-sm text-muted-foreground">No published comments yet.</p>
            ) : (
              comments.data.map((comment) => (
                <article key={comment.id} className="py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="text-sm font-semibold text-ink">{comment.author_name}</div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>
                </article>
              ))
            )}
          </div>
        </div>
        <div className="border border-border bg-card p-5">
          <h3 className="font-sans text-sm font-semibold text-foreground">Join the discussion</h3>
          <p className="mt-1 text-xs text-muted-foreground">Comments are reviewed before publication.</p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(false);
              submit.mutate();
            }}
          >
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.authorName}
              onChange={(event) => setForm({ ...form, authorName: event.target.value })}
              placeholder="Name"
              className="h-10 w-full border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
            <input
              required
              type="email"
              value={form.authorEmail}
              onChange={(event) => setForm({ ...form, authorEmail: event.target.value })}
              placeholder="Email (not published)"
              className="h-10 w-full border border-input bg-background px-3 text-sm outline-none focus:border-ring"
            />
            <textarea
              required
              minLength={2}
              maxLength={4000}
              rows={5}
              value={form.body}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
              placeholder="Write a thoughtful comment"
              className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            />
            <button
              type="submit"
              disabled={submit.isPending}
              className="h-10 w-full bg-navy text-xs font-semibold uppercase tracking-widest text-navy-foreground disabled:opacity-50"
            >
              {submit.isPending ? "Submitting…" : "Submit comment"}
            </button>
            {submitted && (
              <p className="text-xs text-cat-green">Comment submitted for editorial review.</p>
            )}
            {submit.error && <p className="text-xs text-crimson">{submit.error.message}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}
