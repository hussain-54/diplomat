export const APP_ROLES = [
  "super_admin",
  "editor_in_chief",
  "managing_editor",
  "section_editor",
  "reporter",
  "contributor",
  "photographer",
  "videographer",
  "fact_checker",
  "translator",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  editor_in_chief: "Editor In Chief",
  managing_editor: "Managing Editor",
  section_editor: "Section Editor",
  reporter: "Reporter",
  contributor: "Contributor",
  photographer: "Photographer",
  videographer: "Videographer",
  fact_checker: "Fact Checker",
  translator: "Translator",
};

export const PERMISSIONS = [
  "dashboard:view",
  "articles:view",
  "articles:create",
  "articles:edit_own",
  "articles:edit_all",
  "articles:review",
  "articles:publish",
  "articles:delete",
  "categories:manage",
  "staff:manage",
  "media:view",
  "media:upload",
  "media:manage_all",
  "comments:moderate",
  "analytics:view",
  "settings:manage",
  "newsroom:manage",
  "videos:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const editorialLeadership: Permission[] = [
  "dashboard:view",
  "articles:view",
  "articles:create",
  "articles:edit_own",
  "articles:edit_all",
  "articles:review",
  "articles:publish",
  "articles:delete",
  "categories:manage",
  "media:view",
  "media:upload",
  "media:manage_all",
  "comments:moderate",
  "analytics:view",
  "newsroom:manage",
  "videos:manage",
];

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  editor_in_chief: editorialLeadership,
  managing_editor: editorialLeadership,
  section_editor: [
    "dashboard:view",
    "articles:view",
    "articles:create",
    "articles:edit_own",
    "articles:edit_all",
    "articles:review",
    "articles:publish",
    "articles:delete",
    "media:view",
    "media:upload",
    "comments:moderate",
    "analytics:view",
  ],
  reporter: [
    "dashboard:view",
    "articles:view",
    "articles:create",
    "articles:edit_own",
    "media:view",
    "media:upload",
  ],
  contributor: [
    "dashboard:view",
    "articles:view",
    "articles:create",
    "articles:edit_own",
    "media:view",
  ],
  photographer: ["dashboard:view", "media:view", "media:upload"],
  videographer: ["dashboard:view", "media:view", "media:upload", "videos:manage"],
  fact_checker: ["dashboard:view", "articles:view", "articles:review", "media:view"],
  translator: [
    "dashboard:view",
    "articles:view",
    "articles:create",
    "articles:edit_own",
    "media:view",
  ],
};

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function normalizeRoles(roles: readonly string[] | undefined): AppRole[] {
  return (roles ?? []).filter(isAppRole);
}

export function hasPermission(
  roles: readonly string[] | undefined,
  permission: Permission,
): boolean {
  return normalizeRoles(roles).some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

export function hasAnyPermission(
  roles: readonly string[] | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(roles, permission));
}
