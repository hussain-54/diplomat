import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // location.search is a parsed object — use searchStr, never stringify search
      const returnTo = `${location.pathname}${location.searchStr || ""}`;
      throw redirect({
        to: "/auth",
        search: { redirect: returnTo.startsWith("/") ? returnTo : "/admin" },
      });
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    if (rolesError) {
      console.error("Failed to load newsroom roles", rolesError);
      throw new Error("Unable to verify newsroom access. Please try again.");
    }

    const roleList = (roles ?? []).map((r) => r.role).filter(Boolean);
    if (!roleList.length) {
      throw new Error("Your account does not have newsroom access. Contact an administrator.");
    }

    return { userId: data.user.id, roles: roleList };
  },
  component: () => <Outlet />,
});
