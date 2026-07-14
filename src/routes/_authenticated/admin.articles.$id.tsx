import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminArticle, upsertArticle, uploadHeroImage } from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/articles/$id")({
  component: EditArticle,
});

function EditArticle() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

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
    status: "draft" as "draft" | "review" | "published",
    slug: "",
  });
  const [uploadBusy, setUploadBusy] = useState(false);

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      navigate({ to: "/admin/articles" });
    },
  });

  const upload = async (file: File) => {
    setUploadBusy(true);
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
    } finally {
      setUploadBusy(false);
    }
  };

  return (
    <div>
      <Link to="/admin/articles" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← Back to articles
      </Link>
      <h1 className="mt-2 font-serif text-3xl text-ink">
        {isNew ? "New article" : "Edit article"}
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"
      >
        <div className="space-y-4 rounded-sm border border-border bg-card p-5">
          <Field label="Title">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-sm border border-input px-3 py-2 font-serif text-lg" />
          </Field>
          <Field label="Deck">
            <textarea value={form.deck} onChange={(e) => setForm({ ...form, deck: e.target.value })}
              rows={2} className="w-full rounded-sm border border-input px-3 py-2" />
          </Field>
          <Field label="Body (paragraphs separated by blank line)">
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={16} className="w-full rounded-sm border border-input px-3 py-2 font-serif" />
          </Field>
          <Field label="Slug (auto if blank)">
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full rounded-sm border border-input px-3 py-2 text-sm" />
          </Field>
        </div>
        <aside className="space-y-4 rounded-sm border border-border bg-card p-5">
          <Field label="Section">
            <select required value={form.section_id} onChange={(e) => setForm({ ...form, section_id: e.target.value })}
              className="w-full rounded-sm border border-input px-3 py-2">
              <option value="">—</option>
              {(sectionsQ.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "draft" })}
              className="w-full rounded-sm border border-input px-3 py-2">
              <option value="draft">Draft</option>
              <option value="review">In review</option>
              <option value="published">Published</option>
            </select>
          </Field>
          <Field label="Badge">
            <select value={form.badge_type} onChange={(e) => setForm({ ...form, badge_type: e.target.value })}
              className="w-full rounded-sm border border-input px-3 py-2">
              {["none","breaking","live","exclusive","opinion","premium","alert"].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
          <Field label="Region">
            <input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="w-full rounded-sm border border-input px-3 py-2 text-sm" />
          </Field>
          <Field label="Hero image">
            {form.hero_image_url && (
              <img src={form.hero_image_url} alt="" className="mb-2 aspect-video w-full rounded-sm object-cover" />
            )}
            <input type="file" accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            {uploadBusy && <div className="mt-1 text-xs text-muted-foreground">Uploading…</div>}
            <input value={form.hero_image_url} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })}
              placeholder="Or paste image URL" className="mt-2 w-full rounded-sm border border-input px-3 py-2 text-xs" />
          </Field>
          <button type="submit" disabled={save.isPending}
            className="w-full rounded-sm bg-navy px-4 py-2.5 text-sm font-semibold uppercase tracking-widest text-navy-foreground disabled:opacity-50">
            {save.isPending ? "Saving…" : isNew ? "Create article" : "Save changes"}
          </button>
          {save.isError && <div className="rounded-sm border border-crimson bg-crimson/10 p-2 text-xs text-crimson">{(save.error as Error).message}</div>}
        </aside>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
