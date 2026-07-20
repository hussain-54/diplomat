import { createFileRoute } from "@tanstack/react-router";
import { TagsSeoPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/seo")({
  component: TagsSeoPage,
});
