import { siteOrigin } from "./_content.js";

export default function handler(req, res) {
  const origin = siteOrigin(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /auth

Sitemap: ${origin}/sitemap.xml
`);
}
