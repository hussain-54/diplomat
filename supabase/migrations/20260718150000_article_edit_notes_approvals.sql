-- Phase 9: editorial / fact-check notes and approval history for article editing.

CREATE TABLE IF NOT EXISTS public.article_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('editorial', 'fact_check')),
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS article_notes_article_created_idx
  ON public.article_notes (article_id, created_at DESC);

CREATE INDEX IF NOT EXISTS article_notes_type_idx
  ON public.article_notes (article_id, note_type, created_at DESC);

ALTER TABLE public.article_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read article notes" ON public.article_notes;
CREATE POLICY "staff read article notes"
ON public.article_notes FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'articles:view'));

DROP POLICY IF EXISTS "staff write editorial notes" ON public.article_notes;
CREATE POLICY "staff write editorial notes"
ON public.article_notes FOR INSERT TO authenticated
WITH CHECK (
  note_type = 'editorial'
  AND (
    app_hidden.has_permission(auth.uid(), 'articles:edit_own')
    OR app_hidden.has_permission(auth.uid(), 'articles:edit_all')
    OR app_hidden.has_permission(auth.uid(), 'articles:review')
  )
);

DROP POLICY IF EXISTS "staff write fact check notes" ON public.article_notes;
CREATE POLICY "staff write fact check notes"
ON public.article_notes FOR INSERT TO authenticated
WITH CHECK (
  note_type = 'fact_check'
  AND (
    app_hidden.has_role(auth.uid(), 'fact_checker')
    OR app_hidden.has_permission(auth.uid(), 'articles:review')
    OR app_hidden.has_permission(auth.uid(), 'articles:edit_all')
  )
);

GRANT SELECT, INSERT ON public.article_notes TO authenticated;
GRANT ALL ON public.article_notes TO service_role;

CREATE TABLE IF NOT EXISTS public.article_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (
    action IN (
      'submit_review',
      'approve',
      'reject',
      'request_changes',
      'publish',
      'schedule',
      'archive'
    )
  ),
  from_status public.article_status,
  to_status public.article_status,
  note text,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS article_approvals_article_created_idx
  ON public.article_approvals (article_id, created_at DESC);

ALTER TABLE public.article_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read article approvals" ON public.article_approvals;
CREATE POLICY "staff read article approvals"
ON public.article_approvals FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'articles:view'));

DROP POLICY IF EXISTS "staff write article approvals" ON public.article_approvals;
CREATE POLICY "staff write article approvals"
ON public.article_approvals FOR INSERT TO authenticated
WITH CHECK (
  app_hidden.has_permission(auth.uid(), 'articles:review')
  OR app_hidden.has_permission(auth.uid(), 'articles:publish')
  OR app_hidden.has_permission(auth.uid(), 'articles:edit_all')
  OR app_hidden.has_permission(auth.uid(), 'articles:edit_own')
);

GRANT SELECT, INSERT ON public.article_approvals TO authenticated;
GRANT ALL ON public.article_approvals TO service_role;
