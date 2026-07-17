-- Step 2/2: comment blocklist, auto-flags, and insert policy.
-- Apply AFTER 20260718100000_comment_moderation_enum.sql has committed.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS auto_flags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS moderation_note text;

CREATE TABLE IF NOT EXISTS public.comment_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text,
  blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comment_blocks_email_lower CHECK (email = lower(trim(email))),
  CONSTRAINT comment_blocks_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS comment_blocks_email_idx ON public.comment_blocks (email);
CREATE INDEX IF NOT EXISTS comments_auto_flags_idx ON public.comments USING gin (auto_flags);

ALTER TABLE public.comment_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment moderators manage blocks" ON public.comment_blocks;
CREATE POLICY "comment moderators manage blocks"
ON public.comment_blocks FOR ALL TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'comments:moderate'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'comments:moderate'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_blocks TO authenticated;

-- Allow auto-classified spam/flagged submissions from the public form.
-- Compare as text so this remains safe if pasted with the enum migration.
DROP POLICY IF EXISTS "public submits comments" ON public.comments;
CREATE POLICY "public submits comments"
ON public.comments FOR INSERT
WITH CHECK (
  status::text = ANY (ARRAY['pending', 'flagged', 'spam'])
  AND moderated_by IS NULL
  AND moderated_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.newsroom_settings
    WHERE id IS TRUE AND comments_enabled IS TRUE
  )
);

-- Blocklist enforcement for public comment inserts.
CREATE OR REPLACE FUNCTION public.enforce_comment_blocklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.comment_blocks
    WHERE email = lower(trim(NEW.author_email))
  ) THEN
    RAISE EXCEPTION 'This email address is blocked from commenting.'
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.author_email := lower(trim(NEW.author_email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_enforce_blocklist ON public.comments;
CREATE TRIGGER comments_enforce_blocklist
BEFORE INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.enforce_comment_blocklist();
