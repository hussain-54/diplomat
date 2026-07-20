import { Link } from "@tanstack/react-router";
import { CmsEmptyState, CmsPanel } from "@/components/cms";

export function ArticlesScheduledCalendar({
  mode,
  items,
}: {
  mode: "calendar" | "timeline";
  items: Array<{
    id: string;
    title: string;
    scheduled_at?: string | null;
    hero_image_url?: string | null;
    sections?: { name?: string } | null;
  }>;
}) {
  const withDates = items.filter((i) => i.scheduled_at);

  if (mode === "timeline") {
    return (
      <CmsPanel title="Schedule timeline">
        {withDates.length === 0 ? (
          <CmsEmptyState title="Nothing scheduled" description="Schedule articles to populate the timeline." />
        ) : (
          <ol className="relative space-y-4 border-l border-border/60 pl-4">
            {withDates.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-xs text-muted-foreground">
                  {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : "—"}
                </p>
                <Link
                  to="/admin/articles/$id"
                  params={{ id: item.id }}
                  className="font-medium hover:text-primary"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CmsPanel>
    );
  }

  const byDay = new Map<string, typeof withDates>();
  for (const item of withDates) {
    const key = item.scheduled_at!.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <CmsPanel title="Schedule calendar">
      {days.length === 0 ? (
        <CmsEmptyState title="No scheduled days" description="Pick a future publish time on an article." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {days.map(([day, list]) => (
            <div key={day} className="rounded-xl border border-border/60 bg-card p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <ul className="space-y-2">
                {list.map((item) => (
                  <li key={item.id} className="flex gap-2 text-sm">
                    {item.hero_image_url ? (
                      <img src={item.hero_image_url} alt="" className="h-10 w-12 rounded object-cover" />
                    ) : (
                      <div className="h-10 w-12 rounded bg-muted" />
                    )}
                    <div className="min-w-0">
                      <Link
                        to="/admin/articles/$id"
                        params={{ id: item.id }}
                        className="font-medium line-clamp-2 hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">
                        {item.scheduled_at
                          ? new Date(item.scheduled_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                        {item.sections && typeof item.sections === "object" && "name" in item.sections
                          ? ` · ${(item.sections as { name?: string }).name}`
                          : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CmsPanel>
  );
}
