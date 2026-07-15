-- Run this once in the Supabase SQL Editor to unblock article publishing.
-- At the bottom, set YOUR email before running.

GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;

CREATE OR REPLACE FUNCTION app_hidden.can_edit_section(_user_id uuid, _section_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_hidden.has_role(_user_id,'super_admin')
      OR app_hidden.has_role(_user_id,'section_editor')
      OR EXISTS(SELECT 1 FROM public.editor_section_access WHERE profile_id = _user_id AND section_id = _section_id);
$$;

DROP POLICY IF EXISTS "authorized create articles" ON public.articles;
CREATE POLICY "authorized create articles" ON public.articles FOR INSERT WITH CHECK (
  (author_id = auth.uid()) AND (
    app_hidden.has_role(auth.uid(), 'super_admin')
    OR app_hidden.has_role(auth.uid(), 'section_editor')
    OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
    OR (app_hidden.has_role(auth.uid(), 'contributor') AND status = 'draft'::public.article_status)
  )
);

DROP POLICY IF EXISTS "authorized update articles" ON public.articles;
CREATE POLICY "authorized update articles" ON public.articles FOR UPDATE
USING (
  app_hidden.has_role(auth.uid(), 'super_admin')
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
  OR ((author_id = auth.uid()) AND (status <> 'published'::public.article_status))
)
WITH CHECK (
  app_hidden.has_role(auth.uid(), 'super_admin')
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
  OR ((author_id = auth.uid()) AND (status <> 'published'::public.article_status))
);

DROP POLICY IF EXISTS "authorized delete articles" ON public.articles;
CREATE POLICY "authorized delete articles" ON public.articles FOR DELETE USING (
  app_hidden.has_role(auth.uid(), 'super_admin')
  OR app_hidden.has_role(auth.uid(), 'section_editor')
  OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id))
);

-- 2) Promote your account (edit the email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'REPLACE_WITH_YOUR_EMAIL@example.com'
ON CONFLICT (user_id, role) DO NOTHING;
