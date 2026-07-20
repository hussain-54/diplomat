import { createFileRoute } from "@tanstack/react-router";
import { CategoryArticlesPanel, CategoryProfileShell } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/$id/articles")({
  component: CategoryArticlesRoute,
});

function CategoryArticlesRoute() {
  const { id } = Route.useParams();
  return (
    <CategoryProfileShell categoryId={id}>
      <CategoryArticlesPanel categoryId={id} />
    </CategoryProfileShell>
  );
}
