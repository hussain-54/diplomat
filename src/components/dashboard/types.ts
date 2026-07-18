import type { LucideIcon } from "lucide-react";
import {
  Bell,
  DollarSign,
  FileText,
  Gauge,
  LineChart,
  Radio,
  Search,
  Zap,
} from "lucide-react";

export type DashboardView =
  | "overview"
  | "editorial"
  | "seo"
  | "analytics"
  | "revenue"
  | "realtime"
  | "notifications"
  | "actions";

export const DASHBOARD_VIEWS: Array<{ id: DashboardView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "editorial", label: "Editorial", icon: FileText },
  { id: "seo", label: "SEO", icon: Search },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "realtime", label: "Real-Time", icon: Radio },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "actions", label: "Quick Actions", icon: Zap },
];

export type DashboardArticle = {
  id: string;
  slug: string;
  title: string;
  status: string;
  badge_type?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  updated_at: string;
  section_id?: string | null;
  author_id?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  robots_index?: boolean | null;
  canonical_url?: string | null;
  sections?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
  author?: { name?: string | null } | { name?: string | null }[] | null;
};

export function sectionName(
  section: { name?: string } | { name?: string }[] | null | undefined,
) {
  return (Array.isArray(section) ? section[0]?.name : section?.name) ?? "Unassigned";
}

export function authorName(
  author: { name?: string | null } | { name?: string | null }[] | null | undefined,
) {
  return (Array.isArray(author) ? author[0]?.name : author?.name) ?? "Unassigned";
}
