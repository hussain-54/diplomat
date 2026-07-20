import type { TagWizardPayload } from "@/lib/tag-types";

export function computeTagSeoScore(
  form: Pick<
    TagWizardPayload,
    "name" | "slug" | "seo_title" | "meta_description" | "focus_keyword" | "description"
  >,
): number {
  let score = 0;
  const title = (form.seo_title || form.name || "").trim();
  const meta = (form.meta_description || "").trim();
  const slug = (form.slug || "").trim();
  const keyword = (form.focus_keyword || "").trim();

  if (title.length >= 30 && title.length <= 60) score += 30;
  else if (title.length >= 10) score += 18;

  if (meta.length >= 120 && meta.length <= 160) score += 30;
  else if (meta.length >= 50) score += 18;

  if (slug.length >= 3) score += 15;
  if (keyword) score += 15;
  if ((form.description || "").trim().length >= 40) score += 10;

  return Math.min(100, score);
}
