import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import {
  CmsPageHeader,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsInput,
} from "@/components/cms-ui";
import {
  listEditors,
  setUserRole,
  toggleSectionAccess,
  updateStaffProfile,
} from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { requireSuperAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  beforeLoad: ({ context }) => requireSuperAdminRoute(context.roles),
  component: StaffPage,
});

function StaffPage() {
  const queryClient = useQueryClient();
  const staff = useQuery({ queryKey: ["editors"], queryFn: listEditors });
  const sections = useQuery({ queryKey: ["sections"], queryFn: getSections });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", bio: "" });

  const roleMutation = useMutation({
    mutationFn: (value: { user_id: string; role: AppRole; grant: boolean }) =>
      setUserRole({ data: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["editors"] }),
  });
  const accessMutation = useMutation({
    mutationFn: (value: { profile_id: string; section_id: string; grant: boolean }) =>
      toggleSectionAccess({ data: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["editors"] }),
  });
  const profileMutation = useMutation({
    mutationFn: (value: { id: string; name: string; bio: string }) =>
      updateStaffProfile({ data: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["editors"] }),
  });

  const profiles = useMemo(() => {
    const all = staff.data?.profiles ?? [];
    const query = search.trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (profile) =>
        profile.name?.toLowerCase().includes(query) || profile.id.toLowerCase().includes(query),
    );
  }, [search, staff.data?.profiles]);
  const selected = staff.data?.profiles.find((profile) => profile.id === selectedId) ?? null;
  const roles = staff.data?.roles ?? [];
  const access = staff.data?.access ?? [];
  const hasRole = (userId: string, role: AppRole) =>
    roles.some((item) => item.user_id === userId && item.role === role);
  const hasAccess = (profileId: string, sectionId: string) =>
    access.some((item) => item.profile_id === profileId && item.section_id === sectionId);

  const openProfile = (id: string) => {
    const profile = staff.data?.profiles.find((item) => item.id === id);
    if (!profile) return;
    setSelectedId(id);
    setProfileForm({ name: profile.name ?? "", bio: profile.bio ?? "" });
  };

  const error = staff.error ?? sections.error ?? roleMutation.error ?? accessMutation.error ?? profileMutation.error;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Newsroom administration"
        title="Authors & Staff"
        description="Manage staff identities, newsroom roles, and category-level publishing access."
      />

      {error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error.message}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        <CmsPanel
          title="Newsroom directory"
          description={`${staff.data?.profiles.length ?? 0} registered staff accounts`}
          action={
            <label className="relative block w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${cmsInput} pl-9`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search staff"
              />
            </label>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Staff member</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Category access</th>
                  <th className="px-5 py-3 text-right font-semibold">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {profiles.map((profile) => {
                  const profileRoles = roles.filter((item) => item.user_id === profile.id);
                  const accessCount = access.filter((item) => item.profile_id === profile.id).length;
                  return (
                    <tr key={profile.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center bg-muted font-semibold text-foreground">
                            {(profile.name ?? "U").slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{profile.name ?? "Unnamed staff"}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{profile.id.slice(0, 12)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {profileRoles.map((item) => (
                            <CmsStatus
                              key={item.id}
                              tone={item.role === "super_admin" ? "danger" : item.role.includes("editor") ? "info" : "neutral"}
                            >
                              {ROLE_LABELS[item.role as AppRole] ?? item.role.replaceAll("_", " ")}
                            </CmsStatus>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {hasRole(profile.id, "section_editor") ||
                        hasRole(profile.id, "managing_editor") ||
                        hasRole(profile.id, "editor_in_chief") ||
                        hasRole(profile.id, "super_admin")
                          ? "All categories"
                          : `${accessCount} assigned`}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button type="button" className={cmsButton} onClick={() => openProfile(profile.id)}>
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CmsPanel>

        <CmsPanel
          title={selected ? "Staff permissions" : "Select a staff member"}
          description={selected ? "Changes take effect immediately" : "Choose a person from the directory"}
        >
          {!selected ? (
            <div className="flex min-h-96 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <UserRound className="h-8 w-8" />
              <p className="mt-3 text-sm">No staff member selected</p>
            </div>
          ) : (
            <div className="space-y-6 p-5">
              <div className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold">Display name</span>
                  <input
                    className={cmsInput}
                    value={profileForm.name}
                    onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold">Staff biography</span>
                  <textarea
                    className="min-h-24 w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                    value={profileForm.bio}
                    onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className={cmsButton}
                  disabled={profileMutation.isPending}
                  onClick={() => profileMutation.mutate({ id: selected.id, ...profileForm })}
                >
                  Save profile
                </button>
              </div>

              <div className="border-t border-border pt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="h-4 w-4" /> Newsroom roles
                </div>
                <div className="space-y-2">
                  {APP_ROLES.map((role) => (
                    <label key={role} className="flex items-center justify-between border border-border px-3 py-2">
                      <span className="text-xs">{ROLE_LABELS[role]}</span>
                      <input
                        type="checkbox"
                        checked={hasRole(selected.id, role)}
                        disabled={roleMutation.isPending}
                        onChange={(event) =>
                          roleMutation.mutate({
                            user_id: selected.id,
                            role,
                            grant: event.target.checked,
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-5">
                <div className="mb-3 text-xs font-semibold">Category publishing access</div>
                <div className="grid grid-cols-2 gap-2">
                  {(sections.data ?? []).map((section) => (
                    <label key={section.id} className="flex items-center gap-2 border border-border px-3 py-2 text-xs">
                      <input
                        type="checkbox"
                        checked={hasAccess(selected.id, section.id)}
                        disabled={accessMutation.isPending}
                        onChange={(event) =>
                          accessMutation.mutate({
                            profile_id: selected.id,
                            section_id: section.id,
                            grant: event.target.checked,
                          })
                        }
                      />
                      <span className="truncate">{section.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CmsPanel>
      </div>
    </div>
  );
}
