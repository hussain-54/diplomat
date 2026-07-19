import { blocksToPlainText, type Block } from "@/lib/blocks";
import type { ArticleSeoInput } from "@/lib/admin.functions";

export type EditorSeoInsights = {
  seoScore: number;
  readabilityScore: number;
  keywordDensity: number;
  internalLinks: number;
  externalLinks: number;
  schemaReady: boolean;
  titleLength: number;
  metaLength: number;
};

/** Desk heuristics for live SEO feedback in the editor inspector. */
export function computeEditorSeoInsights(input: {
  title: string;
  deck: string;
  blocks: Block[];
  seo: Pick<
    ArticleSeoInput,
    | "seo_title"
    | "meta_description"
    | "focus_keyword"
    | "robots_index"
    | "schema_type"
    | "og_title"
    | "og_description"
  >;
  seoScore: number;
}): EditorSeoInsights {
  const plain = blocksToPlainText(input.blocks);
  const words = plain.trim() ? plain.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const sentences = plain.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWords =
    sentences.length > 0 ? wordCount / Math.max(sentences.length, 1) : wordCount;
  // Prefer mid-length sentences for news copy.
  let readability = 70;
  if (wordCount < 80) readability -= 15;
  if (avgWords > 28) readability -= 20;
  else if (avgWords > 22) readability -= 10;
  else if (avgWords >= 12 && avgWords <= 20) readability += 15;
  if (input.deck.trim().length > 40) readability += 5;
  readability = Math.max(0, Math.min(100, Math.round(readability)));

  const keyword = input.seo.focus_keyword?.trim().toLowerCase() ?? "";
  let keywordDensity = 0;
  if (keyword && wordCount > 0) {
    const hay = `${input.title} ${input.deck} ${plain}`.toLowerCase();
    const matches = hay.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"));
    const hits = matches?.length ?? 0;
    keywordDensity = Math.round((hits / wordCount) * 1000) / 10;
  }

  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let internalLinks = 0;
  let externalLinks = 0;
  let match: RegExpExecArray | null;
  const blob = plain;
  while ((match = linkPattern.exec(blob)) !== null) {
    const href = match[2] ?? "";
    if (href.startsWith("/") || href.includes("/article/")) internalLinks += 1;
    else if (/^https?:\/\//i.test(href)) externalLinks += 1;
  }

  const schemaReady = Boolean(input.seo.schema_type);
  const titleLength = (input.seo.seo_title || input.title).trim().length;
  const metaLength = (input.seo.meta_description || input.deck).trim().length;

  return {
    seoScore: input.seoScore,
    readabilityScore: readability,
    keywordDensity,
    internalLinks,
    externalLinks,
    schemaReady,
    titleLength,
    metaLength,
  };
}
