import { createFileRoute } from "@tanstack/react-router";
import { StaffRolesPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/roles")({
  component: StaffRolesPage,
});
