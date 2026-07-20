import { createFileRoute } from "@tanstack/react-router";
import { TagActivityPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/activity")({
  component: TagActivityPage,
});
