import { createFileRoute } from "@tanstack/react-router";
import { CategoryWizardPage } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/$id/edit")({
  component: EditCategoryPage,
});

function EditCategoryPage() {
  const { id } = Route.useParams();
  return <CategoryWizardPage categoryId={id} />;
}
