import { createFileRoute } from "@tanstack/react-router";
import { ArticlesQueuePage } from "@/components/articles/articles-queue-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/approved")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:review"),
  component: () => <ArticlesQueuePage queue="approved" />,
});
