import { createFileRoute } from "@tanstack/react-router";
import { TagsListPanel } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/all")({
  component: TagsListPanel,
});
