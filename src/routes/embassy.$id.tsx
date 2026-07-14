import { createFileRoute, notFound } from "@tanstack/react-router";
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
      </div>
    </SiteShell>
  );
}
