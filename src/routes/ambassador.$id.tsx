import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { getAmbassador } from "@/lib/content.functions";

const qo = (id: string) =>
  queryOptions({ queryKey: ["ambassador", id], queryFn: () => getAmbassador({ data: { id } }) });

export const Route = createFileRoute("/ambassador/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(qo(params.id));
    if (!data) throw notFound();
  },
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(qo(id));
  const a = data!;
  return (
    <SiteShell>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
          <div className="aspect-square overflow-hidden rounded-sm bg-muted">
            {a.avatar_url ? (
              <img src={a.avatar_url} alt={a.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">
                {a.flag_emoji ?? "🌐"}
              </div>
            )}
          </div>
          <div>
            <div className="eyebrow text-crimson">
              {a.flag_emoji} {a.country}
            </div>
            <h1 className="mt-2 font-serif text-4xl text-ink">{a.name}</h1>
            <div className="mt-1 text-muted-foreground">{a.position}</div>
            <div className="mt-3 inline-flex rounded-sm bg-navy px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-navy-foreground">
              {a.status}
            </div>
            {a.quote && (
              <blockquote className="mt-6 border-l-4 border-gold pl-4 font-serif text-xl italic text-ink">
                "{a.quote}"
              </blockquote>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {(a.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="rounded-sm bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
