import { createFileRoute, redirect } from "@tanstack/react-router";
import { CategoryProfileOverview, CategoryProfileShell, CATEGORIES_STATIC_SEGMENTS } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/$id")({
  beforeLoad: ({ params }) => {
    if (CATEGORIES_STATIC_SEGMENTS.has(params.id)) {
      throw redirect({ href: `/admin/categories/${params.id}` });
    }
  },
  component: CategoryProfilePage,
});

function CategoryProfilePage() {
  const { id } = Route.useParams();
  return (
    <CategoryProfileShell categoryId={id}>
      <CategoryProfileOverview categoryId={id} />
    </CategoryProfileShell>
  );
}
