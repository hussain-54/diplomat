export type ArticleCmsExtras = {
  article_type?: string;
  visibility?: "public" | "premium" | "members";
  co_author_ids?: string[];
  editor_id?: string | null;
  expiry_at?: string | null;
  media?: {
    alt_text?: string;
    caption?: string;
    credit?: string;
    gallery?: Array<{ url: string; alt?: string }>;
    video_url?: string;
    infographic_url?: string;
  };
  local_seo?: {
    country?: string;
    region?: string;
    city?: string;
    local_keywords?: string;
    business_relevance?: string;
  };
  google_news?: {
    news_category?: string;
    eligible?: boolean;
    include_sitemap?: boolean;
    breaking?: boolean;
    news_keywords?: string;
  };
  eeat?: {
    expert_reviewer?: string;
    fact_checker?: string;
    source_verification?: string;
    author_credentials?: string;
    original_reporting?: boolean;
    sources_noted?: boolean;
  };
  secondary_keywords?: string;
  custom_fields?: {
    editorial_notes?: string;
    sponsored?: boolean;
    external_id?: string;
    metadata?: string;
  };
  related_article_ids?: string[];
  references?: Array<{ name: string; url: string; citation_type: string }>;
};

export const DEFAULT_CMS_EXTRAS: ArticleCmsExtras = {
  article_type: "news",
  visibility: "public",
  media: {},
  local_seo: {},
  google_news: {
    eligible: false,
    include_sitemap: true,
    breaking: false,
  },
  eeat: {
    original_reporting: false,
    sources_noted: false,
  },
  custom_fields: {
    sponsored: false,
  },
  references: [],
  related_article_ids: [],
};

export const ARTICLE_TYPE_OPTIONS = [
  { id: "news", label: "News" },
  { id: "blog", label: "Blog" },
  { id: "analysis", label: "Analysis" },
  { id: "opinion", label: "Opinion" },
  { id: "feature", label: "Feature Story" },
  { id: "research", label: "Research" },
  { id: "interview", label: "Interview" },
  { id: "editorial", label: "Editorial" },
  { id: "report", label: "Report" },
] as const;

export function mergeCmsExtras(
  base?: ArticleCmsExtras | null,
  patch?: Partial<ArticleCmsExtras> | null,
): ArticleCmsExtras {
  return {
    ...DEFAULT_CMS_EXTRAS,
    ...base,
    ...patch,
    media: { ...DEFAULT_CMS_EXTRAS.media, ...base?.media, ...patch?.media },
    local_seo: { ...DEFAULT_CMS_EXTRAS.local_seo, ...base?.local_seo, ...patch?.local_seo },
    google_news: {
      ...DEFAULT_CMS_EXTRAS.google_news,
      ...base?.google_news,
      ...patch?.google_news,
    },
    eeat: { ...DEFAULT_CMS_EXTRAS.eeat, ...base?.eeat, ...patch?.eeat },
    custom_fields: {
      ...DEFAULT_CMS_EXTRAS.custom_fields,
      ...base?.custom_fields,
      ...patch?.custom_fields,
    },
  };
}

export function parseCmsExtras(raw: unknown): ArticleCmsExtras {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CMS_EXTRAS };
  return mergeCmsExtras(raw as ArticleCmsExtras);
}
