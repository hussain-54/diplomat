import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  LayoutDashboard,
  List,
  PlusSquare,
  Search,
  Tag,
  TrendingUp,
  Upload,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type TagsNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  exact?: boolean;
  countKey?: "all" | "published" | "draft" | "seoReady";
};

export const TAGS_SIDEBAR_ITEMS: TagsNavItem[] = [
  {
    to: "/admin/tags",
    label: "Tags Dashboard",
    icon: LayoutDashboard,
    permission: "tags:manage",
    exact: true,
  },
  {
    to: "/admin/tags/all",
    label: "All Tags",
    icon: List,
    permission: "tags:manage",
    countKey: "all",
  },
  {
    to: "/admin/tags/create",
    label: "Create Tag",
    icon: PlusSquare,
    permission: "tags:manage",
  },
  {
    to: "/admin/tags/analytics",
    label: "Tag Analytics",
    icon: BarChart3,
    permission: "tags:manage",
  },
  {
    to: "/admin/tags/trending",
    label: "Trending Tags",
    icon: TrendingUp,
    permission: "tags:manage",
  },
  {
    to: "/admin/tags/import-export",
    label: "Import / Export",
    icon: Upload,
    permission: "tags:manage",
  },
  {
    to: "/admin/tags/seo",
    label: "SEO Tags",
    icon: Search,
    permission: "tags:manage",
    countKey: "seoReady",
  },
  {
    to: "/admin/tags/activity",
    label: "Activity Logs",
    icon: Activity,
    permission: "tags:manage",
  },
];

export const TAGS_PRIMARY_TABS: TagsNavItem[] = [
  ...TAGS_SIDEBAR_ITEMS.slice(0, 3),
];

export const TAGS_MORE_ITEMS: TagsNavItem[] = TAGS_SIDEBAR_ITEMS.slice(3);

export const TAGS_PROFILE_TABS = [
  { to: "profile", label: "Overview", icon: Tag, suffix: "" },
  { to: "analytics", label: "Analytics", icon: BarChart3, suffix: "/analytics" },
] as const;

export const TAGS_STATIC_SEGMENTS = new Set([
  "all",
  "create",
  "analytics",
  "trending",
  "import-export",
  "seo",
  "activity",
]);

export function isTagsNavActive(pathname: string, item: TagsNavItem): boolean {
  if (item.exact) {
    return pathname === "/admin/tags" || pathname === "/admin/tags/";
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function tagProfilePath(id: string, tab: "profile" | "analytics") {
  if (tab === "profile") return `/admin/tags/${id}`;
  return `/admin/tags/${id}/analytics`;
}
