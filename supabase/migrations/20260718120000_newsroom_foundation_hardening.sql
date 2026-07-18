-- Newsroom foundation hardening (additive only).
-- Extends Articles / Revisions / Notifications / Analytics without breaking data.
-- Apply after 20260718110000_newsroom_settings_module.sql.

-- ============ ARTICLES: indexes ============

CREATE INDEX IF NOT EXISTS articles_author_idx
  ON public.articles (author_id);

CREATE INDEX IF NOT EXISTS articles_scheduled_due_idx
  ON public.articles (scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- ============ NOTIFICATIONS: outbox for existing settings prefs ============

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (char_length(trim(event_type)) BETWEEN 1 AND 80),
  channel text NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'in_app', 'webhook')),
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_outbox_pending_idx
  ON public.notification_outbox (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS notification_outbox_recipient_idx
  ON public.notification_outbox (recipient_user_id, created_at DESC);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings managers read notification outbox" ON public.notification_outbox;
CREATE POLICY "settings managers read notification outbox"
ON public.notification_outbox FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'settings:manage'));

DROP POLICY IF EXISTS "settings managers update notification outbox" ON public.notification_outbox;
CREATE POLICY "settings managers update notification outbox"
ON public.notification_outbox FOR UPDATE TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'settings:manage'))
WITH CHECK (app_hidden.has_permission(auth.uid(), 'settings:manage'));

GRANT SELECT, UPDATE ON public.notification_outbox TO authenticated;
GRANT ALL ON public.notification_outbox TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_notification(
  p_event_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_recipient_user_id uuid DEFAULT NULL,
  p_recipient_email text DEFAULT NULL,
  p_channel text DEFAULT 'email'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.notification_outbox (
    event_type, channel, recipient_user_id, recipient_email, payload, status
  )
  VALUES (
    p_event_type,
    COALESCE(NULLIF(p_channel, ''), 'email'),
    p_recipient_user_id,
    lower(nullif(trim(p_recipient_email), '')),
    COALESCE(p_payload, '{}'::jsonb),
    'pending'
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_notification(text, jsonb, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_notification(text, jsonb, uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.notify_on_comment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs jsonb;
  enabled boolean := false;
BEGIN
  SELECT notification_prefs INTO prefs
  FROM public.newsroom_settings
  WHERE id IS TRUE;

  enabled := COALESCE((prefs ->> 'email_on_comment_pending')::boolean, true);
  IF enabled AND NEW.status IN ('pending', 'flagged', 'spam') THEN
    PERFORM public.enqueue_notification(
      'comment.pending',
      jsonb_build_object(
        'comment_id', NEW.id,
        'article_id', NEW.article_id,
        'author_name', NEW.author_name,
        'status', NEW.status
      ),
      NULL,
      (SELECT contact_email FROM public.newsroom_settings WHERE id IS TRUE),
      'email'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_notify_insert ON public.comments;
CREATE TRIGGER comments_notify_insert
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment_insert();

CREATE OR REPLACE FUNCTION public.notify_on_article_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefs jsonb;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT notification_prefs INTO prefs
  FROM public.newsroom_settings
  WHERE id IS TRUE;

  IF NEW.status = 'review'
     AND COALESCE((prefs ->> 'email_on_article_review')::boolean, true) THEN
    PERFORM public.enqueue_notification(
      'article.review',
      jsonb_build_object(
        'article_id', NEW.id,
        'title', NEW.title,
        'slug', NEW.slug,
        'author_id', NEW.author_id
      ),
      NEW.author_id,
      (SELECT contact_email FROM public.newsroom_settings WHERE id IS TRUE),
      'email'
    );
  END IF;

  IF NEW.status = 'published'
     AND COALESCE((prefs ->> 'email_on_publish')::boolean, false) THEN
    PERFORM public.enqueue_notification(
      'article.published',
      jsonb_build_object(
        'article_id', NEW.id,
        'title', NEW.title,
        'slug', NEW.slug,
        'author_id', NEW.author_id
      ),
      NEW.author_id,
      (SELECT contact_email FROM public.newsroom_settings WHERE id IS TRUE),
      'email'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_notify_status ON public.articles;
CREATE TRIGGER articles_notify_status
AFTER UPDATE OF status ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.notify_on_article_status_change();

-- ============ ARTICLES: scheduled publish RPC ============

CREATE OR REPLACE FUNCTION public.publish_due_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  published_count integer := 0;
BEGIN
  WITH due AS (
    UPDATE public.articles
    SET
      status = 'published',
      published_at = COALESCE(published_at, now()),
      scheduled_at = NULL,
      updated_at = now()
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now()
    RETURNING id, title, author_id, slug
  )
  SELECT count(*)::integer INTO published_count FROM due;

  RETURN COALESCE(published_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_due_articles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_due_articles() TO authenticated, service_role;

-- ============ REVISIONS: include tags (backward compatible) ============

CREATE OR REPLACE FUNCTION public.capture_article_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tag_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF OLD IS DISTINCT FROM NEW THEN
    SELECT COALESCE(array_agg(article_tags.tag_id), ARRAY[]::uuid[])
    INTO tag_ids
    FROM public.article_tags
    WHERE article_tags.article_id = OLD.id;

    INSERT INTO public.article_revisions (
      article_id,
      version,
      snapshot,
      changed_by
    )
    VALUES (
      OLD.id,
      COALESCE((
        SELECT max(revision.version) + 1
        FROM public.article_revisions revision
        WHERE revision.article_id = OLD.id
      ), 1),
      jsonb_build_object(
        'article', to_jsonb(OLD),
        'tag_ids', to_jsonb(tag_ids),
        'format', 2
      ),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_article_revision(p_revision_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  revision_row public.article_revisions%ROWTYPE;
  article_json jsonb;
  tag_ids uuid[] := ARRAY[]::uuid[];
  article_id uuid;
BEGIN
  IF NOT app_hidden.has_permission(auth.uid(), 'articles:edit_own')
     AND NOT app_hidden.has_permission(auth.uid(), 'articles:edit_all') THEN
    RAISE EXCEPTION 'Not authorized to restore revisions';
  END IF;

  SELECT * INTO revision_row
  FROM public.article_revisions
  WHERE id = p_revision_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revision not found';
  END IF;

  article_id := revision_row.article_id;

  IF revision_row.snapshot ? 'article' THEN
    article_json := revision_row.snapshot -> 'article';
    IF jsonb_typeof(revision_row.snapshot -> 'tag_ids') = 'array' THEN
      SELECT COALESCE(array_agg(value::uuid), ARRAY[]::uuid[])
      INTO tag_ids
      FROM jsonb_array_elements_text(revision_row.snapshot -> 'tag_ids') AS value;
    END IF;
  ELSE
    -- Legacy flat snapshot (format 1)
    article_json := revision_row.snapshot;
  END IF;

  UPDATE public.articles
  SET
    title = article_json ->> 'title',
    deck = nullif(article_json ->> 'deck', ''),
    body = nullif(article_json ->> 'body', ''),
    section_id = NULLIF(article_json ->> 'section_id', '')::uuid,
    region = nullif(article_json ->> 'region', ''),
    badge_type = COALESCE((article_json ->> 'badge_type')::public.badge_type, 'none'),
    hero_image_url = nullif(article_json ->> 'hero_image_url', ''),
    status = COALESCE((article_json ->> 'status')::public.article_status, 'draft'),
    slug = article_json ->> 'slug',
    scheduled_at = NULLIF(article_json ->> 'scheduled_at', '')::timestamptz,
    seo_title = nullif(article_json ->> 'seo_title', ''),
    meta_description = nullif(article_json ->> 'meta_description', ''),
    focus_keyword = nullif(article_json ->> 'focus_keyword', ''),
    canonical_url = nullif(article_json ->> 'canonical_url', ''),
    robots_index = COALESCE((article_json ->> 'robots_index')::boolean, true),
    robots_follow = COALESCE((article_json ->> 'robots_follow')::boolean, true),
    schema_type = COALESCE(article_json ->> 'schema_type', 'NewsArticle'),
    og_title = nullif(article_json ->> 'og_title', ''),
    og_description = nullif(article_json ->> 'og_description', ''),
    og_image_url = nullif(article_json ->> 'og_image_url', ''),
    twitter_card = COALESCE(article_json ->> 'twitter_card', 'summary_large_image'),
    twitter_title = nullif(article_json ->> 'twitter_title', ''),
    twitter_description = nullif(article_json ->> 'twitter_description', ''),
    twitter_image_url = nullif(article_json ->> 'twitter_image_url', ''),
    rss_inclusion = COALESCE((article_json ->> 'rss_inclusion')::boolean, true),
    hreflang = COALESCE(article_json -> 'hreflang', '{}'::jsonb),
    updated_at = now()
  WHERE id = article_id;

  DELETE FROM public.article_tags WHERE article_tags.article_id = article_id;
  IF coalesce(array_length(tag_ids, 1), 0) > 0 THEN
    INSERT INTO public.article_tags (article_id, tag_id)
    SELECT article_id, unnest(tag_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN article_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restore_article_revision(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_restore_article_revision(uuid) TO authenticated, service_role;

-- ============ ANALYTICS / MEDIA: index hardening ============

CREATE INDEX IF NOT EXISTS article_daily_metrics_article_idx
  ON public.article_daily_metrics (article_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS media_asset_usages_entity_lookup_idx
  ON public.media_asset_usages (entity_type, entity_id, field);
