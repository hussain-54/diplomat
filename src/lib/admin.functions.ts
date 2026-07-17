import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toAppError } from "@/lib/db-errors";
import {
  hasAnyPermission,
  hasPermission,
  isAppRole,
  type AppRole,
  type Permission,
} from "@/lib/permissions";

type BadgeType = Database["public"]["Enums"]["badge_type"];
type ArticleStatus = Database["public"]["Enums"]["article_status"];
export type ArticleSeoInput = {
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  canonical_url?: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  schema_type: "NewsArticle" | "Article" | "Review" | "Report";
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  twitter_card: "summary" | "summary_large_image";
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image_url?: string | null;
  rss_inclusion: boolean;
  hreflang: Record<string, string>;
};

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

const requirePermission = async (permission: Permission) => {
  const newsroom = await requireNewsroomRole();
  if (!hasPermission(newsroom.roles, permission)) {
    throw new Error(`Forbidden — missing ${permission} permission.`);
  }
  return newsroom;
};

const requireEditorRole = async () => {
  return requirePermission("newsroom:manage");
};

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
    canPublish:
      roles.some((role) =>
        ["super_admin", "editor_in_chief", "managing_editor"].includes(role),
      ) ||
      (hasPermission(roles, "articles:publish") && sectionAccess.length > 0),
  };
};

export const listAdminArticles = async () => {
  await requirePermission("articles:view");
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,status,badge_type,published_at,scheduled_at,updated_at,created_at,section_id,author_id, sections(name,slug), author:profiles!articles_author_id_fkey(id,name)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw toAppError(error);
  return data ?? [];
};

export const listDashboardArticles = async () => {
  await requirePermission("dashboard:view");
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,status,badge_type,published_at,updated_at,section_id, sections(name,slug)")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getDashboardMetrics = async () => {
  await requirePermission("dashboard:view");
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [publishedRes, reviewRes] = await Promise.all([
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", startOfToday.toISOString()),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "review"),
  ]);
  if (publishedRes.error) throw toAppError(publishedRes.error);
  if (reviewRes.error) throw toAppError(reviewRes.error);
  return {
    publishedToday: publishedRes.count ?? 0,
    pendingReview: reviewRes.count ?? 0,
  };
};

export const getAdminArticle = async ({ data }: { data: { id: string } }) => {
  await requirePermission("articles:view");
  const { data: a, error } = await supabase
    .from("articles")
    .select("*, author:profiles!articles_author_id_fkey(id,name,avatar_url)")
    .eq("id", data.id)
    .maybeSingle();
  if (error) throw toAppError(error);
  return a;
};

export const updateArticleSeo = async ({
  data,
}: {
  data: ArticleSeoInput & { article_id: string };
}) => {
  const { article_id, ...seo } = data;
  const { data: article, error } = await supabase.rpc("admin_update_article_seo", {
    p_article_id: article_id,
    p_seo_title: seo.seo_title || null,
    p_meta_description: seo.meta_description || null,
    p_focus_keyword: seo.focus_keyword || null,
    p_canonical_url: seo.canonical_url || null,
    p_robots_index: seo.robots_index,
    p_robots_follow: seo.robots_follow,
    p_schema_type: seo.schema_type,
    p_og_title: seo.og_title || null,
    p_og_description: seo.og_description || null,
    p_og_image_url: seo.og_image_url || null,
    p_twitter_card: seo.twitter_card,
    p_twitter_title: seo.twitter_title || null,
    p_twitter_description: seo.twitter_description || null,
    p_twitter_image_url: seo.twitter_image_url || null,
    p_rss_inclusion: seo.rss_inclusion,
    p_hreflang: seo.hreflang,
  });
  if (error) {
    if (/admin_update_article_seo|schema cache|PGRST202/i.test(error.message)) {
      throw new Error(
        "SEO database module is not installed. Apply supabase/migrations/20260718060000_complete_seo_module.sql, then reload.",
      );
    }
    throw toAppError(error);
  }
  return article;
};

// TAGS
export const listTags = async () => {
  await requirePermission("articles:view");
  const { data, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getArticleTags = async ({ data }: { data: { article_id: string } }) => {
  await requirePermission("articles:view");
  const { data: rows, error } = await supabase
    .from("article_tags")
    .select("tag_id, tags(id,name,slug)")
    .eq("article_id", data.article_id);
  if (error) throw toAppError(error);
  return (rows ?? [])
    .map((row) => (Array.isArray(row.tags) ? row.tags[0] : row.tags))
    .filter((t): t is { id: string; name: string; slug: string } => !!t);
};

export const setArticleTags = async ({
  data,
}: {
  data: { article_id: string; tag_names: string[] };
}) => {
  await requirePermission("articles:create");
  const names = [...new Set(data.tag_names.map((n) => n.trim()).filter(Boolean))].slice(0, 20);

  const tagIds: string[] = [];
  for (const name of names) {
    const slug = slugify(name);
    const { data: existing, error: findError } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (findError) throw toAppError(findError);
    if (existing) {
      tagIds.push(existing.id);
    } else {
      const { data: created, error: createError } = await supabase
        .from("tags")
        .insert({ name, slug })
        .select("id")
        .single();
      if (createError) throw toAppError(createError);
      tagIds.push(created.id);
    }
  }

  const { error: clearError } = await supabase
    .from("article_tags")
    .delete()
    .eq("article_id", data.article_id);
  if (clearError) throw toAppError(clearError);

  if (tagIds.length) {
    const { error: insertError } = await supabase
      .from("article_tags")
      .insert(tagIds.map((tag_id) => ({ article_id: data.article_id, tag_id })));
    if (insertError) throw toAppError(insertError);
  }
  return { ok: true };
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
    scheduled_at?: string | null;
  };
}) => {
  const { user, roles } = await requireNewsroomRole();
  const required = data.id
    ? (["articles:edit_own", "articles:edit_all", "articles:review"] as const)
    : (["articles:create"] as const);
  if (!hasAnyPermission(roles, required)) {
    throw new Error("You do not have permission to save articles.");
  }
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
  const wantsRestrictedStatus = ["scheduled", "published", "archived"].includes(data.status);
  const isEditorialLeader = roles.some((role) =>
    ["super_admin", "editor_in_chief", "managing_editor"].includes(role),
  );
  const mayPublish =
    isEditorialLeader ||
    (hasPermission(roles, "articles:publish") && !!accessRows);
  if (wantsRestrictedStatus && !mayPublish) {
    throw new Error(
      "Publishing, scheduling, or archiving requires publishing permission for this category.",
    );
  }
  if (
    data.status === "scheduled" &&
    (!data.scheduled_at || new Date(data.scheduled_at).getTime() <= Date.now())
  ) {
    throw new Error("Choose a future publication date and time.");
  }

  const slug = data.slug?.trim() || slugify(data.title);
  const badge = (data.badge_type ?? "none") as BadgeType;

  // Prefer SECURITY DEFINER RPC so table GRANT quirks cannot block editors.
  const { data: viaRpc, error: rpcError } = await supabase.rpc("admin_upsert_article", {
    p_id: data.id ?? null,
    p_title: data.title.trim(),
    p_deck: data.deck || null,
    p_body: data.body || null,
    p_section_id: data.section_id,
    p_region: data.region || null,
    p_badge_type: badge,
    p_hero_image_url: data.hero_image_url || null,
    p_status: data.status,
    p_slug: slug,
    p_scheduled_at: data.scheduled_at ?? null,
  });

  if (!rpcError && viaRpc) return viaRpc;

  // Fallback direct write if RPC not deployed yet
  if (rpcError && !/could not find the function|schema cache|PGRST202/i.test(rpcError.message)) {
    throw toAppError(rpcError);
  }

  if (data.id) {
    const { data: existing, error: existingError } = await supabase
      .from("articles")
      .select("id, published_at, status, author_id")
      .eq("id", data.id)
      .maybeSingle();
    if (existingError) throw toAppError(existingError);
    if (!existing) throw new Error("Article not found or you cannot edit it.");

    const published_at =
      wantsPublish || data.status === "archived"
        ? (existing.published_at ?? (wantsPublish ? new Date().toISOString() : null))
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
      scheduled_at: data.status === "scheduled" ? (data.scheduled_at ?? null) : null,
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
      throw new Error("The article could not be updated with your current permissions.");
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
    scheduled_at: data.status === "scheduled" ? (data.scheduled_at ?? null) : null,
    author_id: user.id,
    published_at: wantsPublish ? new Date().toISOString() : null,
  };

  const { data: r, error } = await supabase.from("articles").insert(payload).select().maybeSingle();
  if (error) throw toAppError(error);
  if (!r) {
    throw new Error("The article could not be created with your current permissions.");
  }
  return r;
};

export const deleteArticle = async ({ data }: { data: { id: string } }) => {
  await requirePermission("articles:delete");
  const { error } = await supabase.from("articles").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const duplicateArticle = async ({ data }: { data: { id: string } }) => {
  await requirePermission("articles:create");
  const source = await getAdminArticle({ data });
  if (!source) throw new Error("Article not found.");
  return upsertArticle({
    data: {
      title: `${source.title} (Copy)`,
      deck: source.deck ?? undefined,
      body: source.body ?? undefined,
      section_id: source.section_id ?? "",
      region: source.region ?? undefined,
      badge_type: source.badge_type,
      hero_image_url: source.hero_image_url ?? undefined,
      status: "draft",
    },
  });
};

export const bulkManageArticles = async ({
  data,
}: {
  data: {
    ids: string[];
    action: "publish" | "archive" | "delete" | "reassign_category";
    section_id?: string | null;
  };
}) => {
  if (!data.ids.length) throw new Error("Select at least one article.");
  const permission =
    data.action === "delete"
      ? "articles:delete"
      : data.action === "reassign_category"
        ? "articles:edit_all"
        : "articles:publish";
  await requirePermission(permission);
  const { data: affected, error } = await supabase.rpc("admin_bulk_manage_articles", {
    p_ids: data.ids,
    p_action: data.action,
    p_section_id: data.section_id ?? null,
  });
  if (error) throw toAppError(error);
  return { affected: affected ?? 0 };
};

export const getArticleRevisions = async ({ data }: { data: { article_id: string } }) => {
  await requirePermission("articles:view");
  const { data: revisions, error } = await supabase
    .from("article_revisions")
    .select("*, changer:profiles!article_revisions_changed_by_fkey(name)")
    .eq("article_id", data.article_id)
    .order("version", { ascending: false })
    .limit(50);
  if (error) throw toAppError(error);
  return revisions ?? [];
};

export const restoreArticleRevision = async ({
  data,
}: {
  data: { article_id: string; revision_id: string };
}) => {
  const { data: revision, error } = await supabase
    .from("article_revisions")
    .select("snapshot")
    .eq("id", data.revision_id)
    .eq("article_id", data.article_id)
    .single();
  if (error) throw toAppError(error);
  const snapshot = revision.snapshot as unknown as Database["public"]["Tables"]["articles"]["Row"];
  if (!snapshot?.title || !snapshot.section_id) {
    throw new Error("This revision cannot be restored.");
  }
  const article = await upsertArticle({
    data: {
      id: data.article_id,
      title: snapshot.title,
      deck: snapshot.deck ?? undefined,
      body: snapshot.body ?? undefined,
      section_id: snapshot.section_id,
      region: snapshot.region ?? undefined,
      badge_type: snapshot.badge_type,
      hero_image_url: snapshot.hero_image_url ?? undefined,
      status: snapshot.status,
      slug: snapshot.slug,
      scheduled_at: snapshot.scheduled_at,
    },
  });
  await updateArticleSeo({
    data: {
      article_id: data.article_id,
      seo_title: snapshot.seo_title,
      meta_description: snapshot.meta_description,
      focus_keyword: snapshot.focus_keyword,
      canonical_url: snapshot.canonical_url,
      robots_index: snapshot.robots_index,
      robots_follow: snapshot.robots_follow,
      schema_type: (
        ["NewsArticle", "Article", "Review", "Report"].includes(snapshot.schema_type)
          ? snapshot.schema_type
          : "NewsArticle"
      ) as ArticleSeoInput["schema_type"],
      og_title: snapshot.og_title,
      og_description: snapshot.og_description,
      og_image_url: snapshot.og_image_url,
      twitter_card:
        snapshot.twitter_card === "summary" ? "summary" : "summary_large_image",
      twitter_title: snapshot.twitter_title,
      twitter_description: snapshot.twitter_description,
      twitter_image_url: snapshot.twitter_image_url,
      rss_inclusion: snapshot.rss_inclusion,
      hreflang:
        snapshot.hreflang &&
        !Array.isArray(snapshot.hreflang) &&
        typeof snapshot.hreflang === "object"
          ? Object.fromEntries(
              Object.entries(snapshot.hreflang).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            )
          : {},
    },
  });
  return article;
};

// AMBASSADORS
export const listAmbassadors = async () => {
  await requireEditorRole();
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
  await requireEditorRole();
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
  await requireEditorRole();
  const { error } = await supabase.from("ambassadors").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// EMBASSIES
export const listEmbassies = async () => {
  await requireEditorRole();
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
  await requireEditorRole();
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
  await requireEditorRole();
  const { error } = await supabase.from("embassies").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// WAR MONITOR
export const listWar = async () => {
  await requireEditorRole();
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
  await requireEditorRole();
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
  await requireEditorRole();
  const { error } = await supabase.from("war_monitor_items").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// TICKER
export const listTicker = async () => {
  await requireEditorRole();
  const { data, error } = await supabase.from("ticker_items").select("*").order("sort_order");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertTicker = async ({
  data,
}: {
  data: { id?: string; text: string; tag?: string; active: boolean; sort_order: number };
}) => {
  await requireEditorRole();
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
  await requireEditorRole();
  const { error } = await supabase.from("ticker_items").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// VIDEOS
export const listVideos = async () => {
  await requirePermission("videos:manage");
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
  await requirePermission("videos:manage");
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
  await requirePermission("videos:manage");
  const { error } = await supabase.from("videos").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

const requireSuperAdmin = async () => {
  return (await requirePermission("staff:manage")).user;
};

// ACCESS MANAGEMENT (super admin only)
export type StaffMember = {
  id: string;
  name: string | null;
  email: string | null;
  byline_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  social_links: Record<string, string>;
  status: "active" | "suspended" | "invited";
  created_at: string;
  mfa_enabled: boolean;
  auth_banned: boolean;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  roles: AppRole[];
  section_ids: string[];
};

export type StaffSocialLinks = {
  twitter?: string;
  linkedin?: string;
  website?: string;
  bluesky?: string;
};

const parseStaffList = (raw: unknown): StaffMember[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    const social =
      row.social_links && typeof row.social_links === "object" && !Array.isArray(row.social_links)
        ? (row.social_links as Record<string, string>)
        : {};
    const roles = Array.isArray(row.roles)
      ? row.roles.filter((role): role is AppRole => typeof role === "string" && isAppRole(role))
      : [];
    const sectionIds = Array.isArray(row.section_ids)
      ? row.section_ids.filter((id): id is string => typeof id === "string")
      : [];
    const status =
      row.status === "suspended" || row.status === "invited" ? row.status : "active";
    return {
      id: String(row.id),
      name: (row.name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      byline_name: (row.byline_name as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      social_links: social,
      status,
      created_at: String(row.created_at ?? ""),
      mfa_enabled: Boolean(row.mfa_enabled),
      auth_banned: Boolean(row.auth_banned),
      last_sign_in_at: (row.last_sign_in_at as string | null) ?? null,
      email_confirmed_at: (row.email_confirmed_at as string | null) ?? null,
      roles,
      section_ids: sectionIds,
    };
  });
};

export const listEditors = async () => {
  await requireSuperAdmin();
  const { data, error } = await supabase.rpc("admin_list_staff");
  if (!error && data != null) {
    const staff = parseStaffList(data);
    return {
      staff,
      // Backward-compatible shape for any residual callers.
      profiles: staff,
      roles: staff.flatMap((member) =>
        member.roles.map((role) => ({ user_id: member.id, role })),
      ),
      access: staff.flatMap((member) =>
        member.section_ids.map((section_id) => ({
          profile_id: member.id,
          section_id,
        })),
      ),
    };
  }

  if (error && !/admin_list_staff|schema cache|PGRST202/i.test(error.message)) {
    throw toAppError(error);
  }

  // Fallback before the staff migration is applied.
  const [profilesRes, rolesRes, accessRes] = await Promise.all([
    supabase.from("profiles").select("*").order("name"),
    supabase.from("user_roles").select("*"),
    supabase.from("editor_section_access").select("*"),
  ]);
  if (profilesRes.error) throw toAppError(profilesRes.error);
  if (rolesRes.error) throw toAppError(rolesRes.error);
  if (accessRes.error) throw toAppError(accessRes.error);
  const roles = rolesRes.data ?? [];
  const access = accessRes.data ?? [];
  const staff: StaffMember[] = (profilesRes.data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    email: profile.email ?? null,
    byline_name: profile.byline_name ?? null,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
    social_links:
      profile.social_links &&
      typeof profile.social_links === "object" &&
      !Array.isArray(profile.social_links)
        ? (profile.social_links as Record<string, string>)
        : {},
    status:
      profile.status === "suspended" || profile.status === "invited"
        ? profile.status
        : "active",
    created_at: profile.created_at,
    mfa_enabled: false,
    auth_banned: false,
    last_sign_in_at: null,
    email_confirmed_at: null,
    roles: roles.filter((r) => r.user_id === profile.id).map((r) => r.role),
    section_ids: access
      .filter((a) => a.profile_id === profile.id)
      .map((a) => a.section_id),
  }));
  return { staff, profiles: staff, roles, access };
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
  const body = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
  if (!response.ok) {
    throw new Error(body.error || "Staff administration request failed.");
  }
  return body;
};

export const inviteStaffMember = async ({
  data,
}: {
  data: {
    email: string;
    name: string;
    byline_name?: string;
    role: AppRole;
    section_ids: string[];
  };
}) => {
  await requireSuperAdmin();
  return staffApi({ action: "invite", ...data });
};

export const setStaffSuspended = async ({
  data,
}: {
  data: { user_id: string; suspended: boolean };
}) => {
  await requireSuperAdmin();
  return staffApi({
    action: data.suspended ? "suspend" : "unsuspend",
    user_id: data.user_id,
  });
};

export const sendStaffPasswordReset = async ({
  data,
}: {
  data: { email: string };
}) => {
  await requireSuperAdmin();
  return staffApi({ action: "reset_password", email: data.email });
};

export const refreshStaffMfaStatus = async ({
  data,
}: {
  data: { user_id: string };
}) => {
  await requireSuperAdmin();
  return staffApi({ action: "mfa_status", user_id: data.user_id }) as Promise<{
    ok: boolean;
    mfa_enabled?: boolean;
  }>;
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
  data: { user_id: string; role: AppRole; grant: boolean };
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
  const { user } = await requirePermission("media:upload");
  const bucket = data.bucket ?? "article-hero";
  if (!data.contentType.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > 5 * 1024 * 1024) {
    throw new Error("Images must be 5 MB or smaller.");
  }
  const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const path = bucket === "avatars" ? `${user.id}/${fileName}` : fileName;
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: data.contentType,
    upsert: false,
  });
  if (error) throw toAppError(error);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("Upload succeeded but public URL could not be created.");

  const { error: assetError } = await supabase.from("media_assets").insert({
    bucket,
    object_path: path,
    public_url: pub.publicUrl,
    file_name: data.fileName,
    mime_type: data.contentType,
    size_bytes: bytes.byteLength,
    uploaded_by: user.id,
  });
  if (assetError && !/media_assets|schema cache|PGRST/i.test(assetError.message)) {
    console.error("Image uploaded but media indexing failed", assetError);
  }

  return { path, url: pub.publicUrl };
};

// CATEGORIES / TAXONOMY
export const listCategories = async () => {
  await requirePermission("categories:manage");
  const { data, error } = await supabase
    .from("sections")
    .select("*, articles(count)")
    .order("sort_order")
    .order("name");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const upsertCategory = async ({
  data,
}: {
  data: {
    id?: string;
    name: string;
    slug?: string;
    description?: string | null;
    parent_id?: string | null;
    visibility?: "public" | "hidden";
    color?: string | null;
    sort_order?: number;
  };
}) => {
  await requirePermission("categories:manage");
  if (data.id && data.parent_id === data.id) {
    throw new Error("A category cannot be its own parent.");
  }
  const payload = {
    name: data.name.trim(),
    slug: data.slug?.trim() || slugify(data.name),
    description: data.description?.trim() || null,
    parent_id: data.parent_id || null,
    visibility: data.visibility === "hidden" ? "hidden" : "public",
    color: data.color || null,
    sort_order: data.sort_order ?? 0,
  };
  if (!payload.name) throw new Error("Category name is required.");
  const result = data.id
    ? await supabase.from("sections").update(payload).eq("id", data.id)
    : await supabase.from("sections").insert(payload);
  if (result.error) throw toAppError(result.error);
  return { ok: true };
};

export const reorderCategories = async ({
  data,
}: {
  data: { items: Array<{ id: string; parent_id: string | null; sort_order: number }> };
}) => {
  await requirePermission("categories:manage");
  if (!data.items.length) return { affected: 0 };
  const { data: affected, error } = await supabase.rpc("admin_reorder_categories", {
    p_items: data.items,
  });
  if (error) {
    if (/admin_reorder_categories|schema cache|PGRST202/i.test(error.message)) {
      // Fallback when the RPC migration has not been applied yet.
      for (const item of data.items) {
        const { error: updateError } = await supabase
          .from("sections")
          .update({ parent_id: item.parent_id, sort_order: item.sort_order })
          .eq("id", item.id);
        if (updateError) throw toAppError(updateError);
      }
      return { affected: data.items.length };
    }
    throw toAppError(error);
  }
  return { affected: affected ?? 0 };
};

export const deleteCategory = async ({ data }: { data: { id: string } }) => {
  await requirePermission("categories:manage");
  const { count, error: countError } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("section_id", data.id);
  if (countError) throw toAppError(countError);
  if (count) throw new Error("Move or delete articles in this category before deleting it.");

  const { count: childCount, error: childError } = await supabase
    .from("sections")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", data.id);
  if (childError) throw toAppError(childError);
  if (childCount) {
    throw new Error("Move or delete nested categories before deleting this parent.");
  }

  const { error } = await supabase.from("sections").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// STAFF
export const updateStaffProfile = async ({
  data,
}: {
  data: {
    id: string;
    name: string;
    byline_name?: string | null;
    bio?: string | null;
    email?: string | null;
    social_links?: StaffSocialLinks;
  };
}) => {
  await requireSuperAdmin();
  const social = data.social_links ?? {};
  const cleanedSocial = Object.fromEntries(
    Object.entries(social)
      .map(([key, value]) => [key, value?.trim() || ""])
      .filter(([, value]) => value),
  );
  const { error } = await supabase
    .from("profiles")
    .update({
      name: data.name.trim() || null,
      byline_name: data.byline_name?.trim() || null,
      bio: data.bio?.trim() || null,
      email: data.email?.trim().toLowerCase() || null,
      social_links: cleanedSocial,
    })
    .eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// MEDIA LIBRARY
export const listMediaAssets = async () => {
  await requirePermission("media:view");
  const { data, error } = await supabase
    .from("media_assets")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw toAppError(error);
  return data ?? [];
};

export const updateMediaAsset = async ({
  data,
}: {
  data: { id: string; alt_text: string };
}) => {
  await requirePermission("media:view");
  const { error } = await supabase
    .from("media_assets")
    .update({ alt_text: data.alt_text.trim() || null })
    .eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const deleteMediaAsset = async ({ data }: { data: { id: string } }) => {
  await requirePermission("media:view");
  const { data: asset, error: readError } = await supabase
    .from("media_assets")
    .select("bucket, object_path")
    .eq("id", data.id)
    .single();
  if (readError) throw toAppError(readError);
  const { error: storageError } = await supabase.storage
    .from(asset.bucket)
    .remove([asset.object_path]);
  if (storageError) throw toAppError(storageError);
  const { error } = await supabase.from("media_assets").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// COMMENTS
export const listComments = async () => {
  await requirePermission("comments:moderate");
  const { data, error } = await supabase
    .from("comments")
    .select("*, articles(id,title,slug)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw toAppError(error);
  return data ?? [];
};

export const moderateComment = async ({
  data,
}: {
  data: { id: string; status: Database["public"]["Enums"]["comment_status"] };
}) => {
  const { user } = await requirePermission("comments:moderate");
  const { error } = await supabase
    .from("comments")
    .update({
      status: data.status,
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const deleteComment = async ({ data }: { data: { id: string } }) => {
  await requirePermission("comments:moderate");
  const { error } = await supabase.from("comments").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

// ANALYTICS
export const getAnalyticsOverview = async () => {
  await requirePermission("analytics:view");
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  const date = since.toISOString().slice(0, 10);
  const [metricsRes, articlesRes, commentsRes] = await Promise.all([
    supabase
      .from("article_daily_metrics")
      .select("article_id,metric_date,views,articles(id,title,slug,sections(name))")
      .gte("metric_date", date)
      .order("metric_date"),
    supabase
      .from("articles")
      .select("id,status,created_at,published_at,section_id,sections(name)")
      .gte("created_at", since.toISOString()),
    supabase.from("comments").select("id,status,created_at").gte("created_at", since.toISOString()),
  ]);
  if (metricsRes.error) throw toAppError(metricsRes.error);
  if (articlesRes.error) throw toAppError(articlesRes.error);
  if (commentsRes.error) throw toAppError(commentsRes.error);
  return {
    metrics: metricsRes.data ?? [],
    articles: articlesRes.data ?? [],
    comments: commentsRes.data ?? [],
  };
};

// SETTINGS
export const getNewsroomSettings = async () => {
  await requirePermission("settings:manage");
  const { data, error } = await supabase
    .from("newsroom_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw toAppError(error);
  return data;
};

export const updateNewsroomSettings = async ({
  data,
}: {
  data: Database["public"]["Tables"]["newsroom_settings"]["Update"];
}) => {
  await requirePermission("settings:manage");
  const { id: _id, updated_at: _updatedAt, updated_by: _updatedBy, ...payload } = data;
  const { error } = await supabase.from("newsroom_settings").update(payload).eq("id", true);
  if (error) throw toAppError(error);
  return { ok: true };
};
