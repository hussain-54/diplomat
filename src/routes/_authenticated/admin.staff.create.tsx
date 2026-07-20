import { createFileRoute } from "@tanstack/react-router";
import { StaffWizardPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/create")({
  component: () => <StaffWizardPage />,
});
