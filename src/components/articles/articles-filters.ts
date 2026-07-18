import type { Database } from "@/integrations/supabase/types";

export type ArticleStatus = Database["public"]["Enums"]["article_status"];
export type SchemaType = "NewsArticle" | "Article" | "Review" | "Report";

export type ArticlesFilterState = {
  search: string;
  author: string;
  category: string;
  tag: string;
  status: "all" | ArticleStatus;
  language: string;
  contentType: "all" | SchemaType;
  dateFrom: string;
  dateTo: string;
  seoScore: "all" | "weak" | "fair" | "strong";
  viewsMin: string;
  viewsMax: string;
};

export type ArticlesFilterPreset = {
  id: string;
  name: string;
  builtin?: boolean;
  filters: ArticlesFilterState;
};

export const DEFAULT_ARTICLES_FILTERS: ArticlesFilterState = {
  search: "",
  author: "all",
  category: "all",
  tag: "all",
  status: "all",
  language: "all",
  contentType: "all",
  dateFrom: "",
  dateTo: "",
  seoScore: "all",
  viewsMin: "",
  viewsMax: "",
};

export const ARTICLE_LANGUAGES = [
  { id: "en", label: "English" },
  { id: "ur", label: "Urdu" },
  { id: "ar", label: "Arabic" },
  { id: "fr", label: "French" },
  { id: "zh", label: "Chinese" },
  { id: "es", label: "Spanish" },
] as const;

export const CONTENT_TYPES: Array<{ id: SchemaType; label: string }> = [
  { id: "NewsArticle", label: "News article" },
  { id: "Article", label: "Article" },
  { id: "Review", label: "Review" },
  { id: "Report", label: "Report" },
];

const PRESETS_KEY = "diplomacy.articles.filterPresets.v1";

export function computeArticleSeoScore(article: {
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  robots_index?: boolean | null;
}) {
  let score = 0;
  if (article.seo_title?.trim()) score += 25;
  if (article.meta_description?.trim()) score += 25;
  if (article.focus_keyword?.trim()) score += 25;
  if (article.robots_index !== false) score += 25;
  return score;
}

export function isArticlesFilterActive(
  filters: ArticlesFilterState,
  options?: { ignoreStatus?: boolean },
) {
  return (
    Boolean(filters.search || filters.dateFrom || filters.dateTo || filters.viewsMin || filters.viewsMax) ||
    filters.author !== "all" ||
    filters.category !== "all" ||
    filters.tag !== "all" ||
    filters.language !== "all" ||
    filters.contentType !== "all" ||
    filters.seoScore !== "all" ||
    (!options?.ignoreStatus && filters.status !== "all")
  );
}

export function matchesArticlesFilters(
  article: {
    title: string;
    slug: string;
    author_id: string | null;
    section_id: string | null;
    status: ArticleStatus;
    language?: string | null;
    schema_type?: string | null;
    updated_at: string;
    seo_title?: string | null;
    meta_description?: string | null;
    focus_keyword?: string | null;
    robots_index?: boolean | null;
    tag_ids?: string[];
  },
  filters: ArticlesFilterState,
  views = 0,
  options?: { ignoreStatus?: boolean },
) {
  const query = filters.search.trim().toLowerCase();
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;
  const updated = new Date(article.updated_at).getTime();
  const seo = computeArticleSeoScore(article);
  const viewsMin = filters.viewsMin.trim() === "" ? null : Number(filters.viewsMin);
  const viewsMax = filters.viewsMax.trim() === "" ? null : Number(filters.viewsMax);

  if (query && !article.title.toLowerCase().includes(query) && !article.slug.toLowerCase().includes(query)) {
    return false;
  }
  if (filters.author !== "all" && article.author_id !== filters.author) return false;
  if (filters.category !== "all" && article.section_id !== filters.category) return false;
  if (filters.tag === "untagged") {
    if ((article.tag_ids?.length ?? 0) > 0) return false;
  } else if (filters.tag !== "all" && !(article.tag_ids ?? []).includes(filters.tag)) {
    return false;
  }
  if (!options?.ignoreStatus && filters.status !== "all" && article.status !== filters.status) {
    return false;
  }
  if (filters.language !== "all" && (article.language ?? "en") !== filters.language) return false;
  if (filters.contentType !== "all" && (article.schema_type ?? "NewsArticle") !== filters.contentType) {
    return false;
  }
  if (from !== null && updated < from) return false;
  if (to !== null && updated > to) return false;
  if (filters.seoScore === "weak" && seo >= 50) return false;
  if (filters.seoScore === "fair" && (seo < 50 || seo >= 75)) return false;
  if (filters.seoScore === "strong" && seo < 75) return false;
  if (viewsMin !== null && !Number.isNaN(viewsMin) && views < viewsMin) return false;
  if (viewsMax !== null && !Number.isNaN(viewsMax) && views > viewsMax) return false;
  return true;
}

export function builtinFilterPresets(): ArticlesFilterPreset[] {
  return [
    {
      id: "builtin-seo-weak",
      name: "Needs SEO",
      builtin: true,
      filters: { ...DEFAULT_ARTICLES_FILTERS, seoScore: "weak" },
    },
    {
      id: "builtin-high-traffic",
      name: "High traffic",
      builtin: true,
      filters: { ...DEFAULT_ARTICLES_FILTERS, viewsMin: "1000" },
    },
    {
      id: "builtin-untagged",
      name: "Untagged",
      builtin: true,
      filters: { ...DEFAULT_ARTICLES_FILTERS, tag: "untagged" },
    },
    {
      id: "builtin-review-queue",
      name: "In review",
      builtin: true,
      filters: { ...DEFAULT_ARTICLES_FILTERS, status: "review" },
    },
  ];
}

export function loadSavedFilterPresets(): ArticlesFilterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArticlesFilterPreset[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((preset) => preset?.id && preset?.name && preset?.filters);
  } catch {
    return [];
  }
}

export function saveFilterPreset(name: string, filters: ArticlesFilterState): ArticlesFilterPreset[] {
  const next: ArticlesFilterPreset = {
    id: `saved-${Date.now()}`,
    name: name.trim().slice(0, 48) || "Saved filter",
    filters: { ...filters },
  };
  const presets = [...loadSavedFilterPresets().filter((p) => !p.builtin), next].slice(-12);
  window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

export function deleteFilterPreset(id: string): ArticlesFilterPreset[] {
  const presets = loadSavedFilterPresets().filter((preset) => preset.id !== id);
  window.localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  return presets;
}
