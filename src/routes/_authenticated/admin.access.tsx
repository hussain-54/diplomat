import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listEditors, setUserRole, toggleSectionAccess } from "@/lib/admin.functions";
import { getSections } from "@/lib/content.functions";

export const Route = createFileRoute("/_authenticated/admin/access")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const editorsQ = useQuery({ queryKey: ["editors"], queryFn: () => listEditors() });
  const sectionsQ = useQuery({ queryKey: ["sections"], queryFn: () => getSections() });
  const toggle = useMutation({
    mutationFn: (v: { profile_id: string; section_id: string; grant: boolean }) => toggleSectionAccess({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["editors"] }),
  });
  const roleMut = useMutation({
    mutationFn: (v: { user_id: string; role: any; grant: boolean }) => setUserRole({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["editors"] }),
  });

  if (editorsQ.isError) {
    return <div className="rounded-sm border border-crimson bg-crimson/10 p-4 text-crimson">Forbidden. Only super admins can access this page.</div>;
  }
  if (!editorsQ.data || !sectionsQ.data) return <div>Loading…</div>;

  const { profiles, roles, access } = editorsQ.data;
  const sections = sectionsQ.data;

  const hasAccess = (pid: string, sid: string) => access.some((a) => a.profile_id === pid && a.section_id === sid);
  const hasRole = (uid: string, role: string) => roles.some((r) => r.user_id === uid && r.role === role);

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink">Manage editor access</h1>
      <p className="mt-1 text-sm text-muted-foreground">Grant section-editor permissions and per-section publishing rights.</p>
      <div className="mt-6 space-y-4">
        {profiles.map((p) => (
          <div key={p.id} className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-serif text-lg text-ink">{p.name ?? "(unnamed)"}</div>
                <div className="text-xs text-muted-foreground">{p.id}</div>
              </div>
              <div className="flex gap-2 text-xs">
                {(["super_admin","section_editor","contributor"] as const).map((r) => (
                  <label key={r} className="flex items-center gap-1 rounded-sm border border-input px-2 py-1 uppercase tracking-widest">
                    <input type="checkbox" checked={hasRole(p.id, r)}
                      onChange={(e) => roleMut.mutate({ user_id: p.id, role: r, grant: e.target.checked })} />
                    {r.replace("_", " ")}
                  </label>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="eyebrow text-muted-foreground">Section editing access</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {sections.map((s) => (
                  <label key={s.id} className={`flex items-center gap-1 rounded-sm border px-2 py-1 text-xs ${hasAccess(p.id, s.id) ? "border-navy bg-navy text-navy-foreground" : "border-input"}`}>
                    <input type="checkbox" checked={hasAccess(p.id, s.id)}
                      onChange={(e) => toggle.mutate({ profile_id: p.id, section_id: s.id, grant: e.target.checked })} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
