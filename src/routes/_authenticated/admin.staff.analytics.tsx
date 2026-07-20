import { createFileRoute } from "@tanstack/react-router";
import { StaffAnalyticsPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/analytics")({
  component: StaffAnalyticsPage,
});
