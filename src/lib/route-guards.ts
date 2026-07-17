import { redirect } from "@tanstack/react-router";
import { hasPermission, type Permission } from "@/lib/permissions";

export function requirePermissionRoute(
  roles: readonly string[] | undefined,
  permission: Permission,
) {
  if (!hasPermission(roles, permission)) {
    throw redirect({ to: "/admin" });
  }
}

export function requireEditorRoute(roles: readonly string[] | undefined) {
  requirePermissionRoute(roles, "newsroom:manage");
}

export function requireSuperAdminRoute(roles: readonly string[] | undefined) {
  requirePermissionRoute(roles, "staff:manage");
}
