import { createFileRoute } from "@tanstack/react-router";
import { TagsTrendingPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/trending")({
  component: TagsTrendingPage,
});
