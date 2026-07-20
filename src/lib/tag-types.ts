export type TagStatus = "draft" | "published" | "scheduled";

export type TagWizardPayload = {
  id?: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
  description?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  language?: string | null;
  country?: string | null;
  cover_image_url?: string | null;
  icon_name?: string | null;
  icon_url?: string | null;
  status?: TagStatus;
  scheduled_at?: string | null;
  ai_optimized?: boolean;
  discover_eligible?: boolean;
};

export type TagListFilters = {
  search?: string;
  status?: "all" | TagStatus;
  language?: string | null;
  seo_min?: number | null;
  ai_optimized?: boolean | null;
  date_from?: string | null;
  date_to?: string | null;
  page?: number;
  pageSize?: number;
  sort?: "name" | "articles" | "seo" | "updated";
  sortDir?: "asc" | "desc";
};

export const TAG_WIZARD_SECTIONS = [
  { id: 1, key: "basic", label: "Basic Information" },
  { id: 2, key: "seo", label: "SEO Settings" },
  { id: 3, key: "locale", label: "Localization" },
  { id: 4, key: "media", label: "Featured Image" },
  { id: 5, key: "icon", label: "Icon Selection" },
  { id: 6, key: "publish", label: "Publish Settings" },
] as const;

export const DEFAULT_TAG_FORM: TagWizardPayload = {
  name: "",
  slug: "",
  parent_id: null,
  description: "",
  seo_title: "",
  meta_description: "",
  focus_keyword: "",
  language: "en",
  country: "",
  cover_image_url: "",
  icon_name: "",
  icon_url: "",
  status: "draft",
  scheduled_at: null,
  ai_optimized: false,
  discover_eligible: false,
};

export const TAG_ICON_OPTIONS = [
  "Tag",
  "Hash",
  "Globe2",
  "Landmark",
  "Newspaper",
  "TrendingUp",
  "Sparkles",
  "Bookmark",
] as const;
