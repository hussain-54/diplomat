-- PostgreSQL requires newly-added enum values to be committed before they
-- can safely be referenced by policies and functions in a later migration.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor_in_chief';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'managing_editor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reporter';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'photographer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'videographer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fact_checker';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'translator';
