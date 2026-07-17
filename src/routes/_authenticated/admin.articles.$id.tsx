import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminArticle, getMe, upsertArticle, uploadHeroImage } from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { useState, useEffect } from "react";
import type { Database } from "@/integrations/supabase/types";
import { CmsPageHeader, CmsPanel, CmsStatus, cmsButton, cmsInput } from "@/components/cms-ui";

type ArticleStatus = Database["public"]["Enums"]["article_status"];

export const Route = createFileRoute("/_authenticated/admin/articles/$id")({
  component: EditArticle,
});

function EditArticle() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const meQ = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const rolesReady = meQ.isSuccess;
  const editorRoles = meQ.data?.roles ?? [];
  const isEditor = editorRoles.includes("super_admin") || editorRoles.includes("section_editor");

  const sectionsQ = useQuery({ queryKey: ["sections"], queryFn: () => getSections() });
  const articleQ = useQuery({
    queryKey: ["admin-article", id],
    queryFn: () => getAdminArticle({ data: { id } }),
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    title: "",
    deck: "",
    body: "",
    section_id: "",
    region: "",
    badge_type: "none",
    hero_image_url: "",
    status: "draft" as ArticleStatus,
    slug: "",
  });
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (articleQ.data) {
      setForm({
        title: articleQ.data.title,
        deck: articleQ.data.deck ?? "",
        body: articleQ.data.body ?? "",
        section_id: articleQ.data.section_id ?? "",
        region: articleQ.data.region ?? "",
        badge_type: articleQ.data.badge_type ?? "none",
        hero_image_url: articleQ.data.hero_image_url ?? "",
        status: articleQ.data.status,
        slug: articleQ.data.slug,
      });
    }
  }, [articleQ.data]);

  const canPublish =
    isEditor ||
    (!!form.section_id && (meQ.data?.sectionAccess ?? []).includes(form.section_id));
  const publishedReadOnly =
    !isNew && rolesReady && !canPublish && articleQ.data?.status === "published";

  const save = useMutation({
    mutationFn: () =>
      upsertArticle({
        data: {
          id: isNew ? undefined : id,
          title: form.title,
          deck: form.deck,
          body: form.body,
          section_id: form.section_id,
          region: form.region,
          badge_type: form.badge_type,
          hero_image_url: form.hero_image_url,
          status: form.status,
          slug: form.slug || undefined,
        },
      }),
    onSuccess: (article) => {
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      qc.invalidateQueries({ queryKey: ["admin-article"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["latest"] });
      if (article?.slug) {
        qc.invalidateQueries({ queryKey: ["article", article.slug] });
      }
      navigate({ to: "/admin/articles" });
    },
  });

  const upload = async (file: File) => {
    setUploadBusy(true);
    setUploadError(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      const base64 = btoa(bin);
      const res = await uploadHeroImage({
        data: {
          fileName: file.name,
          contentType: file.type || "image/jpeg",
          base64,
          bucket: "article-hero",
        },
      });
      if (res.url) setForm((f) => ({ ...f, hero_image_url: res.url! }));
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploadBusy(false);
    }
  };

  if (!isNew && articleQ.isLoading) {
    return <div className="text-sm text-muted-foreground">Loading article…</div>;
  }
  if (!isNew && articleQ.isError) {
    return (
      <div className="rounded-sm border border-crimson bg-crimson/10 p-4 text-sm text-crimson">
        {(articleQ.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Editorial workspace"
        title={isNew ? "Create article" : "Edit article"}
        description={isNew ? "Draft a new story for the newsroom." : `Editing ${articleQ.data?.slug ?? "article"}`}
        actions={
          <Link to="/admin/articles" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            ← Back to articles
          </Link>
        }
      />
      {!canPublish && (
        <div className="border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-muted-foreground">
          {publishedReadOnly ? (
            <>This published article is read-only for your role. An editor must make changes.</>
          ) : (
            <>
              Your role can save <strong>draft</strong> or <strong>in review</strong> only. A section
              editor or super admin must publish.
            </>
          )}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!publishedReadOnly) save.mutate();
        }}
        className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      >
        <CmsPanel title="Story content" description="Headline, summary, body, and permanent URL">
          <div className="space-y-5 p-5">
          <Field label="Headline">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-12 w-full border border-input bg-background px-3 font-serif text-xl text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="Summary / deck">
            <textarea
              value={form.deck}
              onChange={(e) => setForm({ ...form, deck: e.target.value })}
              rows={2}
              className="w-full border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="Article body" hint="Separate paragraphs with a blank line">
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={16}
              className="w-full border border-input bg-background px-4 py-3 font-serif text-base leading-7 outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </Field>
          <Field label="Slug (auto if blank)">
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className={cmsInput}
            />
          </Field>
          </div>
        </CmsPanel>
        <aside className="space-y-4">
          <CmsPanel title="Publishing" description="Workflow status and distribution">
            <div className="space-y-4 p-5">
          <Field label="Category">
            <select
              required
              value={form.section_id}
              onChange={(e) => setForm({ ...form, section_id: e.target.value })}
              className={cmsInput}
            >
              <option value="">—</option>
              {(sectionsQ.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ArticleStatus })}
              disabled={publishedReadOnly}
              className={cmsInput}
            >
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              {canPublish && <option value="published">Published</option>}
            </select>
          </Field>
          <Field label="Badge">
            <select
              value={form.badge_type}
              onChange={(e) => setForm({ ...form, badge_type: e.target.value })}
              className={cmsInput}
            >
              {["none", "breaking", "live", "exclusive", "opinion", "premium", "alert"].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Region">
            <input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className={cmsInput}
            />
          </Field>
            </div>
          </CmsPanel>
          <CmsPanel title="Lead image" description="JPEG, PNG, WebP, or GIF · maximum 5 MB">
            <div className="space-y-3 p-5">
          <Field label="Hero image">
            {form.hero_image_url && (
              <img src={form.hero_image_url} alt={form.title || "Article hero"} className="mb-2 aspect-video w-full object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            {uploadBusy && <div className="mt-1 text-xs text-muted-foreground">Uploading…</div>}
            {uploadError && <div className="mt-1 text-xs text-crimson">{uploadError}</div>}
            <input
              value={form.hero_image_url}
              onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
              placeholder="Or paste image URL"
              className={`${cmsInput} mt-2 text-xs`}
            />
          </Field>
            </div>
          </CmsPanel>
          <div className="border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Current state</span>
              <CmsStatus
                tone={form.status === "published" ? "success" : form.status === "review" ? "warning" : "neutral"}
              >
                {form.status}
              </CmsStatus>
            </div>
          <button
            type="submit"
            disabled={
              publishedReadOnly || save.isPending || !form.section_id || !form.title.trim()
            }
            className={`${cmsButton} w-full`}
          >
            {save.isPending
              ? "Saving…"
              : form.status === "published"
                ? "Publish article"
                : isNew
                  ? "Create article"
                  : "Save changes"}
          </button>
          {save.isError && (
            <div className="mt-3 border border-crimson/30 bg-crimson/10 p-3 text-xs text-crimson">
              {(save.error as Error).message}
            </div>
          )}
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {hint && <span className="ml-2 text-[11px] font-normal text-muted-foreground">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
