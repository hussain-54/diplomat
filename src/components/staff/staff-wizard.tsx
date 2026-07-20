import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  APP_ROLES,
  ROLE_LABELS,
  type AppRole,
} from "@/lib/permissions";
import {
  getStaffDetail,
  inviteStaffUser,
  listDepartments,
  listTeams,
  updateStaffMemberProfile,
  type StaffWizardPayload,
} from "@/lib/staff.functions";
import {
  CmsAlert,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Basic Information" },
  { id: 2, label: "Professional" },
  { id: 3, label: "Roles & Permissions" },
  { id: 4, label: "Review & Create" },
];

const EMPTY: StaffWizardPayload = {
  name: "",
  email: "",
  username: "",
  phone: "",
  byline_name: "",
  designation: "",
  location: "",
  department_id: null,
  team_id: null,
  roles: ["contributor"],
  section_ids: [],
};

export function StaffWizardPage({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(userId);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<StaffWizardPayload>({ ...EMPTY });

  const detailQ = useQuery({
    queryKey: ["staff-detail", userId],
    queryFn: () => getStaffDetail({ data: { id: userId! } }),
    enabled: isEdit,
  });
  const deptsQ = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });

  useEffect(() => {
    if (detailQ.data?.member) {
      const m = detailQ.data.member;
      setForm({
        id: m.id,
        name: m.name ?? "",
        email: m.email ?? "",
        username: m.username ?? "",
        phone: m.phone ?? "",
        byline_name: m.byline_name ?? "",
        designation: m.designation ?? "",
        location: m.location ?? "",
        department_id: m.department_id,
        team_id: m.team_id,
        roles: m.roles,
        bio: m.bio ?? "",
        social_links: m.social_links,
      });
    }
  }, [detailQ.data]);

  const patch = (partial: Partial<StaffWizardPayload>) => setForm((f) => ({ ...f, ...partial }));

  const save = useMutation({
    mutationFn: async () => {
      if (isEdit && userId) {
        return updateStaffMemberProfile({ data: { ...form, id: userId } });
      }
      return inviteStaffUser({ data: form });
    },
    onSuccess: () => {
      toast.success(isEdit ? "User updated" : "Invitation sent");
      void qc.invalidateQueries({ queryKey: ["staff-table"] });
      void qc.invalidateQueries({ queryKey: ["staff-dashboard"] });
      navigate({ to: "/admin/staff/all" });
    },
    onError: (e) => toast.error(e.message),
  });

  const teamsForDept = (teamsQ.data ?? []).filter(
    (t) => !form.department_id || t.department_id === form.department_id,
  );

  if (isEdit && detailQ.isLoading) return <CmsPageSkeleton metrics={0} panels={2} />;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={isEdit ? "Edit user" : "Create user"}
        title={isEdit ? form.name || "Edit user" : "Invite a newsroom user"}
        description="Four-step onboarding for identity, org placement, and roles."
      />

      {save.error ? <CmsAlert>{save.error.message}</CmsAlert> : null}

      <nav className="overflow-x-auto pb-1">
        <ol className="flex min-w-max gap-1">
          {STEPS.map((s) => {
            const done = s.id < step;
            const active = s.id === step;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                    active && "bg-primary text-primary-foreground",
                    done && !active && "bg-muted/60",
                    !active && !done && "text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset",
                      active && "bg-primary-foreground/20",
                      done && !active && "text-cat-green",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  {s.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <CmsPanel>
        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <input className={cmsInput} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className={cmsInput}
                value={form.email}
                disabled={isEdit}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>
            <Field label="Username">
              <input className={cmsInput} value={form.username ?? ""} onChange={(e) => patch({ username: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={cmsInput} value={form.phone ?? ""} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Department">
              <select
                className={cmsInput}
                value={form.department_id ?? ""}
                onChange={(e) => patch({ department_id: e.target.value || null, team_id: null })}
              >
                <option value="">Unassigned</option>
                {(deptsQ.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Team">
              <select
                className={cmsInput}
                value={form.team_id ?? ""}
                onChange={(e) => patch({ team_id: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {teamsForDept.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Designation">
              <input
                className={cmsInput}
                value={form.designation ?? ""}
                onChange={(e) => patch({ designation: e.target.value })}
                placeholder="e.g. SEO Specialist"
              />
            </Field>
            <Field label="Location">
              <input className={cmsInput} value={form.location ?? ""} onChange={(e) => patch({ location: e.target.value })} />
            </Field>
            <Field label="Byline name" className="sm:col-span-2">
              <input
                className={cmsInput}
                value={form.byline_name ?? ""}
                onChange={(e) => patch({ byline_name: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Assign one or more newsroom roles. Permissions follow the existing RBAC matrix.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {APP_ROLES.map((role) => {
                const checked = form.roles?.includes(role);
                return (
                  <label
                    key={role}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(checked)}
                      onChange={(e) => {
                        const next = new Set(form.roles ?? []);
                        if (e.target.checked) next.add(role);
                        else next.delete(role);
                        patch({ roles: [...next] as AppRole[] });
                      }}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Summary label="Name" value={form.name || "—"} />
            <Summary label="Email" value={form.email || "—"} />
            <Summary label="Roles" value={(form.roles ?? []).map((r) => ROLE_LABELS[r]).join(", ") || "—"} />
            <Summary label="Designation" value={form.designation || "—"} />
            {!form.name.trim() || !form.email.trim() ? (
              <p className="sm:col-span-2 text-xs font-medium text-cat-rose">Name and email are required.</p>
            ) : null}
          </div>
        ) : null}
      </CmsPanel>

      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className={cmsSecondaryButton} disabled={step <= 1} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        <div className="flex gap-2">
          {step < 4 ? (
            <button type="button" className={cmsButton} onClick={() => setStep((s) => s + 1)}>
              Next step
            </button>
          ) : (
            <button
              type="button"
              className={cmsButton}
              disabled={save.isPending || !form.name.trim() || !form.email.trim()}
              onClick={() => save.mutate()}
            >
              {isEdit ? "Save changes" : "Send invitation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-semibold">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/20 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
