import { createFileRoute } from "@tanstack/react-router";
import { StaffListPanel } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/pending")({
  component: () => (
    <StaffListPanel
      forcedStatus="invited"
      title="Pending approvals"
      description="Users with invited status awaiting activation."
    />
  ),
});
