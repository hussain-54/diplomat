-- Tags CMS module: extend tags + activity logs + dual-write RLS + tags:manage.

ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'scheduled')),
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS icon_name text,
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS focus_keyword text,
  ADD COLUMN IF NOT EXISTS seo_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_optimized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discover_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tags_status_idx ON public.tags (status);
CREATE INDEX IF NOT EXISTS tags_updated_at_idx ON public.tags (updated_at DESC);
CREATE INDEX IF NOT EXISTS tags_seo_score_idx ON public.tags (seo_score DESC);
CREATE INDEX IF NOT EXISTS tags_parent_id_idx ON public.tags (parent_id);
CREATE INDEX IF NOT EXISTS tags_language_idx ON public.tags (language);

CREATE OR REPLACE FUNCTION public.tags_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tags_updated_at ON public.tags;
CREATE TRIGGER tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.tags_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.tag_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id uuid REFERENCES public.tags(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tag_activity_logs_tag_idx
  ON public.tag_activity_logs (tag_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tag_activity_logs_actor_idx
  ON public.tag_activity_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tag_activity_logs_action_idx
  ON public.tag_activity_logs (action, created_at DESC);

ALTER TABLE public.tag_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tag_activity_logs_staff ON public.tag_activity_logs;
CREATE POLICY tag_activity_logs_staff ON public.tag_activity_logs
  FOR ALL
  USING (app_hidden.has_permission(auth.uid(), 'tags:manage'))
  WITH CHECK (app_hidden.has_permission(auth.uid(), 'tags:manage'));

-- Dual write: module managers OR article authors (find-or-create from editor)
DROP POLICY IF EXISTS "article authors manage tags" ON public.tags;
DROP POLICY IF EXISTS tags_manage ON public.tags;
CREATE POLICY tags_manage ON public.tags
  FOR ALL
  USING (
    app_hidden.has_permission(auth.uid(), 'tags:manage')
    OR app_hidden.has_permission(auth.uid(), 'articles:create')
  )
  WITH CHECK (
    app_hidden.has_permission(auth.uid(), 'tags:manage')
    OR app_hidden.has_permission(auth.uid(), 'articles:create')
  );

-- Extend has_permission with tags:manage (editorial leadership)
CREATE OR REPLACE FUNCTION app_hidden.has_permission(
  _user_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = 'super_admin'
    ) THEN true
    WHEN _permission IN ('dashboard:view', 'media:view') THEN EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    )
    WHEN _permission IN (
      'articles:view', 'articles:create', 'articles:edit_own'
    ) THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor',
          'reporter', 'contributor', 'translator'
        ])
    )
    WHEN _permission IN ('articles:edit_all', 'articles:publish', 'articles:delete') THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor'
        ])
    )
    WHEN _permission = 'articles:review' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor', 'fact_checker'
        ])
    )
    WHEN _permission IN ('categories:manage', 'tags:manage') THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    WHEN _permission = 'staff:manage' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    WHEN _permission = 'media:upload' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor',
          'reporter', 'photographer', 'videographer'
        ])
    )
    WHEN _permission = 'media:manage_all' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    WHEN _permission IN ('comments:moderate', 'analytics:view') THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'section_editor'
        ])
    )
    WHEN _permission = 'newsroom:manage' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY['editor_in_chief', 'managing_editor'])
    )
    WHEN _permission = 'videos:manage' THEN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id
        AND role::text = ANY (ARRAY[
          'editor_in_chief', 'managing_editor', 'videographer'
        ])
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION app_hidden.has_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_hidden.has_permission(uuid, text)
TO authenticated, service_role;
