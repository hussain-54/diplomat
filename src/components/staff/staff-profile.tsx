import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ban, KeyRound, Pencil } from "lucide-react";
import { useState } from "react";
import { ROLE_LABELS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { getStaffDetail, resetStaffPassword, suspendStaffUser } from "@/lib/staff.functions";
import {
  CmsAlert,
  CmsPageSkeleton,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsSecondaryButton,
} from "@/components/cms";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function StaffProfilePage({ userId }: { userId: string }) {
  const [tab, setTab] = useState("overview");
  const qc = useQueryClient();
  const detailQ = useQuery({
    queryKey: ["staff-detail", userId],
    queryFn: () => getStaffDetail({ data: { id: userId } }),
  });

  const suspend = useMutation({
    mutationFn: (suspended: boolean) => suspendStaffUser({ data: { user_id: userId, suspended } }),
    onSuccess: () => {
      toast.success("Status updated");
      void qc.invalidateQueries({ queryKey: ["staff-detail", userId] });
    },
    onError: (e) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: (email: string) => resetStaffPassword({ data: { email } }),
    onSuccess: () => toast.success("Password reset sent"),
    onError: (e) => toast.error(e.message),
  });

  if (detailQ.isLoading) return <CmsPageSkeleton metrics={4} panels={2} />;
  if (detailQ.error) return <CmsAlert>{detailQ.error.message}</CmsAlert>;

  const m = detailQ.data?.member;
  if (!m) return <CmsAlert>User not found.</CmsAlert>;
  const stats = detailQ.data!.stats;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "professional", label: "Professional" },
    { id: "publishing", label: "Publishing" },
    { id: "permissions", label: "Permissions" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          {m.avatar_url ? (
            <img src={m.avatar_url} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
              {(m.name ?? "?").slice(0, 1)}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold">{m.name}</h1>
              <CmsStatus
                tone={m.status === "active" ? "success" : m.status === "invited" ? "warning" : "danger"}
              >
                {m.status}
              </CmsStatus>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {m.roles.map((r) => ROLE_LABELS[r]).join(" · ") || "No roles"}
              {m.department_name ? ` · ${m.department_name}` : ""}
            </p>
            <p className="mt-1 text-sm">{m.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/staff/$id/edit" params={{ id: userId }} className={cmsSecondaryButton}>
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button
            type="button"
            className={cmsSecondaryButton}
            onClick={() => suspend.mutate(m.status !== "suspended")}
          >
            <Ban className="h-4 w-4" />
            {m.status === "suspended" ? "Activate" : "Suspend"}
          </button>
          {m.email ? (
            <button type="button" className={cmsButton} onClick={() => reset.mutate(m.email!)}>
              <KeyRound className="h-4 w-4" /> Reset password
            </button>
          ) : null}
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-border/60 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium",
              tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-foreground" /> : null}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          <CmsPanel title="Contact" className="xl:col-span-2">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Info label="Email" value={m.email ?? "—"} />
              <Info label="Phone" value={m.phone ?? "—"} />
              <Info label="Username" value={m.username ?? "—"} />
              <Info label="Byline" value={m.byline_name ?? "—"} />
              <Info label="Created" value={new Date(m.created_at).toLocaleString()} />
              <Info
                label="Last login"
                value={m.last_login_at ? new Date(m.last_login_at).toLocaleString() : "—"}
              />
            </dl>
          </CmsPanel>
          <CmsPanel title="Statistics">
            <dl className="space-y-2 text-sm">
              <Stat label="Published" value={stats.published} />
              <Stat label="Drafts" value={stats.drafts} />
              <Stat label="Views" value="—" muted />
              <Stat label="Engagement score" value={stats.engagement} />
            </dl>
          </CmsPanel>
          {m.bio ? (
            <CmsPanel title="Biography" className="xl:col-span-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{m.bio}</p>
            </CmsPanel>
          ) : null}
        </div>
      ) : null}

      {tab === "professional" ? (
        <CmsPanel title="Professional">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Department" value={m.department_name ?? "—"} />
            <Info label="Team" value={m.team_name ?? "—"} />
            <Info label="Designation" value={m.designation ?? "—"} />
            <Info label="Location" value={m.location ?? "—"} />
          </dl>
        </CmsPanel>
      ) : null}

      {tab === "publishing" ? (
        <CmsPanel title="Recent articles">
          {(detailQ.data?.articles.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No articles authored yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detailQ.data?.articles.map((a) => (
                <li key={a.id} className="flex justify-between gap-2 border-b border-border/40 py-2">
                  <Link to="/admin/articles/$id" params={{ id: a.id }} className="font-medium hover:text-primary">
                    {a.title}
                  </Link>
                  <CmsStatus tone={a.status === "published" ? "success" : "neutral"}>{a.status}</CmsStatus>
                </li>
              ))}
            </ul>
          )}
        </CmsPanel>
      ) : null}

      {tab === "permissions" ? (
        <CmsPanel title="Effective permissions">
          <div className="space-y-4">
            {m.roles.map((role) => (
              <div key={role}>
                <div className="mb-2 text-sm font-semibold">{ROLE_LABELS[role]}</div>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_PERMISSIONS[role].map((p) => (
                    <span key={p} className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CmsPanel>
      ) : null}

      {tab === "activity" ? (
        <CmsPanel title="Recent activity">
          {(detailQ.data?.activity.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No activity logged yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {detailQ.data?.activity.map((row) => (
                <li key={row.id} className="flex justify-between gap-2 border-b border-border/40 py-2">
                  <span>
                    <span className="font-medium">{row.action}</span>
                    {row.details ? ` — ${row.details}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CmsPanel>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string | number; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}
