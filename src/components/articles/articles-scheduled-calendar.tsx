import { Link } from "@tanstack/react-router";
import { CmsEmptyState, CmsPanel } from "@/components/cms";

function sectionLabel(
  sections?: { name?: string } | { name?: string }[] | null,
): string {
  if (!sections) return "";
  if (Array.isArray(sections)) return sections[0]?.name ?? "";
  return sections.name ?? "";
}

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
    sections?: { name?: string } | { name?: string }[] | null;
  }>;
}) {
  const withDates = [...items]
    .filter((i) => i.scheduled_at)
    .sort(
      (a, b) =>
        new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime(),
    );

  if (mode === "timeline") {
    return (
      <CmsPanel
        title="Schedule timeline"
        description={`${withDates.length} timed ${withDates.length === 1 ? "publish" : "publishes"}`}
      >
        {withDates.length === 0 ? (
          <CmsEmptyState
            title="Nothing scheduled"
            description="Schedule articles to populate the timeline."
          />
        ) : (
          <ol className="relative space-y-4 border-l border-border/60 p-4 pl-5">
            {withDates.map((item) => {
              const section = sectionLabel(item.sections);
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-xs font-medium text-muted-foreground">
                    {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : "—"}
                  </p>
                  <div className="mt-1 flex gap-3">
                    {item.hero_image_url ? (
                      <img
                        src={item.hero_image_url}
                        alt=""
                        className="h-12 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-16 rounded-lg bg-muted" />
                    )}
                    <div className="min-w-0">
                      <Link
                        to="/admin/articles/$id"
                        params={{ id: item.id }}
                        className="font-medium hover:text-primary"
                      >
                        {item.title}
                      </Link>
                      {section ? (
                        <p className="text-[11px] text-muted-foreground">{section}</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
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
    <CmsPanel
      title="Schedule calendar"
      description={`${days.length} upcoming ${days.length === 1 ? "day" : "days"}`}
    >
      {days.length === 0 ? (
        <CmsEmptyState
          title="No scheduled days"
          description="Pick a future publish time on an article."
        />
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {days.map(([day, list]) => (
            <div
              key={day}
              className="rounded-xl border border-border/60 bg-card p-3 shadow-[var(--cms-shadow)]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <span className="cms-metric rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {list.length}
                </span>
              </div>
              <ul className="space-y-2">
                {list.map((item) => {
                  const section = sectionLabel(item.sections);
                  return (
                    <li key={item.id} className="flex gap-2 text-sm">
                      {item.hero_image_url ? (
                        <img
                          src={item.hero_image_url}
                          alt=""
                          className="h-10 w-12 rounded object-cover"
                        />
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
                          {section ? ` · ${section}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CmsPanel>
  );
}
