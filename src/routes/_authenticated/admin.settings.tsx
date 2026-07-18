import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  addIpWhitelistEntry,
  getAdminSessionInfo,
  getNewsroomSettings,
  listAuditLogs,
  listBackupRecords,
  listIpWhitelist,
  recordBackupCheckpoint,
  removeIpWhitelistEntry,
  updateNewsroomSettings,
} from "@/lib/admin.functions";
import { requirePermissionRoute } from "@/lib/route-guards";
import {
  DEFAULT_INTEGRATIONS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_SEO,
  INTEGRATION_FIELDS,
  PERMISSION_LABELS,
  PERMISSIONS,
  SETTINGS_SECTIONS,
  parseIntegrations,
  parseNotificationPrefs,
  parseSeoDefaults,
  roleMatrix,
  type SettingsForm,
  type SettingsSection,
} from "@/lib/settings";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "settings:manage"),
  component: SettingsPage,
});

type ArticleStatus = Database["public"]["Enums"]["article_status"];

const defaults: SettingsForm = {
  publication_name: "Diplomacy Lens",
  short_name: "DL",
  tagline: "Global affairs. Clear perspective.",
  contact_email: "",
  timezone: "UTC",
  default_article_status: "draft",
  comments_enabled: true,
  seo_defaults: DEFAULT_SEO,
  integrations: DEFAULT_INTEGRATIONS,
  notification_prefs: DEFAULT_NOTIFICATIONS,
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<SettingsSection>("general");
  const [form, setForm] = useState<SettingsForm>(defaults);
  const [ipCidr, setIpCidr] = useState("");
  const [ipLabel, setIpLabel] = useState("");
  const [backupNotes, setBackupNotes] = useState("");

  const settings = useQuery({ queryKey: ["newsroom-settings"], queryFn: getNewsroomSettings });
  const audit = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: listAuditLogs,
    enabled: section === "security",
  });
  const whitelist = useQuery({
    queryKey: ["admin-ip-whitelist"],
    queryFn: listIpWhitelist,
    enabled: section === "security",
  });
  const backups = useQuery({
    queryKey: ["admin-backup-records"],
    queryFn: listBackupRecords,
    enabled: section === "security",
  });
  const session = useQuery({
    queryKey: ["admin-session-info"],
    queryFn: getAdminSessionInfo,
    enabled: section === "security",
  });

  useEffect(() => {
    if (!settings.data) return;
    const row = settings.data as Record<string, unknown>;
    setForm({
      publication_name: settings.data.publication_name,
      short_name: settings.data.short_name,
      tagline: settings.data.tagline,
      contact_email: settings.data.contact_email ?? "",
      timezone: settings.data.timezone,
      default_article_status: settings.data.default_article_status,
      comments_enabled: settings.data.comments_enabled,
      seo_defaults: parseSeoDefaults(row.seo_defaults),
      integrations: parseIntegrations(row.integrations),
      notification_prefs: parseNotificationPrefs(row.notification_prefs),
    });
  }, [settings.data]);

  const invalidateSecurity = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-ip-whitelist"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-backup-records"] }),
      queryClient.invalidateQueries({ queryKey: ["newsroom-settings"] }),
    ]);
  };

  const save = useMutation({
    mutationFn: (value: SettingsForm) =>
      updateNewsroomSettings({
        data: {
          publication_name: value.publication_name.trim(),
          short_name: value.short_name.trim(),
          tagline: value.tagline.trim(),
          contact_email: value.contact_email.trim() || null,
          timezone: value.timezone,
          default_article_status: value.default_article_status,
          comments_enabled: value.comments_enabled,
          seo_defaults: value.seo_defaults,
          integrations: value.integrations,
          notification_prefs: value.notification_prefs,
        },
      }),
    onSuccess: invalidateSecurity,
  });

  const addIp = useMutation({
    mutationFn: () => addIpWhitelistEntry({ data: { cidr: ipCidr, label: ipLabel } }),
    onSuccess: async () => {
      setIpCidr("");
      setIpLabel("");
      await invalidateSecurity();
    },
  });

  const removeIp = useMutation({
    mutationFn: (id: string) => removeIpWhitelistEntry({ data: { id } }),
    onSuccess: invalidateSecurity,
  });

  const addBackup = useMutation({
    mutationFn: () =>
      recordBackupCheckpoint({
        data: {
          label: "Manual checkpoint",
          notes: backupNotes,
          status: "recorded",
        },
      }),
    onSuccess: async () => {
      setBackupNotes("");
      await invalidateSecurity();
    },
  });

  const roles = useMemo(() => roleMatrix(), []);
  const error =
    settings.error ??
    save.error ??
    audit.error ??
    whitelist.error ??
    backups.error ??
    session.error ??
    addIp.error ??
    removeIp.error ??
    addBackup.error;

  const showSave = section === "general" || section === "seo" || section === "integrations" || section === "notifications";

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="System configuration"
        title="Settings"
        description="General, SEO, roles, integrations, security, and notification preferences."
        actions={
          showSave ? (
            <button
              type="button"
              className={cmsButton}
              onClick={() => save.mutate(form)}
              disabled={save.isPending || settings.isLoading}
            >
              <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save changes"}
            </button>
          ) : null
        }
      />

      {error && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {error.message}
        </div>
      )}
      {save.isSuccess && (
        <div className="border border-cat-green/30 bg-cat-green/10 px-4 py-3 text-sm text-cat-green">
          Settings saved.
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {SETTINGS_SECTIONS.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => setSection(item.id)}
            className={`h-9 border px-4 text-xs font-semibold uppercase tracking-wide ${
              section === item.id
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {section === "general" && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <CmsPanel title="Publication identity" description="Core newsroom branding and contact">
              <div className="grid gap-5 p-5 md:grid-cols-2">
                <Field label="Publication name" description="Full public-facing name">
                  <input
                    className={cmsInput}
                    value={form.publication_name}
                    onChange={(e) => setForm({ ...form, publication_name: e.target.value })}
                  />
                </Field>
                <Field label="Short name" description="Compact labels">
                  <input
                    className={cmsInput}
                    value={form.short_name}
                    maxLength={12}
                    onChange={(e) => setForm({ ...form, short_name: e.target.value })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Tagline" description="Editorial positioning">
                    <input
                      className={cmsInput}
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Newsroom contact" description="Public editorial email">
                  <input
                    className={cmsInput}
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  />
                </Field>
                <Field label="Timezone" description="Scheduling and digests">
                  <select
                    className={cmsInput}
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  >
                    {["UTC", "America/New_York", "Europe/London", "Europe/Brussels", "Asia/Dubai", "Asia/Karachi"].map(
                      (tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </div>
            </CmsPanel>

            <CmsPanel title="Editorial defaults" description="Defaults for new content">
              <div className="space-y-5 p-5">
                <Field label="Default article status" description="Subject to role restrictions">
                  <select
                    className={`${cmsInput} max-w-sm`}
                    value={form.default_article_status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        default_article_status: e.target.value as ArticleStatus,
                      })
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="review">In review</option>
                  </select>
                </Field>
                <Toggle
                  label="Audience comments"
                  description="Accept new comments into the moderation queue"
                  checked={form.comments_enabled}
                  onChange={(checked) => setForm({ ...form, comments_enabled: checked })}
                />
              </div>
            </CmsPanel>
          </div>

          <CmsPanel title="Configuration details">
            <dl className="divide-y divide-border text-xs">
              <Detail label="Settings record" value="Singleton" />
              <Detail
                label="Last updated"
                value={settings.data ? new Date(settings.data.updated_at).toLocaleString() : "—"}
              />
              <Detail label="Environment" value={import.meta.env.PROD ? "Production" : "Development"} />
            </dl>
          </CmsPanel>
        </div>
      )}

      {section === "seo" && (
        <CmsPanel title="SEO defaults" description="Site-wide fallbacks used when articles omit SEO fields">
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Default meta description" description="Fallback for pages without a custom description">
                <textarea
                  className={`${cmsInput} min-h-[88px]`}
                  value={form.seo_defaults.meta_description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      seo_defaults: { ...form.seo_defaults, meta_description: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Title template" description="Use %s for the page title">
              <input
                className={cmsInput}
                value={form.seo_defaults.title_template}
                onChange={(e) =>
                  setForm({
                    ...form,
                    seo_defaults: { ...form.seo_defaults, title_template: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Default OG image URL" description="Social share fallback image">
              <input
                className={cmsInput}
                value={form.seo_defaults.default_og_image_url}
                onChange={(e) =>
                  setForm({
                    ...form,
                    seo_defaults: { ...form.seo_defaults, default_og_image_url: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Default schema type" description="Structured data default">
              <select
                className={cmsInput}
                value={form.seo_defaults.schema_type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    seo_defaults: {
                      ...form.seo_defaults,
                      schema_type: e.target.value as SettingsForm["seo_defaults"]["schema_type"],
                    },
                  })
                }
              >
                {["NewsArticle", "Article", "Review", "Report"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Default Twitter card" description="Card style for social previews">
              <select
                className={cmsInput}
                value={form.seo_defaults.twitter_card}
                onChange={(e) =>
                  setForm({
                    ...form,
                    seo_defaults: {
                      ...form.seo_defaults,
                      twitter_card: e.target.value as SettingsForm["seo_defaults"]["twitter_card"],
                    },
                  })
                }
              >
                <option value="summary_large_image">summary_large_image</option>
                <option value="summary">summary</option>
              </select>
            </Field>
            <div className="md:col-span-2 space-y-3">
              <Toggle
                label="Robots index"
                description="Allow search engines to index by default"
                checked={form.seo_defaults.robots_index}
                onChange={(checked) =>
                  setForm({
                    ...form,
                    seo_defaults: { ...form.seo_defaults, robots_index: checked },
                  })
                }
              />
              <Toggle
                label="Robots follow"
                description="Allow search engines to follow links by default"
                checked={form.seo_defaults.robots_follow}
                onChange={(checked) =>
                  setForm({
                    ...form,
                    seo_defaults: { ...form.seo_defaults, robots_follow: checked },
                  })
                }
              />
              <Toggle
                label="Sitemap enabled"
                description="Include this publication in sitemap generation"
                checked={form.seo_defaults.sitemap_enabled}
                onChange={(checked) =>
                  setForm({
                    ...form,
                    seo_defaults: { ...form.seo_defaults, sitemap_enabled: checked },
                  })
                }
              />
              <Toggle
                label="RSS enabled"
                description="Include articles in the public RSS feed by default"
                checked={form.seo_defaults.rss_enabled}
                onChange={(checked) =>
                  setForm({
                    ...form,
                    seo_defaults: { ...form.seo_defaults, rss_enabled: checked },
                  })
                }
              />
            </div>
          </div>
        </CmsPanel>
      )}

      {section === "roles" && (
        <div className="space-y-6">
          <CmsPanel
            title="Roles & permissions"
            description="Read-only matrix from the newsroom permission model. Manage assignments on Staff."
            action={
              <Link to="/admin/staff" className={cmsSecondaryButton}>
                Manage staff
              </Link>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="sticky left-0 bg-muted/40 px-4 py-3 font-semibold">Permission</th>
                    {roles.map((role) => (
                      <th key={role.role} className="px-3 py-3 font-semibold whitespace-nowrap">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PERMISSIONS.map((permission) => (
                    <tr key={permission}>
                      <td className="sticky left-0 bg-card px-4 py-2 font-medium text-foreground">
                        {PERMISSION_LABELS[permission]}
                      </td>
                      {roles.map((role) => {
                        const allowed = role.permissions.includes(permission);
                        return (
                          <td key={`${role.role}-${permission}`} className="px-3 py-2 text-center">
                            <CmsStatus tone={allowed ? "success" : "neutral"}>
                              {allowed ? "Yes" : "—"}
                            </CmsStatus>
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
      )}

      {section === "integrations" && (
        <CmsPanel
          title="Integrations"
          description="Public measurement IDs and channel URLs. Keep API secrets in environment variables."
        >
          <div className="grid gap-5 p-5 md:grid-cols-2">
            {INTEGRATION_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} description={field.description}>
                <input
                  className={cmsInput}
                  value={form.integrations[field.key]}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      integrations: { ...form.integrations, [field.key]: e.target.value },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </CmsPanel>
      )}

      {section === "security" && (
        <div className="space-y-6">
          <CmsPanel title="Sessions" description="Current authenticated admin session">
            <div className="space-y-3 p-5 text-sm">
              {session.isLoading ? (
                <p className="text-muted-foreground">Loading session…</p>
              ) : (
                <>
                  <DetailRow label="User ID" value={session.data?.userId ?? "—"} />
                  <DetailRow label="Email" value={session.data?.email ?? "—"} />
                  <DetailRow
                    label="Expires"
                    value={
                      session.data?.expiresAt
                        ? new Date(session.data.expiresAt).toLocaleString()
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Access token"
                    value={session.data?.accessTokenPresent ? "Present" : "Missing"}
                  />
                  <p className="pt-2 text-xs text-muted-foreground">
                    Revoke other devices from the Supabase Auth dashboard or by rotating the user password.
                  </p>
                </>
              )}
            </div>
          </CmsPanel>

          <CmsPanel title="IP whitelist" description="Allowed admin source ranges (enforcement via edge/API)">
            <div className="space-y-4 p-5">
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  className={cmsInput}
                  placeholder="203.0.113.0/24 or 203.0.113.10"
                  value={ipCidr}
                  onChange={(e) => setIpCidr(e.target.value)}
                />
                <input
                  className={cmsInput}
                  placeholder="Label (optional)"
                  value={ipLabel}
                  onChange={(e) => setIpLabel(e.target.value)}
                />
                <button
                  type="button"
                  className={cmsButton}
                  disabled={!ipCidr.trim() || addIp.isPending}
                  onClick={() => addIp.mutate()}
                >
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
              {!whitelist.data?.length ? (
                <CmsEmptyState
                  title="No IP rules"
                  description="Add CIDR ranges that should be trusted for admin access."
                />
              ) : (
                <div className="divide-y divide-border border border-border">
                  {whitelist.data.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold text-foreground">{row.cidr}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.label || "No label"} · {new Date(row.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="p-2 text-muted-foreground hover:text-crimson"
                        onClick={() => removeIp.mutate(row.id)}
                        aria-label="Remove IP rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CmsPanel>

          <CmsPanel title="Backups" description="Record operational backup checkpoints for the newsroom">
            <div className="space-y-4 p-5">
              <p className="text-sm text-muted-foreground">
                Use Supabase project backups / PITR for recovery. Record checkpoints here after verified dumps.
              </p>
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  className={cmsInput}
                  placeholder="Optional notes"
                  value={backupNotes}
                  onChange={(e) => setBackupNotes(e.target.value)}
                />
                <button
                  type="button"
                  className={cmsButton}
                  disabled={addBackup.isPending}
                  onClick={() => addBackup.mutate()}
                >
                  Record checkpoint
                </button>
              </div>
              {!backups.data?.length ? (
                <CmsEmptyState title="No checkpoints" description="No backup records yet." />
              ) : (
                <div className="divide-y divide-border border border-border">
                  {backups.data.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <div className="font-semibold text-foreground">{row.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.notes || "No notes"} · {new Date(row.created_at).toLocaleString()}
                          {row.profiles?.name ? ` · ${row.profiles.name}` : ""}
                        </div>
                      </div>
                      <CmsStatus tone={row.status === "failed" ? "danger" : "success"}>
                        {row.status}
                      </CmsStatus>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CmsPanel>

          <CmsPanel title="Audit logs" description="Recent privileged configuration changes">
            {!audit.data?.length ? (
              <CmsEmptyState
                title="No audit events"
                description="Updates to settings and security rules will appear here."
              />
            ) : (
              <div className="divide-y divide-border">
                {audit.data.map((row) => (
                  <div key={row.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-foreground">{row.action}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {row.summary || row.entity_type}
                      {row.profiles?.name || row.profiles?.email
                        ? ` · ${row.profiles.name || row.profiles.email}`
                        : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CmsPanel>
        </div>
      )}

      {section === "notifications" && (
        <CmsPanel title="Notifications" description="Editorial alert preferences for the newsroom">
          <div className="space-y-3 p-5">
            <Toggle
              label="Pending comments"
              description="Notify when new comments enter the moderation queue"
              checked={form.notification_prefs.email_on_comment_pending}
              onChange={(checked) =>
                setForm({
                  ...form,
                  notification_prefs: {
                    ...form.notification_prefs,
                    email_on_comment_pending: checked,
                  },
                })
              }
            />
            <Toggle
              label="Articles in review"
              description="Notify when stories are submitted for review"
              checked={form.notification_prefs.email_on_article_review}
              onChange={(checked) =>
                setForm({
                  ...form,
                  notification_prefs: {
                    ...form.notification_prefs,
                    email_on_article_review: checked,
                  },
                })
              }
            />
            <Toggle
              label="Publish events"
              description="Notify when articles are published"
              checked={form.notification_prefs.email_on_publish}
              onChange={(checked) =>
                setForm({
                  ...form,
                  notification_prefs: {
                    ...form.notification_prefs,
                    email_on_publish: checked,
                  },
                })
              }
            />
            <Toggle
              label="Daily digest"
              description="Send a daily summary of newsroom activity"
              checked={form.notification_prefs.email_digest_daily}
              onChange={(checked) =>
                setForm({
                  ...form,
                  notification_prefs: {
                    ...form.notification_prefs,
                    email_digest_daily: checked,
                  },
                })
              }
            />
            <Toggle
              label="Security alerts"
              description="Notify on IP whitelist and security configuration changes"
              checked={form.notification_prefs.notify_security_alerts}
              onChange={(checked) =>
                setForm({
                  ...form,
                  notification_prefs: {
                    ...form.notification_prefs,
                    notify_security_alerts: checked,
                  },
                })
              }
            />
          </div>
        </CmsPanel>
      )}
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <span className="block text-[11px] text-muted-foreground">{description}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 border border-border p-4">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
