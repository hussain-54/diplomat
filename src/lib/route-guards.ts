import { redirect } from "@tanstack/react-router";

const EDITOR_ROLES = new Set(["super_admin", "section_editor"]);

export function requireEditorRoute(roles: readonly string[] | undefined) {
  if (!roles?.some((role) => EDITOR_ROLES.has(role))) {
    throw redirect({ to: "/admin" });
  }
}

export function requireSuperAdminRoute(roles: readonly string[] | undefined) {
  if (!roles?.includes("super_admin")) {
    throw redirect({ to: "/admin" });
  }
}
