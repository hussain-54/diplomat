import { createFileRoute } from "@tanstack/react-router";
import { CategoryAnalyticsPage, CategoryProfileShell } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/$id/analytics")({
  component: CategoryAnalyticsRoute,
});

function CategoryAnalyticsRoute() {
  const { id } = Route.useParams();
  return (
    <CategoryProfileShell categoryId={id}>
      <CategoryAnalyticsPage categoryId={id} />
    </CategoryProfileShell>
  );
}
