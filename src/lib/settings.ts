import type { Database } from "@/integrations/supabase/types";
import { APP_ROLES, PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, type AppRole, type Permission } from "@/lib/permissions";

export type SettingsSection =
  | "general"
  | "seo"
  | "roles"
  | "integrations"
  | "security"
  | "notifications";

export type SeoDefaults = {
  meta_description: string;
  title_template: string;
  default_og_image_url: string;
  robots_index: boolean;
  robots_follow: boolean;
  schema_type: "NewsArticle" | "Article" | "Review" | "Report";
  twitter_card: "summary" | "summary_large_image";
  sitemap_enabled: boolean;
  rss_enabled: boolean;
};

export type IntegrationsConfig = {
  google_analytics_id: string;
  google_search_console_meta: string;
  google_ad_manager_network_code: string;
  facebook: string;
  linkedin: string;
  twitter: string;
  telegram: string;
  whatsapp: string;
  instagram: string;
  youtube: string;
};

export type NotificationPrefs = {
  email_on_comment_pending: boolean;
  email_on_article_review: boolean;
  email_on_publish: boolean;
  email_digest_daily: boolean;
  notify_security_alerts: boolean;
};

export type SettingsForm = {
  publication_name: string;
  short_name: string;
  tagline: string;
  contact_email: string;
  timezone: string;
  default_article_status: Database["public"]["Enums"]["article_status"];
  comments_enabled: boolean;
  seo_defaults: SeoDefaults;
  integrations: IntegrationsConfig;
  notification_prefs: NotificationPrefs;
};

export const DEFAULT_SEO: SeoDefaults = {
  meta_description:
    "Independent reporting and analysis on diplomacy, geopolitics, embassies, and international affairs.",
  title_template: "%s — Diplomacy Lens",
  default_og_image_url: "",
  robots_index: true,
  robots_follow: true,
  schema_type: "NewsArticle",
  twitter_card: "summary_large_image",
  sitemap_enabled: true,
  rss_enabled: true,
};

export const DEFAULT_INTEGRATIONS: IntegrationsConfig = {
  google_analytics_id: "",
  google_search_console_meta: "",
  google_ad_manager_network_code: "",
  facebook: "",
  linkedin: "",
  twitter: "",
  telegram: "",
  whatsapp: "",
  instagram: "",
  youtube: "",
};

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  email_on_comment_pending: true,
  email_on_article_review: true,
  email_on_publish: false,
  email_digest_daily: false,
  notify_security_alerts: true,
};

export const SETTINGS_SECTIONS: Array<{ id: SettingsSection; label: string }> = [
  { id: "general", label: "General" },
  { id: "seo", label: "SEO Defaults" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "integrations", label: "Integrations" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
];

export const INTEGRATION_FIELDS: Array<{
  key: keyof IntegrationsConfig;
  label: string;
  description: string;
  placeholder: string;
}> = [
  {
    key: "google_analytics_id",
    label: "Google Analytics",
    description: "GA4 measurement ID (G-XXXXXXXX)",
    placeholder: "G-XXXXXXXXXX",
  },
  {
    key: "google_search_console_meta",
    label: "Google Search Console",
    description: "HTML verification meta content value",
    placeholder: "verification token",
  },
  {
    key: "google_ad_manager_network_code",
    label: "Google Ad Manager",
    description: "Network code for ad inventory",
    placeholder: "12345678",
  },
  {
    key: "facebook",
    label: "Facebook",
    description: "Public page URL",
    placeholder: "https://facebook.com/…",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    description: "Company or newsroom page URL",
    placeholder: "https://linkedin.com/company/…",
  },
  {
    key: "twitter",
    label: "Twitter / X",
    description: "Profile URL",
    placeholder: "https://x.com/…",
  },
  {
    key: "telegram",
    label: "Telegram",
    description: "Channel or bot public URL",
    placeholder: "https://t.me/…",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    description: "WhatsApp channel or contact link",
    placeholder: "https://wa.me/…",
  },
  {
    key: "instagram",
    label: "Instagram",
    description: "Profile URL",
    placeholder: "https://instagram.com/…",
  },
  {
    key: "youtube",
    label: "YouTube",
    description: "Channel URL",
    placeholder: "https://youtube.com/@…",
  },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard:view": "Dashboard",
  "articles:view": "View articles",
  "articles:create": "Create articles",
  "articles:edit_own": "Edit own articles",
  "articles:edit_all": "Edit all articles",
  "articles:review": "Review",
  "articles:publish": "Publish",
  "articles:delete": "Delete articles",
  "categories:manage": "Categories",
  "staff:manage": "Staff",
  "media:view": "View media",
  "media:upload": "Upload media",
  "media:manage_all": "Manage all media",
  "comments:moderate": "Moderate comments",
  "analytics:view": "Analytics",
  "settings:manage": "Settings",
  "newsroom:manage": "Newsroom desks",
  "videos:manage": "Videos",
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseSeoDefaults(value: unknown): SeoDefaults {
  const raw = asObject(value);
  const schema = asString(raw.schema_type, DEFAULT_SEO.schema_type);
  const card = asString(raw.twitter_card, DEFAULT_SEO.twitter_card);
  return {
    meta_description: asString(raw.meta_description, DEFAULT_SEO.meta_description),
    title_template: asString(raw.title_template, DEFAULT_SEO.title_template),
    default_og_image_url: asString(raw.default_og_image_url, ""),
    robots_index: asBool(raw.robots_index, true),
    robots_follow: asBool(raw.robots_follow, true),
    schema_type: (["NewsArticle", "Article", "Review", "Report"].includes(schema)
      ? schema
      : "NewsArticle") as SeoDefaults["schema_type"],
    twitter_card: (card === "summary" ? "summary" : "summary_large_image") as SeoDefaults["twitter_card"],
    sitemap_enabled: asBool(raw.sitemap_enabled, true),
    rss_enabled: asBool(raw.rss_enabled, true),
  };
}

export function parseIntegrations(value: unknown): IntegrationsConfig {
  const raw = asObject(value);
  return {
    google_analytics_id: asString(raw.google_analytics_id),
    google_search_console_meta: asString(raw.google_search_console_meta),
    google_ad_manager_network_code: asString(raw.google_ad_manager_network_code),
    facebook: asString(raw.facebook),
    linkedin: asString(raw.linkedin),
    twitter: asString(raw.twitter),
    telegram: asString(raw.telegram),
    whatsapp: asString(raw.whatsapp),
    instagram: asString(raw.instagram),
    youtube: asString(raw.youtube),
  };
}

export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  const raw = asObject(value);
  return {
    email_on_comment_pending: asBool(raw.email_on_comment_pending, true),
    email_on_article_review: asBool(raw.email_on_article_review, true),
    email_on_publish: asBool(raw.email_on_publish, false),
    email_digest_daily: asBool(raw.email_digest_daily, false),
    notify_security_alerts: asBool(raw.notify_security_alerts, true),
  };
}

export function roleMatrix() {
  return APP_ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    permissions: ROLE_PERMISSIONS[role],
  }));
}

export { APP_ROLES, PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS };
export type { AppRole, Permission };
