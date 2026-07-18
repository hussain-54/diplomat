import {
  Activity,
  CircleAlert,
  DollarSign,
  MessageSquareText,
  Radio,
  Search,
} from "lucide-react";
import { CmsEmptyState, CmsPanel, cmsInput, cmsSecondaryButton } from "@/components/cms-ui";
import { FilterChip } from "@/components/cms";
import { SectionHeader } from "@/components/dashboard/primitives";
import {
  useDeskNotifications,
  type DeskNotification,
  type NotificationCategory,
} from "@/hooks/useDeskNotifications";
import { cn } from "@/lib/utils";

const CATEGORIES: Array<"all" | NotificationCategory> = [
  "all",
  "editorial",
  "publishing",
  "seo",
  "revenue",
  "system",
  "security",
];

export function NotificationsView({
  reviewCount,
  pendingComments,
  flaggedComments,
  alertCount,
  realtimeConnected,
  seoIssues,
  adManagerConfigured,
}: {
  reviewCount: number;
  pendingComments: number;
  flaggedComments: number;
  alertCount: number;
  realtimeConnected: boolean;
  seoIssues: number;
  adManagerConfigured: boolean;
}) {
  const now = new Date().toISOString();
  const items: DeskNotification[] = [
    {
      id: "editorial-review",
      category: "editorial",
      title: "Editorial review queue",
      detail: `${reviewCount} ${reviewCount === 1 ? "story" : "stories"} waiting`,
      href: "/admin/articles",
      active: reviewCount > 0,
      createdAt: now,
    },
    {
      id: "publishing-alerts",
      category: "publishing",
      title: "Breaking news desk",
      detail: `${alertCount} active ticker ${alertCount === 1 ? "alert" : "alerts"}`,
      active: alertCount > 0,
      createdAt: now,
    },
    {
      id: "seo-gaps",
      category: "seo",
      title: "SEO metadata gaps",
      detail: `${seoIssues} stories below optimization threshold`,
      href: "/admin",
      active: seoIssues > 0,
      createdAt: now,
    },
    {
      id: "revenue-gam",
      category: "revenue",
      title: "Ad Manager reporting",
      detail: adManagerConfigured
        ? "Network linked · currency reports still pending"
        : "Network code missing in Settings",
      href: "/admin/settings",
      active: !adManagerConfigured,
      createdAt: now,
    },
    {
      id: "system-realtime",
      category: "system",
      title: "Realtime connection",
      detail: realtimeConnected ? "Dashboard synchronized" : "Reconnecting to live channels",
      active: !realtimeConnected,
      createdAt: now,
    },
    {
      id: "security-comments",
      category: "security",
      title: "Comment moderation",
      detail: `${pendingComments} pending · ${flaggedComments} flagged`,
      href: "/admin/comments",
      active: pendingComments + flaggedComments > 0,
      createdAt: now,
    },
  ];

  const desk = useDeskNotifications(items);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notification center"
        description="Editorial, publishing, SEO, revenue, system, and security signals"
        action={
          <button type="button" className={cmsSecondaryButton} onClick={desk.markAllRead}>
            Mark all read
          </button>
        }
      />

      <CmsPanel>
        <div className="space-y-3 border-b border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className={cn(cmsInput, "sm:max-w-sm")}
              value={desk.query}
              onChange={(event) => desk.setQuery(event.target.value)}
              placeholder="Search notifications"
              aria-label="Search notifications"
            />
            <div className="text-xs text-muted-foreground">
              <span className="cms-metric font-semibold text-foreground">{desk.unreadCount}</span> unread
            </div>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={desk.unreadOnly}
                onChange={(event) => desk.setUnreadOnly(event.target.checked)}
              />
              Unread only
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat}
                active={desk.category === cat}
                onClick={() => desk.setCategory(cat)}
              >
                {cat}
              </FilterChip>
            ))}
          </div>
        </div>

        {!desk.filtered.length ? (
          <CmsEmptyState
            title="No matching notifications"
            description="Adjust filters or clear search."
          />
        ) : (
          <div className="divide-y divide-border">
            {desk.filtered.map((item) => {
              const Icon = iconFor(item.category);
              const read = desk.isRead(item.id);
              const row = (
                <>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center",
                      item.active ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("text-sm font-semibold", read && "text-muted-foreground")}>
                        {item.title}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {item.category}
                      </span>
                      {!read ? <span className="h-2 w-2 rounded-full bg-crimson" /> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.detail}</div>
                  </div>
                </>
              );
              if (item.href) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => desk.markRead(item.id)}
                    className="flex items-center gap-3 px-5 py-4 cms-transition hover:bg-accent/50"
                  >
                    {row}
                  </a>
                );
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => desk.markRead(item.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left cms-transition hover:bg-accent/50"
                >
                  {row}
                </button>
              );
            })}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

function iconFor(category: NotificationCategory) {
  switch (category) {
    case "editorial":
      return CircleAlert;
    case "publishing":
      return Radio;
    case "seo":
      return Search;
    case "revenue":
      return DollarSign;
    case "security":
      return MessageSquareText;
    default:
      return Activity;
  }
}
