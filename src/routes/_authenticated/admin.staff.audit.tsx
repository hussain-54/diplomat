import { createFileRoute } from "@tanstack/react-router";
import { StaffAuditPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/audit")({
  component: StaffAuditPage,
});
