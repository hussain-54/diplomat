import { createFileRoute } from "@tanstack/react-router";
import { StaffInvitationsPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/invitations")({
  component: StaffInvitationsPage,
});
