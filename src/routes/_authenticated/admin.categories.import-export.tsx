import { createFileRoute } from "@tanstack/react-router";
import { CategoryImportExportPage } from "@/components/categories";

export const Route = createFileRoute("/_authenticated/admin/categories/import-export")({
  component: CategoryImportExportPage,
});
