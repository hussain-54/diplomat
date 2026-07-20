import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Clock,
  History,
  LayoutDashboard,
  List,
  Mail,
  PlusSquare,
  Shield,
  Users,
  UsersRound,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export type StaffNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  exact?: boolean;
  countKey?: "all" | "active" | "invited" | "suspended";
};

export const STAFF_SIDEBAR_ITEMS: StaffNavItem[] = [
  {
    to: "/admin/staff",
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "staff:manage",
    exact: true,
  },
  {
    to: "/admin/staff/all",
    label: "All Users",
    icon: List,
    permission: "staff:manage",
    countKey: "all",
  },
  {
    to: "/admin/staff/create",
    label: "Create User",
    icon: PlusSquare,
    permission: "staff:manage",
  },
  {
    to: "/admin/staff/roles",
    label: "Roles & Permissions",
    icon: Shield,
    permission: "staff:manage",
  },
  {
    to: "/admin/staff/teams",
    label: "Teams & Departments",
    icon: UsersRound,
    permission: "staff:manage",
  },
  {
    to: "/admin/staff/invitations",
    label: "Invitations",
    icon: Mail,
    permission: "staff:manage",
    countKey: "invited",
  },
  {
    to: "/admin/staff/pending",
    label: "Pending Approvals",
    icon: Clock,
    permission: "staff:manage",
    countKey: "invited",
  },
  {
    to: "/admin/staff/analytics",
    label: "User Analytics",
    icon: BarChart3,
    permission: "staff:manage",
  },
  {
    to: "/admin/staff/activity",
    label: "Activity Logs",
    icon: Activity,
    permission: "staff:manage",
  },
  {
    to: "/admin/staff/audit",
    label: "Audit Logs",
    icon: History,
    permission: "staff:manage",
  },
];

export const STAFF_PRIMARY_TABS: StaffNavItem[] = STAFF_SIDEBAR_ITEMS.slice(0, 4);
export const STAFF_MORE_ITEMS: StaffNavItem[] = STAFF_SIDEBAR_ITEMS.slice(4);

export const STAFF_PROFILE_TABS = [
  { to: "overview", label: "Overview", suffix: "" },
  { to: "professional", label: "Professional", suffix: "?tab=professional" },
  { to: "publishing", label: "Publishing", suffix: "?tab=publishing" },
  { to: "permissions", label: "Permissions", suffix: "?tab=permissions" },
  { to: "activity", label: "Activity", suffix: "?tab=activity" },
] as const;

export const STAFF_STATIC_SEGMENTS = new Set([
  "all",
  "create",
  "roles",
  "teams",
  "invitations",
  "pending",
  "analytics",
  "activity",
  "audit",
]);

export function isStaffNavActive(pathname: string, item: StaffNavItem): boolean {
  if (item.exact) {
    return pathname === "/admin/staff" || pathname === "/admin/staff/";
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
