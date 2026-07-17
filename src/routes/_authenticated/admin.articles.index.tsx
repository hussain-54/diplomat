import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import { deleteArticle, getMe, listAdminArticles } from "@/lib/admin.functions";
import { useState } from "react";
import {
  CmsEmptyState,
  CmsPageHeader,
  CmsPanel,
  CmsStatus,
  cmsButton,
  cmsInput,
} from "@/components/cms-ui";
import { hasPermission } from "@/lib/permissions";
import { requirePermissionRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/articles/")({
  beforeLoad: ({ context }) => requirePermissionRoute(context.roles, "articles:view"),
  component: Page,
});

function Page() {
  const [filter, setFilter] = useState<"all" | "draft" | "review" | "published">("all");
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-articles"], queryFn: () => listAdminArticles() });
  const me = useQuery({ queryKey: ["me"], queryFn: getMe });
  const del = useMutation({
    mutationFn: (id: string) => deleteArticle({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });
  const list = (q.data ?? []).filter(
    (article) =>
      (filter === "all" || article.status === filter) &&
      (!search.trim() || article.title.toLowerCase().includes(search.trim().toLowerCase())),
  );
  const navigate = useNavigate();
  const canCreate = hasPermission(me.data?.roles, "articles:create");
  const canDelete = hasPermission(me.data?.roles, "articles:delete");

  return (
    <div className="space-y-6">
      <CmsPageHeader
        eyebrow="Editorial workflow"
        title="Articles"
        description="Create, review, schedule, and publish newsroom reporting."
        actions={
          canCreate ? <button
            onClick={() => navigate({ to: "/admin/articles/$id", params: { id: "new" } })}
            className={cmsButton}
          >
            <Plus className="h-4 w-4" /> New article
          </button> : null
        }
      />

      {(q.error || del.error) && (
        <div className="border border-crimson/30 bg-crimson/10 px-4 py-3 text-sm text-crimson">
          {(q.error ?? del.error)?.message}
        </div>
      )}

      <CmsPanel>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {(["all", "draft", "review", "published"] as const).map((status) => (
          <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`h-9 px-3 text-xs font-semibold capitalize ${
                  filter === status
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
          >
                {status}{" "}
                <span className="ml-1 tabular-nums opacity-60">
                  {status === "all"
                    ? q.data?.length ?? 0
                    : q.data?.filter((article) => article.status === status).length ?? 0}
                </span>
          </button>
        ))}
          </div>
          <label className="relative block w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              className={`${cmsInput} pl-9`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search articles"
            />
          </label>
        </div>

        {q.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading articles…</div>
        ) : !list.length ? (
          <CmsEmptyState
            title="No matching articles"
            description="Adjust your filters or create a new article."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
                  <th className="px-5 py-3 font-semibold">Headline</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
              <tbody className="divide-y divide-border">
                {list.map((article) => (
                  <tr key={article.id} className="hover:bg-muted/30">
                    <td className="max-w-xl px-5 py-4">
                      <Link
                        to="/admin/articles/$id"
                        params={{ id: article.id }}
                        className="block truncate font-semibold text-foreground hover:text-cat-blue"
                      >
                        {article.title}
                  </Link>
                      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        /article/{article.slug}
                      </div>
                </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {(Array.isArray(article.sections) ? article.sections[0]?.name : article.sections?.name) ?? "Unassigned"}
                    </td>
                    <td className="px-5 py-4">
                      <CmsStatus
                        tone={
                          article.status === "published"
                            ? "success"
                            : article.status === "review"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {article.status}
                      </CmsStatus>
                </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {new Date(article.updated_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {canDelete && (
                  <button
                          type="button"
                          onClick={() => window.confirm("Permanently delete this article?") && del.mutate(article.id)}
                          className="p-2 text-muted-foreground hover:bg-crimson/10 hover:text-crimson"
                          aria-label={`Delete ${article.title}`}
                  >
                          <Trash2 className="h-4 w-4" />
                  </button>
                      )}
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
