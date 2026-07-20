import { useQuery } from "@tanstack/react-query";
import { getRolesMatrix } from "@/lib/staff.functions";
import { ROLE_LABELS, type AppRole, type Permission } from "@/lib/permissions";
import {
  CmsAlert,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
} from "@/components/cms";
import { cn } from "@/lib/utils";

export function StaffRolesPage() {
  const matrixQ = useQuery({ queryKey: ["roles-matrix"], queryFn: getRolesMatrix });

  if (matrixQ.isLoading) return <CmsPageSkeleton metrics={0} panels={2} />;
  if (matrixQ.error) return <CmsAlert>{matrixQ.error.message}</CmsAlert>;

  const roles = matrixQ.data?.roles ?? [];
  const allPerms = Array.from(
    new Set(roles.flatMap((r) => r.permissions)),
  ) as Permission[];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Roles & permissions"
        description="Read-only matrix of the newsroom RBAC model. Assign roles on each user profile — custom per-user overrides are not supported (RLS-safe)."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => (
          <CmsPanel key={r.role} title={r.label}>
            <p className="mb-2 text-xs text-muted-foreground">{r.permissions.length} permissions</p>
            <div className="flex flex-wrap gap-1">
              {r.permissions.slice(0, 8).map((p) => (
                <span key={p} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                  {p}
                </span>
              ))}
              {r.permissions.length > 8 ? (
                <span className="text-[10px] text-muted-foreground">+{r.permissions.length - 8}</span>
              ) : null}
            </div>
          </CmsPanel>
        ))}
      </div>

      <CmsPanel title="Permission matrix">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-3 font-semibold">Permission</th>
                {roles.map((r) => (
                  <th key={r.role} className="px-1 py-2 text-center font-semibold">
                    {ROLE_LABELS[r.role as AppRole].split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPerms.map((perm) => (
                <tr key={perm} className="border-b border-border/40">
                  <td className="py-2 pr-3 font-medium">{perm}</td>
                  {roles.map((r) => {
                    const has = r.permissions.includes(perm);
                    return (
                      <td key={r.role} className="px-1 py-2 text-center">
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            has ? "bg-cat-green" : "bg-muted",
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CmsPanel>
    </div>
  );
}
