import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Eye,
  FileEdit,
  FilePenLine,
  FileText,
  Gauge,
  GitBranch,
  Globe,
  History,
  LayoutDashboard,
  Link2,
  List,
  PlusSquare,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type ArticlesNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  exact?: boolean;
  params?: Record<string, string>;
  phaseHint?: string;
  /** Badge key from articles library / metrics counts */
  countKey?:
    | "all"
    | "draft"
    | "review"
    | "approved"
    | "scheduled"
    | "published"
    | "archived"
    | "trash";
};

/** Main CMS sidebar accordion children (Content → Articles) */
export const ARTICLES_SIDEBAR_ITEMS: ArticlesNavItem[] = [
  {
    to: "/admin/articles",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "articles:view",
    exact: true,
  },
  {
    to: "/admin/articles/all",
    label: "All Articles",
    icon: FileText,
    permission: "articles:view",
    countKey: "all",
  },
  {
    to: "/admin/articles/create",
    label: "Create Article",
    icon: PlusSquare,
    permission: "articles:create",
  },
  {
    to: "/admin/articles/drafts",
    label: "Drafts",
    icon: FileEdit,
    permission: "articles:view",
    countKey: "draft",
  },
  {
    to: "/admin/articles/review",
    label: "Pending Review",
    icon: ClipboardCheck,
    permission: "articles:view",
    countKey: "review",
  },
  {
    to: "/admin/articles/approved",
    label: "Approved",
    icon: CheckCircle2,
    permission: "articles:review",
    countKey: "approved",
  },
  {
    to: "/admin/articles/scheduled",
    label: "Scheduled",
    icon: CalendarClock,
    permission: "articles:view",
    countKey: "scheduled",
  },
  {
    to: "/admin/articles/published",
    label: "Published",
    icon: Globe,
    permission: "articles:view",
    countKey: "published",
  },
  {
    to: "/admin/articles/archived",
    label: "Archived",
    icon: Archive,
    permission: "articles:view",
    countKey: "archived",
  },
  {
    to: "/admin/articles/trash",
    label: "Trash",
    icon: Trash2,
    permission: "articles:delete",
    countKey: "trash",
  },
  {
    to: "/admin/articles/revisions",
    label: "Revisions",
    icon: History,
    permission: "articles:view",
  },
  {
    to: "/admin/articles/workflow",
    label: "Workflow",
    icon: GitBranch,
    permission: "articles:review",
  },
];

/** Primary status tabs — always visible in the Articles top bar */
export const ARTICLES_PRIMARY_TABS: ArticlesNavItem[] = [
  { to: "/admin/articles/all", label: "All", icon: List, permission: "articles:view" },
  { to: "/admin/articles/drafts", label: "Drafts", icon: FilePenLine, permission: "articles:view" },
  { to: "/admin/articles/review", label: "Review", icon: ClipboardList, permission: "articles:view" },
  {
    to: "/admin/articles/scheduled",
    label: "Scheduled",
    icon: CalendarClock,
    permission: "articles:view",
  },
  {
    to: "/admin/articles/published",
    label: "Published",
    icon: FileText,
    permission: "articles:view",
  },
  {
    to: "/admin/articles/archived",
    label: "Archived",
    icon: Archive,
    permission: "articles:view",
  },
];

/** Secondary tools — live under the More menu */
export const ARTICLES_MORE_ITEMS: ArticlesNavItem[] = [
  {
    to: "/admin/articles",
    label: "Dashboard",
    icon: Gauge,
    permission: "articles:view",
    exact: true,
  },
  {
    to: "/admin/articles/approved",
    label: "Approved",
    icon: CheckCircle2,
    permission: "articles:review",
  },
  {
    to: "/admin/articles/trash",
    label: "Trash",
    icon: Trash2,
    permission: "articles:delete",
  },
  {
    to: "/admin/articles/workflow",
    label: "Workflow",
    icon: Workflow,
    permission: "articles:review",
  },
  {
    to: "/admin/articles/revisions",
    label: "Revision History",
    icon: History,
    permission: "articles:view",
  },
  {
    to: "/admin/articles/preview",
    label: "Preview",
    icon: Eye,
    permission: "articles:view",
  },
  {
    to: "/admin/articles/ai-writing",
    label: "AI Writing",
    icon: Bot,
    permission: "articles:create",
    phaseHint: "Phase 20",
  },
  {
    to: "/admin/articles/ai-seo",
    label: "AI SEO",
    icon: Sparkles,
    permission: "articles:edit_own",
    phaseHint: "Phase 21",
  },
  {
    to: "/admin/articles/related",
    label: "Related Articles",
    icon: GitBranch,
    permission: "articles:view",
    phaseHint: "Phase 22",
  },
  {
    to: "/admin/articles/internal-linking",
    label: "Internal Linking",
    icon: Link2,
    permission: "articles:edit_own",
    phaseHint: "Phase 23",
  },
  {
    to: "/admin/articles/content-score",
    label: "Content Score",
    icon: Search,
    permission: "articles:view",
    phaseHint: "Phase 24",
  },
  {
    to: "/admin/articles/settings",
    label: "Article Settings",
    icon: Settings2,
    permission: "articles:edit_all",
    phaseHint: "Phase 25",
  },
];

/** @deprecated Prefer ARTICLES_PRIMARY_TABS + ARTICLES_MORE_ITEMS */
export const ARTICLES_NAV = [
  { label: "Overview", items: ARTICLES_PRIMARY_TABS.slice(0, 1) },
  { label: "Workflow queues", items: ARTICLES_PRIMARY_TABS.slice(1) },
  { label: "Tools", items: ARTICLES_MORE_ITEMS },
];

/** Static path segments reserved so `$id` never captures them */
export const ARTICLES_STATIC_SEGMENTS = new Set([
  "all",
  "drafts",
  "review",
  "approved",
  "scheduled",
  "published",
  "archived",
  "trash",
  "workflow",
  "revisions",
  "preview",
  "ai-writing",
  "ai-seo",
  "related",
  "internal-linking",
  "content-score",
  "settings",
  "create",
]);

export function isArticlesPrimaryPath(pathname: string): boolean {
  return ARTICLES_PRIMARY_TABS.some(
    (tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`),
  );
}

export function isArticlesNavActive(pathname: string, item: ArticlesNavItem): boolean {
  if (item.exact) {
    return pathname === "/admin/articles" || pathname === "/admin/articles/";
  }
  if (item.to === "/admin/articles/create") {
    return (
      pathname === "/admin/articles/create" ||
      pathname === "/admin/articles/new" ||
      pathname.startsWith("/admin/articles/new/")
    );
  }
  if (item.params) {
    return pathname.includes("/new") && item.label === "Create Article";
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
