import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toAppError } from "@/lib/db-errors";
import {
  APP_ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  hasPermission,
  isAppRole,
  type AppRole,
} from "@/lib/permissions";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type StaffListFilters = {
  search?: string;
  role?: AppRole | null;
  department_id?: string | null;
  team_id?: string | null;
  status?: "all" | "active" | "suspended" | "invited";
  page?: number;
  pageSize?: number;
  sort?: "name" | "created" | "activity" | "login";
  sortDir?: "asc" | "desc";
};

export type StaffWizardPayload = {
  id?: string;
  name: string;
  email: string;
  username?: string;
  phone?: string;
  byline_name?: string;
  designation?: string;
  location?: string;
  department_id?: string | null;
  team_id?: string | null;
  bio?: string;
  social_links?: Record<string, string>;
  roles?: AppRole[];
  section_ids?: string[];
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "item-" + Math.random().toString(36).slice(2, 8);

const checkAuth = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized — please sign in again.");
  return user;
};

const requireStaffManage = async () => {
  const user = await checkAuth();
  const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error) throw toAppError(error);
  const roleList = (roles ?? []).map((r) => r.role);
  if (!hasPermission(roleList, "staff:manage")) {
    throw new Error("Forbidden — missing staff:manage permission.");
  }
  return { user, roles: roleList };
};

const writeStaffActivity = async (entry: {
  actor_id: string;
  subject_id?: string | null;
  action: string;
  details?: string | null;
  payload?: Record<string, unknown>;
}) => {
  const { error } = await supabase.from("staff_activity_logs").insert({
    actor_id: entry.actor_id,
    subject_id: entry.subject_id ?? null,
    action: entry.action,
    details: entry.details ?? null,
    payload: (entry.payload ?? {}) as Json,
  });
  if (error && !/staff_activity_logs|schema cache|PGRST/i.test(error.message)) {
    console.error("Staff activity log failed", error);
  }
};

const staffApi = async (payload: Record<string, unknown>) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in required.");
  const response = await fetch("/api/staff", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean; user_id?: string };
  if (!response.ok) throw new Error(body.error || "Staff administration request failed.");
  return body;
};

async function loadStaffBase() {
  const [profilesRes, rolesRes, accessRes, deptsRes, teamsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("user_roles").select("*"),
    supabase.from("editor_section_access").select("*"),
    supabase.from("departments").select("*").order("sort_order"),
    supabase.from("teams").select("*").order("sort_order"),
  ]);
  if (profilesRes.error) throw toAppError(profilesRes.error);
  if (rolesRes.error) throw toAppError(rolesRes.error);
  if (accessRes.error) throw toAppError(accessRes.error);

  const departments = deptsRes.error ? [] : (deptsRes.data ?? []);
  const teams = teamsRes.error ? [] : (teamsRes.data ?? []);
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const roles = rolesRes.data ?? [];
  const access = accessRes.data ?? [];

  const { data: articleCounts } = await supabase
    .from("articles")
    .select("author_id, status")
    .not("author_id", "is", null);

  const publishedByAuthor = new Map<string, number>();
  const draftByAuthor = new Map<string, number>();
  for (const a of articleCounts ?? []) {
    if (!a.author_id) continue;
    if (a.status === "published") {
      publishedByAuthor.set(a.author_id, (publishedByAuthor.get(a.author_id) ?? 0) + 1);
    } else if (a.status === "draft") {
      draftByAuthor.set(a.author_id, (draftByAuthor.get(a.author_id) ?? 0) + 1);
    }
  }

  const staff = (profilesRes.data ?? []).map((p) => {
    const memberRoles = roles.filter((r) => r.user_id === p.id).map((r) => r.role).filter(isAppRole);
    const published = publishedByAuthor.get(p.id) ?? 0;
    const drafts = draftByAuthor.get(p.id) ?? 0;
    const activity = Math.min(100, published * 8 + drafts * 2 + memberRoles.length * 5);
    return {
      ...p,
      roles: memberRoles,
      section_ids: access.filter((a) => a.profile_id === p.id).map((a) => a.section_id),
      department_name: p.department_id ? deptMap.get(p.department_id)?.name ?? null : null,
      team_name: p.team_id ? teamMap.get(p.team_id)?.name ?? null : null,
      published_count: published,
      draft_count: drafts,
      activity_score: p.activity_score || activity,
      status:
        p.status === "suspended" || p.status === "invited" ? p.status : ("active" as const),
      social_links:
        p.social_links && typeof p.social_links === "object" && !Array.isArray(p.social_links)
          ? (p.social_links as Record<string, string>)
          : {},
    };
  });

  return { staff, departments, teams, roles, access };
}

export const getStaffDashboard = async () => {
  await requireStaffManage();
  const { staff } = await loadStaffBase();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const total = staff.length;
  const active = staff.filter((s) => s.status === "active").length;
  const invited = staff.filter((s) => s.status === "invited").length;
  const suspended = staff.filter((s) => s.status === "suspended").length;
  const journalists = staff.filter((s) => s.roles.includes("reporter")).length;
  const editors = staff.filter((s) =>
    s.roles.some((r) =>
      ["editor_in_chief", "managing_editor", "section_editor"].includes(r),
    ),
  ).length;
  const contributors = staff.filter((s) => s.roles.includes("contributor")).length;

  const thisMonth = staff.filter((s) => new Date(s.created_at) >= monthStart).length;
  const lastMonth = staff.filter((s) => {
    const d = new Date(s.created_at);
    return d >= prevMonthStart && d < monthStart;
  }).length;
  const growthPct =
    lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  const byRole = APP_ROLES.map((role) => ({
    label: ROLE_LABELS[role],
    value: staff.filter((s) => s.roles.includes(role)).length,
  })).filter((r) => r.value > 0);

  const statusDistribution = [
    { label: "Active", value: active },
    { label: "Invited", value: invited },
    { label: "Suspended", value: suspended },
  ];

  const recentRegistrations = [...staff]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.name ?? s.email ?? "Unknown",
      email: s.email,
      status: s.status,
      created_at: s.created_at,
    }));

  const topAuthors = [...staff]
    .sort((a, b) => b.published_count - a.published_count)
    .slice(0, 8)
    .map((s) => ({
      id: s.id,
      name: s.name ?? s.email ?? "Unknown",
      published: s.published_count,
      activity: s.activity_score,
    }));

  const growthTrend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      label: d.toLocaleString(undefined, { month: "short" }),
      value: staff.filter((s) => {
        const c = new Date(s.created_at);
        return c >= d && c < next;
      }).length,
    };
  });

  const deptBreakdown = Array.from(
    staff.reduce((map, s) => {
      const key = s.department_name ?? "Unassigned";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).map(([label, value]) => ({ label, value }));

  return {
    kpis: {
      total,
      active,
      pending: invited,
      blocked: suspended,
      journalists,
      editors,
      contributors,
      subscribers: 0,
      growthPct,
    },
    byRole,
    statusDistribution,
    recentRegistrations,
    topAuthors,
    growthTrend,
    deptBreakdown,
  };
};

export const listStaffTable = async ({ data }: { data: StaffListFilters }) => {
  await requireStaffManage();
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 20;
  const { staff } = await loadStaffBase();
  let rows = [...staff];

  if (data.search?.trim()) {
    const q = data.search.trim().toLowerCase();
    rows = rows.filter(
      (s) =>
        (s.name ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q) ||
        (s.username ?? "").toLowerCase().includes(q),
    );
  }
  if (data.role) rows = rows.filter((s) => s.roles.includes(data.role!));
  if (data.department_id) rows = rows.filter((s) => s.department_id === data.department_id);
  if (data.team_id) rows = rows.filter((s) => s.team_id === data.team_id);
  if (data.status && data.status !== "all") rows = rows.filter((s) => s.status === data.status);

  const dir = data.sortDir === "desc" ? -1 : 1;
  rows.sort((a, b) => {
    switch (data.sort) {
      case "activity":
        return (a.activity_score - b.activity_score) * dir;
      case "created":
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      case "login":
        return (
          (new Date(a.last_login_at ?? 0).getTime() - new Date(b.last_login_at ?? 0).getTime()) * dir
        );
      default:
        return (a.name ?? "").localeCompare(b.name ?? "") * dir;
    }
  });

  const total = rows.length;
  const start = (page - 1) * pageSize;
  return {
    items: rows.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

export const getStaffDetail = async ({ data }: { data: { id: string } }) => {
  await requireStaffManage();
  const { staff, departments, teams } = await loadStaffBase();
  const member = staff.find((s) => s.id === data.id);
  if (!member) throw new Error("User not found.");

  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, slug, status, published_at")
    .eq("author_id", data.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(20);

  const { data: activity } = await supabase
    .from("staff_activity_logs")
    .select("*")
    .or(`subject_id.eq.${data.id},actor_id.eq.${data.id}`)
    .order("created_at", { ascending: false })
    .limit(30);

  return {
    member,
    departments,
    teams,
    articles: articles ?? [],
    activity: activity ?? [],
    stats: {
      published: member.published_count,
      drafts: member.draft_count,
      views: null as number | null,
      comments: null as number | null,
      seo: null as number | null,
      engagement: member.activity_score,
      lastLogin: member.last_login_at,
    },
  };
};

export const updateStaffMemberProfile = async ({
  data,
}: {
  data: StaffWizardPayload & { id: string };
}) => {
  const { user } = await requireStaffManage();
  const payload = {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    username: data.username?.trim() || null,
    phone: data.phone?.trim() || null,
    byline_name: data.byline_name?.trim() || null,
    designation: data.designation?.trim() || null,
    location: data.location?.trim() || null,
    department_id: data.department_id || null,
    team_id: data.team_id || null,
    bio: data.bio?.trim() || null,
    social_links: (data.social_links ?? {}) as Json,
  };
  const { data: updated, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", data.id)
    .select("*")
    .single();
  if (error) throw toAppError(error);

  if (data.roles) {
    const { data: existing } = await supabase.from("user_roles").select("role").eq("user_id", data.id);
    const current = new Set((existing ?? []).map((r) => r.role));
    const next = new Set(data.roles);
    for (const role of next) {
      if (!current.has(role)) {
        await supabase.from("user_roles").insert({ user_id: data.id, role });
      }
    }
    for (const role of current) {
      if (!next.has(role as AppRole) && isAppRole(role)) {
        await supabase.from("user_roles").delete().eq("user_id", data.id).eq("role", role);
      }
    }
  }

  await writeStaffActivity({
    actor_id: user.id,
    subject_id: data.id,
    action: "staff.update",
    details: `Updated ${payload.name}`,
  });
  return updated;
};

export const inviteStaffUser = async ({ data }: { data: StaffWizardPayload }) => {
  const { user } = await requireStaffManage();
  const role = data.roles?.[0] ?? "contributor";
  const result = await staffApi({
    action: "invite",
    email: data.email,
    name: data.name,
    byline_name: data.byline_name,
    role,
    section_ids: data.section_ids ?? [],
  });

  const inviteRow = {
    email: data.email.trim().toLowerCase(),
    invited_by: user.id,
    roles: data.roles?.length ? data.roles : [role],
    department_id: data.department_id || null,
    team_id: data.team_id || null,
    name: data.name,
    byline_name: data.byline_name || null,
    designation: data.designation || null,
    status: "pending" as const,
  };
  const { error: invError } = await supabase.from("staff_invitations").insert(inviteRow);
  if (invError && !/staff_invitations|schema cache|PGRST/i.test(invError.message)) {
    console.error(invError);
  }

  // Patch org fields on the invited profile when user id is known
  if (result.user_id) {
    await supabase
      .from("profiles")
      .update({
        username: data.username || null,
        phone: data.phone || null,
        department_id: data.department_id || null,
        team_id: data.team_id || null,
        designation: data.designation || null,
        location: data.location || null,
      })
      .eq("id", result.user_id);
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email.trim().toLowerCase())
      .maybeSingle();
    if (profile?.id) {
      await supabase
        .from("profiles")
        .update({
          username: data.username || null,
          phone: data.phone || null,
          department_id: data.department_id || null,
          team_id: data.team_id || null,
          designation: data.designation || null,
          location: data.location || null,
        })
        .eq("id", profile.id);
    }
  }

  await writeStaffActivity({
    actor_id: user.id,
    action: "staff.invite",
    details: `Invited ${data.email}`,
    payload: { role },
  });
  return result;
};

export const suspendStaffUser = async ({
  data,
}: {
  data: { user_id: string; suspended: boolean };
}) => {
  const { user } = await requireStaffManage();
  const result = await staffApi({
    action: data.suspended ? "suspend" : "unsuspend",
    user_id: data.user_id,
  });
  await writeStaffActivity({
    actor_id: user.id,
    subject_id: data.user_id,
    action: data.suspended ? "staff.suspend" : "staff.activate",
    details: data.suspended ? "User suspended" : "User activated",
  });
  return result;
};

export const resetStaffPassword = async ({ data }: { data: { email: string } }) => {
  const { user } = await requireStaffManage();
  const result = await staffApi({ action: "reset_password", email: data.email });
  await writeStaffActivity({
    actor_id: user.id,
    action: "staff.reset_password",
    details: `Password reset for ${data.email}`,
  });
  return result;
};

export const assignStaffRole = async ({
  data,
}: {
  data: { user_id: string; role: AppRole; grant: boolean };
}) => {
  const { user } = await requireStaffManage();
  if (data.grant) {
    const { error } = await supabase.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error && error.code !== "23505" && !error.message.includes("duplicate")) throw toAppError(error);
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw toAppError(error);
  }
  await writeStaffActivity({
    actor_id: user.id,
    subject_id: data.user_id,
    action: data.grant ? "staff.role_grant" : "staff.role_revoke",
    details: `${data.grant ? "Granted" : "Revoked"} ${ROLE_LABELS[data.role]}`,
  });
  return { ok: true };
};

export const bulkStaffAction = async ({
  data,
}: {
  data: {
    ids: string[];
    action: "activate" | "suspend" | "assign_role" | "assign_team";
    role?: AppRole;
    team_id?: string | null;
    department_id?: string | null;
  };
}) => {
  const { user } = await requireStaffManage();
  for (const id of data.ids) {
    if (data.action === "suspend" || data.action === "activate") {
      await staffApi({
        action: data.action === "suspend" ? "suspend" : "unsuspend",
        user_id: id,
      });
    } else if (data.action === "assign_role" && data.role) {
      await supabase.from("user_roles").upsert(
        { user_id: id, role: data.role },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
    } else if (data.action === "assign_team") {
      await supabase
        .from("profiles")
        .update({
          team_id: data.team_id || null,
          department_id: data.department_id || null,
        })
        .eq("id", id);
    }
  }
  await writeStaffActivity({
    actor_id: user.id,
    action: `staff.bulk_${data.action}`,
    details: `${data.ids.length} users`,
  });
  return { ok: true };
};

export const exportStaffCsv = async () => {
  await requireStaffManage();
  const { staff } = await loadStaffBase();
  const headers = ["id", "name", "email", "status", "roles", "department", "team", "created_at"];
  const lines = [
    headers.join(","),
    ...staff.map((s) =>
      [
        s.id,
        s.name,
        s.email,
        s.status,
        s.roles.join("|"),
        s.department_name,
        s.team_name,
        s.created_at,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  return { content: lines.join("\n"), filename: "staff-users.csv", mime: "text/csv" };
};

export const listDepartments = async () => {
  await requireStaffManage();
  const { data, error } = await supabase.from("departments").select("*").order("sort_order");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const listTeams = async () => {
  await requireStaffManage();
  const { data, error } = await supabase
    .from("teams")
    .select("*, departments(name, slug)")
    .order("sort_order");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertDepartment = async ({
  data,
}: {
  data: { id?: string; name: string; description?: string; sort_order?: number };
}) => {
  await requireStaffManage();
  const payload = {
    name: data.name.trim(),
    slug: slugify(data.name),
    description: data.description?.trim() || null,
    sort_order: data.sort_order ?? 0,
  };
  const result = data.id
    ? await supabase.from("departments").update(payload).eq("id", data.id).select("*").single()
    : await supabase.from("departments").insert(payload).select("*").single();
  if (result.error) throw toAppError(result.error);
  return result.data;
};

export const upsertTeam = async ({
  data,
}: {
  data: {
    id?: string;
    department_id: string;
    name: string;
    description?: string;
    sort_order?: number;
  };
}) => {
  await requireStaffManage();
  const payload = {
    department_id: data.department_id,
    name: data.name.trim(),
    slug: slugify(data.name),
    description: data.description?.trim() || null,
    sort_order: data.sort_order ?? 0,
  };
  const result = data.id
    ? await supabase.from("teams").update(payload).eq("id", data.id).select("*").single()
    : await supabase.from("teams").insert(payload).select("*").single();
  if (result.error) throw toAppError(result.error);
  return result.data;
};

export const deleteDepartment = async ({ data }: { data: { id: string } }) => {
  await requireStaffManage();
  const { error } = await supabase.from("departments").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const deleteTeam = async ({ data }: { data: { id: string } }) => {
  await requireStaffManage();
  const { error } = await supabase.from("teams").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const listInvitations = async ({
  data,
}: {
  data?: { status?: string; page?: number; pageSize?: number };
}) => {
  await requireStaffManage();
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 30;
  let query = supabase
    .from("staff_invitations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (data?.status) query = query.eq("status", data.status);
  const from = (page - 1) * pageSize;
  const { data: rows, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw toAppError(error);
  return { items: rows ?? [], total: count ?? 0, page, pageSize };
};

export const revokeInvitation = async ({ data }: { data: { id: string } }) => {
  const { user } = await requireStaffManage();
  const { error } = await supabase
    .from("staff_invitations")
    .update({ status: "revoked" })
    .eq("id", data.id);
  if (error) throw toAppError(error);
  await writeStaffActivity({
    actor_id: user.id,
    action: "staff.invite_revoke",
    details: data.id,
  });
  return { ok: true };
};

export const resendInvitation = async ({ data }: { data: { id: string } }) => {
  const { user } = await requireStaffManage();
  const { data: invite, error } = await supabase
    .from("staff_invitations")
    .select("*")
    .eq("id", data.id)
    .single();
  if (error) throw toAppError(error);
  const role = (invite.roles?.[0] && isAppRole(invite.roles[0]) ? invite.roles[0] : "contributor") as AppRole;
  await staffApi({
    action: "invite",
    email: invite.email,
    name: invite.name || invite.email,
    byline_name: invite.byline_name,
    role,
    section_ids: [],
  });
  await supabase
    .from("staff_invitations")
    .update({
      status: "pending",
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    })
    .eq("id", data.id);
  await writeStaffActivity({
    actor_id: user.id,
    action: "staff.invite_resend",
    details: invite.email,
  });
  return { ok: true };
};

export const listStaffActivity = async ({
  data,
}: {
  data?: { action?: string; subject_id?: string; page?: number; pageSize?: number };
}) => {
  await requireStaffManage();
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 30;
  let query = supabase
    .from("staff_activity_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (data?.action) query = query.eq("action", data.action);
  if (data?.subject_id) query = query.eq("subject_id", data.subject_id);
  const from = (page - 1) * pageSize;
  const { data: rows, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw toAppError(error);
  return { items: rows ?? [], total: count ?? 0, page, pageSize };
};

export const listStaffAudit = async ({
  data,
}: {
  data?: { page?: number; pageSize?: number };
}) => {
  await requireStaffManage();
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 30;
  const from = (page - 1) * pageSize;

  const [activity, adminLogs] = await Promise.all([
    supabase
      .from("staff_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, 50),
    supabase
      .from("admin_audit_logs")
      .select("*, profiles(name, email)")
      .order("created_at", { ascending: false })
      .range(0, 50),
  ]);

  const merged = [
    ...(activity.data ?? []).map((r) => ({
      id: r.id,
      source: "staff" as const,
      action: r.action,
      details: r.details,
      created_at: r.created_at,
      actor_name: null as string | null,
    })),
    ...(adminLogs.data ?? []).map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return {
        id: r.id,
        source: "admin" as const,
        action: r.action,
        details: r.summary,
        created_at: r.created_at,
        actor_name: profile?.name ?? profile?.email ?? null,
      };
    }),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    items: merged.slice(from, from + pageSize),
    total: merged.length,
    page,
    pageSize,
  };
};

export const getStaffAnalytics = async () => {
  await requireStaffManage();
  const dash = await getStaffDashboard();
  return {
    metrics: {
      publishingActivity: dash.topAuthors.reduce((s, a) => s + a.published, 0),
      loginActivity: null as number | null,
      userGrowth: dash.kpis.growthPct,
      engagement: null as number | null,
    },
    growthTrend: dash.growthTrend,
    byRole: dash.byRole,
    deptBreakdown: dash.deptBreakdown,
    topAuthors: dash.topAuthors,
    loginTrend: [] as Array<{ label: string; value: number }>,
  };
};

export const getRolesMatrix = async () => {
  await requireStaffManage();
  return {
    roles: APP_ROLES.map((role) => ({
      role,
      label: ROLE_LABELS[role],
      permissions: ROLE_PERMISSIONS[role],
    })),
    allPermissions: Object.keys(
      Object.fromEntries(
        Object.values(ROLE_PERMISSIONS)
          .flat()
          .map((p) => [p, true]),
      ),
    ),
  };
};

export const getStaffLibraryCounts = async () => {
  await requireStaffManage();
  const { staff } = await loadStaffBase();
  return {
    all: staff.length,
    active: staff.filter((s) => s.status === "active").length,
    invited: staff.filter((s) => s.status === "invited").length,
    suspended: staff.filter((s) => s.status === "suspended").length,
  };
};

export type StaffMemberRow = Awaited<ReturnType<typeof loadStaffBase>>["staff"][number];
export type { ProfileRow };
