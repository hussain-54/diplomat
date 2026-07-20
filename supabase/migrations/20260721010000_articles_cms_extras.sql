-- Newsroom CMS extras for Local SEO, Google News meta, EEAT, media credits, custom fields.
-- Prefer jsonb over proliferating tables; tags/sections/revisions already relational.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS cms_extras JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS expiry_at TIMESTAMPTZ;

COMMENT ON COLUMN public.articles.cms_extras IS
  'Editorial extras: local_seo, google_news meta, eeat, media, custom_fields, visibility, co_authors';

CREATE INDEX IF NOT EXISTS articles_cms_extras_gin_idx
  ON public.articles USING gin (cms_extras);
