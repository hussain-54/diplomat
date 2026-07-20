import { createFileRoute } from "@tanstack/react-router";
import { ArticlesQueuePage } from "@/components/articles/articles-queue-page";

export const Route = createFileRoute("/_authenticated/admin/articles/scheduled")({
  component: () => <ArticlesQueuePage queue="scheduled" />,
});
