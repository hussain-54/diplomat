import {
  BarChart3,
  CalendarClock,
  FilePlus2,
  FolderTree,
  ImagePlus,
  Users,
} from "lucide-react";
import { SectionHeader, QuickActionCard } from "@/components/dashboard/primitives";

export function QuickActionsView() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Quick actions hub"
        description="Jump into the highest-frequency newsroom tasks"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <QuickActionCard
          title="New article"
          description="Open the block editor and start a draft"
          href="/admin/articles/$id"
          params={{ id: "new" }}
          icon={FilePlus2}
          permission="articles:create"
        />
        <QuickActionCard
          title="Upload media"
          description="Add assets to the digital library"
          href="/admin/media"
          icon={ImagePlus}
          permission="media:upload"
        />
        <QuickActionCard
          title="Create category"
          description="Add or nest a taxonomy section"
          href="/admin/categories"
          icon={FolderTree}
          permission="categories:manage"
        />
        <QuickActionCard
          title="Invite user"
          description="Add editors and assign roles"
          href="/admin/staff"
          icon={Users}
          permission="staff:manage"
        />
        <QuickActionCard
          title="View analytics"
          description="Open the full performance board"
          href="/admin/analytics"
          icon={BarChart3}
          permission="analytics:view"
        />
        <QuickActionCard
          title="Publish scheduled"
          description="Review the timed publication queue"
          href="/admin/articles"
          icon={CalendarClock}
          permission="articles:publish"
        />
      </div>
    </div>
  );
}

export const FLOATING_QUICK_ACTIONS = [
  {
    title: "New article",
    href: "/admin/articles/$id",
    params: { id: "new" },
    icon: FilePlus2,
    permission: "articles:create" as const,
  },
  {
    title: "Upload media",
    href: "/admin/media",
    icon: ImagePlus,
    permission: "media:upload" as const,
  },
  {
    title: "Create category",
    href: "/admin/categories",
    icon: FolderTree,
    permission: "categories:manage" as const,
  },
  {
    title: "Invite user",
    href: "/admin/staff",
    icon: Users,
    permission: "staff:manage" as const,
  },
  {
    title: "View analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    permission: "analytics:view" as const,
  },
  {
    title: "Scheduled queue",
    href: "/admin/articles",
    icon: CalendarClock,
    permission: "articles:publish" as const,
  },
];
