import { createFileRoute } from "@tanstack/react-router";
import { ArticlesLayout } from "@/components/articles/articles-shell";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: ArticlesLayout,
});
