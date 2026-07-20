import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  CmsAlert,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  cmsButton,
  cmsInput,
} from "@/components/cms";
import { getCategoryModuleSettings, updateCategoryModuleSettings } from "@/lib/admin.functions";
import type { CategoryModuleSettings } from "@/lib/category-types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "general", label: "General" },
  { id: "seo_defaults", label: "SEO Defaults" },
  { id: "social", label: "Social / Open Graph" },
  { id: "permissions", label: "Permissions" },
  { id: "notifications", label: "Notifications" },
  { id: "advanced", label: "Advanced" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CategoryModuleSettingsPage() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["category-module-settings"],
    queryFn: getCategoryModuleSettings,
  });
  const [tab, setTab] = useState<TabId>("general");
  const [draft, setDraft] = useState<CategoryModuleSettings | null>(null);

  const save = useMutation({
    mutationFn: () => updateCategoryModuleSettings({ data: draft ?? {} }),
    onSuccess: () => {
      toast.success("Settings saved");
      void qc.invalidateQueries({ queryKey: ["category-module-settings"] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (settingsQ.isLoading) return <CmsPageSkeleton metrics={0} panels={1} />;
  const settings = draft ?? {
    general: (settingsQ.data?.general as Record<string, unknown>) ?? {},
    seo_defaults: (settingsQ.data?.seo_defaults as Record<string, unknown>) ?? {},
    social: (settingsQ.data?.social as Record<string, unknown>) ?? {},
    permissions: (settingsQ.data?.permissions as Record<string, unknown>) ?? {},
    notifications: (settingsQ.data?.notifications as Record<string, unknown>) ?? {},
    advanced: (settingsQ.data?.advanced as Record<string, unknown>) ?? {},
  };

  const patchSection = (section: TabId, key: string, value: unknown) => {
    setDraft((prev) => {
      const base = prev ?? settings;
      return { ...base, [section]: { ...(base[section] as Record<string, unknown>), [key]: value } };
    });
  };

  const g = settings.general as Record<string, unknown>;
  const seo = settings.seo_defaults as Record<string, unknown>;
  const social = settings.social as Record<string, unknown>;
  const perms = settings.permissions as Record<string, unknown>;
  const notif = settings.notifications as Record<string, unknown>;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Category settings"
        description="Defaults and module-wide preferences for the categories system."
        actions={
          <button type="button" className={cmsButton} disabled={save.isPending} onClick={() => save.mutate()}>
            Save settings
          </button>
        }
      />
      {save.error ? <CmsAlert>{save.error.message}</CmsAlert> : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-52 shrink-0">
          <nav className="space-y-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full rounded-lg px-3 py-2 text-left text-sm font-medium cms-transition",
                  tab === t.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60",
                )}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <CmsPanel className="min-w-0 flex-1">
          {tab === "general" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingField label="Default author ID" value={String(g.default_author_id ?? "")} onChange={(v) => patchSection("general", "default_author_id", v)} />
              <SettingField label="Category layout" value={String(g.layout ?? "grid")} onChange={(v) => patchSection("general", "layout", v)} />
              <ToggleField label="Show in navigation" checked={g.show_in_nav !== false} onChange={(v) => patchSection("general", "show_in_nav", v)} />
              <ToggleField label="Show in footer" checked={Boolean(g.show_in_footer)} onChange={(v) => patchSection("general", "show_in_footer", v)} />
              <SettingField label="Articles per page" value={String(g.articles_per_page ?? 12)} onChange={(v) => patchSection("general", "articles_per_page", Number(v) || 12)} />
            </div>
          ) : null}

          {tab === "seo_defaults" ? (
            <div className="space-y-4">
              <SettingField label="Meta title template" value={String(seo.meta_title_template ?? "{{category_name}} — Diplomacy Lens")} onChange={(v) => patchSection("seo_defaults", "meta_title_template", v)} multiline />
              <SettingField label="Meta description template" value={String(seo.meta_description_template ?? "Latest {{category_name}} coverage.")} onChange={(v) => patchSection("seo_defaults", "meta_description_template", v)} multiline />
            </div>
          ) : null}

          {tab === "social" ? (
            <div className="space-y-4">
              <SettingField label="Default OG image URL" value={String(social.default_og_image ?? "")} onChange={(v) => patchSection("social", "default_og_image", v)} />
              <SettingField label="Twitter card" value={String(social.twitter_card ?? "summary_large_image")} onChange={(v) => patchSection("social", "twitter_card", v)} />
            </div>
          ) : null}

          {tab === "permissions" ? (
            <div className="space-y-3">
              <ToggleField label="Admin full access" checked={perms.admin !== false} onChange={(v) => patchSection("permissions", "admin", v)} />
              <ToggleField label="Editor can manage categories" checked={perms.editor !== false} onChange={(v) => patchSection("permissions", "editor", v)} />
              <ToggleField label="Contributor read-only" checked={Boolean(perms.contributor_readonly)} onChange={(v) => patchSection("permissions", "contributor_readonly", v)} />
            </div>
          ) : null}

          {tab === "notifications" ? (
            <div className="space-y-3">
              <ToggleField label="New article alerts" checked={notif.new_article !== false} onChange={(v) => patchSection("notifications", "new_article", v)} />
              <ToggleField label="SEO score alerts" checked={Boolean(notif.seo_alerts)} onChange={(v) => patchSection("notifications", "seo_alerts", v)} />
            </div>
          ) : null}

          {tab === "advanced" ? (
            <p className="text-sm text-muted-foreground">Advanced module hooks and API integrations can be configured here as they become available.</p>
          ) : null}
        </CmsPanel>
      </div>
    </div>
  );
}

function SettingField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block sm:col-span-2">
      <span className="mb-1 block text-xs font-semibold">{label}</span>
      {multiline ? (
        <textarea className={cmsInput} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={cmsInput} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function CategoryDetailSettingsPage({ categoryId }: { categoryId: string }) {
  return (
    <CmsPanel title="Category settings">
      <p className="text-sm text-muted-foreground">
        Per-category overrides for <code className="text-xs">{categoryId}</code> use the edit wizard. Module-wide defaults live under{" "}
        <a href="/admin/categories/settings" className="font-semibold text-primary hover:underline">
          Categories → Settings
        </a>
        .
      </p>
    </CmsPanel>
  );
}
