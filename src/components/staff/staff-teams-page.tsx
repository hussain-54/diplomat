import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteDepartment,
  deleteTeam,
  listDepartments,
  listTeams,
  upsertDepartment,
  upsertTeam,
} from "@/lib/staff.functions";
import {
  CmsAlert,
  CmsEmptyState,
  CmsPageHeader,
  CmsPageSkeleton,
  CmsPanel,
  cmsButton,
  cmsGhostButton,
  cmsInput,
  cmsSecondaryButton,
} from "@/components/cms";

export function StaffTeamsPage() {
  const qc = useQueryClient();
  const deptsQ = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const teamsQ = useQuery({ queryKey: ["teams"], queryFn: listTeams });
  const [deptName, setDeptName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDept, setTeamDept] = useState("");

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["departments"] });
    void qc.invalidateQueries({ queryKey: ["teams"] });
  };

  const addDept = useMutation({
    mutationFn: () => upsertDepartment({ data: { name: deptName } }),
    onSuccess: () => {
      toast.success("Department created");
      setDeptName("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const addTeam = useMutation({
    mutationFn: () => upsertTeam({ data: { name: teamName, department_id: teamDept } }),
    onSuccess: () => {
      toast.success("Team created");
      setTeamName("");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const removeDept = useMutation({
    mutationFn: (id: string) => deleteDepartment({ data: { id } }),
    onSuccess: () => {
      toast.success("Department deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const removeTeam = useMutation({
    mutationFn: (id: string) => deleteTeam({ data: { id } }),
    onSuccess: () => {
      toast.success("Team deleted");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (deptsQ.isLoading || teamsQ.isLoading) return <CmsPageSkeleton metrics={0} panels={2} />;

  const depts = deptsQ.data ?? [];
  const teams = teamsQ.data ?? [];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Teams & departments"
        description="Organize the newsroom into departments and nested teams."
      />

      {deptsQ.error ? <CmsAlert>{deptsQ.error.message}</CmsAlert> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <CmsPanel title="Departments">
          <div className="mb-3 flex gap-2">
            <input
              className={cmsInput}
              placeholder="New department"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
            />
            <button
              type="button"
              className={cmsButton}
              disabled={!deptName.trim() || addDept.isPending}
              onClick={() => addDept.mutate()}
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          {depts.length === 0 ? (
            <CmsEmptyState title="No departments" description="Apply the staff migration to seed defaults." />
          ) : (
            <ul className="space-y-2">
              {depts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {teams.filter((t) => t.department_id === d.id).length} teams
                    </div>
                  </div>
                  <button
                    type="button"
                    className={cmsGhostButton}
                    onClick={() => {
                      if (window.confirm(`Delete ${d.name}?`)) removeDept.mutate(d.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CmsPanel>

        <CmsPanel title="Teams">
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <select className={cmsInput} value={teamDept} onChange={(e) => setTeamDept(e.target.value)}>
              <option value="">Department…</option>
              {depts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              className={cmsInput}
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <button
              type="button"
              className={cmsSecondaryButton}
              disabled={!teamName.trim() || !teamDept || addTeam.isPending}
              onClick={() => addTeam.mutate()}
            >
              Add team
            </button>
          </div>
          <ul className="space-y-2">
            {teams.map((t) => {
              const dept = Array.isArray(t.departments) ? t.departments[0] : t.departments;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{dept?.name ?? "—"}</div>
                  </div>
                  <button
                    type="button"
                    className={cmsGhostButton}
                    onClick={() => {
                      if (window.confirm(`Delete ${t.name}?`)) removeTeam.mutate(t.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </CmsPanel>
      </div>
    </div>
  );
}
