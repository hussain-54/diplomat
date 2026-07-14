import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site-shell";
import { getAllVideos } from "@/lib/content.functions";

const qo = queryOptions({ queryKey: ["videos"], queryFn: () => getAllVideos() });

export const Route = createFileRoute("/video")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  head: () => ({ meta: [{ title: "Video — Diplomacy Lens" }] }),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(qo);
  return (
    <SiteShell>
      <div className="border-b border-border bg-navy text-navy-foreground">
        <div className="mx-auto max-w-[1400px] px-4 py-10">
          <div className="eyebrow text-navy-foreground/60">Video</div>
          <h1 className="mt-1 font-serif text-5xl">Dispatches on tape</h1>
        </div>
      </div>
      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-10 md:grid-cols-2 lg:grid-cols-3">
        {data.map((v) => (
          <div key={v.id} className="group cursor-pointer">
            <div className="flex aspect-video items-center justify-center bg-navy text-navy-foreground">
              <span className="text-xl font-semibold">▶ {v.duration}</span>
            </div>
            <div className="mt-3 eyebrow text-muted-foreground">{v.category}</div>
            <h3 className="mt-1 font-serif text-xl text-ink group-hover:text-crimson">{v.title}</h3>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
