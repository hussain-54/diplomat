import { createFileRoute } from "@tanstack/react-router";
import { CategoriesLayout } from "@/components/categories";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "categories:manage"),
  component: CategoriesLayout,
});
