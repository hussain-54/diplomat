import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/content-score")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Content Score"
      description="SEO, readability, structure, media, and linking scored out of 100."
      icon={Search}
      phaseHint="Phase 24"
      primaryAction={{ label: "All Articles", to: "/admin/articles/all" }}
    />
  ),
});
