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
      throw new Error(rolesError.message || "Failed to load newsroom roles");
    }

    const roleList = (roles ?? []).map((r) => r.role).filter(Boolean);
    if (!roleList.length) {
      throw new Error(
        "Your account has no newsroom role yet. Run supabase/fix-has-role-now.sql (promotes your email to super_admin), then sign out and sign in again.",
      );
    }

    return { userId: data.user.id, roles: roleList };
  },
  component: () => <Outlet />,
});
