import { createFileRoute } from "@tanstack/react-router";
import { StaffListPanel } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/all")({
  component: () => <StaffListPanel />,
});
