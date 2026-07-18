import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/admin.functions";
import {
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@/lib/permissions";

export function RoleGuard({
  permission,
  roles,
  fallback = null,
  mode = "hide",
  children,
}: {
  permission: Permission | Permission[];
  roles?: string[];
  fallback?: ReactNode;
  mode?: "hide" | "disable";
  children: ReactNode;
}) {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !roles,
  });

  const resolvedRoles = roles ?? me.data?.roles;
  const allowed = Array.isArray(permission)
    ? hasAnyPermission(resolvedRoles, permission)
    : hasPermission(resolvedRoles, permission);

  if (me.isLoading && !roles) {
    return mode === "disable" ? (
      <div className="pointer-events-none opacity-50">{children}</div>
    ) : null;
  }

  if (!allowed) {
    if (mode === "disable") {
      return <div className="pointer-events-none opacity-50">{children}</div>;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
