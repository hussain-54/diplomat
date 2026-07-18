import { useCallback, useMemo, useState } from "react";

export type NotificationCategory =
  | "editorial"
  | "publishing"
  | "seo"
  | "revenue"
  | "system"
  | "security";

export type DeskNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  detail: string;
  href?: string;
  active?: boolean;
  createdAt: string;
};

const STORAGE_KEY = "newsroom-notification-reads";

function readSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSet(ids: Set<string>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function useDeskNotifications(items: DeskNotification[]) {
  const [readIds, setReadIds] = useState<Set<string>>(() => readSet());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | NotificationCategory>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeSet(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.id);
      writeSet(next);
      return next;
    });
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const unread = !readIds.has(item.id);
      if (unreadOnly && !unread) return false;
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        item.category.includes(q)
      );
    });
  }, [items, readIds, query, category, unreadOnly]);

  const unreadCount = useMemo(
    () => items.filter((item) => !readIds.has(item.id)).length,
    [items, readIds],
  );

  return {
    filtered,
    unreadCount,
    query,
    setQuery,
    category,
    setCategory,
    unreadOnly,
    setUnreadOnly,
    markRead,
    markAllRead,
    isRead: (id: string) => readIds.has(id),
  };
}
