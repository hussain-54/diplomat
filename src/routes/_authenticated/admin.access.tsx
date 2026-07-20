import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/access")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/staff/roles" });
  },
});
