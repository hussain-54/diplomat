import { createFileRoute } from "@tanstack/react-router";
import { StaffWizardPage } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/$id/edit")({
  component: StaffEditRoute,
});

function StaffEditRoute() {
  const { id } = Route.useParams();
  return <StaffWizardPage userId={id} />;
}
