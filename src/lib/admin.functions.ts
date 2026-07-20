import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  collectUrlsFromBody,
  detectAssetType,
  isAllowedMime,
  MAX_HERO_BYTES,
  MAX_LIBRARY_BYTES,
  type MediaAssetType,
  type MediaBucket,
} from "@/lib/dam";
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

const requireAnyPermission = async (permissions: Permission[]) => {
  const newsroom = await requireNewsroomRole();
  if (!hasAnyPermission(newsroom.roles, permissions)) {
    throw new Error(`Forbidden — missing one of: ${permissions.join(", ")}.`);
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
  const enrich = <T extends Record<string, unknown>>(rows: T[]) =>
    rows.map((row) => {
      const tagRows =
        (row.article_tags as Array<{
          tag_id?: string;
          tags?: { id: string; name?: string; slug?: string } | { id: string; name?: string; slug?: string }[] | null;
        }> | null) ?? [];
      const tags = tagRows
        .map((entry) => {
          const tag = Array.isArray(entry.tags) ? entry.tags[0] : entry.tags;
          if (!tag?.id) return null;
          return { id: tag.id, name: tag.name ?? "Tag", slug: tag.slug ?? tag.id };
        })
        .filter((tag): tag is { id: string; name: string; slug: string } => Boolean(tag));
      const { article_tags: _tags, ...rest } = row as T & { article_tags?: unknown };
      return {
        ...rest,
        language: (row.language as string | undefined) ?? "en",
        schema_type: (row.schema_type as string | undefined) ?? "NewsArticle",
        seo_title: (row.seo_title as string | null | undefined) ?? null,
        meta_description: (row.meta_description as string | null | undefined) ?? null,
        focus_keyword: (row.focus_keyword as string | null | undefined) ?? null,
        robots_index: (row.robots_index as boolean | undefined) ?? true,
        is_featured: Boolean(row.is_featured),
        google_news: Boolean(row.google_news),
        google_discover: Boolean(row.google_discover),
        hero_image_url: (row.hero_image_url as string | null | undefined) ?? null,
        deck: (row.deck as string | null | undefined) ?? null,
        tag_ids: tags.map((tag) => tag.id),
        tags,
      };
    });

  const selectFull =
    "id,slug,title,deck,status,badge_type,hero_image_url,published_at,scheduled_at,updated_at,created_at,section_id,author_id,is_featured,google_news,google_discover,language,schema_type,seo_title,meta_description,focus_keyword,robots_index, article_tags(tag_id, tags(id,name,slug)), sections(name,slug), author:profiles!articles_author_id_fkey(id,name)";
  const { data, error } = await supabase
    .from("articles")
    .select(selectFull)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (!error) return enrich(data ?? []);

  if (
    !/language|schema_type|seo_title|article_tags|is_featured|google_news|google_discover|hero_image_url|deck|schema cache|PGRST/i.test(
      error.message,
    )
  ) {
    throw toAppError(error);
  }

  const legacy = await supabase
    .from("articles")
    .select(
      "id,slug,title,status,badge_type,published_at,scheduled_at,updated_at,created_at,section_id,author_id, sections(name,slug), author:profiles!articles_author_id_fkey(id,name)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  if (legacy.error) throw toAppError(legacy.error);
  return enrich(
    (legacy.data ?? []).map((row) => ({
      ...row,
      is_featured: false,
      google_news: false,
      google_discover: false,
      language: "en",
      schema_type: "NewsArticle",
      seo_title: null,
      meta_description: null,
      focus_keyword: null,
      robots_index: true,
      hero_image_url: null,
      deck: null,
      article_tags: [],
    })),
  );
};

/** Lifetime view totals keyed by article id (Phase 5 filters) */
export const getArticleViewTotals = async () => {
  await requirePermission("articles:view");
  const { data, error } = await supabase.from("article_daily_metrics").select("article_id,views");
  if (error) {
    if (/article_daily_metrics|schema cache|PGRST/i.test(error.message)) return {} as Record<string, number>;
    throw toAppError(error);
  }
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.article_id] = (totals[row.article_id] ?? 0) + (row.views ?? 0);
  }
  return totals;
};

/** Comment counts keyed by article id (Phase 6 table) */
export const getArticleCommentCounts = async () => {
  await requirePermission("articles:view");
  const { data, error } = await supabase.from("comments").select("article_id");
  if (error) {
    if (/comments|schema cache|PGRST/i.test(error.message)) return {} as Record<string, number>;
    throw toAppError(error);
  }
  const totals: Record<string, number> = {};
  for (const row of data ?? []) {
    totals[row.article_id] = (totals[row.article_id] ?? 0) + 1;
  }
  return totals;
};

/** CSV import → draft articles (Phase 6). Columns: title, slug, deck, section */
export const importArticlesCsv = async ({
  data,
}: {
  data: {
    rows: Array<{
      title: string;
      slug?: string;
      deck?: string;
      section?: string;
    }>;
  };
}) => {
  await requirePermission("articles:create");
  const rows = data.rows.filter((row) => row.title?.trim()).slice(0, 50);
  if (!rows.length) throw new Error("No importable rows found. Include a title column.");

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("id,name,slug");
  if (sectionsError) throw toAppError(sectionsError);

  const findSection = (value?: string) => {
    if (!value?.trim()) return sections?.[0]?.id ?? null;
    const needle = value.trim().toLowerCase();
    return (
      sections?.find(
        (section) =>
          section.slug.toLowerCase() === needle || section.name.toLowerCase() === needle,
      )?.id ?? null
    );
  };

  let created = 0;
  const errors: string[] = [];
  for (const row of rows) {
    const section_id = findSection(row.section);
    if (!section_id) {
      errors.push(`Skipped “${row.title}”: no matching category.`);
      continue;
    }
    try {
      await upsertArticle({
        data: {
          title: row.title.trim(),
          slug: row.slug?.trim() || undefined,
          deck: row.deck?.trim() || undefined,
          section_id,
          status: "draft",
        },
      });
      created += 1;
    } catch (error) {
      errors.push(
        `“${row.title}”: ${error instanceof Error ? error.message : "failed to import"}`,
      );
    }
  }

  return { created, errors };
};

export type ArticlesLibraryTab =
  | "all"
  | "published"
  | "draft"
  | "review"
  | "scheduled"
  | "archived"
  | "breaking"
  | "featured"
  | "google_news"
  | "discover";

/** Exact tab counts for All Articles library (Phase 4) */
export const getArticlesLibraryCounts = async () => {
  await requirePermission("articles:view");

  const countEq = async (column: string, value: string | boolean) => {
    let query = supabase.from("articles").select("id", { count: "exact", head: true });
    query = query.eq(column, value);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  try {
    const [all, published, draft, review, scheduled, archived, breaking, featured, googleNews, discover] =
      await Promise.all([
        supabase.from("articles").select("id", { count: "exact", head: true }).then((r) => {
          if (r.error) throw r.error;
          return r.count ?? 0;
        }),
        countEq("status", "published"),
        countEq("status", "draft"),
        countEq("status", "review"),
        countEq("status", "scheduled"),
        countEq("status", "archived"),
        countEq("badge_type", "breaking"),
        countEq("is_featured", true),
        countEq("google_news", true),
        countEq("google_discover", true),
      ]);

    return {
      all,
      published,
      draft,
      review,
      scheduled,
      archived,
      breaking,
      featured,
      google_news: googleNews,
      discover,
    } satisfies Record<ArticlesLibraryTab, number>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/is_featured|google_news|google_discover|schema cache|PGRST/i.test(message)) {
      throw toAppError(error);
    }

    const [all, published, draft, review, scheduled, archived, breaking] = await Promise.all([
      supabase.from("articles").select("id", { count: "exact", head: true }).then((r) => {
        if (r.error) throw toAppError(r.error);
        return r.count ?? 0;
      }),
      countEq("status", "published"),
      countEq("status", "draft"),
      countEq("status", "review"),
      countEq("status", "scheduled"),
      countEq("status", "archived"),
      countEq("badge_type", "breaking"),
    ]);

    return {
      all,
      published,
      draft,
      review,
      scheduled,
      archived,
      breaking,
      featured: 0,
      google_news: 0,
      discover: 0,
    } satisfies Record<ArticlesLibraryTab, number>;
  }
};

export const listDashboardArticles = async () => {
  await requirePermission("dashboard:view");
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,slug,title,status,badge_type,published_at,scheduled_at,updated_at,section_id,author_id,seo_title,meta_description,focus_keyword,robots_index,canonical_url, sections(name,slug), author:profiles!articles_author_id_fkey(name)",
    )
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    // Fallback when SEO columns are not yet migrated.
    if (/seo_title|meta_description|focus_keyword|robots_index|canonical_url|schema cache|PGRST/i.test(error.message)) {
      const legacy = await supabase
        .from("articles")
        .select("id,slug,title,status,badge_type,published_at,scheduled_at,updated_at,section_id,author_id, sections(name,slug), author:profiles!articles_author_id_fkey(name)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (legacy.error) throw toAppError(legacy.error);
      return (legacy.data ?? []).map((row) => ({
        ...row,
        seo_title: null,
        meta_description: null,
        focus_keyword: null,
        robots_index: true,
        canonical_url: null,
      }));
    }
    throw toAppError(error);
  }
  return data ?? [];
};

export const getDashboardSettingsSnapshot = async () => {
  await requirePermission("dashboard:view");
  const { data, error } = await supabase
    .from("newsroom_settings")
    .select("publication_name,integrations,seo_defaults,notification_prefs,comments_enabled")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    if (/integrations|seo_defaults|notification_prefs|schema cache|PGRST/i.test(error.message)) {
      const legacy = await supabase
        .from("newsroom_settings")
        .select("publication_name,comments_enabled")
        .eq("id", true)
        .maybeSingle();
      if (legacy.error) throw toAppError(legacy.error);
      return {
        publication_name: legacy.data?.publication_name ?? "Diplomacy Lens",
        comments_enabled: legacy.data?.comments_enabled ?? true,
        integrations: {},
        seo_defaults: {},
        notification_prefs: {},
      };
    }
    throw toAppError(error);
  }
  return data;
};

export const getDashboardMetrics = async () => {
  await requirePermission("dashboard:view");
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const monthAgo = new Date();
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 29);
  const monthDate = monthAgo.toISOString().slice(0, 10);

  const [
    totalRes,
    publishedTotalRes,
    publishedTodayRes,
    reviewRes,
    draftRes,
    scheduledRes,
    archivedRes,
    commentsPendingRes,
    commentsFlaggedRes,
    authorsRes,
    monthlyViewsRes,
  ] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", startOfToday.toISOString()),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "review"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "archived"),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("status", "flagged"),
    supabase
      .from("articles")
      .select("author_id")
      .not("author_id", "is", null)
      .neq("status", "archived")
      .limit(2000),
    supabase.from("article_daily_metrics").select("views").gte("metric_date", monthDate),
  ]);

  for (const result of [
    totalRes,
    publishedTotalRes,
    publishedTodayRes,
    reviewRes,
    draftRes,
    scheduledRes,
    archivedRes,
  ]) {
    if (result.error) throw toAppError(result.error);
  }

  const activeAuthors = new Set(
    (authorsRes.error ? [] : authorsRes.data ?? [])
      .map((row) => row.author_id)
      .filter(Boolean),
  ).size;

  const monthlyViews = monthlyViewsRes.error
    ? 0
    : (monthlyViewsRes.data ?? []).reduce((sum, row) => sum + (row.views ?? 0), 0);

  return {
    totalArticles: totalRes.count ?? 0,
    publishedTotal: publishedTotalRes.count ?? 0,
    publishedToday: publishedTodayRes.count ?? 0,
    pendingReview: reviewRes.count ?? 0,
    drafts: draftRes.count ?? 0,
    scheduled: scheduledRes.count ?? 0,
    archived: archivedRes.count ?? 0,
    activeAuthors,
    monthlyViews,
    pendingComments: commentsPendingRes.error ? 0 : (commentsPendingRes.count ?? 0),
    flaggedComments: commentsFlaggedRes.error ? 0 : (commentsFlaggedRes.count ?? 0),
  };
};

function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** Articles module dashboard snapshot (Phase 3) — uses articles:view */
export const getArticlesDashboardSnapshot = async () => {
  await requirePermission("articles:view");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const weekAgo = new Date(startOfToday);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(startOfToday);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const todayKey = startOfToday.toISOString().slice(0, 10);
  const yesterdayKey = startOfYesterday.toISOString().slice(0, 10);

  const [
    publishedTotalRes,
    publishedTodayRes,
    publishedYesterdayRes,
    publishedWeekRes,
    publishedPrevWeekRes,
    draftRes,
    reviewRes,
    scheduledRes,
    articlesRes,
    viewsTodayRes,
    viewsYesterdayRes,
    metricsWeekRes,
    publishWindowRes,
  ] = await Promise.all([
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", startOfToday.toISOString()),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", startOfYesterday.toISOString())
      .lt("published_at", startOfToday.toISOString()),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", weekAgo.toISOString()),
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("published_at", twoWeeksAgo.toISOString())
      .lt("published_at", weekAgo.toISOString()),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "review"),
    supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase
      .from("articles")
      .select(
        "id,slug,title,status,badge_type,published_at,updated_at,seo_title,meta_description,focus_keyword,robots_index,author:profiles!articles_author_id_fkey(name),sections(name)",
      )
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase.from("article_daily_metrics").select("views").eq("metric_date", todayKey),
    supabase.from("article_daily_metrics").select("views").eq("metric_date", yesterdayKey),
    supabase
      .from("article_daily_metrics")
      .select("article_id,views,metric_date,articles(id,title,slug)")
      .gte("metric_date", weekAgo.toISOString().slice(0, 10)),
    supabase
      .from("articles")
      .select("published_at")
      .not("published_at", "is", null)
      .gte("published_at", twoWeeksAgo.toISOString()),
  ]);

  for (const result of [
    publishedTotalRes,
    publishedTodayRes,
    draftRes,
    reviewRes,
    scheduledRes,
  ]) {
    if (result.error) throw toAppError(result.error);
  }
  if (articlesRes.error) throw toAppError(articlesRes.error);

  const articles = articlesRes.data ?? [];
  const viewsToday = viewsTodayRes.error
    ? 0
    : (viewsTodayRes.data ?? []).reduce((sum, row) => sum + (row.views ?? 0), 0);
  const viewsYesterday = viewsYesterdayRes.error
    ? 0
    : (viewsYesterdayRes.data ?? []).reduce((sum, row) => sum + (row.views ?? 0), 0);

  const seoScores = articles.map((article) => {
    let score = 0;
    if (article.seo_title?.trim()) score += 25;
    if (article.meta_description?.trim()) score += 25;
    if (article.focus_keyword?.trim()) score += 25;
    if (article.robots_index !== false) score += 25;
    return score;
  });
  const seoHealth = seoScores.length
    ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length)
    : 0;
  const seoStrong = seoScores.filter((s) => s >= 75).length;
  const seoWeak = seoScores.filter((s) => s < 50).length;
  const missingMeta = articles.filter(
    (a) => !a.seo_title?.trim() || !a.meta_description?.trim(),
  ).length;

  const storyViews = new Map<string, { title: string; slug: string; views: number }>();
  for (const row of metricsWeekRes.error ? [] : metricsWeekRes.data ?? []) {
    const article = Array.isArray(row.articles) ? row.articles[0] : row.articles;
    const current = storyViews.get(row.article_id) ?? {
      title: article?.title ?? "Unknown",
      slug: article?.slug ?? "",
      views: 0,
    };
    current.views += row.views ?? 0;
    storyViews.set(row.article_id, current);
  }
  const topPerforming = [...storyViews.entries()]
    .map(([id, value]) => ({ id, ...value }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  const publishActivity = new Map<string, number>();
  for (let offset = 13; offset >= 0; offset -= 1) {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() - offset);
    publishActivity.set(date.toISOString().slice(0, 10), 0);
  }
  for (const row of publishWindowRes.error ? [] : publishWindowRes.data ?? []) {
    if (!row.published_at) continue;
    const key = row.published_at.slice(0, 10);
    if (publishActivity.has(key)) {
      publishActivity.set(key, (publishActivity.get(key) ?? 0) + 1);
    }
  }

  const publishedToday = publishedTodayRes.count ?? 0;
  const publishedYesterday = publishedYesterdayRes.error ? 0 : (publishedYesterdayRes.count ?? 0);
  const drafts = draftRes.count ?? 0;
  const pendingReview = reviewRes.count ?? 0;
  const scheduled = scheduledRes.count ?? 0;
  const publishedWeek = publishedWeekRes.error ? 0 : (publishedWeekRes.count ?? 0);
  const publishedPrevWeek = publishedPrevWeekRes.error ? 0 : (publishedPrevWeekRes.count ?? 0);

  return {
    kpis: {
      published: publishedTotalRes.count ?? 0,
      publishedChange: pctChange(publishedWeek, publishedPrevWeek),
      drafts,
      draftsChange: null as number | null,
      pendingReview,
      pendingReviewChange: null as number | null,
      scheduled,
      scheduledChange: null as number | null,
      viewsToday,
      viewsTodayChange: pctChange(viewsToday, viewsYesterday),
      seoHealth,
      seoHealthChange: null as number | null,
      publishedToday,
      publishedYesterday,
    },
    contentHealth: {
      seoHealth,
      seoStrong,
      seoWeak,
      missingMeta,
      totalSampled: articles.length,
      backlog: drafts + pendingReview + scheduled,
    },
    topPerforming,
    recentlyUpdated: articles.slice(0, 8).map((article) => ({
      id: article.id,
      title: article.title,
      status: article.status,
      updated_at: article.updated_at,
      author: Array.isArray(article.author) ? article.author[0]?.name : article.author?.name,
      section: Array.isArray(article.sections)
        ? article.sections[0]?.name
        : article.sections?.name,
    })),
    editorialQueue: articles
      .filter((a) => a.status === "review")
      .slice(0, 8)
      .map((article) => ({
        id: article.id,
        title: article.title,
        updated_at: article.updated_at,
        author: Array.isArray(article.author) ? article.author[0]?.name : article.author?.name,
        badge_type: article.badge_type,
      })),
    publishingActivity: [...publishActivity.entries()].map(([date, count]) => ({
      date,
      count,
    })),
  };
};

export const getDashboardPerformance = async () => {
  await requirePermission("dashboard:view");
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  const date = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("article_daily_metrics")
    .select("article_id,metric_date,views,articles(id,title)")
    .gte("metric_date", date)
    .order("metric_date");

  if (error) {
    if (/article_daily_metrics|schema cache|PGRST/i.test(error.message)) {
      return { dailyRows: emptyDailyRows(), topStories: [] as Array<{ title: string; views: number }> };
    }
    throw toAppError(error);
  }

  const daily = new Map<string, number>();
  for (const [key] of emptyDailyRows()) daily.set(key, 0);
  const storyTotals = new Map<string, { title: string; views: number }>();

  for (const metric of data ?? []) {
    daily.set(metric.metric_date, (daily.get(metric.metric_date) ?? 0) + metric.views);
    const article = Array.isArray(metric.articles) ? metric.articles[0] : metric.articles;
    const current = storyTotals.get(metric.article_id) ?? {
      title: article?.title ?? "Unknown article",
      views: 0,
    };
    current.views += metric.views;
    storyTotals.set(metric.article_id, current);
  }

  return {
    dailyRows: [...daily.entries()] as Array<[string, number]>,
    topStories: [...storyTotals.values()].sort((a, b) => b.views - a.views).slice(0, 8),
  };
};

function emptyDailyRows(): Array<[string, number]> {
  const rows: Array<[string, number]> = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    rows.push([date.toISOString().slice(0, 10), 0]);
  }
  return rows;
}

export const getAdminArticle = async ({ data }: { data: { id: string } }) => {
  await requirePermission("articles:view");
  const { data: a, error } = await supabase
    .from("articles")
    .select(
      "*, author:profiles!articles_author_id_fkey(id,name,avatar_url), sections(name,slug)",
    )
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

  const trackUsage = (article: {
    id: string;
    title: string;
    slug?: string | null;
    hero_image_url?: string | null;
    body?: string | null;
  }) => {
    void recordArticleMediaUsages({
      data: {
        article_id: article.id,
        title: article.title,
        slug: article.slug,
        urls: [
          { field: "hero_image_url", url: article.hero_image_url },
          ...collectUrlsFromBody(article.body).map((url) => ({ field: "body", url })),
        ],
      },
    });
  };

  if (!rpcError && viaRpc) {
    trackUsage(viaRpc);
    return viaRpc;
  }

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
    trackUsage(r);
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
  trackUsage(r);
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

/** Unwrap format-1 (flat) and format-2 (`{ article, tag_ids }`) revision snapshots. */
export function unwrapRevisionSnapshot(raw: unknown): Partial<
  Database["public"]["Tables"]["articles"]["Row"]
> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  if (obj.article && typeof obj.article === "object" && !Array.isArray(obj.article)) {
    return obj.article as Partial<Database["public"]["Tables"]["articles"]["Row"]>;
  }
  return obj as Partial<Database["public"]["Tables"]["articles"]["Row"]>;
}

export type ArticleNoteType = "editorial" | "fact_check";

export type ArticleApprovalAction =
  | "submit_review"
  | "approve"
  | "reject"
  | "request_changes"
  | "publish"
  | "schedule"
  | "archive";

export const listArticleNotes = async ({
  data,
}: {
  data: { article_id: string; note_type?: ArticleNoteType };
}) => {
  await requirePermission("articles:view");
  let query = supabase
    .from("article_notes")
    .select("*, author:profiles!article_notes_author_id_fkey(name)")
    .eq("article_id", data.article_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (data.note_type) query = query.eq("note_type", data.note_type);
  const { data: rows, error } = await query;
  if (error) throw toAppError(error);
  return rows ?? [];
};

export const addArticleNote = async ({
  data,
}: {
  data: { article_id: string; note_type: ArticleNoteType; body: string };
}) => {
  const body = data.body.trim();
  if (!body) throw new Error("Note cannot be empty.");
  if (data.note_type === "editorial") {
    await requireAnyPermission(["articles:edit_own", "articles:edit_all", "articles:review"]);
  } else {
    await requireAnyPermission(["articles:review", "articles:edit_all"]);
  }
  const { data: row, error } = await supabase
    .from("article_notes")
    .insert({
      article_id: data.article_id,
      note_type: data.note_type,
      body,
    })
    .select("*, author:profiles!article_notes_author_id_fkey(name)")
    .single();
  if (error) throw toAppError(error);
  return row;
};

export const listArticleApprovals = async ({
  data,
}: {
  data: { article_id: string };
}) => {
  await requirePermission("articles:view");
  const { data: rows, error } = await supabase
    .from("article_approvals")
    .select("*, actor:profiles!article_approvals_actor_id_fkey(name)")
    .eq("article_id", data.article_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw toAppError(error);
  return rows ?? [];
};

export const recordArticleApproval = async ({
  data,
}: {
  data: {
    article_id: string;
    action: ArticleApprovalAction;
    from_status?: ArticleStatus | null;
    to_status?: ArticleStatus | null;
    note?: string | null;
  };
}) => {
  await requireAnyPermission([
    "articles:review",
    "articles:publish",
    "articles:edit_all",
    "articles:edit_own",
  ]);
  const { data: row, error } = await supabase
    .from("article_approvals")
    .insert({
      article_id: data.article_id,
      action: data.action,
      from_status: data.from_status ?? null,
      to_status: data.to_status ?? null,
      note: data.note?.trim() || null,
    })
    .select("*, actor:profiles!article_approvals_actor_id_fkey(name)")
    .single();
  if (error) throw toAppError(error);
  return row;
};

export const applyArticleWorkflowAction = async ({
  data,
}: {
  data: {
    article_id: string;
    action: ArticleApprovalAction;
    note?: string;
    scheduled_at?: string | null;
  };
}) => {
  const article = await getAdminArticle({ data: { id: data.article_id } });
  if (!article) throw new Error("Article not found.");
  const from = article.status as ArticleStatus;

  let to: ArticleStatus = from;
  switch (data.action) {
    case "submit_review":
      if (from !== "draft") throw new Error("Only drafts can be submitted for review.");
      to = "review";
      break;
    case "approve":
      if (from !== "review") throw new Error("Only articles in review can be approved.");
      to = "review";
      break;
    case "reject":
    case "request_changes":
      if (from !== "review") throw new Error("Only articles in review can be sent back.");
      to = "draft";
      break;
    case "publish":
      to = "published";
      break;
    case "schedule":
      to = "scheduled";
      break;
    case "archive":
      to = "archived";
      break;
    default:
      throw new Error("Unknown workflow action.");
  }

  if (data.action === "publish" || data.action === "schedule" || data.action === "archive") {
    await requirePermission("articles:publish");
  } else if (data.action === "submit_review") {
    await requireAnyPermission(["articles:edit_own", "articles:edit_all", "articles:create"]);
  } else {
    await requireAnyPermission(["articles:review", "articles:publish", "articles:edit_all"]);
  }

  const updated =
    to !== from
      ? await upsertArticle({
          data: {
            id: data.article_id,
            title: article.title,
            deck: article.deck ?? undefined,
            body: article.body ?? undefined,
            section_id: article.section_id!,
            region: article.region ?? undefined,
            badge_type: article.badge_type,
            hero_image_url: article.hero_image_url ?? undefined,
            status: to,
            slug: article.slug,
            scheduled_at:
              to === "scheduled"
                ? (data.scheduled_at ?? article.scheduled_at)
                : to === "published"
                  ? null
                  : article.scheduled_at,
          },
        })
      : article;

  await recordArticleApproval({
    data: {
      article_id: data.article_id,
      action: data.action,
      from_status: from,
      to_status: to,
      note: data.note,
    },
  });

  return updated;
};

export const restoreArticleRevision = async ({
  data,
}: {
  data: { article_id: string; revision_id: string };
}) => {
  const { data: restoredId, error: rpcError } = await supabase.rpc(
    "admin_restore_article_revision",
    { p_revision_id: data.revision_id },
  );
  if (!rpcError && restoredId) {
    return getAdminArticle({ data: { id: data.article_id } });
  }
  if (rpcError && !/admin_restore_article_revision|schema cache|PGRST202/i.test(rpcError.message)) {
    throw toAppError(rpcError);
  }

  const { data: revision, error } = await supabase
    .from("article_revisions")
    .select("snapshot")
    .eq("id", data.revision_id)
    .eq("article_id", data.article_id)
    .single();
  if (error) throw toAppError(error);

  const snapshot = unwrapRevisionSnapshot(revision.snapshot) as Database["public"]["Tables"]["articles"]["Row"];
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

  if (
    revision.snapshot &&
    typeof revision.snapshot === "object" &&
    !Array.isArray(revision.snapshot) &&
    Array.isArray((revision.snapshot as { tag_ids?: unknown }).tag_ids)
  ) {
    const tagIds = (revision.snapshot as { tag_ids: string[] }).tag_ids;
    if (tagIds.length) {
      const { data: tags } = await supabase.from("tags").select("id,name").in("id", tagIds);
      if (tags?.length) {
        await setArticleTags({
          data: { article_id: data.article_id, tag_names: tags.map((tag) => tag.name) },
        });
      }
    }
  }

  return article;
};

export const publishDueArticles = async () => {
  await requirePermission("articles:publish");
  const { data, error } = await supabase.rpc("publish_due_articles");
  if (error) {
    if (/publish_due_articles|schema cache|PGRST202/i.test(error.message)) {
      throw new Error(
        "Scheduled publish is not installed. Apply supabase/migrations/20260718120000_newsroom_foundation_hardening.sql.",
      );
    }
    throw toAppError(error);
  }
  return { published: data ?? 0 };
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

const indexMediaAsset = async (row: {
  bucket: MediaBucket;
  object_path: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  asset_type: MediaAssetType;
  folder_id?: string | null;
  alt_text?: string | null;
  caption?: string | null;
  copyright?: string | null;
}) => {
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      bucket: row.bucket,
      object_path: row.object_path,
      public_url: row.public_url,
      file_name: row.file_name,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      uploaded_by: row.uploaded_by,
      asset_type: row.asset_type,
      folder_id: row.folder_id || null,
      alt_text: row.alt_text?.trim() || null,
      caption: row.caption?.trim() || null,
      copyright: row.copyright?.trim() || null,
    })
    .select("id")
    .maybeSingle();
  if (error && !/media_assets|schema cache|PGRST|asset_type|folder_id|caption|copyright/i.test(error.message)) {
    console.error("File uploaded but media indexing failed", error);
  }
  return data?.id ?? null;
};

export const uploadHeroImage = async ({
  data,
}: {
  data: {
    fileName: string;
    contentType: string;
    base64: string;
    bucket?: "article-hero" | "avatars";
    folder_id?: string | null;
  };
}) => {
  const { user } = await requirePermission("media:upload");
  const bucket = data.bucket ?? "article-hero";
  if (!data.contentType.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
  if (bytes.byteLength > MAX_HERO_BYTES) {
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

  const assetId = await indexMediaAsset({
    bucket,
    object_path: path,
    public_url: pub.publicUrl,
    file_name: data.fileName,
    mime_type: data.contentType,
    size_bytes: bytes.byteLength,
    uploaded_by: user.id,
    asset_type: "image",
    folder_id: data.folder_id,
  });

  return { path, url: pub.publicUrl, id: assetId };
};

export const uploadMediaAsset = async ({
  data,
}: {
  data: {
    file: File;
    folder_id?: string | null;
    alt_text?: string | null;
    caption?: string | null;
    copyright?: string | null;
    bucket?: MediaBucket;
  };
}) => {
  const { user } = await requirePermission("media:upload");
  const mime = data.file.type || "application/octet-stream";
  if (!isAllowedMime(mime)) {
    throw new Error(`Unsupported file type: ${mime || data.file.name}`);
  }
  const assetType = detectAssetType(mime);
  const bucket: MediaBucket =
    data.bucket ?? (assetType === "image" && data.file.size <= MAX_HERO_BYTES ? "article-hero" : "media-library");
  const maxBytes = bucket === "media-library" ? MAX_LIBRARY_BYTES : MAX_HERO_BYTES;
  if (data.file.size > maxBytes) {
    throw new Error(
      bucket === "media-library"
        ? "Files must be 50 MB or smaller."
        : "Images must be 5 MB or smaller.",
    );
  }
  if (bucket !== "media-library" && assetType !== "image") {
    throw new Error("Only images can be uploaded to the hero/avatar buckets.");
  }

  const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
  const path =
    bucket === "avatars"
      ? `${user.id}/${fileName}`
      : bucket === "media-library"
        ? `${assetType}/${fileName}`
        : fileName;

  const { error } = await supabase.storage.from(bucket).upload(path, data.file, {
    contentType: mime,
    upsert: false,
  });
  if (error) throw toAppError(error);
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("Upload succeeded but public URL could not be created.");

  const assetId = await indexMediaAsset({
    bucket,
    object_path: path,
    public_url: pub.publicUrl,
    file_name: data.file.name,
    mime_type: mime,
    size_bytes: data.file.size,
    uploaded_by: user.id,
    asset_type: assetType,
    folder_id: data.folder_id,
    alt_text: data.alt_text,
    caption: data.caption,
    copyright: data.copyright,
  });

  return {
    id: assetId,
    path,
    url: pub.publicUrl,
    asset_type: assetType,
    bucket,
  };
};

export const uploadMediaAssetsBulk = async ({
  data,
}: {
  data: { files: File[]; folder_id?: string | null };
}) => {
  await requirePermission("media:upload");
  if (!data.files.length) throw new Error("Select at least one file.");
  const results: Array<{ fileName: string; ok: boolean; error?: string; url?: string }> = [];
  for (const file of data.files) {
    try {
      const uploaded = await uploadMediaAsset({
        data: { file, folder_id: data.folder_id, bucket: "media-library" },
      });
      results.push({ fileName: file.name, ok: true, url: uploaded.url });
    } catch (error) {
      results.push({
        fileName: file.name,
        ok: false,
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  }
  return {
    uploaded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
};

// CATEGORIES / TAXONOMY — see category.functions.ts for full CMS module
export {
  archiveCategory,
  bulkArchiveCategories,
  deleteCategory,
  duplicateCategory,
  exportCategories,
  getCategoriesDashboard,
  getCategoriesLibraryCounts,
  getCategoryAnalytics,
  getCategoryDetail,
  getCategoryModuleSettings,
  importCategories,
  listCategories,
  listCategoriesTable,
  listCategoryActivity,
  listCategoryArticles,
  reorderCategories,
  rowToWizardPayload,
  updateCategoryModuleSettings,
  upsertCategory,
} from "@/lib/category.functions";

// TAGS CMS — see tag.functions.ts (legacy listTags / setArticleTags remain above)
export {
  deleteTag,
  exportTags,
  getTagAnalytics,
  getTagArticles,
  getTagDetail,
  getTagsDashboard,
  getTagsLibraryCounts,
  getTagsModuleAnalytics,
  getTagsSidebarWidgets,
  importTags,
  listSeoTagsQueue,
  listTagActivity,
  listTagsAdmin,
  listTagsTable,
  listTrendingTags,
  optimizeTagSeo,
  rowToTagWizardPayload,
  upsertTag,
} from "@/lib/tag.functions";

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

// MEDIA LIBRARY / DAM
export type MediaAssetRow = {
  id: string;
  bucket: string;
  object_path: string;
  public_url: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  alt_text: string | null;
  caption: string | null;
  copyright: string | null;
  asset_type: MediaAssetType;
  folder_id: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  profiles: { name: string | null } | null;
  media_asset_usages?: Array<{ count: number }> | null;
};

export const listMediaFolders = async () => {
  await requirePermission("media:view");
  const { data, error } = await supabase
    .from("media_folders")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) {
    if (/media_folders|schema cache|PGRST/i.test(error.message)) return [];
    throw toAppError(error);
  }
  return data ?? [];
};

export const upsertMediaFolder = async ({
  data,
}: {
  data: { id?: string; name: string; parent_id?: string | null; sort_order?: number };
}) => {
  const { user } = await requirePermission("media:upload");
  if (data.id && data.parent_id === data.id) {
    throw new Error("A folder cannot be its own parent.");
  }
  const payload = {
    name: data.name.trim(),
    parent_id: data.parent_id || null,
    sort_order: data.sort_order ?? 0,
    updated_at: new Date().toISOString(),
  };
  if (!payload.name) throw new Error("Folder name is required.");
  if (data.id) {
    const { error } = await supabase.from("media_folders").update(payload).eq("id", data.id);
    if (error) throw toAppError(error);
  } else {
    const { error } = await supabase.from("media_folders").insert({
      ...payload,
      created_by: user.id,
    });
    if (error) throw toAppError(error);
  }
  return { ok: true };
};

export const deleteMediaFolder = async ({ data }: { data: { id: string } }) => {
  await requirePermission("media:upload");
  const { count: childCount, error: childError } = await supabase
    .from("media_folders")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", data.id);
  if (childError) throw toAppError(childError);
  if (childCount) throw new Error("Move or delete nested folders first.");

  const { count: assetCount, error: assetError } = await supabase
    .from("media_assets")
    .select("id", { count: "exact", head: true })
    .eq("folder_id", data.id);
  if (assetError) throw toAppError(assetError);
  if (assetCount) throw new Error("Move or delete assets in this folder first.");

  const { error } = await supabase.from("media_folders").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const listMediaAssets = async (filters?: {
  asset_type?: MediaAssetType | "all";
  folder_id?: string | null | "unfiled";
  search?: string;
}) => {
  await requirePermission("media:view");
  let query = supabase
    .from("media_assets")
    .select("*, profiles(name), media_asset_usages(count)")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters?.asset_type && filters.asset_type !== "all") {
    query = query.eq("asset_type", filters.asset_type);
  }
  if (filters?.folder_id === "unfiled") {
    query = query.is("folder_id", null);
  } else if (filters?.folder_id) {
    query = query.eq("folder_id", filters.folder_id);
  }

  const { data, error } = await query;
  if (error) {
    // Fallback when DAM migration columns/tables are not applied yet.
    if (/asset_type|caption|copyright|folder_id|media_asset_usages|schema cache|PGRST/i.test(error.message)) {
      const legacy = await supabase
        .from("media_assets")
        .select("*, profiles(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (legacy.error) throw toAppError(legacy.error);
      return (legacy.data ?? []).map((row) => ({
        ...row,
        asset_type: detectAssetType(row.mime_type) as MediaAssetType,
        caption: null,
        copyright: null,
        folder_id: null,
        width: null,
        height: null,
        duration_seconds: null,
        updated_at: row.created_at,
        media_asset_usages: [],
      })) as MediaAssetRow[];
    }
    throw toAppError(error);
  }

  let rows = (data ?? []) as MediaAssetRow[];
  const search = filters?.search?.trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (asset) =>
        asset.file_name.toLowerCase().includes(search) ||
        asset.alt_text?.toLowerCase().includes(search) ||
        asset.caption?.toLowerCase().includes(search) ||
        asset.copyright?.toLowerCase().includes(search) ||
        asset.mime_type.toLowerCase().includes(search),
    );
  }
  return rows;
};

export const updateMediaAsset = async ({
  data,
}: {
  data: {
    id: string;
    alt_text?: string | null;
    caption?: string | null;
    copyright?: string | null;
    folder_id?: string | null;
  };
}) => {
  await requirePermission("media:view");
  const payload: Database["public"]["Tables"]["media_assets"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (data.alt_text !== undefined) payload.alt_text = data.alt_text?.trim() || null;
  if (data.caption !== undefined) payload.caption = data.caption?.trim() || null;
  if (data.copyright !== undefined) payload.copyright = data.copyright?.trim() || null;
  if (data.folder_id !== undefined) payload.folder_id = data.folder_id || null;

  const { error } = await supabase.from("media_assets").update(payload).eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const moveMediaAssets = async ({
  data,
}: {
  data: { ids: string[]; folder_id: string | null };
}) => {
  await requirePermission("media:upload");
  if (!data.ids.length) throw new Error("Select at least one asset.");
  const { error } = await supabase
    .from("media_assets")
    .update({ folder_id: data.folder_id, updated_at: new Date().toISOString() })
    .in("id", data.ids);
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

export const listMediaAssetUsages = async ({ data }: { data: { asset_id: string } }) => {
  await requirePermission("media:view");
  const { data: rows, error } = await supabase
    .from("media_asset_usages")
    .select("*")
    .eq("asset_id", data.asset_id)
    .order("created_at", { ascending: false });
  if (error) {
    if (/media_asset_usages|schema cache|PGRST/i.test(error.message)) return [];
    throw toAppError(error);
  }
  return rows ?? [];
};

export const syncMediaAssetUsages = async () => {
  await requirePermission("media:view");
  const { data: assets, error: assetsError } = await supabase
    .from("media_assets")
    .select("id, public_url");
  if (assetsError) throw toAppError(assetsError);

  const byUrl = new Map((assets ?? []).map((asset) => [asset.public_url, asset.id]));
  if (!byUrl.size) return { synced: 0 };

  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("id, title, slug, hero_image_url, og_image_url, twitter_image_url, body");
  if (articlesError) throw toAppError(articlesError);

  const rows: Array<{
    asset_id: string;
    entity_type: "article";
    entity_id: string;
    field: string;
    entity_title: string;
    entity_path: string;
  }> = [];

  for (const article of articles ?? []) {
    const path = article.slug ? `/article/${article.slug}` : `/admin/articles/${article.id}`;
    const title = article.title;
    const fields: Array<[string, string | null | undefined]> = [
      ["hero_image_url", article.hero_image_url],
      ["og_image_url", article.og_image_url],
      ["twitter_image_url", article.twitter_image_url],
    ];
    for (const [field, url] of fields) {
      if (!url) continue;
      const assetId = byUrl.get(url);
      if (assetId) {
        rows.push({
          asset_id: assetId,
          entity_type: "article",
          entity_id: article.id,
          field,
          entity_title: title,
          entity_path: path,
        });
      }
    }
    for (const url of collectUrlsFromBody(article.body)) {
      const assetId = byUrl.get(url);
      if (assetId) {
        rows.push({
          asset_id: assetId,
          entity_type: "article",
          entity_id: article.id,
          field: "body",
          entity_title: title,
          entity_path: path,
        });
      }
    }
  }

  const { error: clearError } = await supabase
    .from("media_asset_usages")
    .delete()
    .eq("entity_type", "article");
  if (clearError) {
    if (/media_asset_usages|schema cache|PGRST/i.test(clearError.message)) {
      throw new Error(
        "Usage tracking is not installed. Apply supabase/migrations/20260718090000_digital_asset_management.sql.",
      );
    }
    throw toAppError(clearError);
  }

  if (rows.length) {
    const { error: insertError } = await supabase.from("media_asset_usages").insert(rows);
    if (insertError) throw toAppError(insertError);
  }

  return { synced: rows.length };
};

export const recordArticleMediaUsages = async ({
  data,
}: {
  data: {
    article_id: string;
    title: string;
    slug?: string | null;
    urls: Array<{ field: string; url: string | null | undefined }>;
  };
}) => {
  try {
    await requirePermission("media:view");
  } catch {
    return { ok: false };
  }

  const urls = data.urls.filter((item) => item.url);
  const { error: clearError } = await supabase
    .from("media_asset_usages")
    .delete()
    .eq("entity_type", "article")
    .eq("entity_id", data.article_id);
  if (clearError) {
    if (/media_asset_usages|schema cache|PGRST/i.test(clearError.message)) return { ok: false };
    return { ok: false };
  }
  if (!urls.length) return { ok: true };

  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, public_url")
    .in(
      "public_url",
      urls.map((item) => item.url!).filter(Boolean),
    );
  if (!assets?.length) return { ok: true };

  const byUrl = new Map(assets.map((asset) => [asset.public_url, asset.id]));
  const path = data.slug ? `/article/${data.slug}` : `/admin/articles/${data.article_id}`;
  const rows = urls
    .map((item) => {
      const assetId = item.url ? byUrl.get(item.url) : null;
      if (!assetId) return null;
      return {
        asset_id: assetId,
        entity_type: "article" as const,
        entity_id: data.article_id,
        field: item.field,
        entity_title: data.title,
        entity_path: path,
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row);

  if (rows.length) {
    await supabase.from("media_asset_usages").insert(rows);
  }
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
  data: {
    id: string;
    status: Database["public"]["Enums"]["comment_status"];
    moderation_note?: string | null;
  };
}) => {
  const { user } = await requirePermission("comments:moderate");
  const payload: Database["public"]["Tables"]["comments"]["Update"] = {
    status: data.status,
    moderated_by: user.id,
    moderated_at: new Date().toISOString(),
  };
  if (data.moderation_note !== undefined) {
    payload.moderation_note = data.moderation_note?.trim() || null;
  }
  const { error } = await supabase.from("comments").update(payload).eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const deleteComment = async ({ data }: { data: { id: string } }) => {
  await requirePermission("comments:moderate");
  const { error } = await supabase.from("comments").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  return { ok: true };
};

export const listCommentBlocks = async () => {
  await requirePermission("comments:moderate");
  const { data, error } = await supabase
    .from("comment_blocks")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    if (/comment_blocks|schema cache|PGRST/i.test(error.message)) return [];
    throw toAppError(error);
  }
  return data ?? [];
};

export const blockCommenter = async ({
  data,
}: {
  data: { email: string; reason?: string | null; comment_id?: string };
}) => {
  const { user } = await requirePermission("comments:moderate");
  const email = data.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("A valid email is required to block a commenter.");

  const { error } = await supabase.from("comment_blocks").upsert(
    {
      email,
      reason: data.reason?.trim() || "Blocked by moderator",
      blocked_by: user.id,
    },
    { onConflict: "email" },
  );
  if (error) {
    if (/comment_blocks|schema cache|PGRST/i.test(error.message)) {
      throw new Error(
        "Comment blocklist is not installed. Apply supabase/migrations/20260718100000_comment_moderation_enum.sql then 20260718100001_comment_moderation.sql.",
      );
    }
    throw toAppError(error);
  }

  if (data.comment_id) {
    await supabase
      .from("comments")
      .update({
        status: "spam",
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
        moderation_note: data.reason?.trim() || "Commenter blocked",
      })
      .eq("id", data.comment_id);
  }

  return { ok: true };
};

export const unblockCommenter = async ({ data }: { data: { email: string } }) => {
  await requirePermission("comments:moderate");
  const email = data.email.trim().toLowerCase();
  const { error } = await supabase.from("comment_blocks").delete().eq("email", email);
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

const writeAuditLog = async (entry: {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  summary?: string | null;
  payload?: Database["public"]["Tables"]["admin_audit_logs"]["Insert"]["payload"];
}) => {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_id: entry.actor_id,
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id ?? null,
    summary: entry.summary ?? null,
    payload: entry.payload ?? {},
  });
  if (error && !/admin_audit_logs|schema cache|PGRST/i.test(error.message)) {
    console.error("Audit log write failed", error);
  }
};

export const updateNewsroomSettings = async ({
  data,
}: {
  data: Database["public"]["Tables"]["newsroom_settings"]["Update"];
}) => {
  const { user } = await requirePermission("settings:manage");
  const { id: _id, updated_at: _updatedAt, updated_by: _updatedBy, ...payload } = data;
  const { error } = await supabase.from("newsroom_settings").update(payload).eq("id", true);
  if (error) {
    if (/seo_defaults|integrations|notification_prefs|schema cache|PGRST/i.test(error.message)) {
      const legacy: Database["public"]["Tables"]["newsroom_settings"]["Update"] = {
        publication_name: payload.publication_name,
        short_name: payload.short_name,
        tagline: payload.tagline,
        contact_email: payload.contact_email,
        timezone: payload.timezone,
        default_article_status: payload.default_article_status,
        comments_enabled: payload.comments_enabled,
      };
      const { error: legacyError } = await supabase
        .from("newsroom_settings")
        .update(legacy)
        .eq("id", true);
      if (legacyError) throw toAppError(legacyError);
      throw new Error(
        "Core settings saved, but SEO/integrations columns are missing. Apply supabase/migrations/20260718110000_newsroom_settings_module.sql.",
      );
    }
    throw toAppError(error);
  }
  await writeAuditLog({
    actor_id: user.id,
    action: "settings.update",
    entity_type: "newsroom_settings",
    entity_id: "singleton",
    summary: "Newsroom settings updated",
    payload: { keys: Object.keys(payload) },
  });
  return { ok: true };
};

export const listAuditLogs = async () => {
  await requirePermission("settings:manage");
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("*, profiles(name, email)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    if (/admin_audit_logs|schema cache|PGRST/i.test(error.message)) return [];
    throw toAppError(error);
  }
  return data ?? [];
};

export const listIpWhitelist = async () => {
  await requirePermission("settings:manage");
  const { data, error } = await supabase
    .from("admin_ip_whitelist")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (/admin_ip_whitelist|schema cache|PGRST/i.test(error.message)) return [];
    throw toAppError(error);
  }
  return data ?? [];
};

export const addIpWhitelistEntry = async ({
  data,
}: {
  data: { cidr: string; label?: string | null };
}) => {
  const { user } = await requirePermission("settings:manage");
  const cidr = data.cidr.trim();
  if (!cidr) throw new Error("Enter an IP address or CIDR range.");
  const { error } = await supabase.from("admin_ip_whitelist").insert({
    cidr,
    label: data.label?.trim() || null,
    created_by: user.id,
  });
  if (error) {
    if (/admin_ip_whitelist|schema cache|PGRST/i.test(error.message)) {
      throw new Error(
        "IP whitelist is not installed. Apply supabase/migrations/20260718110000_newsroom_settings_module.sql.",
      );
    }
    throw toAppError(error);
  }
  await writeAuditLog({
    actor_id: user.id,
    action: "security.ip_whitelist.add",
    entity_type: "admin_ip_whitelist",
    summary: `Added IP rule ${cidr}`,
    payload: { cidr, label: data.label ?? null },
  });
  return { ok: true };
};

export const removeIpWhitelistEntry = async ({ data }: { data: { id: string } }) => {
  const { user } = await requirePermission("settings:manage");
  const { error } = await supabase.from("admin_ip_whitelist").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  await writeAuditLog({
    actor_id: user.id,
    action: "security.ip_whitelist.remove",
    entity_type: "admin_ip_whitelist",
    entity_id: data.id,
    summary: "Removed IP whitelist entry",
  });
  return { ok: true };
};

export const listBackupRecords = async () => {
  await requirePermission("settings:manage");
  const { data, error } = await supabase
    .from("admin_backup_records")
    .select("*, profiles(name)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    if (/admin_backup_records|schema cache|PGRST/i.test(error.message)) return [];
    throw toAppError(error);
  }
  return data ?? [];
};

export const recordBackupCheckpoint = async ({
  data,
}: {
  data: { label?: string; notes?: string | null; status?: "recorded" | "verified" | "failed" };
}) => {
  const { user } = await requirePermission("settings:manage");
  const { error } = await supabase.from("admin_backup_records").insert({
    label: data.label?.trim() || "Manual checkpoint",
    notes: data.notes?.trim() || null,
    status: data.status ?? "recorded",
    created_by: user.id,
  });
  if (error) {
    if (/admin_backup_records|schema cache|PGRST/i.test(error.message)) {
      throw new Error(
        "Backup records are not installed. Apply supabase/migrations/20260718110000_newsroom_settings_module.sql.",
      );
    }
    throw toAppError(error);
  }
  await writeAuditLog({
    actor_id: user.id,
    action: "security.backup.record",
    entity_type: "admin_backup_records",
    summary: data.label?.trim() || "Manual checkpoint",
  });
  return { ok: true };
};

export const getAdminSessionInfo = async () => {
  const { user } = await requirePermission("settings:manage");
  const { data } = await supabase.auth.getSession();
  return {
    userId: user.id,
    email: user.email ?? null,
    expiresAt: data.session?.expires_at
      ? new Date(data.session.expires_at * 1000).toISOString()
      : null,
    accessTokenPresent: !!data.session?.access_token,
  };
};
