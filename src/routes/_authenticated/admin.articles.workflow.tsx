import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { ArticlesToolPage } from "@/components/articles/articles-tool-page";
import { CmsPanel } from "@/components/cms";
import { requirePermissionRoute } from "@/lib/route-guards";

const STAGES = ["Draft", "Editor Review", "Fact Check", "Approved", "Scheduled", "Published"];

export const Route = createFileRoute("/_authenticated/admin/articles/workflow")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:review"),
  component: WorkflowPage,
});

function WorkflowPage() {
  return (
    <ArticlesToolPage
      eyebrow="Articles · Tools"
      title="Workflow"
      description="Newsroom stage map. Visual timeline and assignments deepen in Phase 19."
      icon={Workflow}
      phaseHint="Phase 19"
    >
      <CmsPanel title="Stage pipeline" description="Current editorial states">
        <div className="flex flex-wrap gap-2 p-5">
          {STAGES.map((stage, index) => (
            <div
              key={stage}
              className="flex items-center gap-2 border border-border bg-muted/30 px-3 py-2 text-xs font-semibold"
            >
              <span className="cms-metric text-muted-foreground">{index + 1}</span>
              {stage}
            </div>
          ))}
        </div>
      </CmsPanel>
    </ArticlesToolPage>
  );
}
