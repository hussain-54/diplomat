-- Article library tabs (Phase 4): featured / Google News / Discover placement flags.

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_news boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_discover boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS articles_is_featured_idx
  ON public.articles (is_featured)
  WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS articles_google_news_idx
  ON public.articles (google_news)
  WHERE google_news = true;

CREATE INDEX IF NOT EXISTS articles_google_discover_idx
  ON public.articles (google_discover)
  WHERE google_discover = true;

CREATE INDEX IF NOT EXISTS articles_badge_type_idx
  ON public.articles (badge_type)
  WHERE badge_type <> 'none';
