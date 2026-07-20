import { createFileRoute } from "@tanstack/react-router";
import { TagsDashboardPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/")({
  component: TagsDashboardPage,
});
