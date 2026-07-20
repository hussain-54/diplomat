import { createFileRoute } from "@tanstack/react-router";
import { CategoryActivityPage } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/activity")({
  component: CategoryActivityPage,
});
