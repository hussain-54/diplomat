import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toAppError } from "@/lib/db-errors";
import {
  computeCategoryAiScore,
  computeCategorySeoScore,
} from "@/lib/category-seo-score";
import type {
  CategoryListFilters,
  CategoryModuleSettings,
  CategoryWizardPayload,
} from "@/lib/category-types";
import { buildCategoryTree, flattenCategoryTree, type TaxonomyCategory } from "@/lib/taxonomy";
import { hasPermission } from "@/lib/permissions";

type SectionRow = Database["public"]["Tables"]["sections"]["Row"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "category-" + Math.random().toString(36).slice(2, 8);

const checkAuth = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized — please sign in again.");
  return user;
};

const requireCategoryPermission = async () => {
  const user = await checkAuth();
  const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error) throw toAppError(error);
  const roleList = (roles ?? []).map((r) => r.role);
  if (!hasPermission(roleList, "categories:manage")) {
    throw new Error("Forbidden — missing categories:manage permission.");
  }
  return { user, roles: roleList };
};

const writeCategoryActivity = async (entry: {
  section_id?: string | null;
  actor_id: string;
  action: string;
  details?: string | null;
  payload?: Record<string, unknown>;
}) => {
  const { error } = await supabase.from("category_activity_logs").insert({
    section_id: entry.section_id ?? null,
    actor_id: entry.actor_id,
    action: entry.action,
    details: entry.details ?? null,
    payload: (entry.payload ?? {}) as Json,
  });
  if (error && !/category_activity_logs|schema cache|PGRST/i.test(error.message)) {
    console.error("Category activity log failed", error);
  }
};

const SECTION_SELECT = "*, articles(count)";

function sectionToPayload(data: CategoryWizardPayload, userId?: string) {
  const visibility = data.publish === false || data.visibility === "hidden" ? "hidden" : "public";
  const seo_score = computeCategorySeoScore(data);
  const ai_score = computeCategoryAiScore(data);
  return {
    name: data.name.trim(),
    slug: data.slug?.trim() || slugify(data.name),
    parent_id: data.parent_id || null,
    category_type: data.category_type || "standard",
    short_description: data.short_description?.trim() || null,
    description: data.description?.trim() || null,
    icon_url: data.icon_url?.trim() || null,
    cover_image_url: data.cover_image_url?.trim() || null,
    visibility,
    featured: Boolean(data.featured),
    color: data.color || null,
    sort_order: data.sort_order ?? 0,
    seo_title: data.seo_title?.trim() || null,
    meta_description: data.meta_description?.trim() || null,
    focus_keywords: data.focus_keywords?.filter(Boolean) ?? [],
    canonical_url: data.canonical_url?.trim() || null,
    og_title: data.og_title?.trim() || null,
    og_description: data.og_description?.trim() || null,
    twitter_title: data.twitter_title?.trim() || null,
    twitter_description: data.twitter_description?.trim() || null,
    seo_score,
    ai_summary: data.ai_summary?.trim() || null,
    topic_cluster: data.topic_cluster?.trim() || null,
    search_intent: data.search_intent?.trim() || null,
    semantic_keywords: data.semantic_keywords?.filter(Boolean) ?? [],
    entities: (data.entities ?? []) as Json,
    ai_score,
    news_eligible: Boolean(data.news_eligible),
    news_sitemap: Boolean(data.news_sitemap),
    news_priority: data.news_priority ?? 5,
    breaking_news: Boolean(data.breaking_news),
    schema_type: data.schema_type || "CollectionPage",
    language: data.language || "en",
    region: data.region?.trim() || null,
    country: data.country?.trim() || null,
    default_author_id: data.default_author_id || null,
    access_mode: data.access_mode || "public",
    discover_eligible: Boolean(data.discover_eligible),
    ...(userId && !data.id ? { created_by: userId } : {}),
  };
}

function rowArticleCount(row: { articles?: Array<{ count: number }> | null }) {
  return row.articles?.[0]?.count ?? 0;
}

function computeLevel(categories: TaxonomyCategory[], id: string): number {
  const byId = new Map(categories.map((c) => [c.id, c]));
  let level = 0;
  let cursor = byId.get(id)?.parent_id ?? null;
  while (cursor && level < 20) {
    level += 1;
    cursor = byId.get(cursor)?.parent_id ?? null;
  }
  return level;
}

export const listCategories = async () => {
  await requireCategoryPermission();
  const { data, error } = await supabase
    .from("sections")
    .select("*, articles(count)")
    .order("sort_order")
    .order("name");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getCategoriesDashboard = async () => {
  await requireCategoryPermission();
  const { data: sections, error } = await supabase
    .from("sections")
    .select("*, articles(count)")
    .order("sort_order")
    .order("name");
  if (error) throw toAppError(error);
  const rows = sections ?? [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const total = rows.length;
  const active = rows.filter((r) => r.visibility === "public").length;
  const hidden = rows.filter((r) => r.visibility === "hidden").length;
  const featured = rows.filter((r) => r.featured).length;
  const newsEligible = rows.filter((r) => r.news_eligible).length;
  const discoverEligible = rows.filter((r) => r.discover_eligible).length;
  const articleTotal = rows.reduce((sum, r) => sum + rowArticleCount(r), 0);
  const seoScores = rows.map((r) => r.seo_score ?? 0).filter((s) => s > 0);
  const aiScores = rows.map((r) => r.ai_score ?? 0).filter((s) => s > 0);
  const avgSeo = seoScores.length
    ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length)
    : 0;
  const avgAi = aiScores.length
    ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length)
    : 0;

  const thisMonth = rows.filter((r) => new Date(r.created_at) >= monthStart).length;
  const lastMonth = rows.filter((r) => {
    const d = new Date(r.created_at);
    return d >= prevMonthStart && d < monthStart;
  }).length;
  const growthPct =
    lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  const topPerforming = [...rows]
    .sort((a, b) => rowArticleCount(b) - rowArticleCount(a))
    .slice(0, 8)
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      articles: rowArticleCount(r),
      views: null as number | null,
      seoScore: r.seo_score ?? 0,
    }));

  const trafficByCategory = topPerforming
    .filter((r) => r.articles > 0)
    .map((r) => ({ label: r.name, value: r.articles }));

  const seoBuckets = [
    { label: "90–100", value: rows.filter((r) => (r.seo_score ?? 0) >= 90).length },
    { label: "70–89", value: rows.filter((r) => (r.seo_score ?? 0) >= 70 && (r.seo_score ?? 0) < 90).length },
    { label: "50–69", value: rows.filter((r) => (r.seo_score ?? 0) >= 50 && (r.seo_score ?? 0) < 70).length },
    { label: "0–49", value: rows.filter((r) => (r.seo_score ?? 0) < 50).length },
  ];

  const growthTrend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const count = rows.filter((r) => {
      const created = new Date(r.created_at);
      return created >= d && created < next;
    }).length;
    return { label: d.toLocaleString(undefined, { month: "short" }), value: count };
  });

  return {
    kpis: {
      total,
      active,
      hidden,
      featured,
      articleTotal,
      totalViews: null as number | null,
      googleIndexed: null as number | null,
      newsEligible,
      discoverEligible,
      avgSeo,
      avgAi,
      growthPct,
    },
    topPerforming,
    trafficByCategory,
    seoBuckets,
    growthTrend,
  };
};

export const listCategoriesTable = async ({ data }: { data: CategoryListFilters }) => {
  await requireCategoryPermission();
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 20;
  const { data: sections, error } = await supabase
    .from("sections")
    .select("*, articles(count)")
    .order("sort_order")
    .order("name");
  if (error) throw toAppError(error);
  const rows = sections ?? [];
  const flat = flattenCategoryTree(buildCategoryTree(rows as TaxonomyCategory[]));
  const parentName = new Map(rows.map((r) => [r.id, r.name]));

  let enriched = flat.map((r) => ({
    ...r,
    parentName: r.parent_id ? parentName.get(r.parent_id) ?? "—" : "—",
    level: computeLevel(rows as TaxonomyCategory[], r.id),
    articles: rowArticleCount(r),
    views: null as number | null,
    indexed: r.visibility === "public" && rowArticleCount(r) > 0,
  }));

  if (data.search?.trim()) {
    const q = data.search.trim().toLowerCase();
    enriched = enriched.filter(
      (r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
    );
  }
  if (data.parent_id) enriched = enriched.filter((r) => r.parent_id === data.parent_id);
  if (data.status === "active") enriched = enriched.filter((r) => r.visibility === "public");
  if (data.status === "hidden") enriched = enriched.filter((r) => r.visibility === "hidden");
  if (data.news_eligible === true) enriched = enriched.filter((r) => r.news_eligible);
  if (data.discover_eligible === true) enriched = enriched.filter((r) => r.discover_eligible);
  if (data.language) enriched = enriched.filter((r) => r.language === data.language);
  if (data.country) enriched = enriched.filter((r) => r.country === data.country);
  if (data.seo_min != null) enriched = enriched.filter((r) => (r.seo_score ?? 0) >= data.seo_min!);

  const dir = data.sortDir === "desc" ? -1 : 1;
  enriched.sort((a, b) => {
    switch (data.sort) {
      case "articles":
        return (a.articles - b.articles) * dir;
      case "seo":
        return ((a.seo_score ?? 0) - (b.seo_score ?? 0)) * dir;
      case "updated":
        return (
          (new Date(a.updated_at ?? a.created_at ?? 0).getTime() -
            new Date(b.updated_at ?? b.created_at ?? 0).getTime()) *
          dir
        );
      default:
        return a.name.localeCompare(b.name) * dir;
    }
  });

  const total = enriched.length;
  const start = (page - 1) * pageSize;
  return {
    items: enriched.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
  };
};

export const getCategoryDetail = async ({ data }: { data: { id: string } }) => {
  await requireCategoryPermission();
  const { data: row, error } = await supabase
    .from("sections")
    .select(SECTION_SELECT)
    .eq("id", data.id)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!row) throw new Error("Category not found.");

  const parent = row.parent_id
    ? await supabase.from("sections").select("id, name, slug").eq("id", row.parent_id).maybeSingle()
    : { data: null };

  const { count: published } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("section_id", data.id)
    .eq("status", "published");
  const { count: drafts } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("section_id", data.id)
    .eq("status", "draft");

  const { data: topAuthors } = await supabase
    .from("articles")
    .select("author_id, profiles(name)")
    .eq("section_id", data.id)
    .not("author_id", "is", null)
    .limit(50);

  const authorCounts = new Map<string, { name: string; count: number }>();
  for (const a of topAuthors ?? []) {
    const aid = a.author_id!;
    const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
    const name = profile?.name ?? "Staff";
    const prev = authorCounts.get(aid);
    authorCounts.set(aid, { name, count: (prev?.count ?? 0) + 1 });
  }

  return {
    category: row,
    parent: parent.data,
    stats: {
      totalArticles: rowArticleCount(row),
      publishedArticles: published ?? 0,
      draftArticles: drafts ?? 0,
      totalViews: null as number | null,
      seoScore: row.seo_score ?? 0,
      aiScore: row.ai_score ?? 0,
    },
    topKeywords: (row.focus_keywords ?? []).slice(0, 8).map((k) => ({
      keyword: k,
      clicks: null as number | null,
      ctr: null as number | null,
    })),
    topAuthors: [...authorCounts.values()].sort((a, b) => b.count - a.count).slice(0, 6),
  };
};

export const upsertCategory = async ({ data }: { data: CategoryWizardPayload }) => {
  const { user } = await requireCategoryPermission();
  if (data.id && data.parent_id === data.id) throw new Error("A category cannot be its own parent.");
  if (!data.name.trim()) throw new Error("Category name is required.");
  const payload = sectionToPayload(data, user.id);
  const result = data.id
    ? await supabase.from("sections").update(payload).eq("id", data.id).select("*").single()
    : await supabase.from("sections").insert(payload).select("*").single();
  if (result.error) throw toAppError(result.error);
  await writeCategoryActivity({
    section_id: result.data.id,
    actor_id: user.id,
    action: data.id ? "category.update" : "category.create",
    details: `${payload.name} (${payload.slug})`,
  });
  return result.data;
};

export const duplicateCategory = async ({ data }: { data: { id: string } }) => {
  const { user } = await requireCategoryPermission();
  const { data: row, error } = await supabase.from("sections").select("*").eq("id", data.id).single();
  if (error) throw toAppError(error);
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = row;
  const { data: created, error: insertError } = await supabase
    .from("sections")
    .insert({
      ...rest,
      name: `${row.name} (Copy)`,
      slug: slugify(`${row.slug}-copy-${Date.now().toString(36).slice(-4)}`),
      featured: false,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (insertError) throw toAppError(insertError);
  await writeCategoryActivity({
    section_id: created.id,
    actor_id: user.id,
    action: "category.duplicate",
    details: `Duplicated from ${row.name}`,
  });
  return created;
};

export const archiveCategory = async ({ data }: { data: { id: string } }) => {
  const { user } = await requireCategoryPermission();
  const { data: updated, error } = await supabase
    .from("sections")
    .update({ visibility: "hidden", featured: false })
    .eq("id", data.id)
    .select("*")
    .single();
  if (error) throw toAppError(error);
  await writeCategoryActivity({
    section_id: data.id,
    actor_id: user.id,
    action: "category.archive",
    details: updated.name,
  });
  return updated;
};

export const deleteCategory = async ({ data }: { data: { id: string } }) => {
  const { user } = await requireCategoryPermission();
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
  if (childCount) throw new Error("Move or delete nested categories before deleting this parent.");
  const { error } = await supabase.from("sections").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  await writeCategoryActivity({
    section_id: data.id,
    actor_id: user.id,
    action: "category.delete",
    details: "Category removed",
  });
  return { ok: true };
};

export const reorderCategories = async ({
  data,
}: {
  data: { items: Array<{ id: string; parent_id: string | null; sort_order: number }> };
}) => {
  await requireCategoryPermission();
  if (!data.items.length) return { affected: 0 };
  const { data: affected, error } = await supabase.rpc("admin_reorder_categories", {
    p_items: data.items,
  });
  if (error) {
    if (/admin_reorder_categories|schema cache|PGRST202/i.test(error.message)) {
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

export const listCategoryArticles = async ({
  data,
}: {
  data: {
    section_id: string;
    status?: string | null;
    page?: number;
    pageSize?: number;
  };
}) => {
  await requireCategoryPermission();
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 20;
  let query = supabase
    .from("articles")
    .select("id, title, slug, status, published_at, profiles(name)", { count: "exact" })
    .eq("section_id", data.section_id)
    .order("published_at", { ascending: false, nullsFirst: false });
  if (data.status) query = query.eq("status", data.status as Database["public"]["Enums"]["article_status"]);
  const from = (page - 1) * pageSize;
  const { data: rows, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw toAppError(error);
  return {
    items: (rows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      status: r.status,
      published_at: r.published_at,
      authorName: (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles)?.name ?? "—",
      views: null as number | null,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
};

export const getCategoryAnalytics = async ({ data }: { data: { id: string } }) => {
  const detail = await getCategoryDetail({ data: { id: data.id } });
  const { data: articles } = await supabase
    .from("articles")
    .select("published_at, status, created_at")
    .eq("section_id", data.id);
  const byMonth = new Map<string, number>();
  for (const a of articles ?? []) {
    const d = a.published_at ?? a.created_at;
    if (!d) continue;
    byMonth.set(d.slice(0, 7), (byMonth.get(d.slice(0, 7)) ?? 0) + 1);
  }
  return {
    metrics: {
      totalViews: null as number | null,
      sessions: null as number | null,
      avgTime: null as number | null,
      bounceRate: null as number | null,
      ctr: null as number | null,
      articles: detail.stats.totalArticles,
    },
    viewsOverTime: [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([label, value]) => ({ label, value })),
    statusBreakdown: [
      { label: "Published", value: detail.stats.publishedArticles },
      { label: "Draft", value: detail.stats.draftArticles },
    ],
    trafficSources: [] as Array<{ label: string; value: number }>,
    topCountries: [] as Array<{ label: string; value: number }>,
    devices: [] as Array<{ label: string; value: number }>,
    searchImpressions: [] as Array<{ label: string; value: number }>,
    topKeywords: detail.topKeywords,
    topArticles: [] as Array<{ id: string; title: string; views: number | null }>,
  };
};

export const getCategoryModuleSettings = async () => {
  await requireCategoryPermission();
  const { data, error } = await supabase
    .from("category_module_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error && !/category_module_settings|schema cache|PGRST/i.test(error.message)) {
    throw toAppError(error);
  }
  return (data ?? {
    general: {},
    seo_defaults: {},
    social: {},
    permissions: {},
    notifications: {},
    advanced: {},
  }) as CategoryModuleSettings & { updated_at?: string };
};

export const updateCategoryModuleSettings = async ({
  data,
}: {
  data: Partial<CategoryModuleSettings>;
}) => {
  const { user } = await requireCategoryPermission();
  const { error } = await supabase.from("category_module_settings").upsert({
    id: true,
    general: (data.general ?? {}) as Json,
    seo_defaults: (data.seo_defaults ?? {}) as Json,
    social: (data.social ?? {}) as Json,
    permissions: (data.permissions ?? {}) as Json,
    notifications: (data.notifications ?? {}) as Json,
    advanced: (data.advanced ?? {}) as Json,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw toAppError(error);
  await writeCategoryActivity({
    actor_id: user.id,
    action: "category.settings.update",
    details: "Module settings updated",
  });
  return { ok: true };
};

export const listCategoryActivity = async ({
  data,
}: {
  data?: { section_id?: string; action?: string; page?: number; pageSize?: number };
}) => {
  await requireCategoryPermission();
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 30;
  let query = supabase
    .from("category_activity_logs")
    .select("*, profiles(name, email), sections(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (data?.section_id) query = query.eq("section_id", data.section_id);
  if (data?.action) query = query.eq("action", data.action);
  const from = (page - 1) * pageSize;
  const { data: rows, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw toAppError(error);
  return { items: rows ?? [], total: count ?? 0, page, pageSize };
};

export const exportCategories = async ({ data }: { data: { format: "csv" | "json" } }) => {
  await requireCategoryPermission();
  const { data: rows, error } = await supabase.from("sections").select("*").order("name");
  if (error) throw toAppError(error);
  if (data.format === "json") {
    return {
      content: JSON.stringify(rows ?? [], null, 2),
      mime: "application/json",
      filename: "categories.json",
    };
  }
  const headers = ["id", "name", "slug", "parent_id", "visibility", "featured", "description"];
  const lines = [
    headers.join(","),
    ...(rows ?? []).map((r) =>
      headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ];
  return { content: lines.join("\n"), mime: "text/csv", filename: "categories.csv" };
};

export const importCategories = async ({
  data,
}: {
  data: {
    format: "csv" | "json";
    content: string;
    updateExisting?: boolean;
    skipExisting?: boolean;
    validateOnly?: boolean;
  };
}) => {
  const { user } = await requireCategoryPermission();
  let records: Array<Record<string, unknown>> = [];
  if (data.format === "json") {
    records = JSON.parse(data.content) as Array<Record<string, unknown>>;
  } else {
    const lines = data.content.trim().split(/\r?\n/);
    const headers = lines[0]?.split(",").map((h) => h.replace(/^"|"$/g, "")) ?? [];
    records = lines.slice(1).map((line) => {
      const cols =
        line.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"')) ?? [];
      const row: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] ?? "";
      });
      return row;
    });
  }
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const rec of records) {
    const name = String(rec.name ?? "").trim();
    const slug = String(rec.slug ?? slugify(name)).trim();
    if (!name) {
      errors.push("Skipped row missing name");
      continue;
    }
    const { data: existing } = await supabase.from("sections").select("id").eq("slug", slug).maybeSingle();
    if (existing && data.skipExisting) {
      skipped += 1;
      continue;
    }
    if (data.validateOnly) {
      imported += 1;
      continue;
    }
    const payload = {
      name,
      slug,
      description: String(rec.description ?? "") || null,
      parent_id: (rec.parent_id as string) || null,
      visibility: rec.visibility === "hidden" ? "hidden" : "public",
    };
    const result =
      existing && data.updateExisting
        ? await supabase.from("sections").update(payload).eq("id", existing.id)
        : existing
          ? null
          : await supabase.from("sections").insert(payload);
    if (result === null) skipped += 1;
    else if (result.error) errors.push(`${slug}: ${result.error.message}`);
    else imported += 1;
  }
  if (!data.validateOnly) {
    await writeCategoryActivity({
      actor_id: user.id,
      action: "category.import",
      details: `Imported ${imported}, skipped ${skipped}`,
    });
  }
  return { imported, skipped, errors, validateOnly: Boolean(data.validateOnly) };
};

export const bulkArchiveCategories = async ({ data }: { data: { ids: string[] } }) => {
  const { user } = await requireCategoryPermission();
  for (const id of data.ids) {
    await supabase.from("sections").update({ visibility: "hidden", featured: false }).eq("id", id);
  }
  await writeCategoryActivity({
    actor_id: user.id,
    action: "category.bulk_archive",
    details: `${data.ids.length} categories archived`,
  });
  return { ok: true };
};

export const getCategoriesLibraryCounts = async () => {
  await requireCategoryPermission();
  const { data: rows, error } = await supabase.from("sections").select("visibility, featured");
  if (error) throw toAppError(error);
  const list = rows ?? [];
  return {
    all: list.length,
    active: list.filter((r) => r.visibility === "public").length,
    hidden: list.filter((r) => r.visibility === "hidden").length,
    featured: list.filter((r) => r.featured).length,
  };
};

export function rowToWizardPayload(row: SectionRow): CategoryWizardPayload {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent_id: row.parent_id,
    category_type: row.category_type ?? "standard",
    short_description: row.short_description ?? "",
    description: row.description ?? "",
    icon_url: row.icon_url ?? "",
    cover_image_url: row.cover_image_url ?? "",
    visibility: row.visibility === "hidden" ? "hidden" : "public",
    featured: row.featured,
    color: row.color,
    sort_order: row.sort_order,
    seo_title: row.seo_title ?? "",
    meta_description: row.meta_description ?? "",
    focus_keywords: row.focus_keywords ?? [],
    canonical_url: row.canonical_url ?? "",
    og_title: row.og_title ?? "",
    og_description: row.og_description ?? "",
    twitter_title: row.twitter_title ?? "",
    twitter_description: row.twitter_description ?? "",
    ai_summary: row.ai_summary ?? "",
    topic_cluster: row.topic_cluster ?? "",
    search_intent: row.search_intent ?? "",
    semantic_keywords: row.semantic_keywords ?? [],
    entities: Array.isArray(row.entities) ? row.entities : [],
    news_eligible: row.news_eligible,
    news_sitemap: row.news_sitemap,
    news_priority: row.news_priority ?? 5,
    breaking_news: row.breaking_news,
    schema_type: row.schema_type ?? "CollectionPage",
    language: row.language ?? "en",
    region: row.region ?? "",
    country: row.country ?? "",
    default_author_id: row.default_author_id,
    access_mode: row.access_mode ?? "public",
    discover_eligible: row.discover_eligible,
  };
}
