import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAmbassador, listAmbassadors, upsertAmbassador, uploadHeroImage } from "@/lib/admin.functions";
import { useState } from "react";
import { requireEditorRoute } from "@/lib/route-guards";

export const Route = createFileRoute("/_authenticated/admin/ambassadors")({
  beforeLoad: ({ context }) => requireEditorRoute(context.roles),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-ambassadors"], queryFn: () => listAmbassadors() });
  const [editing, setEditing] = useState<any>(null);
  const del = useMutation({
    mutationFn: (id: string) => deleteAmbassador({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ambassadors"] }),
  });
  const save = useMutation({
    mutationFn: (data: any) => upsertAmbassador({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ambassadors"] });
      setEditing(null);
    },
  });

  const uploadAvatar = async (file: File) => {
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const res = await uploadHeroImage({ data: { fileName: file.name, contentType: file.type, base64: btoa(bin), bucket: "avatars" } });
    if (res.url) setEditing({ ...editing, avatar_url: res.url });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">Ambassadors</h1>
        <button
          onClick={() => setEditing({ name: "", country: "", position: "", flag_emoji: "", quote: "", tags: [], status: "active", featured: false })}
          className="rounded-sm bg-navy px-3 py-2 text-xs font-semibold uppercase tracking-widest text-navy-foreground"
        >
          New ambassador
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-sm border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr><th className="p-3">Name</th><th className="p-3">Country</th><th className="p-3">Status</th><th className="p-3">Featured</th><th></th></tr>
          </thead>
          <tbody>
            {(q.data ?? []).map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3 font-serif">{a.name}</td>
                <td className="p-3">{a.flag_emoji} {a.country}</td>
                <td className="p-3">{a.status}</td>
                <td className="p-3">{a.featured ? "★" : ""}</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(a)} className="mr-3 text-xs text-navy hover:underline">Edit</button>
                  <button onClick={() => confirm("Delete?") && del.mutate(a.id)} className="text-xs text-crimson hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-sm bg-card p-6">
            <h2 className="font-serif text-2xl text-ink">{editing.id ? "Edit" : "New"} ambassador</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Input label="Country" value={editing.country} onChange={(v) => setEditing({ ...editing, country: v })} />
              <Input label="Position" value={editing.position ?? ""} onChange={(v) => setEditing({ ...editing, position: v })} />
              <Input label="Flag emoji" value={editing.flag_emoji ?? ""} onChange={(v) => setEditing({ ...editing, flag_emoji: v })} />
              <div className="md:col-span-2">
                <label className="eyebrow text-muted-foreground">Quote</label>
                <textarea value={editing.quote ?? ""} onChange={(e) => setEditing({ ...editing, quote: e.target.value })} rows={2}
                  className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" />
              </div>
              <Input label="Tags (comma separated)" value={(editing.tags ?? []).join(", ")} onChange={(v) => setEditing({ ...editing, tags: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
              <div>
                <label className="eyebrow text-muted-foreground">Status</label>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm">
                  <option value="active">Active</option><option value="recalled">Recalled</option><option value="vacant">Vacant</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="eyebrow text-muted-foreground">Avatar</label>
                {editing.avatar_url && <img src={editing.avatar_url} alt={editing.name || "Ambassador"} className="my-2 h-24 w-24 rounded-sm object-cover" />}
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </div>
              <label className="md:col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
                Featured on homepage
              </label>
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

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="eyebrow text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-sm border border-input px-3 py-2 text-sm" />
    </label>
  );
}
