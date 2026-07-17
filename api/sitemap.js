import {
  absolute,
  bodyBlocks,
  publishedArticles,
  publicSections,
  sameOrigin,
  sendError,
  sendXml,
  siteOrigin,
  xml,
} from "./_content.js";

const XML = '<?xml version="1.0" encoding="UTF-8"?>';

export default async function handler(req, res) {
  try {
    const origin = siteOrigin(req);
    const type = Array.isArray(req.query.type) ? req.query.type[0] : req.query.type;

    if (type === "index") {
      const names = ["pages", "news", "images", "videos"];
      return sendXml(
        res,
        `${XML}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${names
          .map(
            (name) =>
              `<sitemap><loc>${xml(`${origin}/${name}-sitemap.xml`)}</loc></sitemap>`,
          )
          .join("")}</sitemapindex>`,
      );
    }

    if (type === "news") {
      const articles = await publishedArticles({ newsOnly: true });
      const urls = articles
        .filter((article) => !article.canonical_url || sameOrigin(article.canonical_url, origin))
        .map(
          (article) => `<url>
<loc>${xml(absolute(`/article/${article.slug}`, origin))}</loc>
<news:news>
<news:publication><news:name>Diplomacy Lens</news:name><news:language>en</news:language></news:publication>
<news:publication_date>${xml(article.published_at)}</news:publication_date>
<news:title>${xml(article.title)}</news:title>
</news:news>
</url>`,
        )
        .join("");
      return sendXml(
        res,
        `${XML}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${urls}</urlset>`,
        300,
      );
    }

    if (type === "images") {
      const articles = await publishedArticles();
      const urls = articles
        .map((article) => {
          const images = [];
          if (article.hero_image_url) {
            images.push({ url: article.hero_image_url, caption: article.title });
          }
          for (const block of bodyBlocks(article.body)) {
            if (block.type === "image" && block.data?.url) {
              images.push({
                url: block.data.url,
                caption: block.data.caption || block.data.alt || article.title,
              });
            }
            if (block.type === "gallery") {
              for (const image of block.data?.images || []) {
                if (image.url) images.push({ url: image.url, caption: image.alt || article.title });
              }
            }
          }
          if (!images.length) return "";
          return `<url><loc>${xml(absolute(`/article/${article.slug}`, origin))}</loc>${images
            .slice(0, 1000)
            .map(
              (image) =>
                `<image:image><image:loc>${xml(absolute(image.url, origin))}</image:loc><image:caption>${xml(image.caption)}</image:caption></image:image>`,
            )
            .join("")}</url>`;
        })
        .join("");
      return sendXml(
        res,
        `${XML}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${urls}</urlset>`,
      );
    }

    if (type === "videos") {
      const articles = await publishedArticles();
      const urls = articles
        .map((article) => {
          const videos = bodyBlocks(article.body).filter(
            (block) => block.type === "video" && block.data?.url,
          );
          if (!videos.length) return "";
          return `<url><loc>${xml(absolute(`/article/${article.slug}`, origin))}</loc>${videos
            .slice(0, 100)
            .map((block) => {
              const title = block.data.caption || article.title;
              const thumbnail = article.hero_image_url;
              if (!thumbnail) return "";
              return `<video:video><video:thumbnail_loc>${xml(absolute(thumbnail, origin))}</video:thumbnail_loc><video:title>${xml(title)}</video:title><video:description>${xml(article.deck || title)}</video:description><video:content_loc>${xml(absolute(block.data.url, origin))}</video:content_loc></video:video>`;
            })
            .join("")}</url>`;
        })
        .join("");
      return sendXml(
        res,
        `${XML}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${urls}</urlset>`,
      );
    }

    const [articles, sections] = await Promise.all([
      publishedArticles(),
      publicSections(),
    ]);
    const staticPaths = [
      "/",
      "/latest",
      "/popular",
      "/video",
      "/podcast",
      "/programs",
      "/epaper",
      "/about",
      "/newsletter",
    ];
    const staticUrls = staticPaths
      .map((path) => `<url><loc>${xml(absolute(path, origin))}</loc></url>`)
      .join("");
    const sectionUrls = sections
      .map(
        (section) =>
          `<url><loc>${xml(absolute(`/section/${section.slug}`, origin))}</loc></url>`,
      )
      .join("");
    const articleUrls = articles
      .filter((article) => !article.canonical_url || sameOrigin(article.canonical_url, origin))
      .map((article) => {
        const hreflang =
          article.hreflang && typeof article.hreflang === "object" && !Array.isArray(article.hreflang)
            ? Object.entries(article.hreflang)
                .filter(([, href]) => typeof href === "string")
                .map(
                  ([locale, href]) =>
                    `<xhtml:link rel="alternate" hreflang="${xml(locale)}" href="${xml(href)}"/>`,
                )
                .join("")
            : "";
        return `<url><loc>${xml(absolute(`/article/${article.slug}`, origin))}</loc><lastmod>${xml(article.updated_at)}</lastmod>${hreflang}</url>`;
      })
      .join("");
    return sendXml(
      res,
      `${XML}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${staticUrls}${sectionUrls}${articleUrls}</urlset>`,
    );
  } catch (error) {
    return sendError(res, error);
  }
}
