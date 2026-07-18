import { createFileRoute } from "@tanstack/react-router";
import { Link2 } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/internal-linking")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:edit_own"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Internal Linking"
      description="Link opportunities, existing links, and broken-link detection."
      icon={Link2}
      phaseHint="Phase 23"
      primaryAction={{ label: "All Articles", to: "/admin/articles/all" }}
    />
  ),
});
