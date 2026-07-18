import { createFileRoute } from "@tanstack/react-router";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { isArticlesLibraryTab } from "@/components/articles/library-tabs";
import { requirePermissionRoute } from "@/lib/route-guards";
import type { ArticlesLibraryTab } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/articles/all")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  validateSearch: (search: Record<string, unknown>): { tab: ArticlesLibraryTab } => ({
    tab: isArticlesLibraryTab(search.tab) ? search.tab : "all",
  }),
  component: AllArticlesPage,
});

function AllArticlesPage() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  return (
    <ArticlesListPanel
      eyebrow="Articles · Library"
      title="All Articles"
      description="Browse the full catalog by status and placement — counts update with the newsroom."
      libraryMode
      libraryTab={tab}
      onLibraryTabChange={(next) => {
        void navigate({ search: { tab: next }, replace: true });
      }}
    />
  );
}
