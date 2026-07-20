-- Articles Nexivon upgrade: approved status, soft-delete, editorial scores.

ALTER TYPE public.article_status ADD VALUE IF NOT EXISTS 'approved';

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delete_reason text,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS content_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eeat_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seo_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high'));

CREATE INDEX IF NOT EXISTS articles_deleted_at_idx
  ON public.articles (deleted_at)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS articles_status_deleted_idx
  ON public.articles (status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS articles_seo_score_idx ON public.articles (seo_score DESC);
CREATE INDEX IF NOT EXISTS articles_priority_idx ON public.articles (priority);

-- Soft-delete: hide from public when deleted
DROP POLICY IF EXISTS "Public read published articles" ON public.articles;
DROP POLICY IF EXISTS articles_public_read ON public.articles;

DO $$
BEGIN
  -- Re-create public read if a common policy name exists; ignore if already named differently
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'articles' AND policyname = 'articles_public_read_published'
  ) THEN
    CREATE POLICY articles_public_read_published ON public.articles
      FOR SELECT
      USING (
        status = 'published'::public.article_status
        AND deleted_at IS NULL
      );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
