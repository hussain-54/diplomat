import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/ai-writing")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:create"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="AI Writing"
      description="Headline, summary, rewrite, tone, and translation assistants."
      icon={Bot}
      phaseHint="Phase 20"
      primaryAction={{ label: "Open editor", to: "/admin/articles/$id", params: { id: "new" } }}
    />
  ),
});
