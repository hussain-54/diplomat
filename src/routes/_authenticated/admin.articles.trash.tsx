import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/trash")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:delete"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Queue"
      title="Trash"
      description="Soft-delete restore and permanent purge. Requires deleted_at migration in Phase 17."
      icon={Trash2}
      phaseHint="Phase 17"
      primaryAction={{ label: "All Articles", to: "/admin/articles/all" }}
    />
  ),
});
