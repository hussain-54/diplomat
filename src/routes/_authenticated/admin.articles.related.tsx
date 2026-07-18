import { createFileRoute } from "@tanstack/react-router";
import { GitBranch } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/related")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Related Articles"
      description="Similarity-based related, trending, and category suggestions."
      icon={GitBranch}
      phaseHint="Phase 22"
      primaryAction={{ label: "All Articles", to: "/admin/articles/all" }}
    />
  ),
});
