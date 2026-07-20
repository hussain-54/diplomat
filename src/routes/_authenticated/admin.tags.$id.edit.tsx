import { createFileRoute } from "@tanstack/react-router";
import { TagWizardPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/$id/edit")({
  component: EditTagPage,
});

function EditTagPage() {
  const { id } = Route.useParams();
  return <TagWizardPage tagId={id} />;
}
