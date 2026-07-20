import { createFileRoute } from "@tanstack/react-router";
import { CategoriesListPanel } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/all")({
  component: CategoriesListPanel,
});
