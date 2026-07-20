import { createFileRoute } from "@tanstack/react-router";
import { ArticlesQueuePage } from "@/components/articles/articles-queue-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/trash")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:delete"),
  component: () => <ArticlesQueuePage queue="trash" />,
});
