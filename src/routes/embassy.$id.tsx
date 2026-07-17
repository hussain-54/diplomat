import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { getEmbassy } from "@/lib/content.functions";
import { formatDate } from "@/lib/format";

const qo = (id: string) =>
  queryOptions({ queryKey: ["embassy", id], queryFn: () => getEmbassy({ data: { id } }) });

export const Route = createFileRoute("/embassy/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.id));
    if (!data) throw notFound();
  },
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(qo(id));
  const e = data!;
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="eyebrow text-crimson">Embassy Watch</div>
        <h1 className="mt-2 font-serif text-4xl text-ink">{e.country}</h1>
        <div className="mt-3 inline-flex rounded-sm bg-navy px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-navy-foreground">
          {e.status}
        </div>
        <p className="mt-6 font-serif text-xl text-ink">{e.headline}</p>
        <div className="mt-4 text-sm text-muted-foreground">
          Last updated {formatDate(e.updated_at)}
        </div>
        {e.ambassadors && (
          <section className="mt-8 border-t border-border pt-6">
            <div className="eyebrow text-crimson">Ambassador</div>
            <Link
              to="/ambassador/$id"
              params={{ id: e.ambassadors.id }}
              className="mt-3 flex items-center gap-4 rounded-sm border border-border bg-card p-4 hover:border-navy"
            >
              {e.ambassadors.avatar_url && (
                <img
                  src={e.ambassadors.avatar_url}
                  alt={e.ambassadors.name}
                  className="h-20 w-20 rounded-sm object-cover"
                />
              )}
              <div>
                <h2 className="font-serif text-2xl text-ink">{e.ambassadors.name}</h2>
                {e.ambassadors.position && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {e.ambassadors.position}
                  </p>
                )}
              </div>
            </Link>
          </section>
        )}
      </div>
    </SiteShell>
  );
}
