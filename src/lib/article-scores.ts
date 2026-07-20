export type ArticleScoreInput = {
  title?: string | null;
  slug?: string | null;
  deck?: string | null;
  body?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  hero_image_url?: string | null;
  canonical_url?: string | null;
  author_id?: string | null;
  schema_type?: string | null;
  robots_index?: boolean | null;
  google_news?: boolean | null;
};

function wordCount(text: string | null | undefined): number {
  if (!text?.trim()) return 0;
  return text
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function articleWordCount(body: string | null | undefined, deck?: string | null): number {
  return wordCount(body) + wordCount(deck);
}

export function articleReadingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / 220));
}

export function computeArticleSeoScore(input: ArticleScoreInput): number {
  let score = 0;
  const title = (input.seo_title || input.title || "").trim();
  const meta = (input.meta_description || input.deck || "").trim();
  const slug = (input.slug || "").trim();
  const keyword = (input.focus_keyword || "").trim().toLowerCase();
  const words = articleWordCount(input.body, input.deck);

  if (title.length >= 30 && title.length <= 60) score += 20;
  else if (title.length >= 10) score += 12;

  if (meta.length >= 120 && meta.length <= 160) score += 20;
  else if (meta.length >= 50) score += 12;

  if (slug.length >= 3) score += 10;
  if (keyword) {
    score += 10;
    if (title.toLowerCase().includes(keyword)) score += 8;
    if (slug.toLowerCase().includes(keyword.replace(/\s+/g, "-"))) score += 5;
    if (meta.toLowerCase().includes(keyword)) score += 5;
  }
  if (input.hero_image_url) score += 5;
  if (input.canonical_url) score += 4;
  if (input.robots_index !== false) score += 3;
  if (words >= 600) score += 8;
  else if (words >= 300) score += 4;
  if (input.schema_type) score += 2;

  return Math.min(100, score);
}

export function computeContentScore(input: ArticleScoreInput): number {
  let score = 0;
  const words = articleWordCount(input.body, input.deck);
  const title = (input.title || "").trim();
  const deck = (input.deck || "").trim();

  if (title.length >= 20) score += 15;
  else if (title.length >= 8) score += 8;
  if (deck.length >= 40) score += 15;
  else if (deck.length >= 15) score += 8;
  if (words >= 800) score += 30;
  else if (words >= 400) score += 20;
  else if (words >= 200) score += 12;
  else if (words >= 50) score += 6;
  if (input.hero_image_url) score += 10;
  if (input.focus_keyword) score += 10;
  if (input.body && /<h[2-3]|##\s/.test(input.body)) score += 10;
  if (input.body && /https?:\/\//.test(input.body)) score += 10;

  return Math.min(100, score);
}

export function computeEeatScore(input: ArticleScoreInput): number {
  let score = 20;
  if (input.author_id) score += 25;
  if ((input.deck || "").trim().length >= 40) score += 10;
  const words = articleWordCount(input.body, input.deck);
  if (words >= 600) score += 15;
  else if (words >= 300) score += 8;
  if (input.body && /(source|reference|according to|citation)/i.test(input.body)) score += 15;
  if (input.google_news) score += 5;
  if (input.schema_type === "NewsArticle" || input.schema_type === "Article") score += 5;
  if (input.hero_image_url) score += 5;

  return Math.min(100, score);
}

export function computeAllArticleScores(input: ArticleScoreInput) {
  return {
    seo_score: computeArticleSeoScore(input),
    content_score: computeContentScore(input),
    eeat_score: computeEeatScore(input),
    word_count: articleWordCount(input.body, input.deck),
    reading_minutes: articleReadingMinutes(articleWordCount(input.body, input.deck)),
  };
}
