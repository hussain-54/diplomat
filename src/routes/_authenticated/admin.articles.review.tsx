import { createFileRoute } from "@tanstack/react-router";
import { ArticlesListPanel } from "@/components/articles/articles-list-panel";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/review")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: () => (
    <ArticlesListPanel
      title="Pending Review"
      description="Stories awaiting editorial review."
      lockedStatus="review"
    />
  ),
});
