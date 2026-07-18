import type { ComponentType, ReactNode } from "react";
import { Bell } from "lucide-react";
import { CmsEmptyState, CmsPanel } from "@/components/cms-ui";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  icon?: ComponentType<{ className?: string }>;
  label: string;
  detail: string;
  active?: boolean;
  href?: string;
};

export function NotificationCenter({
  items,
  title = "Notifications",
  description = "Newsroom attention items",
  emptyTitle = "All clear",
  emptyDescription = "No active alerts right now.",
  className,
}: {
  items: NotificationItem[];
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  return (
    <CmsPanel title={title} description={description} className={className}>
      {!items.length ? (
        <CmsEmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </CmsPanel>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const Icon = item.icon ?? Bell;
  const content = (
    <>
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center",
          item.active ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground">{item.label}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</div>
      </div>
      {item.active && <span className="h-2 w-2 rounded-full bg-crimson" />}
    </>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-muted/40"
      >
        {content}
      </a>
    );
  }

  return <div className="flex items-center gap-3 px-5 py-4">{content}</div>;
}

export function NotificationList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("divide-y divide-border", className)}>{children}</div>;
}
