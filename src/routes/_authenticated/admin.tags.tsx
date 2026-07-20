import { createFileRoute } from "@tanstack/react-router";
import { TagsLayout } from "@/components/tags";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/tags")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "tags:manage"),
  component: TagsLayout,
});
