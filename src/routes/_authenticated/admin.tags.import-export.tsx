import { createFileRoute } from "@tanstack/react-router";
import { TagImportExportPage } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/import-export")({
  component: TagImportExportPage,
});
