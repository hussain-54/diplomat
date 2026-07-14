import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteTicker, listTicker, upsertTicker } from "@/lib/admin.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/ticker")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-ticker"], queryFn: () => listTicker() });
  const [text, setText] = useState("");
  const [tag, setTag] = useState("");
  const add = useMutation({
    mutationFn: () => upsertTicker({ data: { text, tag, active: true, sort_order: (q.data?.length ?? 0) + 1 } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-ticker"] }); setText(""); setTag(""); },
  });
  const update = useMutation({ mutationFn: (data: any) => upsertTicker({ data }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ticker"] }) });
  const del = useMutation({ mutationFn: (id: string) => deleteTicker({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ticker"] }) });

  const items = q.data ?? [];
  const move = (idx: number, dir: -1 | 1) => {
    const target = items[idx + dir];
    const cur = items[idx];
    if (!target || !cur) return;
    update.mutate({ ...cur, sort_order: target.sort_order });
    update.mutate({ ...target, sort_order: cur.sort_order });
  };

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Breaking Ticker</h1>
      <div className="mt-4 flex flex-wrap gap-2 rounded-sm border border-border bg-card p-4">
        <input placeholder="Ticker text" value={text} onChange={(e) => setText(e.target.value)}
          className="min-w-[300px] flex-1 rounded-sm border border-input px-3 py-2 text-sm" />
        <input placeholder="Tag (e.g. BREAKING)" value={tag} onChange={(e) => setTag(e.target.value)}
          className="w-40 rounded-sm border border-input px-3 py-2 text-sm" />
        <button onClick={() => text && add.mutate()} className="rounded-sm bg-navy px-3 py-2 text-xs uppercase tracking-widest text-navy-foreground">Add</button>
      </div>
      <div className="mt-4 overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="p-3">#</th><th className="p-3">Tag</th><th className="p-3">Text</th><th className="p-3">Active</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((t, i) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3">
                  <button onClick={() => move(i, -1)} className="mr-1">↑</button>
                  <button onClick={() => move(i, 1)}>↓</button>
                </td>
                <td className="p-3 font-semibold">{t.tag}</td>
                <td className="p-3">{t.text}</td>
                <td className="p-3">
                  <input type="checkbox" checked={t.active} onChange={(e) => update.mutate({ ...t, active: e.target.checked })} />
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => confirm("Delete?") && del.mutate(t.id)} className="text-xs text-crimson hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
