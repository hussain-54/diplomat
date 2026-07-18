import { createFileRoute, redirect } from "@tanstack/react-router";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/create")({
  beforeLoad: ({ context }) => {
    requirePermissionRoute(context.roles, "articles:create");
    throw redirect({ to: "/admin/articles/$id", params: { id: "new" } });
  },
  component: () => null,
});
