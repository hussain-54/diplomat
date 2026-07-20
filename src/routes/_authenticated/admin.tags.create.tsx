import { createFileRoute } from "@tanstack/react-router";
import { TagWizardPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/create")({
  component: CreateTagPage,
});

function CreateTagPage() {
  return <TagWizardPage />;
}
