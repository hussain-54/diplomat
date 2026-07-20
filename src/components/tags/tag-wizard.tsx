import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CmsAlert,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import { computeTagSeoScore } from "@/lib/tag-seo-score";
import {
  DEFAULT_TAG_FORM,
  TAG_ICON_OPTIONS,
  TAG_WIZARD_SECTIONS,
  type TagWizardPayload,
} from "@/lib/tag-types";
import {
  getTagDetail,
  listTagsAdmin,
  rowToTagWizardPayload,
  upsertTag,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export function TagWizardPage({ tagId }: { tagId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(tagId);
  const [section, setSection] = useState(1);
  const [form, setForm] = useState<TagWizardPayload>({ ...DEFAULT_TAG_FORM });

  const detailQ = useQuery({
    queryKey: ["tag-detail", tagId],
    queryFn: () => getTagDetail({ data: { id: tagId! } }),
    enabled: isEdit,
  });
  const parentsQ = useQuery({ queryKey: ["tags-admin-all"], queryFn: listTagsAdmin });

  useEffect(() => {
    if (detailQ.data?.tag) {
      setForm(rowToTagWizardPayload(detailQ.data.tag));
    }
  }, [detailQ.data]);

  const patch = (partial: Partial<TagWizardPayload>) => setForm((f) => ({ ...f, ...partial }));
  const seoScore = useMemo(() => computeTagSeoScore(form), [form]);

  const save = useMutation({
    mutationFn: () => upsertTag({ data: { ...form, id: tagId } }),
    onSuccess: (row) => {
      toast.success(isEdit ? "Tag updated" : "Tag created");
      void qc.invalidateQueries({ queryKey: ["tags-table"] });
      void qc.invalidateQueries({ queryKey: ["tags-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["tags-library-counts"] });
      navigate({ to: "/admin/tags/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(e.message),
  });

  const parents = (parentsQ.data ?? []).filter((t) => t.id !== tagId);

  if (isEdit && detailQ.isLoading) return <CmsPageSkeleton metrics={0} panels={2} />;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={isEdit ? "Edit tag" : "Create tag"}
        title={isEdit ? form.name || "Edit tag" : "New tag"}
        description="Define taxonomy metadata, SEO, localization, and publish state."
      />

      {detailQ.error ? <CmsAlert>{detailQ.error.message}</CmsAlert> : null}
      {save.error ? <CmsAlert>{save.error.message}</CmsAlert> : null}

      <nav className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card p-1.5">
        {TAG_WIZARD_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              section === s.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <CmsPanel>
        {section === 1 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Tag name" required>
              <input className={cmsInput} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Slug">
              <input className={cmsInput} value={form.slug ?? ""} onChange={(e) => patch({ slug: e.target.value })} />
            </Field>
            <Field label="Parent tag">
              <select
                className={cmsInput}
                value={form.parent_id ?? ""}
                onChange={(e) => patch({ parent_id: e.target.value || null })}
              >
                <option value="">None</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Description" className="lg:col-span-2">
              <textarea
                className={cmsInput}
                rows={4}
                value={form.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {section === 2 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
              Live SEO score: <strong>{seoScore}/100</strong>
            </div>
            <Field label="SEO title" hint={`${(form.seo_title || form.name).length} chars`}>
              <input
                className={cmsInput}
                value={form.seo_title ?? ""}
                onChange={(e) => patch({ seo_title: e.target.value })}
              />
            </Field>
            <Field label="Focus keyword">
              <input
                className={cmsInput}
                value={form.focus_keyword ?? ""}
                onChange={(e) => patch({ focus_keyword: e.target.value })}
              />
            </Field>
            <Field label="Meta description" className="lg:col-span-2" hint={`${(form.meta_description || "").length} chars`}>
              <textarea
                className={cmsInput}
                rows={3}
                value={form.meta_description ?? ""}
                onChange={(e) => patch({ meta_description: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm lg:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(form.discover_eligible)}
                onChange={(e) => patch({ discover_eligible: e.target.checked })}
              />
              Google Discover eligible
            </label>
            <label className="flex items-center gap-2 text-sm lg:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(form.ai_optimized)}
                onChange={(e) => patch({ ai_optimized: e.target.checked })}
              />
              Mark as AI optimized
            </label>
          </div>
        ) : null}

        {section === 3 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Language">
              <select
                className={cmsInput}
                value={form.language ?? "en"}
                onChange={(e) => patch({ language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </Field>
            <Field label="Country">
              <input
                className={cmsInput}
                placeholder="e.g. US, PK"
                value={form.country ?? ""}
                onChange={(e) => patch({ country: e.target.value })}
              />
            </Field>
          </div>
        ) : null}

        {section === 4 ? (
          <div className="space-y-4">
            <Field label="Featured image URL">
              <input
                className={cmsInput}
                value={form.cover_image_url ?? ""}
                onChange={(e) => patch({ cover_image_url: e.target.value })}
                placeholder="Paste image URL or upload via Media Library"
              />
            </Field>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/80 bg-muted/20 px-6 py-10 text-center">
              <span className="text-sm font-medium">Drag & drop or paste an image URL above</span>
              <span className="text-xs text-muted-foreground">Replace by updating the URL</span>
            </label>
            {form.cover_image_url ? (
              <img
                src={form.cover_image_url}
                alt=""
                className="max-h-48 rounded-xl object-cover ring-1 ring-border/60"
              />
            ) : null}
          </div>
        ) : null}

        {section === 5 ? (
          <div className="space-y-4">
            <Field label="Choose icon">
              <div className="flex flex-wrap gap-2">
                {TAG_ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm",
                      form.icon_name === icon
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/60 text-muted-foreground hover:bg-accent",
                    )}
                    onClick={() => patch({ icon_name: icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Custom icon URL">
              <input
                className={cmsInput}
                value={form.icon_url ?? ""}
                onChange={(e) => patch({ icon_url: e.target.value })}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              Preview: <strong>{form.icon_name || form.icon_url || "None selected"}</strong>
            </p>
          </div>
        ) : null}

        {section === 6 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Status">
              <select
                className={cmsInput}
                value={form.status ?? "draft"}
                onChange={(e) =>
                  patch({ status: e.target.value as TagWizardPayload["status"] })
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </Field>
            {form.status === "scheduled" ? (
              <Field label="Scheduled at">
                <input
                  type="datetime-local"
                  className={cmsInput}
                  value={form.scheduled_at?.slice(0, 16) ?? ""}
                  onChange={(e) =>
                    patch({
                      scheduled_at: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null,
                    })
                  }
                />
              </Field>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
          <button
            type="button"
            className={cmsSecondaryButton}
            disabled={section <= 1}
            onClick={() => setSection((s) => Math.max(1, s - 1))}
          >
            Back
          </button>
          <div className="flex gap-2">
            {section < TAG_WIZARD_SECTIONS.length ? (
              <button
                type="button"
                className={cmsSecondaryButton}
                onClick={() => setSection((s) => Math.min(TAG_WIZARD_SECTIONS.length, s + 1))}
              >
                Next
              </button>
            ) : null}
            <button
              type="button"
              className={cmsButton}
              disabled={save.isPending || !form.name.trim()}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : isEdit ? "Save changes" : "Create tag"}
            </button>
          </div>
        </div>
      </CmsPanel>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>
          {label}
          {required ? " *" : ""}
        </span>
        {hint ? <span className="font-normal normal-case">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}
