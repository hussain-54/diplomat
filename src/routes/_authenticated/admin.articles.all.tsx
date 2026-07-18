import { createFileRoute } from "@tanstack/react-router";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/all")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: AllArticlesPage,
});

function AllArticlesPage() {
  return (
    <ArticlesListPanel
      eyebrow="Articles · Library"
      title="All Articles"
      description="Search, filter, and manage the full newsroom catalog."
    />
  );
}
