import { createFileRoute } from "@tanstack/react-router";
import { StaffActivityPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/activity")({
  component: StaffActivityPage,
});
