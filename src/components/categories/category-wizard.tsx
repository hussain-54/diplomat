import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryStepper } from "@/components/categories/category-stepper";
import {
  CmsAlert,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";
import { computeCategoryAiScore, computeCategorySeoScore } from "@/lib/category-seo-score";
import { DEFAULT_CATEGORY_FORM, type CategoryWizardPayload } from "@/lib/category-types";
import {
  getCategoryDetail,
  listCategories,
  rowToWizardPayload,
  upsertCategory,
} from "@/lib/admin.functions";
import { parentOptions } from "@/lib/taxonomy";

export function CategoryWizardPage({ categoryId }: { categoryId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(categoryId);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CategoryWizardPayload>({ ...DEFAULT_CATEGORY_FORM });

  const detailQ = useQuery({
    queryKey: ["category-detail", categoryId],
    queryFn: () => getCategoryDetail({ data: { id: categoryId! } }),
    enabled: isEdit,
  });
  const parentsQ = useQuery({ queryKey: ["categories-all"], queryFn: listCategories });

  useEffect(() => {
    if (detailQ.data?.category) {
      setForm(rowToWizardPayload(detailQ.data.category));
    }
  }, [detailQ.data]);

  const patch = (partial: Partial<CategoryWizardPayload>) => setForm((f) => ({ ...f, ...partial }));

  const seoScore = useMemo(() => computeCategorySeoScore(form), [form]);
  const aiScore = useMemo(() => computeCategoryAiScore(form), [form]);

  const save = useMutation({
    mutationFn: (publish: boolean) =>
      upsertCategory({ data: { ...form, id: categoryId, publish } }),
    onSuccess: (row) => {
      toast.success(isEdit ? "Category updated" : "Category saved");
      void qc.invalidateQueries({ queryKey: ["categories-table"] });
      void qc.invalidateQueries({ queryKey: ["categories-dashboard"] });
      navigate({ to: "/admin/categories/$id", params: { id: row.id } });
    },
    onError: (e) => toast.error(e.message),
  });

  const parentOpts = parentOptions(
    (parentsQ.data ?? []) as import("@/lib/taxonomy").TaxonomyCategory[],
    categoryId,
  );

  if (isEdit && detailQ.isLoading) return <CmsPageSkeleton metrics={0} panels={2} />;

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow={isEdit ? "Edit category" : "Create category"}
        title={isEdit ? form.name || "Edit category" : "New category"}
        description="Seven-step wizard for taxonomy, SEO, and publishing metadata."
      />

      {detailQ.error ? <CmsAlert>{detailQ.error.message}</CmsAlert> : null}
      {save.error ? <CmsAlert>{save.error.message}</CmsAlert> : null}

      <CategoryStepper current={step} onStepClick={setStep} />

      <CmsPanel>
        {step === 1 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Category name" required>
              <input className={cmsInput} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Slug">
              <input className={cmsInput} value={form.slug} onChange={(e) => patch({ slug: e.target.value })} />
            </Field>
            <Field label="Parent category">
              <select
                className={cmsInput}
                value={form.parent_id ?? ""}
                onChange={(e) => patch({ parent_id: e.target.value || null })}
              >
                <option value="">None (top level)</option>
                {parentOpts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category type">
              <select
                className={cmsInput}
                value={form.category_type ?? "standard"}
                onChange={(e) => patch({ category_type: e.target.value })}
              >
                <option value="standard">Standard</option>
                <option value="topic">Topic</option>
                <option value="region">Region</option>
                <option value="desk">Desk</option>
              </select>
            </Field>
            <Field label="Short description" className="lg:col-span-2">
              <textarea
                className={cmsInput}
                rows={2}
                value={form.short_description ?? ""}
                onChange={(e) => patch({ short_description: e.target.value })}
              />
            </Field>
            <Field label="Full description" className="lg:col-span-2">
              <textarea
                className={cmsInput}
                rows={4}
                value={form.description ?? ""}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>
            <Field label="Icon URL">
              <input className={cmsInput} value={form.icon_url ?? ""} onChange={(e) => patch({ icon_url: e.target.value })} />
            </Field>
            <Field label="Cover image URL">
              <input
                className={cmsInput}
                value={form.cover_image_url ?? ""}
                onChange={(e) => patch({ cover_image_url: e.target.value })}
              />
            </Field>
            <Toggle label="Active (public)" checked={form.visibility !== "hidden"} onChange={(v) => patch({ visibility: v ? "public" : "hidden" })} />
            <Toggle label="Featured category" checked={Boolean(form.featured)} onChange={(v) => patch({ featured: v })} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
              Live SEO score: <strong>{seoScore}/100</strong>
            </div>
            <Field label="SEO title" hint={`${(form.seo_title || form.name).length} chars`}>
              <input className={cmsInput} value={form.seo_title ?? ""} onChange={(e) => patch({ seo_title: e.target.value })} />
            </Field>
            <Field label="Meta description" hint={`${(form.meta_description || "").length} chars`}>
              <textarea className={cmsInput} rows={3} value={form.meta_description ?? ""} onChange={(e) => patch({ meta_description: e.target.value })} />
            </Field>
            <Field label="Focus keywords (comma-separated)" className="lg:col-span-2">
              <input
                className={cmsInput}
                value={(form.focus_keywords ?? []).join(", ")}
                onChange={(e) => patch({ focus_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </Field>
            <Field label="Canonical URL" className="lg:col-span-2">
              <input className={cmsInput} value={form.canonical_url ?? ""} onChange={(e) => patch({ canonical_url: e.target.value })} />
            </Field>
            <Field label="Open Graph title">
              <input className={cmsInput} value={form.og_title ?? ""} onChange={(e) => patch({ og_title: e.target.value })} />
            </Field>
            <Field label="Open Graph description">
              <textarea className={cmsInput} rows={2} value={form.og_description ?? ""} onChange={(e) => patch({ og_description: e.target.value })} />
            </Field>
            <Field label="Twitter title">
              <input className={cmsInput} value={form.twitter_title ?? ""} onChange={(e) => patch({ twitter_title: e.target.value })} />
            </Field>
            <Field label="Twitter description">
              <textarea className={cmsInput} rows={2} value={form.twitter_description ?? ""} onChange={(e) => patch({ twitter_description: e.target.value })} />
            </Field>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2 flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="text-sm">AI optimization score: <strong>{aiScore}/100</strong></span>
              <button
                type="button"
                className={cmsSecondaryButton}
                onClick={() => {
                  patch({
                    ai_summary: form.ai_summary || `Editorial summary for ${form.name || "this category"} covering key themes and audience intent.`,
                    topic_cluster: form.topic_cluster || form.name,
                    semantic_keywords: form.semantic_keywords?.length
                      ? form.semantic_keywords
                      : (form.focus_keywords ?? []).slice(0, 5),
                  });
                  toast.success("AI fields generated");
                }}
              >
                Generate with AI
              </button>
            </div>
            <Field label="AI summary" className="lg:col-span-2">
              <textarea className={cmsInput} rows={3} value={form.ai_summary ?? ""} onChange={(e) => patch({ ai_summary: e.target.value })} />
            </Field>
            <Field label="Topic cluster">
              <input className={cmsInput} value={form.topic_cluster ?? ""} onChange={(e) => patch({ topic_cluster: e.target.value })} />
            </Field>
            <Field label="Search intent">
              <select className={cmsInput} value={form.search_intent ?? ""} onChange={(e) => patch({ search_intent: e.target.value })}>
                <option value="informational">Informational</option>
                <option value="navigational">Navigational</option>
                <option value="commercial">Commercial</option>
                <option value="transactional">Transactional</option>
              </select>
            </Field>
            <Field label="Semantic keywords" className="lg:col-span-2">
              <input
                className={cmsInput}
                value={(form.semantic_keywords ?? []).join(", ")}
                onChange={(e) => patch({ semantic_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              />
            </Field>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle label="News eligible" checked={Boolean(form.news_eligible)} onChange={(v) => patch({ news_eligible: v })} />
            <Toggle label="Include in news sitemap" checked={Boolean(form.news_sitemap)} onChange={(v) => patch({ news_sitemap: v })} />
            <Field label="Priority level (1–10)">
              <input type="number" min={1} max={10} className={cmsInput} value={form.news_priority ?? 5} onChange={(e) => patch({ news_priority: Number(e.target.value) })} />
            </Field>
            <Toggle label="Breaking news category" checked={Boolean(form.breaking_news)} onChange={(v) => patch({ breaking_news: v })} />
            <Toggle label="Discover eligible" checked={Boolean(form.discover_eligible)} onChange={(v) => patch({ discover_eligible: v })} />
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <Field label="Schema type">
              <select className={cmsInput} value={form.schema_type ?? "CollectionPage"} onChange={(e) => patch({ schema_type: e.target.value })}>
                <option value="CollectionPage">CollectionPage</option>
                <option value="Blog">Blog</option>
                <option value="NewsCategory">NewsCategory</option>
                <option value="TopicCategory">TopicCategory</option>
              </select>
            </Field>
            <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
              {JSON.stringify(
                {
                  "@context": "https://schema.org",
                  "@type": form.schema_type || "CollectionPage",
                  name: form.seo_title || form.name,
                  description: form.meta_description || form.short_description,
                  url: form.canonical_url || `/section/${form.slug || "slug"}`,
                },
                null,
                2,
              )}
            </pre>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Language">
              <input className={cmsInput} value={form.language ?? "en"} onChange={(e) => patch({ language: e.target.value })} />
            </Field>
            <Field label="Region">
              <input className={cmsInput} value={form.region ?? ""} onChange={(e) => patch({ region: e.target.value })} />
            </Field>
            <Field label="Country">
              <input className={cmsInput} value={form.country ?? ""} onChange={(e) => patch({ country: e.target.value })} />
            </Field>
            <Field label="Access mode">
              <select className={cmsInput} value={form.access_mode ?? "public"} onChange={(e) => patch({ access_mode: e.target.value })}>
                <option value="public">Public</option>
                <option value="restricted">Restricted</option>
                <option value="private">Private</option>
              </select>
            </Field>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryRow label="Name" value={form.name || "—"} />
              <SummaryRow label="Slug" value={form.slug || "—"} />
              <SummaryRow label="Status" value={form.visibility === "hidden" ? "Draft / Hidden" : "Public"} />
              <SummaryRow label="SEO score" value={`${seoScore}/100`} />
              <SummaryRow label="AI score" value={`${aiScore}/100`} />
              <SummaryRow label="Google News" value={form.news_eligible ? "Eligible" : "No"} />
            </div>
            {!form.name.trim() ? (
              <p className="text-cat-rose text-xs font-medium">Category name is required before saving.</p>
            ) : null}
          </div>
        ) : null}
      </CmsPanel>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={cmsSecondaryButton} disabled={step <= 1} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className={cmsSecondaryButton}
            disabled={save.isPending || !form.name.trim()}
            onClick={() => save.mutate(false)}
          >
            Save draft
          </button>
          {step < 7 ? (
            <button type="button" className={cmsButton} onClick={() => setStep((s) => s + 1)}>
              Next step
            </button>
          ) : (
            <button
              type="button"
              className={cmsButton}
              disabled={save.isPending || !form.name.trim()}
              onClick={() => save.mutate(true)}
            >
              Publish category
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-semibold text-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function Toggle({
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
      <span className="text-xs font-semibold">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/20 px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
