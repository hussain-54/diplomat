import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/ai-seo")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:edit_own"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="AI SEO"
      description="Generate SEO titles, meta, keywords, and content-gap analysis."
      icon={Sparkles}
      phaseHint="Phase 21"
      primaryAction={{ label: "All Articles", to: "/admin/articles/all" }}
    />
  ),
});
