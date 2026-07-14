import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteWar, listWar, upsertWar } from "@/lib/admin.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/war-monitor")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-war"], queryFn: () => listWar() });
  const [editing, setEditing] = useState<any>(null);
  const del = useMutation({ mutationFn: (id: string) => deleteWar({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-war"] }) });
  const save = useMutation({ mutationFn: (data: any) => upsertWar({ data }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-war"] }); setEditing(null); } });
  const toggleStatus = (item: any) => {
    const next = item.status === "active" ? "ceasefire" : item.status === "ceasefire" ? "tension" : "active";
    save.mutate({ ...item, status: next });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">War Monitor</h1>
        <button onClick={() => setEditing({ conflict_name: "", countries: [], headline: "", status: "active" })}
          className="rounded-sm bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-widest text-navy-foreground">New item</button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {(q.data ?? []).map((w) => (
          <div key={w.id} className="rounded-sm border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">{w.conflict_name}</h3>
              <button onClick={() => toggleStatus(w)} className={`rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${w.status === "active" ? "bg-crimson text-crimson-foreground" : w.status === "ceasefire" ? "bg-cat-green text-white" : "bg-cat-amber text-white"}`}>
                {w.status}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">{(w.countries ?? []).join(" · ")}</div>
            <p className="mt-2 text-sm">{w.headline}</p>
            <div className="mt-3 flex justify-end gap-2 text-xs">
              <button onClick={() => setEditing(w)} className="text-navy hover:underline">Edit</button>
              <button onClick={() => confirm("Delete?") && del.mutate(w.id)} className="text-crimson hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-sm bg-card p-6">
            <h2 className="font-serif text-2xl text-ink">{editing.id ? "Edit" : "New"} conflict</h2>
            <div className="mt-4 space-y-3">
              <label className="block"><span className="eyebrow text-muted-foreground">Conflict name</span>
                <input value={editing.conflict_name} onChange={(e) => setEditing({ ...editing, conflict_name: e.target.value })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" /></label>
              <label className="block"><span className="eyebrow text-muted-foreground">Countries (comma)</span>
                <input value={(editing.countries ?? []).join(", ")} onChange={(e) => setEditing({ ...editing, countries: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" /></label>
              <label className="block"><span className="eyebrow text-muted-foreground">Headline</span>
                <textarea value={editing.headline ?? ""} onChange={(e) => setEditing({ ...editing, headline: e.target.value })} rows={2} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" /></label>
              <label className="block"><span className="eyebrow text-muted-foreground">Status</span>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm">
                  <option value="active">Active</option><option value="ceasefire">Ceasefire</option><option value="tension">Tension</option>
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
