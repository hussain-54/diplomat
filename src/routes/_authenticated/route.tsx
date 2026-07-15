import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: `${location.pathname}${location.search}` },
      });
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    if (rolesError) {
      throw new Error(rolesError.message);
    }

    const roleList = (roles ?? []).map((r) => r.role);
    if (!roleList.length) {
      throw new Error(
        "Your account has no newsroom role yet. Sign up creates a contributor role automatically — if this persists, run the promote SQL in INTEGRATION_GUIDE.md.",
      );
    }

    return { user: data.user, roles: roleList };
  },
  component: () => <Outlet />,
});
