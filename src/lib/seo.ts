import type { Json } from "@/integrations/supabase/types";

export const SITE_NAME = "Diplomacy Lens";
export const DEFAULT_DESCRIPTION =
  "Independent reporting and analysis on diplomacy, geopolitics, embassies, and international affairs.";

export type SeoSchemaType = "NewsArticle" | "Article" | "Review" | "Report";
export type TwitterCardType = "summary" | "summary_large_image";
export type HreflangMap = Record<string, string>;

type SeoArticle = {
  slug: string;
  title: string;
  deck: string | null;
  hero_image_url: string | null;
  published_at: string | null;
  updated_at: string;
  seo_title: string | null;
  meta_description: string | null;
  focus_keyword: string | null;
  canonical_url: string | null;
  robots_index: boolean;
  robots_follow: boolean;
  schema_type: string;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  twitter_card: string;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image_url: string | null;
  hreflang: Json;
  author?: { name: string | null } | { name: string | null }[] | null;
  sections?: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

export function siteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://diplomacylens.com";
}

export function absoluteUrl(pathOrUrl: string, base = siteUrl()): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${base}/${pathOrUrl.replace(/^\/+/, "")}`;
}

export function parseHreflang(value: Json | null | undefined): HreflangMap {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        (entry): entry is [string, string] =>
          /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$|^x-default$/i.test(entry[0]) &&
          typeof entry[1] === "string" &&
          entry[1].trim().length > 0,
      )
      .map(([locale, url]) => [locale, url.trim()]),
  );
}

export function articleSeo(article: SeoArticle) {
  const base = siteUrl();
  const title = article.seo_title?.trim() || article.title;
  const documentTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
  const description = article.meta_description?.trim() || article.deck?.trim() || DEFAULT_DESCRIPTION;
  const canonical = absoluteUrl(
    article.canonical_url?.trim() || `/article/${article.slug}`,
    base,
  );
  const image = article.og_image_url || article.hero_image_url;
  const ogTitle = article.og_title?.trim() || title;
  const ogDescription = article.og_description?.trim() || description;
  const twitterTitle = article.twitter_title?.trim() || ogTitle;
  const twitterDescription = article.twitter_description?.trim() || ogDescription;
  const twitterImage = article.twitter_image_url || image;
  const hreflang = Object.fromEntries(
    Object.entries(parseHreflang(article.hreflang)).map(([locale, url]) => [
      locale,
      absoluteUrl(url, base),
    ]),
  );
  const author = Array.isArray(article.author) ? article.author[0] : article.author;
  const section = Array.isArray(article.sections) ? article.sections[0] : article.sections;
  const schemaType = (
    ["NewsArticle", "Article", "Review", "Report"].includes(article.schema_type)
      ? article.schema_type
      : "NewsArticle"
  ) as SeoSchemaType;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": schemaType,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    headline: title,
    description,
    ...(image ? { image: [absoluteUrl(image, base)] } : {}),
    ...(article.published_at ? { datePublished: article.published_at } : {}),
    dateModified: article.updated_at,
    ...(author?.name
      ? { author: [{ "@type": "Person", name: author.name }] }
      : {}),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: base,
    },
    ...(section?.name ? { articleSection: section.name } : {}),
    ...(article.focus_keyword ? { keywords: article.focus_keyword } : {}),
    url: canonical,
  };

  return {
    title,
    documentTitle,
    description,
    canonical,
    image: image ? absoluteUrl(image, base) : null,
    ogTitle,
    ogDescription,
    twitterTitle,
    twitterDescription,
    twitterImage: twitterImage ? absoluteUrl(twitterImage, base) : null,
    twitterCard: (
      article.twitter_card === "summary" ? "summary" : "summary_large_image"
    ) as TwitterCardType,
    robots: `${article.robots_index !== false ? "index" : "noindex"},${article.robots_follow !== false ? "follow" : "nofollow"}`,
    hreflang,
    jsonLd,
  };
}

export function seoLengthTone(length: number, min: number, max: number) {
  if (length === 0) return "text-muted-foreground";
  if (length < min || length > max) return "text-crimson";
  return "text-cat-green";
}
