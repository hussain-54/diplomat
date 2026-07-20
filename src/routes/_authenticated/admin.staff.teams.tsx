import { createFileRoute } from "@tanstack/react-router";
import { StaffTeamsPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/teams")({
  component: StaffTeamsPage,
});
