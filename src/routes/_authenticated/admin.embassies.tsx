import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteEmbassy, listEmbassies, upsertEmbassy } from "@/lib/admin.functions";
import { useState } from "react";
import { requireEditorRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/embassies")({
  beforeLoad: ({ context }) => requireEditorRoute(context.roles),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-embassies"], queryFn: () => listEmbassies() });
  const [editing, setEditing] = useState<any>(null);
  const del = useMutation({ mutationFn: (id: string) => deleteEmbassy({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-embassies"] }) });
  const save = useMutation({ mutationFn: (data: any) => upsertEmbassy({ data }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-embassies"] }); setEditing(null); } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">Embassies</h1>
        <button onClick={() => setEditing({ country: "", headline: "", status: "open" })}
          className="rounded-sm bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-widest text-navy-foreground">New embassy</button>
      </div>
      <div className="mt-4 overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="p-3">Country</th><th className="p-3">Headline</th><th className="p-3">Status</th><th></th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3 font-serif">{e.country}</td>
                <td className="p-3">{e.headline}</td>
                <td className="p-3">{e.status}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(e)} className="mr-3 text-xs text-navy hover:underline">Edit</button>
                  <button onClick={() => confirm("Delete?") && del.mutate(e.id)} className="text-xs text-crimson hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-sm bg-card p-6">
            <h2 className="font-serif text-2xl text-ink">{editing.id ? "Edit" : "New"} embassy</h2>
            <div className="mt-4 space-y-3">
              <label className="block"><span className="eyebrow text-muted-foreground">Country</span>
                <input value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" /></label>
              <label className="block"><span className="eyebrow text-muted-foreground">Headline</span>
                <input value={editing.headline ?? ""} onChange={(e) => setEditing({ ...editing, headline: e.target.value })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" /></label>
              <label className="block"><span className="eyebrow text-muted-foreground">Status</span>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm">
                  <option value="open">Open</option><option value="limited">Limited</option><option value="closed">Closed</option><option value="alert">Alert</option>
                </select></label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded-sm border border-input px-3 py-2 text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={() => save.mutate(editing)} className="rounded-sm bg-navy px-3 py-2 text-xs uppercase tracking-widest text-navy-foreground">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
