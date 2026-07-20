import { createFileRoute } from "@tanstack/react-router";
import { CategoryDetailSettingsPage, CategoryProfileShell } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/$id/settings")({
  component: CategorySettingsRoute,
});

function CategorySettingsRoute() {
  const { id } = Route.useParams();
  return (
    <CategoryProfileShell categoryId={id}>
      <CategoryDetailSettingsPage categoryId={id} />
    </CategoryProfileShell>
  );
}
