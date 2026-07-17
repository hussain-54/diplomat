import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  KeyRound,
  MailPlus,
  Search,
  ShieldCheck,
  ShieldOff,
  UserRound,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms-ui";
import {
  inviteStaffMember,
  listEditors,
  refreshStaffMfaStatus,
  sendStaffPasswordReset,
  setStaffSuspended,
  setUserRole,
  toggleSectionAccess,
  updateStaffProfile,
  type StaffMember,
} from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { APP_ROLES, ROLE_LABELS, type AppRole } from "@/lib/permissions";
import { requireSuperAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  beforeLoad: ({ context }) => requireSuperAdminRoute(context.roles),
  component: StaffPage,
});

type ProfileForm = {
  name: string;
  email: string;
  byline_name: string;
  bio: string;
  twitter: string;
  linkedin: string;
  website: string;
  bluesky: string;
};

type InviteForm = {
  name: string;
  email: string;
  byline_name: string;
  role: AppRole;
  section_ids: string[];
};

const emptyInvite: InviteForm = {
  name: "",
  email: "",
  byline_name: "",
  role: "reporter",
  section_ids: [],
};

function StaffPage() {
  const queryClient = useQueryClient();
  const staffQ = useQuery({ queryKey: ["editors"], queryFn: listEditors });
  const sections = useQuery({
    queryKey: ["sections", "editorial"],
    queryFn: () => getSections({ includeHidden: true }),
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>(emptyInvite);
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: "",
    email: "",
    byline_name: "",
    bio: "",
    twitter: "",
    linkedin: "",
    website: "",
    bluesky: "",
  });
  const [notice, setNotice] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["editors"] });

  const roleMutation = useMutation({
    mutationFn: (value: { user_id: string; role: AppRole; grant: boolean }) =>
      setUserRole({ data: value }),
    onSuccess: () => invalidate(),
  });
  const accessMutation = useMutation({
    mutationFn: (value: { profile_id: string; section_id: string; grant: boolean }) =>
      toggleSectionAccess({ data: value }),
    onSuccess: () => invalidate(),
  });
  const profileMutation = useMutation({
    mutationFn: (value: ProfileForm & { id: string }) =>
      updateStaffProfile({
        data: {
          id: value.id,
          name: value.name,
          email: value.email,
          byline_name: value.byline_name,
          bio: value.bio,
          social_links: {
            twitter: value.twitter,
            linkedin: value.linkedin,
            website: value.website,
            bluesky: value.bluesky,
          },
        },
      }),
    onSuccess: async () => {
      setNotice("Profile saved.");
      await invalidate();
    },
  });
  const inviteMutation = useMutation({
    mutationFn: (value: InviteForm) => inviteStaffMember({ data: value }),
    onSuccess: async () => {
      setInviteOpen(false);
      setInviteForm(emptyInvite);
      setNotice("Invitation sent.");
      await invalidate();
    },
  });
  const suspendMutation = useMutation({
    mutationFn: (value: { user_id: string; suspended: boolean }) =>
      setStaffSuspended({ data: value }),
    onSuccess: async (_data, variables) => {
      setNotice(variables.suspended ? "User suspended." : "User reactivated.");
      await invalidate();
    },
  });
  const resetMutation = useMutation({
    mutationFn: (email: string) => sendStaffPasswordReset({ data: { email } }),
    onSuccess: () => setNotice("Password reset email sent."),
  });
  const mfaMutation = useMutation({
    mutationFn: (userId: string) => refreshStaffMfaStatus({ data: { user_id: userId } }),
    onSuccess: async (result) => {
      setNotice(result.mfa_enabled ? "2FA is enabled." : "2FA is not enabled.");
      await invalidate();
    },
  });

  const staff = staffQ.data?.staff ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return staff;
    return staff.filter(
      (member) =>
        member.name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.byline_name?.toLowerCase().includes(query) ||
        member.roles.some((role) => ROLE_LABELS[role]?.toLowerCase().includes(query)),
    );
  }, [search, staff]);

  const selected = staff.find((member) => member.id === selectedId) ?? null;

  const openProfile = (member: StaffMember) => {
    setSelectedId(member.id);
    setNotice(null);
    setProfileForm({
      name: member.name ?? "",
      email: member.email ?? "",
      byline_name: member.byline_name ?? "",
      bio: member.bio ?? "",
      twitter: member.social_links.twitter ?? "",
      linkedin: member.social_links.linkedin ?? "",
      website: member.social_links.website ?? "",
      bluesky: member.social_links.bluesky ?? "",
    });
  };

  const error =
    staffQ.error ??
    sections.error ??
    roleMutation.error ??
    accessMutation.error ??
    profileMutation.error ??
    inviteMutation.error ??
    suspendMutation.error ??
    resetMutation.error ??
    mfaMutation.error;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Newsroom administration"
        title="Authors & Staff"
        description="Invite colleagues, manage roles and sections, and control account security."
        actions={
          <button
            type="button"
            className={cmsButton}
            onClick={() => {
              setInviteOpen(true);
              setNotice(null);
            }}
          >
            <MailPlus className="h-4 w-4" /> Invite user
          </button>
        }
      />

      {(error || notice) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-crimson/30 bg-crimson/10 text-crimson"
              : "border-cat-green/30 bg-cat-green/10 text-cat-green"
          }`}
        >
          {error?.message ?? notice}
        </div>
      )}

      {inviteOpen && (
        <CmsPanel title="Invite user" description="Sends a Supabase invite email with a newsroom role.">
          <form
            className="grid gap-4 p-5 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              inviteMutation.mutate(inviteForm);
            }}
          >
            <Field label="Name">
              <input
                required
                className={cmsInput}
                value={inviteForm.name}
                onChange={(event) => setInviteForm({ ...inviteForm, name: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                className={cmsInput}
                value={inviteForm.email}
                onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
              />
            </Field>
            <Field label="Byline name">
              <input
                className={cmsInput}
                value={inviteForm.byline_name}
                placeholder="Published author name"
                onChange={(event) =>
                  setInviteForm({ ...inviteForm, byline_name: event.target.value })
                }
              />
            </Field>
            <Field label="Role">
              <select
                className={cmsInput}
                value={inviteForm.role}
                onChange={(event) =>
                  setInviteForm({ ...inviteForm, role: event.target.value as AppRole })
                }
              >
                {APP_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <div className="mb-2 text-xs font-semibold">Assigned sections</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(sections.data ?? []).map((section) => {
                  const checked = inviteForm.section_ids.includes(section.id);
                  return (
                    <label
                      key={section.id}
                      className="flex items-center gap-2 border border-border px-3 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setInviteForm({
                            ...inviteForm,
                            section_ids: event.target.checked
                              ? [...inviteForm.section_ids, section.id]
                              : inviteForm.section_ids.filter((id) => id !== section.id),
                          })
                        }
                      />
                      <span className="truncate">{section.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <button type="submit" className={cmsButton} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Sending invite…" : "Send invite"}
              </button>
              <button
                type="button"
                className={cmsSecondaryButton}
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </CmsPanel>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <CmsPanel
          title="Newsroom directory"
          description={`${staff.length} staff accounts`}
          action={
            <label className="relative block w-56">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${cmsInput} pl-9`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, role"
              />
            </label>
          }
        >
          {staffQ.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading staff…</div>
          ) : !filtered.length ? (
            <CmsEmptyState
              title="No staff found"
              description="Invite the first newsroom colleague to get started."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Staff member</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">2FA</th>
                    <th className="px-5 py-3 text-right font-semibold">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((member) => (
                    <tr key={member.id} className="hover:bg-muted/30">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt=""
                              className="h-9 w-9 object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center bg-muted font-semibold">
                              {(member.name ?? member.email ?? "U").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground">
                              {member.name || member.byline_name || "Unnamed staff"}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {member.email || "No email on file"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {member.roles.length ? (
                            member.roles.map((role) => (
                              <CmsStatus
                                key={role}
                                tone={
                                  role === "super_admin"
                                    ? "danger"
                                    : role.includes("editor")
                                      ? "info"
                                      : "neutral"
                                }
                              >
                                {ROLE_LABELS[role] ?? role}
                              </CmsStatus>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No role</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <CmsStatus
                          tone={
                            member.status === "active"
                              ? "success"
                              : member.status === "invited"
                                ? "info"
                                : "danger"
                          }
                        >
                          {member.status}
                        </CmsStatus>
                      </td>
                      <td className="px-5 py-4">
                        <CmsStatus tone={member.mfa_enabled ? "success" : "warning"}>
                          {member.mfa_enabled ? "Enabled" : "Off"}
                        </CmsStatus>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          className={cmsButton}
                          onClick={() => openProfile(member)}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CmsPanel>

        <CmsPanel
          title={selected ? "Staff profile" : "Select a staff member"}
          description={
            selected
              ? "Identity, access, and account security"
              : "Choose a person from the directory"
          }
        >
          {!selected ? (
            <div className="flex min-h-96 flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <UserRound className="h-8 w-8" />
              <p className="mt-3 text-sm">No staff member selected</p>
            </div>
          ) : (
            <div className="space-y-6 p-5">
              <div className="grid gap-3">
                <Field label="Name">
                  <input
                    className={cmsInput}
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    className={cmsInput}
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, email: event.target.value })
                    }
                  />
                </Field>
                <Field label="Byline name">
                  <input
                    className={cmsInput}
                    value={profileForm.byline_name}
                    placeholder="Shown on published stories"
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, byline_name: event.target.value })
                    }
                  />
                </Field>
                <Field label="Bio">
                  <textarea
                    className={`${cmsInput} h-auto min-h-24 py-2`}
                    value={profileForm.bio}
                    onChange={(event) =>
                      setProfileForm({ ...profileForm, bio: event.target.value })
                    }
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Twitter / X">
                    <input
                      className={cmsInput}
                      value={profileForm.twitter}
                      placeholder="https://x.com/…"
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, twitter: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="LinkedIn">
                    <input
                      className={cmsInput}
                      value={profileForm.linkedin}
                      placeholder="https://linkedin.com/in/…"
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, linkedin: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Website">
                    <input
                      className={cmsInput}
                      value={profileForm.website}
                      placeholder="https://"
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, website: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Bluesky">
                    <input
                      className={cmsInput}
                      value={profileForm.bluesky}
                      placeholder="https://bsky.app/…"
                      onChange={(event) =>
                        setProfileForm({ ...profileForm, bluesky: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  className={cmsButton}
                  disabled={profileMutation.isPending}
                  onClick={() =>
                    profileMutation.mutate({ id: selected.id, ...profileForm })
                  }
                >
                  {profileMutation.isPending ? "Saving…" : "Save profile"}
                </button>
              </div>

              <div className="border-t border-border pt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
                  <ShieldCheck className="h-4 w-4" /> Role
                </div>
                <div className="space-y-2">
                  {APP_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex items-center justify-between border border-border px-3 py-2"
                    >
                      <span className="text-xs">{ROLE_LABELS[role]}</span>
                      <input
                        type="checkbox"
                        checked={selected.roles.includes(role)}
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
                <div className="mb-3 text-xs font-semibold">Assigned sections</div>
                <div className="grid grid-cols-2 gap-2">
                  {(sections.data ?? []).map((section) => (
                    <label
                      key={section.id}
                      className="flex items-center gap-2 border border-border px-3 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selected.section_ids.includes(section.id)}
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

              <div className="border-t border-border pt-5">
                <div className="mb-3 text-xs font-semibold">Account security</div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <CmsStatus tone={selected.mfa_enabled ? "success" : "warning"}>
                    2FA {selected.mfa_enabled ? "enabled" : "off"}
                  </CmsStatus>
                  <CmsStatus
                    tone={
                      selected.status === "suspended" || selected.auth_banned
                        ? "danger"
                        : selected.status === "invited"
                          ? "info"
                          : "success"
                    }
                  >
                    {selected.status === "suspended" || selected.auth_banned
                      ? "Suspended"
                      : selected.status}
                  </CmsStatus>
                </div>
                <div className="grid gap-2">
                  <button
                    type="button"
                    className={cmsSecondaryButton}
                    disabled={mfaMutation.isPending}
                    onClick={() => mfaMutation.mutate(selected.id)}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {mfaMutation.isPending ? "Checking 2FA…" : "Refresh 2FA status"}
                  </button>
                  <button
                    type="button"
                    className={cmsSecondaryButton}
                    disabled={!selected.email || resetMutation.isPending}
                    onClick={() => {
                      if (
                        selected.email &&
                        window.confirm(`Send a password reset email to ${selected.email}?`)
                      ) {
                        resetMutation.mutate(selected.email);
                      }
                    }}
                  >
                    <KeyRound className="h-4 w-4" />
                    {resetMutation.isPending ? "Sending…" : "Reset password"}
                  </button>
                  <button
                    type="button"
                    className={`${cmsSecondaryButton} ${
                      selected.status === "suspended" || selected.auth_banned
                        ? ""
                        : "border-crimson/40 text-crimson hover:bg-crimson/10"
                    }`}
                    disabled={suspendMutation.isPending}
                    onClick={() => {
                      const suspending = !(
                        selected.status === "suspended" || selected.auth_banned
                      );
                      if (
                        window.confirm(
                          suspending
                            ? `Suspend ${selected.name || selected.email}? They will be unable to sign in.`
                            : `Reactivate ${selected.name || selected.email}?`,
                        )
                      ) {
                        suspendMutation.mutate({
                          user_id: selected.id,
                          suspended: suspending,
                        });
                      }
                    }}
                  >
                    {selected.status === "suspended" || selected.auth_banned ? (
                      <>
                        <ShieldOff className="h-4 w-4" />{" "}
                        {suspendMutation.isPending ? "Updating…" : "Unsuspend user"}
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4" />{" "}
                        {suspendMutation.isPending ? "Updating…" : "Suspend user"}
                      </>
                    )}
                  </button>
                </div>
                {selected.last_sign_in_at && (
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Last sign-in {new Date(selected.last_sign_in_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}
        </CmsPanel>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
