import {
  absolute,
  bodyText,
  publishedArticles,
  sendError,
  sendXml,
  siteOrigin,
  xml,
} from "./_content.js";

export default async function handler(req, res) {
  try {
    const origin = siteOrigin(req);
    const articles = (await publishedArticles({ rssOnly: true })).slice(0, 100);
    const items = articles
      .map((article) => {
        const author = Array.isArray(article.author) ? article.author[0] : article.author;
        const link = absolute(`/article/${article.slug}`, origin);
        const description = article.deck || bodyText(article.body).slice(0, 500);
        return `<item>
<title>${xml(article.title)}</title>
<link>${xml(link)}</link>
<guid isPermaLink="true">${xml(link)}</guid>
<pubDate>${new Date(article.published_at).toUTCString()}</pubDate>
${author?.name ? `<dc:creator>${xml(author.name)}</dc:creator>` : ""}
<description>${xml(description)}</description>
${article.hero_image_url ? `<media:content url="${xml(absolute(article.hero_image_url, origin))}" medium="image"/>` : ""}
</item>`;
      })
      .join("");

    return sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
<title>Diplomacy Lens</title>
<link>${xml(origin)}</link>
<description>Global diplomacy and international affairs reporting.</description>
<language>en</language>
<atom:link href="${xml(`${origin}/rss.xml`)}" rel="self" type="application/rss+xml"/>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`,
      300,
    );
  } catch (error) {
    return sendError(res, error);
  }
}
