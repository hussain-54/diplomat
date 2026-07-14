import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteArticle, listAdminArticles } from "@/lib/admin.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/articles/")({
  component: Page,
});

function Page() {
  const [filter, setFilter] = useState<"all" | "draft" | "review" | "published">("all");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-articles"], queryFn: () => listAdminArticles() });
  const del = useMutation({
    mutationFn: (id: string) => deleteArticle({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });
  const list = (q.data ?? []).filter((a) => filter === "all" || a.status === filter);
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">Articles</h1>
        <button
          onClick={() => navigate({ to: "/admin/articles/$id", params: { id: "new" } })}
          className="rounded-sm bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-widest text-navy-foreground"
        >
          New article
        </button>
      </div>
      <div className="mt-4 flex gap-2 text-xs uppercase tracking-widest">
        {(["all", "draft", "review", "published"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-sm px-3 py-1.5 ${filter === s ? "bg-navy text-navy-foreground" : "border border-input"}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Section</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">
                  <Link to="/admin/articles/$id" params={{ id: a.id }} className="font-serif text-ink hover:text-crimson">
                    {a.title}
                  </Link>
                </td>
                <td className="p-3">{a.sections?.name ?? "—"}</td>
                <td className="p-3">
                  <span className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${a.status === "published" ? "bg-navy text-navy-foreground" : a.status === "review" ? "bg-gold text-gold-foreground" : "bg-muted"}`}>
                    {a.status}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(a.updated_at).toLocaleString()}</td>
                <td className="p-3 text-right">
                  <button
                    onClick={() => confirm("Delete article?") && del.mutate(a.id)}
                    className="text-xs text-crimson hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No articles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
