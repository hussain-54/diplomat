import { createFileRoute } from "@tanstack/react-router";
import { StaffDashboardPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/")({
  component: StaffDashboardPage,
});
