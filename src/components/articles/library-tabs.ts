import type { ArticlesLibraryTab } from "@/lib/admin.functions";

export const ARTICLES_LIBRARY_TABS: Array<{
  id: ArticlesLibraryTab;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "review", label: "Review" },
  { id: "scheduled", label: "Scheduled" },
  { id: "archived", label: "Archived" },
  { id: "breaking", label: "Breaking" },
  { id: "featured", label: "Featured" },
  { id: "google_news", label: "Google News" },
  { id: "discover", label: "Discover" },
];

export function isArticlesLibraryTab(value: unknown): value is ArticlesLibraryTab {
  return (
    typeof value === "string" &&
    ARTICLES_LIBRARY_TABS.some((tab) => tab.id === value)
  );
}

export function matchesLibraryTab(
  article: {
    status: string;
    badge_type: string;
    is_featured?: boolean | null;
    google_news?: boolean | null;
    google_discover?: boolean | null;
  },
  tab: ArticlesLibraryTab,
) {
  switch (tab) {
    case "all":
      return true;
    case "published":
    case "draft":
    case "review":
    case "scheduled":
    case "archived":
      return article.status === tab;
    case "breaking":
      return article.badge_type === "breaking";
    case "featured":
      return Boolean(article.is_featured);
    case "google_news":
      return Boolean(article.google_news);
    case "discover":
      return Boolean(article.google_discover);
    default:
      return true;
  }
}
