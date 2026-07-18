import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/approved")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:review"),
  component: () => (
    <ArticlesToolPage
      eyebrow="Articles · Queue"
      title="Approved"
      description="Stories cleared for schedule or publish. Formal approved status lands with the workflow upgrade (Phase 13)."
      icon={CheckCircle2}
      phaseHint="Phase 13"
      primaryAction={{ label: "Open review queue", to: "/admin/articles/review" }}
    />
  ),
});
