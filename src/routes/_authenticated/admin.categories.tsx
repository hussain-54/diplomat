import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  FolderTree,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
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
  deleteCategory,
  listCategories,
  reorderCategories,
  upsertCategory,
} from "@/lib/admin.functions";
import { requirePermissionRoute } from "@/lib/route-guards";
import {
  applyCategoryMove,
  buildCategoryTree,
  flattenCategoryTree,
  normalizeVisibility,
  parentOptions,
  type CategoryVisibility,
  type TaxonomyCategory,
  type TaxonomyNode,
} from "@/lib/taxonomy";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "categories:manage"),
  component: CategoriesPage,
});

type CategoryForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  visibility: CategoryVisibility;
  color: string;
  sort_order: number;
};

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  parent_id: "",
  visibility: "public",
  color: "",
  sort_order: 0,
};

function CategoriesPage() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: ["cms-categories"], queryFn: listCategories });
  const [form, setForm] = useState<CategoryForm | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    mode: "before" | "after" | "into";
  } | null>(null);

  const flat = useMemo(
    () => (categories.data ?? []) as TaxonomyCategory[],
    [categories.data],
  );
  const tree = useMemo(() => buildCategoryTree(flat), [flat]);
  const visibleNodes = useMemo(() => {
    const all = flattenCategoryTree(tree);
    return all.filter((node) => {
      let parentId = node.parent_id;
      while (parentId) {
        if (collapsed.has(parentId)) return false;
        parentId = flat.find((c) => c.id === parentId)?.parent_id ?? null;
      }
      return true;
    });
  }, [tree, collapsed, flat]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["cms-categories"] });
    await queryClient.invalidateQueries({ queryKey: ["sections"] });
  };

  const save = useMutation({
    mutationFn: (value: CategoryForm) =>
      upsertCategory({
        data: {
          id: value.id,
          name: value.name,
          slug: value.slug,
          description: value.description,
          parent_id: value.parent_id || null,
          visibility: value.visibility,
          color: value.color,
          sort_order: value.sort_order,
        },
      }),
    onSuccess: async () => {
      await invalidate();
      setForm(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory({ data: { id } }),
    onSuccess: () => invalidate(),
  });

  const reorder = useMutation({
    mutationFn: (items: Array<{ id: string; parent_id: string | null; sort_order: number }>) =>
      reorderCategories({ data: { items } }),
    onSuccess: () => invalidate(),
  });

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const commitDrop = (targetId: string, mode: "before" | "after" | "into") => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDropTarget(null);
      return;
    }
    const target = flat.find((c) => c.id === targetId);
    if (!target) return;

    let newParentId: string | null;
    let siblingIndex: number;

    if (mode === "into") {
      newParentId = targetId;
      siblingIndex = flat.filter((c) => c.parent_id === targetId && c.id !== dragId).length;
    } else {
      newParentId = target.parent_id;
      const siblings = flat
        .filter((c) => c.parent_id === newParentId && c.id !== dragId)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
      const targetIndex = siblings.findIndex((c) => c.id === targetId);
      siblingIndex = mode === "before" ? targetIndex : targetIndex + 1;
    }

    const items = applyCategoryMove(flat, dragId, newParentId, Math.max(0, siblingIndex));
    setDragId(null);
    setDropTarget(null);
    if (items.length) reorder.mutate(items);
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Content architecture"
        title="Taxonomy"
        description="Manage nested categories with visibility controls and a drag-and-drop hierarchy."
        actions={
          <button type="button" onClick={() => setForm(emptyForm)} className={cmsButton}>
            <Plus className="h-4 w-4" /> New category
          </button>
        }
      />

      {(categories.error || save.error || remove.error || reorder.error) && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {(categories.error ?? save.error ?? remove.error ?? reorder.error)?.message}
        </div>
      )}

      {form && (
        <CmsPanel title={form.id ? "Edit category" : "Create category"}>
          <form
            className="grid gap-4 p-5 md:grid-cols-2"
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
            <Field label="Description">
              <textarea
                className={`${cmsInput} h-auto py-2`}
                rows={3}
                value={form.description}
                placeholder="Short description of this category"
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <div className="space-y-4">
              <Field label="Parent category">
                <select
                  className={cmsInput}
                  value={form.parent_id}
                  onChange={(event) => setForm({ ...form, parent_id: event.target.value })}
                >
                  <option value="">— Top level —</option>
                  {parentOptions(flat, form.id).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Visibility">
                <select
                  className={cmsInput}
                  value={form.visibility}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      visibility: normalizeVisibility(event.target.value),
                    })
                  }
                >
                  <option value="public">Public</option>
                  <option value="hidden">Hidden</option>
                </select>
              </Field>
              <Field label="Editorial color">
                <input
                  className={cmsInput}
                  value={form.color}
                  placeholder="e.g. #0E1524"
                  onChange={(event) => setForm({ ...form, color: event.target.value })}
                />
              </Field>
            </div>
            <div className="flex gap-2 md:col-span-2">
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

      <CmsPanel
        title="Category tree"
        description="Drag rows to reorder siblings. Drop onto a folder to nest. Collapse branches with the chevron."
        action={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderTree className="h-3.5 w-3.5" />
            {flat.length} categories
            {reorder.isPending ? " · Saving hierarchy…" : ""}
          </span>
        }
      >
        {categories.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading taxonomy…</div>
        ) : !flat.length ? (
          <CmsEmptyState
            title="No categories"
            description="Create the first category to begin organizing newsroom content."
            action={
              <button type="button" className={cmsButton} onClick={() => setForm(emptyForm)}>
                <Plus className="h-4 w-4" /> New category
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            <div className="hidden grid-cols-[28px_1fr_120px_88px_100px] gap-2 border-b border-border bg-muted/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:grid">
              <span />
              <span>Category</span>
              <span>Slug</span>
              <span>Articles</span>
              <span className="text-right">Actions</span>
            </div>
            {visibleNodes.map((node) => (
              <CategoryTreeRow
                key={node.id}
                node={node}
                collapsed={collapsed.has(node.id)}
                dragId={dragId}
                dropTarget={dropTarget}
                onToggle={() => toggleCollapse(node.id)}
                onEdit={() =>
                  setForm({
                    id: node.id,
                    name: node.name,
                    slug: node.slug,
                    description: node.description ?? "",
                    parent_id: node.parent_id ?? "",
                    visibility: normalizeVisibility(node.visibility),
                    color: node.color ?? "",
                    sort_order: node.sort_order,
                  })
                }
                onDelete={() => {
                  if (window.confirm(`Delete ${node.name}?`)) remove.mutate(node.id);
                }}
                onDragStart={() => setDragId(node.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTarget(null);
                }}
                onDragOver={(mode) => {
                  if (!dragId || dragId === node.id) return;
                  setDropTarget({ id: node.id, mode });
                }}
                onDrop={(mode) => commitDrop(node.id, mode)}
              />
            ))}
          </div>
        )}
      </CmsPanel>
    </div>
  );
}

function CategoryTreeRow({
  node,
  collapsed,
  dragId,
  dropTarget,
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  node: TaxonomyNode;
  collapsed: boolean;
  dragId: string | null;
  dropTarget: { id: string; mode: "before" | "after" | "into" } | null;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (mode: "before" | "after" | "into") => void;
  onDrop: (mode: "before" | "after" | "into") => void;
}) {
  const isDragging = dragId === node.id;
  const isBefore = dropTarget?.id === node.id && dropTarget.mode === "before";
  const isAfter = dropTarget?.id === node.id && dropTarget.mode === "after";
  const isInto = dropTarget?.id === node.id && dropTarget.mode === "into";
  const hasChildren = node.children.length > 0;

  const resolveMode = (event: React.DragEvent<HTMLDivElement>): "before" | "after" | "into" => {
    const rect = event.currentTarget.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const ratio = y / rect.height;
    if (ratio < 0.25) return "before";
    if (ratio > 0.75) return "after";
    return "into";
  };

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(resolveMode(event));
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(resolveMode(event));
      }}
      className={`relative transition-colors ${
        isDragging ? "opacity-40" : "hover:bg-muted/30"
      } ${isInto ? "bg-accent/50 ring-1 ring-inset ring-ring" : ""}`}
      style={{ paddingLeft: `${12 + node.depth * 20}px` }}
    >
      {isBefore && (
        <div className="absolute inset-x-4 top-0 h-0.5 bg-ring" aria-hidden />
      )}
      {isAfter && (
        <div className="absolute inset-x-4 bottom-0 h-0.5 bg-ring" aria-hidden />
      )}
      <div className="grid grid-cols-[28px_1fr_auto] items-center gap-2 px-4 py-3 md:grid-cols-[28px_1fr_120px_88px_100px]">
        <span
          className="inline-flex cursor-grab text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder or nest"
        >
          <GripVertical className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button
                type="button"
                onClick={onToggle}
                className="inline-flex h-6 w-6 items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={collapsed ? "Expand" : "Collapse"}
              >
                {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            ) : (
              <span className="inline-block h-6 w-6" />
            )}
            <span
              className="inline-block h-2.5 w-2.5 shrink-0"
              style={{ backgroundColor: node.color || "var(--color-cat-blue)" }}
            />
            <span className="truncate font-semibold text-foreground">{node.name}</span>
            <CmsStatus tone={node.visibility === "public" ? "success" : "neutral"}>
              {node.visibility === "public" ? (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Public
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <EyeOff className="h-3 w-3" /> Hidden
                </span>
              )}
            </CmsStatus>
          </div>
          {node.description && (
            <p className="mt-1 line-clamp-1 pl-8 text-xs text-muted-foreground">{node.description}</p>
          )}
        </div>

        <div className="hidden truncate font-mono text-xs text-muted-foreground md:block">
          {node.slug}
        </div>
        <div className="hidden tabular-nums text-sm text-muted-foreground md:block">
          {node.articleCount}
        </div>
        <div className="flex justify-end gap-1">
          <button
            type="button"
            className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onEdit}
            aria-label={`Edit ${node.name}`}
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="p-2 text-muted-foreground hover:bg-crimson/10 hover:text-crimson"
            onClick={onDelete}
            aria-label={`Delete ${node.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
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
