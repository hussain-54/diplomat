import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CmsPageHeader,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsInput,
} from "@/components/cms-ui";
import { getNewsroomSettings, updateNewsroomSettings } from "@/lib/admin.functions";
import { requireSuperAdminRoute } from "@/lib/route-guards";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: ({ context }) => requireSuperAdminRoute(context.roles),
  component: SettingsPage,
});

type ArticleStatus = Database["public"]["Enums"]["article_status"];

type SettingsForm = {
  publication_name: string;
  short_name: string;
  tagline: string;
  contact_email: string;
  timezone: string;
  default_article_status: ArticleStatus;
  comments_enabled: boolean;
};

const defaults: SettingsForm = {
  publication_name: "Diplomacy Lens",
  short_name: "DL",
  tagline: "Global affairs. Clear perspective.",
  contact_email: "",
  timezone: "UTC",
  default_article_status: "draft",
  comments_enabled: true,
};

function SettingsPage() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["newsroom-settings"], queryFn: getNewsroomSettings });
  const [form, setForm] = useState<SettingsForm>(defaults);
  useEffect(() => {
    if (!settings.data) return;
    setForm({
      publication_name: settings.data.publication_name,
      short_name: settings.data.short_name,
      tagline: settings.data.tagline,
      contact_email: settings.data.contact_email ?? "",
      timezone: settings.data.timezone,
      default_article_status: settings.data.default_article_status,
      comments_enabled: settings.data.comments_enabled,
    });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (value: SettingsForm) => updateNewsroomSettings({ data: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["newsroom-settings"] }),
  });

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="System configuration"
        title="Settings"
        description="Manage publication identity, editorial defaults, and audience participation."
        actions={
          <button type="button" className={cmsButton} onClick={() => save.mutate(form)} disabled={save.isPending}>
            <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save changes"}
          </button>
        }
      />

      {(settings.error || save.error) && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {(settings.error ?? save.error)?.message}
        </div>
      )}
      {save.isSuccess && (
        <div className="border border-cat-green/30 bg-cat-green/10 px-4 py-3 text-sm text-cat-green">
          Newsroom settings updated.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <CmsPanel title="Publication identity" description="Used across newsroom workflows and future site integrations">
            <div className="grid gap-5 p-5 md:grid-cols-2">
              <Field label="Publication name" description="Full public-facing name">
                <input
                  className={cmsInput}
                  value={form.publication_name}
                  onChange={(event) => setForm({ ...form, publication_name: event.target.value })}
                />
              </Field>
              <Field label="Short name" description="Navigation and compact labels">
                <input
                  className={cmsInput}
                  value={form.short_name}
                  maxLength={12}
                  onChange={(event) => setForm({ ...form, short_name: event.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Tagline" description="Editorial positioning statement">
                  <input
                    className={cmsInput}
                    value={form.tagline}
                    onChange={(event) => setForm({ ...form, tagline: event.target.value })}
                  />
                </Field>
              </div>
              <Field label="Newsroom contact" description="Public editorial email">
                <input
                  className={cmsInput}
                  type="email"
                  value={form.contact_email}
                  onChange={(event) => setForm({ ...form, contact_email: event.target.value })}
                />
              </Field>
              <Field label="Timezone" description="Used for editorial scheduling">
                <select
                  className={cmsInput}
                  value={form.timezone}
                  onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                >
                  {["UTC", "America/New_York", "Europe/London", "Europe/Brussels", "Asia/Dubai", "Asia/Karachi"].map(
                    (timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ),
                  )}
                </select>
              </Field>
            </div>
          </CmsPanel>

          <CmsPanel title="Editorial defaults" description="Default behavior for newly created newsroom content">
            <div className="space-y-5 p-5">
              <Field label="Default article status" description="Contributors remain subject to role restrictions">
                <select
                  className={`${cmsInput} max-w-sm`}
                  value={form.default_article_status}
                  onChange={(event) =>
                    setForm({ ...form, default_article_status: event.target.value as ArticleStatus })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="review">In review</option>
                </select>
              </Field>
              <label className="flex items-center justify-between border border-border p-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">Audience comments</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Accept new comments into the moderation queue
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.comments_enabled}
                  onChange={(event) => setForm({ ...form, comments_enabled: event.target.checked })}
                />
              </label>
            </div>
          </CmsPanel>
        </div>

        <div className="space-y-6">
          <CmsPanel title="System status">
            <div className="space-y-4 p-5 text-sm">
              <StatusRow label="Database" status="Connected" />
              <StatusRow label="Authentication" status="Operational" />
              <StatusRow label="Media storage" status="Operational" />
              <StatusRow label="Publishing API" status="Operational" />
            </div>
          </CmsPanel>
          <CmsPanel title="Configuration details">
            <dl className="divide-y divide-border text-xs">
              <Detail label="Settings record" value="Singleton" />
              <Detail
                label="Last updated"
                value={settings.data ? new Date(settings.data.updated_at).toLocaleString() : "—"}
              />
              <Detail label="Environment" value={import.meta.env.PROD ? "Production" : "Development"} />
              <Detail label="CMS version" value="1.0" />
            </dl>
          </CmsPanel>
        </div>
      </div>
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

function StatusRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <CmsStatus tone="success">{status}</CmsStatus>
    </div>
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
