import { createFileRoute } from "@tanstack/react-router";
import { TagsAnalyticsPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/analytics")({
  component: TagsAnalyticsPage,
});
