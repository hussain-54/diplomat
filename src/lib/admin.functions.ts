import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toAppError } from "@/lib/db-errors";

type BadgeType = Database["public"]["Enums"]["badge_type"];
type ArticleStatus = Database["public"]["Enums"]["article_status"];

const EDITOR_ROLES = ["super_admin", "section_editor"] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "post-" + Math.random().toString(36).slice(2, 8);

const checkAuth = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized — please sign in again.");
  return user;
};

const requireNewsroomRole = async () => {
  const user = await checkAuth();
  const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error) throw toAppError(error);
  const roleList = (roles ?? []).map((r) => r.role);
  if (!roleList.length) {
    throw new Error("No newsroom role assigned. Contact a super admin.");
  }
  return { user, roles: roleList };
};

const hasEditorRole = (roles: string[]) => roles.some((r) => (EDITOR_ROLES as readonly string[]).includes(r));

export const getMe = async () => {
  const user = await checkAuth();
  const userId = user.id;
  const [profileRes, rolesRes, accessRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("editor_section_access").select("section_id").eq("profile_id", userId),
  ]);
  if (profileRes.error) throw toAppError(profileRes.error);
  if (rolesRes.error) throw toAppError(rolesRes.error);
  if (accessRes.error) throw toAppError(accessRes.error);
  const roles = (rolesRes.data ?? []).map((r) => r.role);
  const sectionAccess = (accessRes.data ?? []).map((a) => a.section_id);
  return {
    userId,
    profile: profileRes.data,
    roles,
    sectionAccess,
    canPublish: hasEditorRole(roles) || sectionAccess.length > 0,
  };
};

export const listAdminArticles = async () => {
  await checkAuth();
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,status,badge_type,published_at,updated_at,section_id, sections(name,slug)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getAdminArticle = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { data: a, error } = await supabase.from("articles").select("*").eq("id", data.id).maybeSingle();
  if (error) throw toAppError(error);
  return a;
};

export const upsertArticle = async ({
  data,
}: {
  data: {
    id?: string;
    title: string;
    deck?: string;
    body?: string;
    section_id: string;
    region?: string;
    badge_type?: string;
    hero_image_url?: string;
    status: ArticleStatus;
    slug?: string;
  };
}) => {
  const { user, roles } = await requireNewsroomRole();
  if (!data.title?.trim()) throw new Error("Title is required.");
  if (!data.section_id) throw new Error("Select a section.");

  const { data: accessRows, error: accessError } = await supabase
    .from("editor_section_access")
    .select("section_id")
    .eq("profile_id", user.id)
    .eq("section_id", data.section_id)
    .maybeSingle();
  if (accessError) throw toAppError(accessError);

  const wantsPublish = data.status === "published";
  const mayPublish = hasEditorRole(roles) || !!accessRows;
  if (wantsPublish && !mayPublish) {
    throw new Error(
      "Contributors cannot publish. Save as Draft or In review, or ask a super admin to grant section_editor / super_admin.",
    );
  }

  const slug = data.slug?.trim() || slugify(data.title);
  const badge = (data.badge_type ?? "none") as BadgeType;

  if (data.id) {
    const { data: existing, error: existingError } = await supabase
      .from("articles")
      .select("id, published_at, status, author_id")
      .eq("id", data.id)
      .maybeSingle();
    if (existingError) throw toAppError(existingError);
    if (!existing) throw new Error("Article not found or you cannot edit it.");

    // Preserve first publish time on edits; clear only when unpublishing.
    const published_at = wantsPublish
      ? (existing.published_at ?? new Date().toISOString())
      : null;

    const payload = {
      title: data.title.trim(),
      deck: data.deck || null,
      body: data.body || null,
      section_id: data.section_id,
      region: data.region || null,
      badge_type: badge,
      hero_image_url: data.hero_image_url || null,
      status: data.status,
      slug,
      published_at,
    };

    const { data: r, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw toAppError(error);
    if (!r) {
      throw new Error(
        "Update blocked by permissions. You need super_admin, section_editor, or section access to publish.",
      );
    }
    return r;
  }

  const payload = {
    title: data.title.trim(),
    deck: data.deck || null,
    body: data.body || null,
    section_id: data.section_id,
    region: data.region || null,
    badge_type: badge,
    hero_image_url: data.hero_image_url || null,
    status: data.status,
    slug,
    author_id: user.id,
    published_at: wantsPublish ? new Date().toISOString() : null,
  };

  const { data: r, error } = await supabase.from("articles").insert(payload).select().maybeSingle();
  if (error) throw toAppError(error);
  if (!r) {
    throw new Error(
      "Create blocked by permissions. Contributors can only create drafts. Promote your role to publish.",
    );
  }
  return r;
};

export const deleteArticle = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("articles").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// AMBASSADORS
export const listAmbassadors = async () => {
  await checkAuth();
  const { data, error } = await supabase.from("ambassadors").select("*").order("name");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertAmbassador = async ({
  data,
}: {
  data: {
    id?: string;
    name: string;
    country: string;
    position?: string;
    flag_emoji?: string;
    avatar_url?: string;
    quote?: string;
    tags?: string[];
    status?: "active" | "recalled" | "vacant";
    featured?: boolean;
  };
}) => {
  await checkAuth();
  const { id, ...payload } = data;
  if (id) {
    const { error } = await supabase.from("ambassadors").update(payload).eq("id", id);
    if (error) throw toAppError(error);
  } else {
    const { error } = await supabase.from("ambassadors").insert(payload);
    if (error) throw toAppError(error);
  }
  return { ok: true };
};

export const deleteAmbassador = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("ambassadors").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// EMBASSIES
export const listEmbassies = async () => {
  await checkAuth();
  const { data, error } = await supabase.from("embassies").select("*").order("country");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertEmbassy = async ({
  data,
}: {
  data: {
    id?: string;
    country: string;
    headline?: string;
    status: "open" | "limited" | "closed" | "alert";
    ambassador_id?: string | null;
  };
}) => {
  await checkAuth();
  const { id, ...payload } = data;
  if (id) {
    const { error } = await supabase.from("embassies").update(payload).eq("id", id);
    if (error) throw toAppError(error);
  } else {
    const { error } = await supabase.from("embassies").insert(payload);
    if (error) throw toAppError(error);
  }
  return { ok: true };
};

export const deleteEmbassy = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("embassies").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// WAR MONITOR
export const listWar = async () => {
  await checkAuth();
  const { data, error } = await supabase
    .from("war_monitor_items")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertWar = async ({
  data,
}: {
  data: {
    id?: string;
    conflict_name: string;
    countries?: string[];
    headline?: string;
    status: "active" | "ceasefire" | "tension";
  };
}) => {
  await checkAuth();
  const { id, ...payload } = data;
  if (id) {
    const { error } = await supabase.from("war_monitor_items").update(payload).eq("id", id);
    if (error) throw toAppError(error);
  } else {
    const { error } = await supabase.from("war_monitor_items").insert(payload);
    if (error) throw toAppError(error);
  }
  return { ok: true };
};

export const deleteWar = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("war_monitor_items").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// TICKER
export const listTicker = async () => {
  await checkAuth();
  const { data, error } = await supabase.from("ticker_items").select("*").order("sort_order");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertTicker = async ({
  data,
}: {
  data: { id?: string; text: string; tag?: string; active: boolean; sort_order: number };
}) => {
  await checkAuth();
  const { id, ...payload } = data;
  if (id) {
    const { error } = await supabase.from("ticker_items").update(payload).eq("id", id);
    if (error) throw toAppError(error);
  } else {
    const { error } = await supabase.from("ticker_items").insert(payload);
    if (error) throw toAppError(error);
  }
  return { ok: true };
};

export const deleteTicker = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("ticker_items").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// VIDEOS
export const listVideos = async () => {
  await checkAuth();
  const { data, error } = await supabase.from("videos").select("*").order("published_at", { ascending: false });
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertVideo = async ({
  data,
}: {
  data: {
    id?: string;
    title: string;
    category?: string;
    duration?: string;
    thumbnail_url?: string;
    video_url?: string;
  };
}) => {
  await checkAuth();
  const { id, ...payload } = data;
  if (id) {
    const { error } = await supabase.from("videos").update(payload).eq("id", id);
    if (error) throw toAppError(error);
  } else {
    const { error } = await supabase.from("videos").insert(payload);
    if (error) throw toAppError(error);
  }
  return { ok: true };
};

export const deleteVideo = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("videos").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

const requireSuperAdmin = async () => {
  const user = await checkAuth();
  const { data: saRow, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!saRow) throw new Error("Forbidden — super admin only.");
  return user;
};

// ACCESS MANAGEMENT (super admin only)
export const listEditors = async () => {
  await requireSuperAdmin();
  const [profilesRes, rolesRes, accessRes] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("user_roles").select("*"),
    supabase.from("editor_section_access").select("*"),
  ]);
  if (profilesRes.error) throw toAppError(profilesRes.error);
  if (rolesRes.error) throw toAppError(rolesRes.error);
  if (accessRes.error) throw toAppError(accessRes.error);
  return {
    profiles: profilesRes.data ?? [],
    roles: rolesRes.data ?? [],
    access: accessRes.data ?? [],
  };
};

export const toggleSectionAccess = async ({
  data,
}: {
  data: { profile_id: string; section_id: string; grant: boolean };
}) => {
  await requireSuperAdmin();
  if (data.grant) {
    const { error } = await supabase
      .from("editor_section_access")
      .insert({ profile_id: data.profile_id, section_id: data.section_id });
    if (error && error.code !== "23505" && !error.message.includes("duplicate")) throw toAppError(error);
  } else {
    const { error } = await supabase
      .from("editor_section_access")
      .delete()
      .eq("profile_id", data.profile_id)
      .eq("section_id", data.section_id);
    if (error) throw toAppError(error);
  }
  return { ok: true };
};

export const setUserRole = async ({
  data,
}: {
  data: { user_id: string; role: "super_admin" | "section_editor" | "contributor"; grant: boolean };
}) => {
  await requireSuperAdmin();
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
  return { ok: true };
};

export const uploadHeroImage = async ({
  data,
}: {
  data: { fileName: string; contentType: string; base64: string; bucket?: "article-hero" | "avatars" };
}) => {
  await checkAuth();
  const bucket = data.bucket ?? "article-hero";
  const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  const path = `${Date.now()}-${data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: data.contentType,
    upsert: false,
  });
  if (error) throw toAppError(error);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("Upload succeeded but public URL could not be created.");
  return { path, url: pub.publicUrl };
};
