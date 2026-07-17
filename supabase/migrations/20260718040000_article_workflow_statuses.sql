-- Commit workflow enum values before they are referenced by the next migration.

ALTER TYPE public.article_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE public.article_status ADD VALUE IF NOT EXISTS 'archived';
