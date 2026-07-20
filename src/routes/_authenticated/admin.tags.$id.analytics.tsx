import { createFileRoute } from "@tanstack/react-router";
import { TagDetailAnalyticsPage, TagProfileShell } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/$id/analytics")({
  component: TagAnalyticsRoute,
});

function TagAnalyticsRoute() {
  const { id } = Route.useParams();
  return (
    <TagProfileShell tagId={id}>
      <TagDetailAnalyticsPage tagId={id} />
    </TagProfileShell>
  );
}
