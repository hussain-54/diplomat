import { createFileRoute } from "@tanstack/react-router";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/drafts")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: () => (
    <ArticlesListPanel
      eyebrow="Articles · Queue"
      title="Drafts"
      description="Work-in-progress stories. Incomplete fields and SEO status deepen in Phase 11."
      lockedStatus="draft"
    />
  ),
});
