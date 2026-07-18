export type ArticleDraftCachePayload = {
  savedAt: string;
  form: {
    title: string;
    deck: string;
    section_id: string;
    region: string;
    badge_type: string;
    hero_image_url: string;
    status: string;
    slug: string;
    scheduled_at: string;
  };
  blocks: unknown[];
  tagNames: string[];
  seo: Record<string, unknown>;
  hreflangRows: Array<{ locale: string; url: string }>;
};

const keyFor = (articleId: string) => `diplomacy.article.draft.v1.${articleId}`;

export function saveArticleDraftCache(articleId: string, payload: ArticleDraftCachePayload) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(articleId), JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function loadArticleDraftCache(articleId: string): ArticleDraftCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(articleId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ArticleDraftCachePayload;
    if (!parsed?.savedAt || !parsed.form) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearArticleDraftCache(articleId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(articleId));
  } catch {
    // ignore
  }
}

export function moveArticleDraftCache(fromId: string, toId: string) {
  const payload = loadArticleDraftCache(fromId);
  if (!payload) return;
  saveArticleDraftCache(toId, payload);
  clearArticleDraftCache(fromId);
}
