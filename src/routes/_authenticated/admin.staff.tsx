import { createFileRoute } from "@tanstack/react-router";
import { StaffLayout } from "@/components/staff";
import { requireSuperAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  beforeLoad: ({ context }) => requireSuperAdminRoute(context.roles),
  component: StaffLayout,
});
