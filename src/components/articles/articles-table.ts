import { computeArticleSeoScore } from "@/components/articles/articles-filters";

export type ArticlesTableColumnKey =
  | "select"
  | "thumbnail"
  | "title"
  | "author"
  | "category"
  | "tags"
  | "seo"
  | "content"
  | "views"
  | "comments"
  | "status"
  | "updated"
  | "actions";

export type ArticlesSortKey =
  | "title"
  | "author"
  | "category"
  | "seo"
  | "content"
  | "views"
  | "comments"
  | "status"
  | "updated";

export const ARTICLES_TABLE_COLUMNS: Array<{
  key: ArticlesTableColumnKey;
  label: string;
  hideable?: boolean;
  defaultVisible?: boolean;
}> = [
  { key: "select", label: "Select", hideable: false, defaultVisible: true },
  { key: "thumbnail", label: "Thumbnail", hideable: true, defaultVisible: true },
  { key: "title", label: "Title", hideable: false, defaultVisible: true },
  { key: "author", label: "Author", hideable: true, defaultVisible: true },
  { key: "category", label: "Category", hideable: true, defaultVisible: true },
  { key: "tags", label: "Tags", hideable: true, defaultVisible: true },
  { key: "seo", label: "SEO Score", hideable: true, defaultVisible: true },
  { key: "content", label: "Content Score", hideable: true, defaultVisible: true },
  { key: "views", label: "Views", hideable: true, defaultVisible: true },
  { key: "comments", label: "Comments", hideable: true, defaultVisible: true },
  { key: "status", label: "Status", hideable: true, defaultVisible: true },
  { key: "updated", label: "Updated", hideable: true, defaultVisible: true },
  { key: "actions", label: "Actions", hideable: false, defaultVisible: true },
];

const VISIBILITY_KEY = "diplomacy.articles.tableColumns.v1";

export function defaultColumnVisibility(): Record<ArticlesTableColumnKey, boolean> {
  return Object.fromEntries(
    ARTICLES_TABLE_COLUMNS.map((column) => [column.key, column.defaultVisible !== false]),
  ) as Record<ArticlesTableColumnKey, boolean>;
}

export function loadColumnVisibility(): Record<ArticlesTableColumnKey, boolean> {
  const defaults = defaultColumnVisibility();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(VISIBILITY_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<ArticlesTableColumnKey, boolean>>;
    return { ...defaults, ...parsed, select: true, title: true, actions: true };
  } catch {
    return defaults;
  }
}

export function saveColumnVisibility(visibility: Record<ArticlesTableColumnKey, boolean>) {
  window.localStorage.setItem(
    VISIBILITY_KEY,
    JSON.stringify({ ...visibility, select: true, title: true, actions: true }),
  );
}

export function computeArticleContentScore(article: {
  title?: string | null;
  deck?: string | null;
  hero_image_url?: string | null;
  tags?: Array<{ id: string }> | null;
  tag_ids?: string[];
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  robots_index?: boolean | null;
}) {
  let score = 0;
  if (article.title?.trim()) score += 15;
  if (article.deck?.trim()) score += 20;
  if (article.hero_image_url?.trim()) score += 20;
  const tagCount = article.tags?.length ?? article.tag_ids?.length ?? 0;
  if (tagCount > 0) score += 15;
  if (tagCount > 2) score += 5;
  score += Math.round(computeArticleSeoScore(article) * 0.25);
  return Math.min(100, score);
}

export function scoreTone(score: number): "success" | "warning" | "danger" | "neutral" {
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  if (score > 0) return "danger";
  return "neutral";
}

export function escapeCsv(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}
