import { createFileRoute } from "@tanstack/react-router";
import { ArticlesQueuePage } from "@/components/articles/articles-queue-page";

export const Route = createFileRoute("/_authenticated/admin/articles/published")({
  component: () => <ArticlesQueuePage queue="published" />,
});
