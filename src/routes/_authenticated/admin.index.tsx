import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listAdminArticles, getMe } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const articles = useQuery({ queryKey: ["admin-articles"], queryFn: () => listAdminArticles() });

  const list = articles.data ?? [];
  const published = list.filter((a) => a.status === "published").length;
  const review = list.filter((a) => a.status === "review");
  const drafts = list.filter((a) => a.status === "draft").length;
  const bySection: Record<string, number> = {};
  for (const a of list) {
    const section = a.sections as { name?: string } | { name?: string }[] | null | undefined;
    const name = Array.isArray(section)
      ? (section[0]?.name ?? "Unassigned")
      : (section?.name ?? "Unassigned");
    bySection[name] = (bySection[name] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Newsroom overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back, {me.data?.profile?.name ?? "editor"}.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Stat label="Published" value={published} accent="bg-navy text-navy-foreground" />
        <Stat label="In review" value={review.length} accent="bg-gold text-gold-foreground" />
        <Stat label="Drafts" value={drafts} accent="bg-muted text-foreground" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-sm border border-border bg-card p-5">
          <h2 className="eyebrow text-crimson">Pending review</h2>
          <div className="mt-3 divide-y divide-border">
            {review.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">Nothing in the queue.</p>
            ) : (
              review.map((a) => (
                <Link
                  key={a.id}
                  to="/admin/articles/$id"
                  params={{ id: a.id }}
                  className="block py-3 hover:text-crimson"
                >
                  <div className="font-serif text-base text-ink">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {(Array.isArray(a.sections)
                      ? a.sections[0]?.name
                      : (a.sections as { name?: string } | null)?.name) ?? "—"}{" "}
                    · updated {new Date(a.updated_at).toLocaleString()}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-sm border border-border bg-card p-5">
          <h2 className="eyebrow text-crimson">By section</h2>
          <div className="mt-3 space-y-2 text-sm">
            {Object.entries(bySection).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between border-b border-border pb-2">
                <span>{name}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <div className={`inline-flex rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${accent}`}>
        {label}
      </div>
      <div className="mt-2 font-serif text-4xl text-ink">{value}</div>
    </div>
  );
}
