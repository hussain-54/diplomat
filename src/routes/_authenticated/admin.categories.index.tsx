import { createFileRoute } from "@tanstack/react-router";
import { CategoriesDashboardPage } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/")({
  component: CategoriesDashboardPage,
});
