import { createFileRoute, redirect } from "@tanstack/react-router";
import { TagProfileOverview, TagProfileShell, TAGS_STATIC_SEGMENTS } from "@/components/tags";

export const Route = createFileRoute("/_authenticated/admin/tags/$id")({
  beforeLoad: ({ params }) => {
    if (TAGS_STATIC_SEGMENTS.has(params.id)) {
      throw redirect({ href: `/admin/tags/${params.id}` });
    }
  },
  component: TagProfilePage,
});

function TagProfilePage() {
  const { id } = Route.useParams();
  return (
    <TagProfileShell tagId={id}>
      <TagProfileOverview tagId={id} />
    </TagProfileShell>
  );
}
