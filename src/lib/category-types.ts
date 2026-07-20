export type CategorySchemaType =
  | "CollectionPage"
  | "Blog"
  | "NewsCategory"
  | "TopicCategory";

export type CategoryWizardPayload = {
  id?: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
  category_type?: string | null;
  short_description?: string | null;
  description?: string | null;
  icon_url?: string | null;
  cover_image_url?: string | null;
  visibility?: "public" | "hidden";
  featured?: boolean;
  color?: string | null;
  sort_order?: number;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keywords?: string[];
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  ai_summary?: string | null;
  topic_cluster?: string | null;
  search_intent?: string | null;
  semantic_keywords?: string[];
  entities?: unknown[];
  news_eligible?: boolean;
  news_sitemap?: boolean;
  news_priority?: number;
  breaking_news?: boolean;
  schema_type?: CategorySchemaType | string | null;
  language?: string | null;
  region?: string | null;
  country?: string | null;
  default_author_id?: string | null;
  access_mode?: string | null;
  discover_eligible?: boolean;
  publish?: boolean;
};

export type CategoryListFilters = {
  search?: string;
  parent_id?: string | null;
  status?: "all" | "active" | "hidden";
  news_eligible?: boolean | null;
  discover_eligible?: boolean | null;
  language?: string | null;
  country?: string | null;
  seo_min?: number | null;
  page?: number;
  pageSize?: number;
  sort?: "name" | "articles" | "seo" | "updated";
  sortDir?: "asc" | "desc";
};

export type CategoryModuleSettings = {
  general: Record<string, unknown>;
  seo_defaults: Record<string, unknown>;
  social: Record<string, unknown>;
  permissions: Record<string, unknown>;
  notifications: Record<string, unknown>;
  advanced: Record<string, unknown>;
};

export const CATEGORY_WIZARD_STEPS = [
  { id: 1, key: "basic", label: "Basic Information" },
  { id: 2, key: "seo", label: "SEO & Meta" },
  { id: 3, key: "geo", label: "GEO (AI)" },
  { id: 4, key: "news", label: "Google News" },
  { id: 5, key: "schema", label: "Schema" },
  { id: 6, key: "advanced", label: "Advanced" },
  { id: 7, key: "review", label: "Review" },
] as const;

export const DEFAULT_CATEGORY_FORM: CategoryWizardPayload = {
  name: "",
  slug: "",
  parent_id: null,
  category_type: "standard",
  short_description: "",
  description: "",
  icon_url: "",
  cover_image_url: "",
  visibility: "public",
  featured: false,
  color: null,
  seo_title: "",
  meta_description: "",
  focus_keywords: [],
  canonical_url: "",
  og_title: "",
  og_description: "",
  twitter_title: "",
  twitter_description: "",
  ai_summary: "",
  topic_cluster: "",
  search_intent: "informational",
  semantic_keywords: [],
  entities: [],
  news_eligible: false,
  news_sitemap: false,
  news_priority: 5,
  breaking_news: false,
  schema_type: "CollectionPage",
  language: "en",
  region: "",
  country: "",
  default_author_id: null,
  access_mode: "public",
  discover_eligible: false,
};
