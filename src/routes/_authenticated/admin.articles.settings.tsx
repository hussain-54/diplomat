import { createFileRoute } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/settings")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:edit_all"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Article Settings"
      description="Publishing, SEO, social, security, comments, featured, breaking, Google News/Discover defaults."
      icon={Settings2}
      phaseHint="Phase 25"
      primaryAction={{ label: "Newsroom settings", to: "/admin/settings" }}
    />
  ),
});
