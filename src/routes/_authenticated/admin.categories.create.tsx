import { createFileRoute } from "@tanstack/react-router";
import { CategoryWizardPage } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/create")({
  component: CreateCategoryPage,
});

function CreateCategoryPage() {
  return <CategoryWizardPage />;
}
