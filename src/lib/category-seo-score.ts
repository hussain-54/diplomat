import type { CategoryWizardPayload } from "@/lib/category-types";

export function computeCategorySeoScore(form: Pick<
  CategoryWizardPayload,
  | "name"
  | "slug"
  | "seo_title"
  | "meta_description"
  | "focus_keywords"
  | "short_description"
  | "description"
  | "og_title"
  | "og_description"
>): number {
  let score = 0;
  const title = (form.seo_title || form.name || "").trim();
  const meta = (form.meta_description || form.short_description || "").trim();
  const slug = (form.slug || "").trim();
  const keywords = form.focus_keywords?.filter(Boolean) ?? [];

  if (title.length >= 30 && title.length <= 60) score += 25;
  else if (title.length >= 10) score += 15;

  if (meta.length >= 120 && meta.length <= 160) score += 25;
  else if (meta.length >= 50) score += 15;

  if (slug.length >= 3) score += 15;
  if (keywords.length >= 1) score += 10;
  if (keywords.length >= 3) score += 5;
  if ((form.description || "").trim().length >= 80) score += 10;
  if ((form.og_title || "").trim()) score += 5;
  if ((form.og_description || "").trim()) score += 5;

  return Math.min(100, score);
}

export function computeCategoryAiScore(form: Pick<
  CategoryWizardPayload,
  "ai_summary" | "topic_cluster" | "search_intent" | "semantic_keywords" | "entities"
>): number {
  let score = 0;
  if ((form.ai_summary || "").trim().length >= 40) score += 30;
  if ((form.topic_cluster || "").trim()) score += 20;
  if ((form.search_intent || "").trim()) score += 15;
  const sem = form.semantic_keywords?.filter(Boolean) ?? [];
  if (sem.length >= 2) score += 20;
  if ((form.entities?.length ?? 0) >= 1) score += 15;
  return Math.min(100, score);
}
