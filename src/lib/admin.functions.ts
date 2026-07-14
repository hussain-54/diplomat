import { supabase } from "@/integrations/supabase/client";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "post-" + Math.random().toString(36).slice(2, 8);

const checkAuth = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
};

export const getMe = async () => {
  const user = await checkAuth();
  const userId = user.id;
  const [{ data: profile }, { data: roles }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("editor_section_access").select("section_id").eq("profile_id", userId),
  ]);
  return {
    userId,
    profile,
    roles: (roles ?? []).map((r) => r.role),
    sectionAccess: (access ?? []).map((a) => a.section_id),
  };
};

export const listAdminArticles = async () => {
  await checkAuth();
  const { data } = await supabase
    .from("articles")
    .select("id,slug,title,status,badge_type,published_at,updated_at,section_id, sections(name,slug)")
    .order("updated_at", { ascending: false })
    .limit(200);
  return data ?? [];
};

export const getAdminArticle = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { data: a } = await supabase.from("articles").select("*").eq("id", data.id).maybeSingle();
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
    status: "draft" | "review" | "published";
    slug?: string;
  };
}) => {
  const user = await checkAuth();
  const slug = data.slug || slugify(data.title);
  const payload = {
    title: data.title,
    deck: data.deck || null,
    body: data.body || null,
    section_id: data.section_id,
    region: data.region || null,
    badge_type: (data.badge_type ?? "none") as "none",
    hero_image_url: data.hero_image_url || null,
    status: data.status,
    slug,
    author_id: user.id,
    published_at: data.status === "published" ? new Date().toISOString() : null,
  };
  if (data.id) {
    const { data: r, error } = await supabase
      .from("articles")
      .update(payload)
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return r;
  }
  const { data: r, error } = await supabase.from("articles").insert(payload).select().maybeSingle();
  if (error) throw error;
  return r;
};

export const deleteArticle = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("articles").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
};

// AMBASSADORS
export const listAmbassadors = async () => {
  await checkAuth();
  const { data } = await supabase.from("ambassadors").select("*").order("name");
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
  const payload = { ...data, id: undefined };
  if (data.id) {
    const { error } = await supabase.from("ambassadors").update(payload).eq("id", data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ambassadors").insert(payload);
    if (error) throw error;
  }
  return { ok: true };
};

export const deleteAmbassador = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("ambassadors").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
};

// EMBASSIES
export const listEmbassies = async () => {
  await checkAuth();
  const { data } = await supabase.from("embassies").select("*").order("country");
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
  const payload = { ...data, id: undefined };
  if (data.id) {
    const { error } = await supabase.from("embassies").update(payload).eq("id", data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("embassies").insert(payload);
    if (error) throw error;
  }
  return { ok: true };
};

export const deleteEmbassy = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("embassies").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
};

// WAR MONITOR
export const listWar = async () => {
  await checkAuth();
  const { data } = await supabase.from("war_monitor_items").select("*").order("updated_at", { ascending: false });
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
  const payload = { ...data, id: undefined };
  if (data.id) {
    const { error } = await supabase.from("war_monitor_items").update(payload).eq("id", data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("war_monitor_items").insert(payload);
    if (error) throw error;
  }
  return { ok: true };
};

export const deleteWar = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("war_monitor_items").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
};

// TICKER
export const listTicker = async () => {
  await checkAuth();
  const { data } = await supabase.from("ticker_items").select("*").order("sort_order");
  return data ?? [];
};

export const upsertTicker = async ({
  data,
}: {
  data: { id?: string; text: string; tag?: string; active: boolean; sort_order: number };
}) => {
  await checkAuth();
  const payload = { ...data, id: undefined };
  if (data.id) {
    const { error } = await supabase.from("ticker_items").update(payload).eq("id", data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("ticker_items").insert(payload);
    if (error) throw error;
  }
  return { ok: true };
};

export const deleteTicker = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("ticker_items").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
};

// VIDEOS
export const listVideos = async () => {
  await checkAuth();
  const { data } = await supabase.from("videos").select("*").order("published_at", { ascending: false });
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
  const payload = { ...data, id: undefined };
  if (data.id) {
    const { error } = await supabase.from("videos").update(payload).eq("id", data.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("videos").insert(payload);
    if (error) throw error;
  }
  return { ok: true };
};

export const deleteVideo = async ({ data }: { data: { id: string } }) => {
  await checkAuth();
  const { error } = await supabase.from("videos").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
};

// ACCESS MANAGEMENT (super admin only)
export const listEditors = async () => {
  const user = await checkAuth();
  const { data: saRow } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  const isSA = !!saRow;
  if (!isSA) throw new Error("Forbidden");
  const [{ data: profiles }, { data: roles }, { data: access }] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("user_roles").select("*"),
    supabase.from("editor_section_access").select("*"),
  ]);
  return {
    profiles: profiles ?? [],
    roles: roles ?? [],
    access: access ?? [],
  };
};

export const toggleSectionAccess = async ({
  data,
}: {
  data: { profile_id: string; section_id: string; grant: boolean };
}) => {
  const user = await checkAuth();
  const { data: saRow } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  const isSA = !!saRow;
  if (!isSA) throw new Error("Forbidden");
  if (data.grant) {
    const { error } = await supabase
      .from("editor_section_access")
      .insert({ profile_id: data.profile_id, section_id: data.section_id });
    if (error && !error.message.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase
      .from("editor_section_access")
      .delete()
      .eq("profile_id", data.profile_id)
      .eq("section_id", data.section_id);
    if (error) throw error;
  }
  return { ok: true };
};

export const setUserRole = async ({
  data,
}: {
  data: { user_id: string; role: "super_admin" | "section_editor" | "contributor"; grant: boolean };
}) => {
  const user = await checkAuth();
  const { data: saRow } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  const isSA = !!saRow;
  if (!isSA) throw new Error("Forbidden");
  if (data.grant) {
    const { error } = await supabase.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    if (error && !error.message.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", data.user_id).eq("role", data.role);
    if (error) throw error;
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
  if (error) throw error;
  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
  return { path, url: signed?.signedUrl };
};
