import { createFileRoute } from "@tanstack/react-router";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/published")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: () => (
    <ArticlesListPanel
      eyebrow="Articles · Queue"
      title="Published"
      description="Live stories. Views, CTR, and engagement columns deepen in Phase 15."
      lockedStatus="published"
    />
  ),
});
