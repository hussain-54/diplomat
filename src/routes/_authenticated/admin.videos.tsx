import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteVideo, listVideos, upsertVideo } from "@/lib/admin.functions";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin/videos")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-videos"], queryFn: () => listVideos() });
  const [editing, setEditing] = useState<any>(null);
  const del = useMutation({ mutationFn: (id: string) => deleteVideo({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-videos"] }) });
  const save = useMutation({ mutationFn: (data: any) => upsertVideo({ data }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-videos"] }); setEditing(null); } });
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">Videos</h1>
        <button onClick={() => setEditing({ title: "", category: "", duration: "" })}
          className="rounded-sm bg-navy px-3 py-2 text-xs uppercase tracking-widest text-navy-foreground">New video</button>
      </div>
      <div className="mt-4 overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="p-3">Title</th><th className="p-3">Category</th><th className="p-3">Duration</th><th></th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="p-3 font-serif">{v.title}</td>
                <td className="p-3">{v.category}</td>
                <td className="p-3">{v.duration}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(v)} className="mr-3 text-xs text-navy hover:underline">Edit</button>
                  <button onClick={() => confirm("Delete?") && del.mutate(v.id)} className="text-xs text-crimson hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-sm bg-card p-6">
            <h2 className="font-serif text-2xl text-ink">{editing.id ? "Edit" : "New"} video</h2>
            <div className="mt-4 space-y-3">
              {["title","category","duration","thumbnail_url","video_url"].map((k) => (
                <label key={k} className="block">
                  <span className="eyebrow text-muted-foreground">{k}</span>
                  <input value={editing[k] ?? ""} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" />
                </label>
              ))}
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
