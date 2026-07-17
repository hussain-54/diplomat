import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  cmsButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms-ui";
import { deleteCategory, listCategories, upsertCategory } from "@/lib/admin.functions";
import { requireSuperAdminRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  beforeLoad: ({ context }) => requireSuperAdminRoute(context.roles),
  component: CategoriesPage,
});

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
};

const emptyForm: CategoryForm = { name: "", slug: "", color: "", sort_order: 0 };

function CategoriesPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["cms-categories"], queryFn: listCategories });
  const [form, setForm] = useState<CategoryForm | null>(null);
  const save = useMutation({
    mutationFn: (value: CategoryForm) => upsertCategory({ data: value }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cms-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["sections"] });
      setForm(null);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cms-categories"] }),
  });

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Content architecture"
        title="Categories"
        description="Control the sections used to organize reporting across the website and newsroom."
        actions={
          <button type="button" onClick={() => setForm(emptyForm)} className={cmsButton}>
            <Plus className="h-4 w-4" /> New category
          </button>
        }
      />

      {(categories.error || save.error || remove.error) && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {(categories.error ?? save.error ?? remove.error)?.message}
        </div>
      )}

      {form && (
        <CmsPanel title={form.id ? "Edit category" : "Create category"}>
          <form
            className="grid gap-4 p-5 md:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate(form);
            }}
          >
            <Field label="Name">
              <input
                className={cmsInput}
                value={form.name}
                required
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Slug">
              <input
                className={cmsInput}
                value={form.slug}
                placeholder="Generated automatically"
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
            </Field>
            <Field label="Editorial color">
              <input
                className={cmsInput}
                value={form.color}
                placeholder="e.g. navy"
                onChange={(event) => setForm({ ...form, color: event.target.value })}
              />
            </Field>
            <Field label="Order">
              <input
                className={cmsInput}
                type="number"
                value={form.sort_order}
                onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })}
              />
            </Field>
            <div className="flex gap-2 md:col-span-4">
              <button type="submit" className={cmsButton} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save category"}
              </button>
              <button type="button" className={cmsSecondaryButton} onClick={() => setForm(null)}>
                Cancel
              </button>
            </div>
          </form>
        </CmsPanel>
      )}

      <CmsPanel title="Published taxonomy" description={`${categories.data?.length ?? 0} categories`}>
        {categories.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading categories…</div>
        ) : !categories.data?.length ? (
          <CmsEmptyState
            title="No categories"
            description="Create the first category to begin organizing newsroom content."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Slug</th>
                  <th className="px-5 py-3 font-semibold">Articles</th>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories.data.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/30">
                    <td className="px-5 py-4 font-semibold text-foreground">
                      <span className="mr-3 inline-block h-2 w-2 bg-cat-blue" />
                      {category.name}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{category.slug}</td>
                    <td className="px-5 py-4 tabular-nums text-muted-foreground">
                      {category.articles?.[0]?.count ?? 0}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-muted-foreground">{category.sort_order}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                          onClick={() =>
                            setForm({
                              id: category.id,
                              name: category.name,
                              slug: category.slug,
                              color: category.color ?? "",
                              sort_order: category.sort_order,
                            })
                          }
                          aria-label={`Edit ${category.name}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 text-muted-foreground hover:bg-crimson/10 hover:text-crimson"
                          onClick={() => {
                            if (window.confirm(`Delete ${category.name}?`)) remove.mutate(category.id);
                          }}
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
