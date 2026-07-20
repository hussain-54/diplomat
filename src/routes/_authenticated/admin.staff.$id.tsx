import { createFileRoute, redirect } from "@tanstack/react-router";
import { StaffProfilePage, STAFF_STATIC_SEGMENTS } from "@/components/staff";

export const Route = createFileRoute("/_authenticated/admin/staff/$id")({
  beforeLoad: ({ params }) => {
    if (STAFF_STATIC_SEGMENTS.has(params.id)) {
      throw redirect({ href: `/admin/staff/${params.id}` });
    }
  },
  component: StaffProfileRoute,
});

function StaffProfileRoute() {
  const { id } = Route.useParams();
  return <StaffProfilePage userId={id} />;
}
