import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  FolderTree,
  History,
  LayoutDashboard,
  List,
  PlusSquare,
  Settings2,
  Upload,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type CategoriesNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  exact?: boolean;
  countKey?: "all" | "active" | "hidden" | "featured";
};

export const CATEGORIES_SIDEBAR_ITEMS: CategoriesNavItem[] = [
  {
    to: "/admin/categories",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "categories:manage",
    exact: true,
  },
  {
    to: "/admin/categories/all",
    label: "All Categories",
    icon: List,
    permission: "categories:manage",
    countKey: "all",
  },
  {
    to: "/admin/categories/create",
    label: "Create Category",
    icon: PlusSquare,
    permission: "categories:manage",
  },
  {
    to: "/admin/categories/import-export",
    label: "Import / Export",
    icon: Upload,
    permission: "categories:manage",
  },
  {
    to: "/admin/categories/activity",
    label: "Activity Logs",
    icon: History,
    permission: "categories:manage",
  },
  {
    to: "/admin/categories/settings",
    label: "Module Settings",
    icon: Settings2,
    permission: "categories:manage",
  },
];

export const CATEGORIES_PRIMARY_TABS: CategoriesNavItem[] = [
  ...CATEGORIES_SIDEBAR_ITEMS.slice(0, 3),
];

export const CATEGORIES_MORE_ITEMS: CategoriesNavItem[] = [
  CATEGORIES_SIDEBAR_ITEMS[3],
  CATEGORIES_SIDEBAR_ITEMS[4],
  CATEGORIES_SIDEBAR_ITEMS[5],
];

export const CATEGORIES_PROFILE_TABS = [
  { to: "profile", label: "Overview", icon: FolderTree, suffix: "" },
  { to: "articles", label: "Articles", icon: List, suffix: "/articles" },
  { to: "analytics", label: "Analytics", icon: BarChart3, suffix: "/analytics" },
  { to: "settings", label: "Settings", icon: Settings2, suffix: "/settings" },
] as const;

export const CATEGORIES_STATIC_SEGMENTS = new Set([
  "all",
  "create",
  "import-export",
  "activity",
  "settings",
]);

export function isCategoriesNavActive(pathname: string, item: CategoriesNavItem): boolean {
  if (item.exact) {
    return pathname === "/admin/categories" || pathname === "/admin/categories/";
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function categoryProfilePath(id: string, tab: "profile" | "articles" | "analytics" | "settings") {
  if (tab === "profile") return `/admin/categories/${id}`;
  if (tab === "articles") return `/admin/categories/${id}/articles`;
  if (tab === "analytics") return `/admin/categories/${id}/analytics`;
  return `/admin/categories/${id}/settings`;
}
