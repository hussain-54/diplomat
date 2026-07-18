-- Language support for Articles advanced filters (Phase 5).

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

CREATE INDEX IF NOT EXISTS articles_language_idx ON public.articles (language);
