import { createFileRoute } from "@tanstack/react-router";
import { CategoryModuleSettingsPage } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/settings")({
  component: CategoryModuleSettingsPage,
});
