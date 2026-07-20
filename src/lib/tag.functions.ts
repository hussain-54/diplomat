import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { toAppError } from "@/lib/db-errors";
import { hasPermission } from "@/lib/permissions";
import { computeTagSeoScore } from "@/lib/tag-seo-score";
import type { TagListFilters, TagWizardPayload } from "@/lib/tag-types";

type TagRow = Database["public"]["Tables"]["tags"]["Row"];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "tag-" + Math.random().toString(36).slice(2, 8);

const checkAuth = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized — please sign in again.");
  return user;
};

const requireTagPermission = async () => {
  const user = await checkAuth();
  const { data: roles, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
  if (error) throw toAppError(error);
  const roleList = (roles ?? []).map((r) => r.role);
  if (!hasPermission(roleList, "tags:manage")) {
    throw new Error("Forbidden — missing tags:manage permission.");
  }
  return { user, roles: roleList };
};

const writeTagActivity = async (entry: {
  tag_id?: string | null;
  actor_id: string;
  action: string;
  details?: string | null;
  payload?: Record<string, unknown>;
}) => {
  const { error } = await supabase.from("tag_activity_logs").insert({
    tag_id: entry.tag_id ?? null,
    actor_id: entry.actor_id,
    action: entry.action,
    details: entry.details ?? null,
    payload: (entry.payload ?? {}) as Json,
  });
  if (error && !/tag_activity_logs|schema cache|PGRST/i.test(error.message)) {
    console.error("Tag activity log failed", error);
  }
};

const TAG_SELECT = "*, article_tags(count)";

function tagToPayload(data: TagWizardPayload, userId?: string) {
  const status = data.status ?? "draft";
  const seo_score = computeTagSeoScore(data);
  return {
    name: data.name.trim(),
    slug: data.slug?.trim() || slugify(data.name),
    parent_id: data.parent_id || null,
    description: data.description?.trim() || null,
    seo_title: data.seo_title?.trim() || null,
    meta_description: data.meta_description?.trim() || null,
    focus_keyword: data.focus_keyword?.trim() || null,
    language: data.language || "en",
    country: data.country?.trim() || null,
    cover_image_url: data.cover_image_url?.trim() || null,
    icon_name: data.icon_name?.trim() || null,
    icon_url: data.icon_url?.trim() || null,
    status,
    scheduled_at: status === "scheduled" ? data.scheduled_at || null : null,
    seo_score,
    ai_optimized: Boolean(data.ai_optimized),
    discover_eligible: Boolean(data.discover_eligible),
    ...(userId && !data.id ? { created_by: userId } : {}),
  };
}

function rowArticleCount(row: { article_tags?: Array<{ count: number }> | null }) {
  return row.article_tags?.[0]?.count ?? 0;
}

export const listTagsAdmin = async () => {
  await requireTagPermission();
  const { data, error } = await supabase.from("tags").select(TAG_SELECT).order("name");
  if (error) throw toAppError(error);
  return data ?? [];
};

export const getTagsDashboard = async () => {
  await requireTagPermission();
  const { data: tags, error } = await supabase.from("tags").select(TAG_SELECT).order("name");
  if (error) throw toAppError(error);
  const rows = tags ?? [];

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const total = rows.length;
  const published = rows.filter((r) => r.status === "published").length;
  const articleTotal = rows.reduce((sum, r) => sum + rowArticleCount(r), 0);
  const seoScores = rows.map((r) => r.seo_score ?? 0);
  const avgSeo = seoScores.length
    ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length)
    : 0;
  const seoOptimizedPct =
    total === 0 ? 0 : Math.round((rows.filter((r) => (r.seo_score ?? 0) >= 70).length / total) * 100);

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

  const { data: recentLinks } = await supabase
    .from("article_tags")
    .select("tag_id, articles!inner(published_at, status)")
    .eq("articles.status", "published")
    .gte("articles.published_at", weekAgo.toISOString());

  const trendCounts = new Map<string, number>();
  for (const link of recentLinks ?? []) {
    trendCounts.set(link.tag_id, (trendCounts.get(link.tag_id) ?? 0) + 1);
  }
  const trending = [...trendCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => {
      const tag = rows.find((r) => r.id === id);
      const totalArts = tag ? rowArticleCount(tag) : count;
      const growth = totalArts > 0 ? Math.round((count / totalArts) * 100) : 100;
      return {
        id,
        name: tag?.name ?? "Unknown",
        slug: tag?.slug ?? "",
        growthPct: growth,
        weekArticles: count,
      };
    });

  const seoBuckets = [
    { label: "Excellent", value: rows.filter((r) => (r.seo_score ?? 0) >= 90).length },
    { label: "Good", value: rows.filter((r) => (r.seo_score ?? 0) >= 70 && (r.seo_score ?? 0) < 90).length },
    { label: "Average", value: rows.filter((r) => (r.seo_score ?? 0) >= 50 && (r.seo_score ?? 0) < 70).length },
    { label: "Poor", value: rows.filter((r) => (r.seo_score ?? 0) < 50).length },
  ];

  return {
    kpis: {
      total,
      published,
      trending: trending.length,
      googleIndexed: null as number | null,
      seoOptimizedPct,
      avgSeo,
      articlesUsingTags: articleTotal,
      totalTraffic: null as number | null,
      growthPct,
    },
    topPerforming,
    trending,
    seoBuckets,
  };
};

export const listTagsTable = async ({ data }: { data: TagListFilters }) => {
  await requireTagPermission();
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 20;
  const { data: tags, error } = await supabase.from("tags").select(TAG_SELECT).order("name");
  if (error) throw toAppError(error);
  const rows = tags ?? [];
  const parentName = new Map(rows.map((r) => [r.id, r.name]));

  let enriched = rows.map((r) => ({
    ...r,
    parentName: r.parent_id ? parentName.get(r.parent_id) ?? "—" : "—",
    articles: rowArticleCount(r),
    searchVolume: null as number | null,
    traffic: null as number | null,
  }));

  if (data.search?.trim()) {
    const q = data.search.trim().toLowerCase();
    enriched = enriched.filter(
      (r) => r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
    );
  }
  if (data.status && data.status !== "all") {
    enriched = enriched.filter((r) => r.status === data.status);
  }
  if (data.language) enriched = enriched.filter((r) => r.language === data.language);
  if (data.seo_min != null) enriched = enriched.filter((r) => (r.seo_score ?? 0) >= data.seo_min!);
  if (data.ai_optimized === true) enriched = enriched.filter((r) => r.ai_optimized);
  if (data.ai_optimized === false) enriched = enriched.filter((r) => !r.ai_optimized);
  if (data.date_from) {
    const from = new Date(data.date_from).getTime();
    enriched = enriched.filter((r) => new Date(r.updated_at).getTime() >= from);
  }
  if (data.date_to) {
    const to = new Date(data.date_to).getTime();
    enriched = enriched.filter((r) => new Date(r.updated_at).getTime() <= to);
  }

  const dir = data.sortDir === "desc" ? -1 : 1;
  enriched.sort((a, b) => {
    switch (data.sort) {
      case "articles":
        return (a.articles - b.articles) * dir;
      case "seo":
        return ((a.seo_score ?? 0) - (b.seo_score ?? 0)) * dir;
      case "updated":
        return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
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

export const getTagDetail = async ({ data }: { data: { id: string } }) => {
  await requireTagPermission();
  const { data: row, error } = await supabase
    .from("tags")
    .select(TAG_SELECT)
    .eq("id", data.id)
    .maybeSingle();
  if (error) throw toAppError(error);
  if (!row) throw new Error("Tag not found.");

  const parent = row.parent_id
    ? await supabase.from("tags").select("id, name, slug").eq("id", row.parent_id).maybeSingle()
    : { data: null };

  return {
    tag: row,
    parent: parent.data,
    stats: {
      articles: rowArticleCount(row),
      views: null as number | null,
      traffic: null as number | null,
      searchVolume: null as number | null,
      seoScore: row.seo_score ?? 0,
    },
  };
};

export const upsertTag = async ({ data }: { data: TagWizardPayload }) => {
  const { user } = await requireTagPermission();
  if (data.id && data.parent_id === data.id) throw new Error("A tag cannot be its own parent.");
  if (!data.name.trim()) throw new Error("Tag name is required.");
  const payload = tagToPayload(data, user.id);
  const existing = data.id
    ? await supabase.from("tags").select("status, cover_image_url, seo_title").eq("id", data.id).maybeSingle()
    : { data: null };

  const result = data.id
    ? await supabase.from("tags").update(payload).eq("id", data.id).select("*").single()
    : await supabase.from("tags").insert(payload).select("*").single();
  if (result.error) throw toAppError(result.error);

  const actions: string[] = [data.id ? "tag.updated" : "tag.created"];
  if (data.id && existing.data) {
    if (existing.data.status !== payload.status) actions.push("tag.status_changed");
    if ((existing.data.cover_image_url ?? "") !== (payload.cover_image_url ?? "")) {
      actions.push("tag.image_updated");
    }
    if (
      (existing.data.seo_title ?? "") !== (payload.seo_title ?? "") ||
      payload.seo_score !== (existing.data as { seo_score?: number }).seo_score
    ) {
      actions.push("tag.seo_updated");
    }
  }

  for (const action of actions) {
    await writeTagActivity({
      tag_id: result.data.id,
      actor_id: user.id,
      action,
      details: `${payload.name} (${payload.slug})`,
    });
  }
  return result.data;
};

export const deleteTag = async ({ data }: { data: { id: string } }) => {
  const { user } = await requireTagPermission();
  const { count, error: countError } = await supabase
    .from("article_tags")
    .select("article_id", { count: "exact", head: true })
    .eq("tag_id", data.id);
  if (countError) throw toAppError(countError);
  if (count) throw new Error("Remove this tag from articles before deleting it.");

  const { count: childCount, error: childError } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", data.id);
  if (childError) throw toAppError(childError);
  if (childCount) throw new Error("Reassign or delete child tags before deleting this parent.");

  const { error } = await supabase.from("tags").delete().eq("id", data.id);
  if (error) throw toAppError(error);
  await writeTagActivity({
    tag_id: data.id,
    actor_id: user.id,
    action: "tag.deleted",
    details: "Tag removed",
  });
  return { ok: true };
};

export const getTagArticles = async ({
  data,
}: {
  data: { tag_id: string; page?: number; pageSize?: number };
}) => {
  await requireTagPermission();
  const page = data.page ?? 1;
  const pageSize = data.pageSize ?? 20;
  const { data: links, error } = await supabase
    .from("article_tags")
    .select("article_id, articles(id, title, slug, status, published_at, hero_image_url)")
    .eq("tag_id", data.tag_id);
  if (error) throw toAppError(error);

  const items = (links ?? [])
    .map((l) => (Array.isArray(l.articles) ? l.articles[0] : l.articles))
    .filter(Boolean)
    .map((a) => ({
      id: a!.id,
      title: a!.title,
      slug: a!.slug,
      status: a!.status,
      published_at: a!.published_at,
      hero_image_url: a!.hero_image_url,
      views: null as number | null,
    }))
    .sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : 0;
      const tb = b.published_at ? new Date(b.published_at).getTime() : 0;
      return tb - ta;
    });

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize };
};

export const getTagAnalytics = async ({ data }: { data: { id: string } }) => {
  const detail = await getTagDetail({ data: { id: data.id } });
  const articles = await getTagArticles({ data: { tag_id: data.id, pageSize: 100 } });
  const byMonth = new Map<string, number>();
  for (const a of articles.items) {
    if (!a.published_at) continue;
    byMonth.set(a.published_at.slice(0, 7), (byMonth.get(a.published_at.slice(0, 7)) ?? 0) + 1);
  }
  return {
    metrics: {
      totalTraffic: null as number | null,
      searchVolume: null as number | null,
      impressions: null as number | null,
      clicks: null as number | null,
      ctr: null as number | null,
      avgPosition: null as number | null,
      articles: detail.stats.articles,
      seoScore: detail.stats.seoScore,
    },
    trafficOverTime: [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([label, value]) => ({ label, value })),
    searchTrend: [] as Array<{ label: string; value: number }>,
    engagementTrend: [] as Array<{ label: string; value: number }>,
    countryBreakdown: [] as Array<{ label: string; value: number }>,
    topArticles: articles.items.slice(0, 8),
  };
};

export const getTagsModuleAnalytics = async () => {
  const dash = await getTagsDashboard();
  return {
    metrics: {
      totalTraffic: null as number | null,
      searchVolume: null as number | null,
      impressions: null as number | null,
      clicks: null as number | null,
      ctr: null as number | null,
      avgPosition: null as number | null,
      totalTags: dash.kpis.total,
      articles: dash.kpis.articlesUsingTags,
    },
    trafficOverTime: [] as Array<{ label: string; value: number }>,
    searchTrend: [] as Array<{ label: string; value: number }>,
    engagementTrend: [] as Array<{ label: string; value: number }>,
    countryBreakdown: [] as Array<{ label: string; value: number }>,
    topPerforming: dash.topPerforming,
    seoBuckets: dash.seoBuckets,
  };
};

export const listTrendingTags = async () => {
  const dash = await getTagsDashboard();
  return { items: dash.trending, weekLabel: "This week" };
};

export const listSeoTagsQueue = async () => {
  await requireTagPermission();
  const { data: tags, error } = await supabase.from("tags").select(TAG_SELECT).order("seo_score");
  if (error) throw toAppError(error);
  const rows = tags ?? [];

  const missingMetadata = rows.filter(
    (r) => !r.seo_title || !r.meta_description || !r.focus_keyword,
  );
  const lowPerforming = rows.filter((r) => (r.seo_score ?? 0) < 50);
  const discoverEligible = rows.filter((r) => r.discover_eligible);

  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      seoScore: r.seo_score ?? 0,
      missingTitle: !r.seo_title,
      missingMeta: !r.meta_description,
      missingKeyword: !r.focus_keyword,
      aiOptimized: r.ai_optimized,
      discoverEligible: r.discover_eligible,
      articles: rowArticleCount(r),
      status: r.status,
    })),
    summary: {
      missingMetadata: missingMetadata.length,
      lowPerforming: lowPerforming.length,
      discoverEligible: discoverEligible.length,
      avgSeo: rows.length
        ? Math.round(rows.reduce((s, r) => s + (r.seo_score ?? 0), 0) / rows.length)
        : 0,
    },
  };
};

export const optimizeTagSeo = async ({ data }: { data: { id: string } }) => {
  const { user } = await requireTagPermission();
  const { data: row, error } = await supabase.from("tags").select("*").eq("id", data.id).single();
  if (error) throw toAppError(error);

  const seo_title = row.seo_title || `${row.name} | Diplomacy Lens`;
  const meta_description =
    row.meta_description ||
    (row.description
      ? row.description.slice(0, 155)
      : `Explore news and analysis tagged ${row.name} on Diplomacy Lens.`);
  const focus_keyword = row.focus_keyword || row.name.toLowerCase();
  const seo_score = computeTagSeoScore({
    name: row.name,
    slug: row.slug,
    seo_title,
    meta_description,
    focus_keyword,
    description: row.description,
  });

  const { data: updated, error: updateError } = await supabase
    .from("tags")
    .update({
      seo_title,
      meta_description,
      focus_keyword,
      seo_score,
      ai_optimized: true,
    })
    .eq("id", data.id)
    .select("*")
    .single();
  if (updateError) throw toAppError(updateError);

  await writeTagActivity({
    tag_id: data.id,
    actor_id: user.id,
    action: "tag.seo_updated",
    details: `Optimized SEO for ${row.name}`,
  });
  return updated;
};

export const listTagActivity = async ({
  data,
}: {
  data?: { tag_id?: string; action?: string; page?: number; pageSize?: number };
}) => {
  await requireTagPermission();
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 30;
  let query = supabase
    .from("tag_activity_logs")
    .select("*, profiles(name, email), tags(name, slug)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (data?.tag_id) query = query.eq("tag_id", data.tag_id);
  if (data?.action) query = query.eq("action", data.action);
  const from = (page - 1) * pageSize;
  const { data: rows, count, error } = await query.range(from, from + pageSize - 1);
  if (error) throw toAppError(error);
  return { items: rows ?? [], total: count ?? 0, page, pageSize };
};

export const exportTags = async ({ data }: { data: { format: "csv" | "json" | "excel" } }) => {
  await requireTagPermission();
  const { data: rows, error } = await supabase.from("tags").select("*").order("name");
  if (error) throw toAppError(error);
  if (data.format === "json") {
    return {
      content: JSON.stringify(rows ?? [], null, 2),
      mime: "application/json",
      filename: "tags.json",
    };
  }
  const headers = [
    "id",
    "name",
    "slug",
    "parent_id",
    "status",
    "description",
    "seo_title",
    "meta_description",
    "focus_keyword",
    "language",
    "country",
  ];
  const lines = [
    headers.join(","),
    ...(rows ?? []).map((r) =>
      headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ];
  return {
    content: lines.join("\n"),
    mime: data.format === "excel" ? "text/csv" : "text/csv",
    filename: data.format === "excel" ? "tags.xls.csv" : "tags.csv",
  };
};

export const importTags = async ({
  data,
}: {
  data: {
    format: "csv" | "json" | "excel";
    content: string;
    updateExisting?: boolean;
    skipExisting?: boolean;
    validateOnly?: boolean;
  };
}) => {
  const { user } = await requireTagPermission();
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
    const { data: existing } = await supabase.from("tags").select("id").eq("slug", slug).maybeSingle();
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
      status: ["draft", "published", "scheduled"].includes(String(rec.status))
        ? String(rec.status)
        : "published",
      seo_title: String(rec.seo_title ?? "") || null,
      meta_description: String(rec.meta_description ?? "") || null,
      focus_keyword: String(rec.focus_keyword ?? "") || null,
      language: String(rec.language ?? "en") || "en",
      country: String(rec.country ?? "") || null,
      seo_score: computeTagSeoScore({
        name,
        slug,
        seo_title: String(rec.seo_title ?? ""),
        meta_description: String(rec.meta_description ?? ""),
        focus_keyword: String(rec.focus_keyword ?? ""),
        description: String(rec.description ?? ""),
      }),
    };
    const result =
      existing && data.updateExisting
        ? await supabase.from("tags").update(payload).eq("id", existing.id)
        : existing
          ? null
          : await supabase.from("tags").insert(payload);
    if (result === null) skipped += 1;
    else if (result.error) errors.push(`${slug}: ${result.error.message}`);
    else imported += 1;
  }

  if (!data.validateOnly) {
    await writeTagActivity({
      actor_id: user.id,
      action: "tag.import",
      details: `Imported ${imported}, skipped ${skipped}`,
    });
  }
  return { imported, skipped, errors, validateOnly: Boolean(data.validateOnly) };
};

export const getTagsLibraryCounts = async () => {
  await requireTagPermission();
  const { data: rows, error } = await supabase.from("tags").select("status, seo_score, ai_optimized");
  if (error) throw toAppError(error);
  const list = rows ?? [];
  return {
    all: list.length,
    published: list.filter((r) => r.status === "published").length,
    draft: list.filter((r) => r.status === "draft").length,
    seoReady: list.filter((r) => (r.seo_score ?? 0) >= 70).length,
  };
};

export const getTagsSidebarWidgets = async () => {
  await requireTagPermission();
  const { data: tags, error } = await supabase.from("tags").select(TAG_SELECT).order("name");
  if (error) throw toAppError(error);
  const rows = tags ?? [];
  const byTraffic = [...rows]
    .sort((a, b) => rowArticleCount(b) - rowArticleCount(a))
    .slice(0, 5)
    .map((r) => ({ id: r.id, name: r.name, articles: rowArticleCount(r) }));
  const trending = await listTrendingTags();
  const lowSeo = rows.filter((r) => (r.seo_score ?? 0) < 50).length;
  const missingMeta = rows.filter((r) => !r.meta_description).length;
  return {
    topByTraffic: byTraffic,
    trending: trending.items.slice(0, 5),
    recommendations: [
      lowSeo > 0 ? `${lowSeo} tags score below 50 — improve SEO metadata.` : null,
      missingMeta > 0 ? `${missingMeta} tags missing meta descriptions.` : null,
      rows.filter((r) => !r.focus_keyword).length
        ? `${rows.filter((r) => !r.focus_keyword).length} tags need a focus keyword.`
        : null,
    ].filter(Boolean) as string[],
    quickStats: {
      total: rows.length,
      published: rows.filter((r) => r.status === "published").length,
      avgSeo: rows.length
        ? Math.round(rows.reduce((s, r) => s + (r.seo_score ?? 0), 0) / rows.length)
        : 0,
    },
  };
};

export function rowToTagWizardPayload(row: TagRow): TagWizardPayload {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent_id: row.parent_id,
    description: row.description ?? "",
    seo_title: row.seo_title ?? "",
    meta_description: row.meta_description ?? "",
    focus_keyword: row.focus_keyword ?? "",
    language: row.language ?? "en",
    country: row.country ?? "",
    cover_image_url: row.cover_image_url ?? "",
    icon_name: row.icon_name ?? "",
    icon_url: row.icon_url ?? "",
    status: (row.status as TagWizardPayload["status"]) || "draft",
    scheduled_at: row.scheduled_at,
    ai_optimized: row.ai_optimized,
    discover_eligible: row.discover_eligible,
  };
}
