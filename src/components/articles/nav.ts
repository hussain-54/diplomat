import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bot,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Eye,
  FilePenLine,
  FilePlus2,
  FileText,
  Gauge,
  GitBranch,
  History,
  Link2,
  List,
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
  /** Static path segments that must not be captured by $id */
  exact?: boolean;
  params?: Record<string, string>;
  phaseHint?: string;
};

export type ArticlesNavGroup = {
  label: string;
  items: ArticlesNavItem[];
};

/** Phase 2 navigation IA — Content → Articles */
export const ARTICLES_NAV: ArticlesNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        to: "/admin/articles",
        label: "Dashboard",
        icon: Gauge,
        permission: "articles:view",
        exact: true,
      },
      {
        to: "/admin/articles/all",
        label: "All Articles",
        icon: List,
        permission: "articles:view",
      },
      {
        to: "/admin/articles/$id",
        label: "Create Article",
        icon: FilePlus2,
        permission: "articles:create",
        params: { id: "new" },
      },
    ],
  },
  {
    label: "Workflow queues",
    items: [
      {
        to: "/admin/articles/drafts",
        label: "Drafts",
        icon: FilePenLine,
        permission: "articles:view",
      },
      {
        to: "/admin/articles/review",
        label: "Pending Review",
        icon: ClipboardList,
        permission: "articles:view",
      },
      {
        to: "/admin/articles/approved",
        label: "Approved",
        icon: CheckCircle2,
        permission: "articles:review",
      },
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
      {
        to: "/admin/articles/trash",
        label: "Trash",
        icon: Trash2,
        permission: "articles:delete",
      },
    ],
  },
  {
    label: "Tools",
    items: [
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
    ],
  },
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
