-- ============ SCHEMAS ============
CREATE SCHEMA IF NOT EXISTS app_hidden;
GRANT USAGE ON SCHEMA app_hidden TO authenticated, service_role;

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'editor_in_chief',
    'managing_editor',
    'section_editor',
    'reporter',
    'contributor',
    'photographer',
    'videographer',
    'fact_checker',
    'translator'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.article_status AS ENUM ('draft', 'review', 'scheduled', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.badge_type AS ENUM ('none','breaking','live','exclusive','opinion','premium','alert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ambassador_status AS ENUM ('active','recalled','vacant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.embassy_status AS ENUM ('open','limited','closed','alert');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.war_status AS ENUM ('active','ceasefire','tension');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comment_status AS ENUM ('pending', 'approved', 'rejected', 'spam', 'flagged');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============ TABLES ============

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  byline_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(social_links) = 'object'),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'invited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Sections
CREATE TABLE IF NOT EXISTS public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  category_type TEXT DEFAULT 'standard',
  icon_url TEXT,
  cover_image_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'hidden')),
  color TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  seo_title TEXT,
  meta_description TEXT,
  focus_keywords TEXT[] DEFAULT '{}',
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  seo_score INT DEFAULT 0,
  ai_summary TEXT,
  topic_cluster TEXT,
  search_intent TEXT,
  semantic_keywords TEXT[] DEFAULT '{}',
  entities JSONB DEFAULT '[]'::jsonb,
  ai_score INT DEFAULT 0,
  news_eligible BOOLEAN NOT NULL DEFAULT false,
  news_sitemap BOOLEAN NOT NULL DEFAULT false,
  news_priority INT DEFAULT 5,
  breaking_news BOOLEAN NOT NULL DEFAULT false,
  schema_type TEXT DEFAULT 'CollectionPage',
  language TEXT DEFAULT 'en',
  region TEXT,
  country TEXT,
  default_author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  access_mode TEXT DEFAULT 'public',
  discover_eligible BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT sections_parent_not_self CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX IF NOT EXISTS sections_parent_sort_idx ON public.sections(parent_id, sort_order, name);
CREATE INDEX IF NOT EXISTS sections_visibility_idx ON public.sections(visibility, sort_order);
CREATE INDEX IF NOT EXISTS sections_featured_idx ON public.sections(featured, sort_order);
CREATE INDEX IF NOT EXISTS sections_updated_at_idx ON public.sections(updated_at DESC);
CREATE INDEX IF NOT EXISTS sections_seo_score_idx ON public.sections(seo_score DESC);

CREATE TABLE IF NOT EXISTS public.category_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS category_activity_logs_section_idx ON public.category_activity_logs(section_id, created_at DESC);
CREATE INDEX IF NOT EXISTS category_activity_logs_actor_idx ON public.category_activity_logs(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.category_module_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  general JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo_defaults JSONB NOT NULL DEFAULT '{}'::jsonb,
  social JSONB NOT NULL DEFAULT '{}'::jsonb,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  notifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  advanced JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);
INSERT INTO public.category_module_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Editor Section Access
CREATE TABLE IF NOT EXISTS public.editor_section_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, section_id)
);

-- Tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

-- Articles
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  deck TEXT,
  body TEXT,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  region TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status public.article_status NOT NULL DEFAULT 'draft',
  badge_type public.badge_type NOT NULL DEFAULT 'none',
  hero_image_url TEXT,
  seo_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  canonical_url TEXT,
  robots_index BOOLEAN NOT NULL DEFAULT true,
  robots_follow BOOLEAN NOT NULL DEFAULT true,
  schema_type TEXT NOT NULL DEFAULT 'NewsArticle'
    CHECK (schema_type IN ('NewsArticle', 'Article', 'Review', 'Report')),
  og_title TEXT,
  og_description TEXT,
  og_image_url TEXT,
  twitter_card TEXT NOT NULL DEFAULT 'summary_large_image'
    CHECK (twitter_card IN ('summary', 'summary_large_image')),
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image_url TEXT,
  rss_inclusion BOOLEAN NOT NULL DEFAULT true,
  hreflang JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(hreflang) = 'object'),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  google_news BOOLEAN NOT NULL DEFAULT false,
  google_discover BOOLEAN NOT NULL DEFAULT false,
  language TEXT NOT NULL DEFAULT 'en',
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS articles_section_idx ON public.articles(section_id);
CREATE INDEX IF NOT EXISTS articles_status_pub_idx ON public.articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_is_featured_idx ON public.articles (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS articles_google_news_idx ON public.articles (google_news) WHERE google_news = true;
CREATE INDEX IF NOT EXISTS articles_google_discover_idx ON public.articles (google_discover) WHERE google_discover = true;
CREATE INDEX IF NOT EXISTS articles_badge_type_idx ON public.articles (badge_type) WHERE badge_type <> 'none';

-- Article Tags
CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY(article_id, tag_id)
);

-- Ambassadors
CREATE TABLE IF NOT EXISTS public.ambassadors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  position TEXT,
  flag_emoji TEXT,
  avatar_url TEXT,
  quote TEXT,
  tags TEXT[] DEFAULT '{}',
  interview_url TEXT,
  status public.ambassador_status NOT NULL DEFAULT 'active',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embassies
CREATE TABLE IF NOT EXISTS public.embassies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  ambassador_id UUID REFERENCES public.ambassadors(id) ON DELETE SET NULL,
  headline TEXT,
  status public.embassy_status NOT NULL DEFAULT 'open',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- War Monitor
CREATE TABLE IF NOT EXISTS public.war_monitor_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_name TEXT NOT NULL,
  countries TEXT[] DEFAULT '{}',
  headline TEXT,
  status public.war_status NOT NULL DEFAULT 'active',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticker
CREATE TABLE IF NOT EXISTS public.ticker_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  tag TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Videos
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  duration TEXT,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Digital asset management
CREATE TABLE IF NOT EXISTS public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  parent_id uuid REFERENCES public.media_folders(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_folders_no_self_parent CHECK (parent_id IS DISTINCT FROM id)
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL CHECK (bucket IN ('article-hero', 'avatars', 'media-library')),
  object_path text NOT NULL UNIQUE,
  public_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  asset_type text NOT NULL DEFAULT 'image' CHECK (asset_type IN ('image', 'video', 'audio', 'document')),
  alt_text text,
  caption text,
  copyright text,
  folder_id uuid REFERENCES public.media_folders(id) ON DELETE SET NULL,
  width integer,
  height integer,
  duration_seconds numeric,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_asset_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('article', 'ambassador', 'video', 'other')),
  entity_id uuid NOT NULL,
  field text NOT NULL CHECK (char_length(trim(field)) BETWEEN 1 AND 80),
  entity_title text,
  entity_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_asset_usages_unique UNIQUE (asset_id, entity_type, entity_id, field)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(trim(author_name)) BETWEEN 2 AND 80),
  author_email text NOT NULL CHECK (char_length(trim(author_email)) BETWEEN 5 AND 254),
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 2 AND 4000),
  status public.comment_status NOT NULL DEFAULT 'pending',
  auto_flags text[] NOT NULL DEFAULT '{}'::text[],
  moderation_note text,
  moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comment_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text,
  blocked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comment_blocks_email_lower CHECK (email = lower(trim(email))),
  CONSTRAINT comment_blocks_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS public.newsroom_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  publication_name text NOT NULL DEFAULT 'Diplomacy Lens',
  short_name text NOT NULL DEFAULT 'DL',
  tagline text NOT NULL DEFAULT 'Global affairs. Clear perspective.',
  contact_email text,
  timezone text NOT NULL DEFAULT 'UTC',
  default_article_status public.article_status NOT NULL DEFAULT 'draft',
  comments_enabled boolean NOT NULL DEFAULT true,
  seo_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidr text NOT NULL,
  label text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_ip_whitelist_cidr_unique UNIQUE (cidr)
);

CREATE TABLE IF NOT EXISTS public.admin_backup_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Manual checkpoint',
  notes text,
  status text NOT NULL DEFAULT 'recorded',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_email text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  snapshot jsonb NOT NULL,
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, version)
);

CREATE TABLE IF NOT EXISTS public.article_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('editorial', 'fact_check')),
  body text NOT NULL CHECK (char_length(trim(body)) > 0),
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

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
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.article_daily_metrics (
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT current_date,
  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  PRIMARY KEY (article_id, metric_date)
);

-- ============ SECURITY HELPER FUNCTIONS ============

CREATE OR REPLACE FUNCTION app_hidden.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION app_hidden.can_edit_section(_user_id uuid, _section_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app_hidden.has_role(_user_id,'super_admin')
      OR EXISTS(SELECT 1 FROM public.editor_section_access WHERE profile_id = _user_id AND section_id = _section_id);
$$;

REVOKE ALL ON SCHEMA app_hidden FROM PUBLIC;
GRANT USAGE ON SCHEMA app_hidden TO authenticated, service_role;
REVOKE ALL ON FUNCTION app_hidden.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION app_hidden.can_edit_section(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_hidden.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app_hidden.can_edit_section(uuid, uuid) TO authenticated, service_role;

-- Canonical article create/update/publish RPC.
CREATE OR REPLACE FUNCTION public.admin_upsert_article(
  p_title text,
  p_section_id uuid,
  p_status public.article_status DEFAULT 'draft',
  p_id uuid DEFAULT NULL,
  p_deck text DEFAULT NULL,
  p_body text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_badge_type public.badge_type DEFAULT 'none',
  p_hero_image_url text DEFAULT NULL,
  p_slug text DEFAULT NULL
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result public.articles;
  v_slug text;
  v_published_at timestamptz;
  existing public.articles;
  can_publish boolean;
  can_edit boolean;
  is_super boolean;
  is_section_editor boolean;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(COALESCE(p_title, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Title is required' USING ERRCODE = '22023';
  END IF;

  IF p_section_id IS NULL THEN
    RAISE EXCEPTION 'Section is required' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = uid) THEN
    RAISE EXCEPTION 'No newsroom role assigned' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.profiles (id, name)
  VALUES (uid, split_part(COALESCE(auth.jwt() ->> 'email', 'editor'), '@', 1))
  ON CONFLICT (id) DO NOTHING;

  is_super := EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'super_admin'
  );
  is_section_editor := EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = uid AND role = 'section_editor'
  );

  can_publish :=
    is_super
    OR is_section_editor
    OR EXISTS (
      SELECT 1 FROM public.editor_section_access
      WHERE profile_id = uid AND section_id = p_section_id
    );

  IF p_status = 'published' AND NOT can_publish THEN
    RAISE EXCEPTION 'Publishing permission required' USING ERRCODE = '42501';
  END IF;

  v_slug := NULLIF(trim(COALESCE(p_slug, '')), '');
  IF v_slug IS NULL THEN
    v_slug := trim(both '-' from lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g')));
    IF v_slug IS NULL OR v_slug = '' THEN
      v_slug := 'post-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    END IF;
    v_slug := left(v_slug, 80);
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT * INTO existing FROM public.articles WHERE id = p_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002';
    END IF;

    can_edit :=
      is_super
      OR is_section_editor
      OR EXISTS (
        SELECT 1 FROM public.editor_section_access
        WHERE profile_id = uid AND section_id = COALESCE(p_section_id, existing.section_id)
      )
      OR (
        existing.author_id = uid
        AND existing.status <> 'published'
        AND p_status <> 'published'
      );

    IF NOT can_edit THEN
      RAISE EXCEPTION 'Editing permission required' USING ERRCODE = '42501';
    END IF;

    v_published_at := CASE
      WHEN p_status = 'published' THEN COALESCE(existing.published_at, now())
      ELSE NULL
    END;

    UPDATE public.articles SET
      title = trim(p_title),
      deck = p_deck,
      body = p_body,
      section_id = p_section_id,
      region = p_region,
      badge_type = COALESCE(p_badge_type, 'none'),
      hero_image_url = p_hero_image_url,
      status = p_status,
      slug = v_slug,
      published_at = v_published_at,
      updated_at = now()
    WHERE id = p_id
    RETURNING * INTO result;
  ELSE
    INSERT INTO public.articles (
      title, deck, body, section_id, region, badge_type, hero_image_url,
      status, slug, author_id, published_at
    ) VALUES (
      trim(p_title), p_deck, p_body, p_section_id, p_region,
      COALESCE(p_badge_type, 'none'), p_hero_image_url,
      p_status, v_slug, uid,
      CASE WHEN p_status = 'published' THEN now() ELSE NULL END
    )
    RETURNING * INTO result;
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text, public.badge_type, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_upsert_article(
  text, uuid, public.article_status, uuid, text, text, text, public.badge_type, text, text
) TO authenticated, service_role;

-- ============ ROW LEVEL SECURITY POLICIES ============

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editor_section_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embassies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.war_monitor_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticker_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT ON public.sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.editor_section_access TO authenticated;
GRANT ALL ON public.editor_section_access TO service_role;

GRANT SELECT ON public.tags TO anon, authenticated;
GRANT ALL ON public.tags TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.tags TO authenticated;

GRANT SELECT ON public.articles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;

GRANT SELECT ON public.article_tags TO anon, authenticated;
GRANT INSERT, DELETE ON public.article_tags TO authenticated;
GRANT ALL ON public.article_tags TO service_role;

GRANT SELECT ON public.ambassadors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ambassadors TO authenticated;
GRANT ALL ON public.ambassadors TO service_role;

GRANT SELECT ON public.embassies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.embassies TO authenticated;
GRANT ALL ON public.embassies TO service_role;

GRANT SELECT ON public.war_monitor_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.war_monitor_items TO authenticated;
GRANT ALL ON public.war_monitor_items TO service_role;

GRANT SELECT ON public.ticker_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticker_items TO authenticated;
GRANT ALL ON public.ticker_items TO service_role;

GRANT SELECT ON public.videos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;

-- Policies

-- profiles
DROP POLICY IF EXISTS "profiles are public readable" ON public.profiles;
CREATE POLICY "profiles are public readable" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "super admins manage roles" ON public.user_roles;
CREATE POLICY "super admins manage roles" ON public.user_roles FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin'));

-- sections
DROP POLICY IF EXISTS "sections public read" ON public.sections;
CREATE POLICY "sections public read" ON public.sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "super admins manage sections" ON public.sections;
CREATE POLICY "super admins manage sections" ON public.sections FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin'));

-- editor_section_access
DROP POLICY IF EXISTS "editors view own access" ON public.editor_section_access;
CREATE POLICY "editors view own access" ON public.editor_section_access FOR SELECT USING ((auth.uid() = profile_id) OR app_hidden.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "super admins manage access" ON public.editor_section_access;
CREATE POLICY "super admins manage access" ON public.editor_section_access FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin'));

-- tags
DROP POLICY IF EXISTS "tags public read" ON public.tags;
CREATE POLICY "tags public read" ON public.tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "editors manage tags" ON public.tags;
CREATE POLICY "editors manage tags" ON public.tags FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor'));

-- articles
DROP POLICY IF EXISTS "published articles public" ON public.articles;
CREATE POLICY "published articles public" ON public.articles FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "authors view own drafts" ON public.articles;
CREATE POLICY "authors view own drafts" ON public.articles FOR SELECT TO authenticated USING ((author_id = auth.uid()) OR app_hidden.has_role(auth.uid(),'super_admin') OR ((section_id IS NOT NULL) AND app_hidden.can_edit_section(auth.uid(), section_id)));
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

-- article_tags
DROP POLICY IF EXISTS "article_tags public read" ON public.article_tags;
CREATE POLICY "article_tags public read" ON public.article_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "editors manage article_tags" ON public.article_tags;
CREATE POLICY "editors manage article_tags" ON public.article_tags FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor') OR app_hidden.has_role(auth.uid(),'contributor'));

-- ambassadors
DROP POLICY IF EXISTS "ambassadors public read" ON public.ambassadors;
CREATE POLICY "ambassadors public read" ON public.ambassadors FOR SELECT USING (true);
DROP POLICY IF EXISTS "editors manage ambassadors" ON public.ambassadors;
CREATE POLICY "editors manage ambassadors" ON public.ambassadors FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- embassies
DROP POLICY IF EXISTS "embassies public read" ON public.embassies;
CREATE POLICY "embassies public read" ON public.embassies FOR SELECT USING (true);
DROP POLICY IF EXISTS "editors manage embassies" ON public.embassies;
CREATE POLICY "editors manage embassies" ON public.embassies FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- war_monitor_items
DROP POLICY IF EXISTS "war public read" ON public.war_monitor_items;
CREATE POLICY "war public read" ON public.war_monitor_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "editors manage war" ON public.war_monitor_items;
CREATE POLICY "editors manage war" ON public.war_monitor_items FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- ticker_items
DROP POLICY IF EXISTS "ticker public read active" ON public.ticker_items;
CREATE POLICY "ticker public read active" ON public.ticker_items FOR SELECT USING (active);
DROP POLICY IF EXISTS "editors read all ticker" ON public.ticker_items;
CREATE POLICY "editors read all ticker" ON public.ticker_items FOR SELECT TO authenticated USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));
DROP POLICY IF EXISTS "editors manage ticker" ON public.ticker_items;
CREATE POLICY "editors manage ticker" ON public.ticker_items FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));

-- videos
DROP POLICY IF EXISTS "videos public read" ON public.videos;
CREATE POLICY "videos public read" ON public.videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "editors manage videos" ON public.videos;
CREATE POLICY "editors manage videos" ON public.videos FOR ALL USING (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor')) WITH CHECK (app_hidden.has_role(auth.uid(),'super_admin') OR app_hidden.has_role(auth.uid(),'section_editor'));


-- ============ TRIGGERS AND FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS articles_touch ON public.articles;
CREATE TRIGGER articles_touch BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS ambassadors_touch ON public.ambassadors;
CREATE TRIGGER ambassadors_touch BEFORE UPDATE ON public.ambassadors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS embassies_touch ON public.embassies;
CREATE TRIGGER embassies_touch BEFORE UPDATE ON public.embassies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS war_touch ON public.war_monitor_items;
CREATE TRIGGER war_touch BEFORE UPDATE ON public.war_monitor_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- New User trigger function to auto-profile/role creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles(id, name, email, avatar_url, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN COALESCE(NEW.raw_user_meta_data->>'invited', '') = 'true' THEN 'invited' ELSE 'active' END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);

  IF COALESCE(NEW.raw_user_meta_data->>'invited', '') <> 'true' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'contributor')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.prevent_last_super_admin_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removing_super_admin boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    removing_super_admin := OLD.role = 'super_admin';
  ELSE
    removing_super_admin := OLD.role = 'super_admin' AND NEW.role <> 'super_admin';
  END IF;

  IF removing_super_admin AND NOT EXISTS (
       SELECT 1
       FROM public.user_roles
       WHERE role = 'super_admin' AND id <> OLD.id
     )
  THEN
    RAISE EXCEPTION 'At least one super admin is required' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_last_super_admin ON public.user_roles;
CREATE TRIGGER protect_last_super_admin
BEFORE DELETE OR UPDATE OF role ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_super_admin_removal();

-- ============ STORAGE BUCKET POLICIES ============

-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES ('article-hero', 'article-hero', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('media-library', 'media-library', true) ON CONFLICT (id) DO NOTHING;
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id IN ('article-hero', 'avatars');
UPDATE storage.buckets
SET public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-wav',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain', 'text/csv', 'application/rtf'
    ]
WHERE id = 'media-library';

-- Policies for objects in storage
DROP POLICY IF EXISTS "public read hero" ON storage.objects;
CREATE POLICY "public read hero" ON storage.objects FOR SELECT USING (bucket_id = 'article-hero');

DROP POLICY IF EXISTS "public read avatars" ON storage.objects;
CREATE POLICY "public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "public read media library" ON storage.objects;
CREATE POLICY "public read media library" ON storage.objects FOR SELECT USING (bucket_id = 'media-library');

DROP POLICY IF EXISTS "authed upload hero" ON storage.objects;
CREATE POLICY "authed upload hero" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'article-hero' AND (
      app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
      OR app_hidden.has_role(auth.uid(),'contributor')
    )
  );

DROP POLICY IF EXISTS "authed upload avatars" ON storage.objects;
CREATE POLICY "authed upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authed update avatars own" ON storage.objects;
CREATE POLICY "authed update avatars own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authed update hero editorial" ON storage.objects;
CREATE POLICY "authed update hero editorial" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'article-hero' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  )
  WITH CHECK (
    bucket_id = 'article-hero' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  );

DROP POLICY IF EXISTS "authed delete avatars own" ON storage.objects;
CREATE POLICY "authed delete avatars own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authed delete hero editorial" ON storage.objects;
CREATE POLICY "authed delete hero editorial" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'article-hero' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  );

DROP POLICY IF EXISTS "permitted staff upload media library" ON storage.objects;
CREATE POLICY "permitted staff upload media library" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media-library' AND (
      app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
      OR app_hidden.has_role(auth.uid(),'contributor')
    )
  );

DROP POLICY IF EXISTS "owners and media managers update media library" ON storage.objects;
CREATE POLICY "owners and media managers update media library" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'media-library' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  )
  WITH CHECK (
    bucket_id = 'media-library' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  );

DROP POLICY IF EXISTS "owners and media managers delete media library" ON storage.objects;
CREATE POLICY "owners and media managers delete media library" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'media-library' AND (
      owner = auth.uid()
      OR app_hidden.has_role(auth.uid(),'super_admin')
      OR app_hidden.has_role(auth.uid(),'section_editor')
    )
  );


-- ============ SEED DATA ============

-- 1. Sections
INSERT INTO public.sections (id, slug, name, color, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'war', 'War Monitor', '#B31B2E', 1),
  ('22222222-2222-2222-2222-222222222222', 'ambassadors', 'Ambassadors', '#0E1524', 2),
  ('33333333-3333-3333-3333-333333333333', 'embassy-watch', 'Embassy Watch', '#B4893C', 3),
  ('44444444-4444-4444-4444-444444444444', 'pakistan', 'Pakistan', '#0f766e', 4),
  ('55555555-5555-5555-5555-555555555555', 'uae', 'UAE', '#0284c7', 5),
  ('66666666-6666-6666-6666-666666666666', 'india', 'India', '#ea580c', 6),
  ('77777777-7777-7777-7777-777777777777', 'world', 'World', '#4f46e5', 7),
  ('88888888-8888-8888-8888-888888888888', 'business', 'Business', '#059669', 8),
  ('99999999-9999-9999-9999-999999999999', 'sports', 'Sports', '#2563eb', 9),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'lifestyle', 'Lifestyle', '#db2777', 10),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'opinion', 'Opinion', '#7c3aed', 11),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'sci-tech', 'Sci-Tech', '#0369a1', 12)
ON CONFLICT (id) DO NOTHING;

-- 2. Ambassadors
INSERT INTO public.ambassadors (id, name, country, position, flag_emoji, quote, tags, status, featured) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'His Excellency Zhang Wei', 'China', 'Ambassador to the United Nations', '🇨🇳', 'Diplomacy is not about winning arguments, but about finding common ground for global peace.', ARRAY['UNSC', 'Multilateralism', 'Trade'], 'active', true),
  ('a2222222-2222-2222-2222-222222222222', 'Her Excellency Sarah Jenkins', 'United Kingdom', 'Ambassador to the United States', '🇬🇧', 'In a complex world, our partnerships are our greatest strength. We build bridges, not walls.', ARRAY['Special Relationship', 'NATO', 'Climate Action'], 'active', true),
  ('a3333333-3333-3333-3333-333333333333', 'His Excellency Faisal Al-Saud', 'Saudi Arabia', 'Ambassador to Pakistan', '🇸🇦', 'The bonds between our nations are rooted in shared history, values, and a mutual vision for regional stability.', ARRAY['Bilateral Relations', 'Investment', 'Energy Cooperation'], 'active', true),
  ('a4444444-4444-4444-4444-444444444444', 'Her Excellency Elena Rostova', 'Russia', 'Ambassador to India', '🇷🇺', 'Bilateral cooperation in aerospace and defense remains the cornerstone of our strategic partnership.', ARRAY['BRICS', 'Defense', 'Space Exploration'], 'active', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Embassies
INSERT INTO public.embassies (id, country, ambassador_id, headline, status) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'United States', 'a2222222-2222-2222-2222-222222222222', 'Embassy watch lists increased security guidelines following regional cyber warnings.', 'open'),
  ('e2222222-2222-2222-2222-222222222222', 'Saudi Arabia', 'a3333333-3333-3333-3333-333333333333', 'Consular services fully operational; trade delegation scheduled for next month.', 'open'),
  ('e3333333-3333-3333-3333-333333333333', 'Ukraine', NULL, 'Consulate operating under limited hours due to power infrastructure constraints.', 'limited'),
  ('e4444444-4444-4444-4444-444444444444', 'Sudan', NULL, 'Operations temporarily suspended. All diplomatic staff recalled to regional bureau.', 'closed'),
  ('e5555555-5555-5555-5555-555555555555', 'Lebanon', NULL, 'Embassy watch issues travel alert for citizens inside the capital zone.', 'alert')
ON CONFLICT (id) DO NOTHING;

-- 4. War Monitor Items
INSERT INTO public.war_monitor_items (id, conflict_name, countries, headline, status) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Eastern Europe Conflict', ARRAY['Ukraine', 'Russia'], 'Frontline shelling intensifies in the Donbas sector; energy grid repairs underway.', 'active'),
  ('c2222222-2222-2222-2222-222222222222', 'Gaza Strip & Border Zone', ARRAY['Israel', 'Palestine'], 'High-level ceasefire negotiations resume in Cairo with international mediators.', 'ceasefire'),
  ('c3333333-3333-3333-3333-333333333333', 'Red Sea Maritime Corridor', ARRAY['Yemen', 'US', 'UK'], 'Naval coalition intercepts drone threats; global shipping lanes maintain alert status.', 'tension')
ON CONFLICT (id) DO NOTHING;

-- 5. Ticker Items
INSERT INTO public.ticker_items (id, text, tag, active, sort_order) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'UNSC convenes emergency session on maritime security in the Red Sea.', 'LIVE', true, 1),
  ('d2222222-2222-2222-2222-222222222222', 'Saudi Arabia announces $2B investment program in green hydrogen sectors.', 'EXCLUSIVE', true, 2),
  ('d3333333-3333-3333-3333-333333333333', 'G20 summit draft calls for coordinated framework on sovereign debt restructuring.', 'BREAKING', true, 3),
  ('d4444444-4444-4444-4444-444444444444', 'UK and EU announce joint agreement on cyber defence operations.', 'LIVE', true, 4)
ON CONFLICT (id) DO NOTHING;

-- 6. Videos
INSERT INTO public.videos (id, title, category, thumbnail_url, video_url, duration, published_at) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Inside the UNSC Chamber: How Resolutions are Negotiated', 'Special Report', 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=800', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '14:20', now() - interval '2 days'),
  ('b2222222-2222-2222-2222-222222222222', 'The New Silk Road: Trade, Ports, and Geopolitics', 'Documentary', 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=800', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '22:15', now() - interval '5 days'),
  ('b3333333-3333-3333-3333-333333333333', 'Interview with Sarah Jenkins: The Future of NATO', 'Interview', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '08:45', now() - interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- 7. Seed Articles
INSERT INTO public.articles (id, slug, title, deck, body, section_id, region, author_id, status, badge_type, hero_image_url, published_at) VALUES
  (
    'f1111111-1111-1111-1111-111111111111',
    'red-sea-naval-coalition-patrols',
    'Red Sea Naval Coalition Expands Maritime Security Patrols',
    'The joint command has increased anti-drone sweeps in the commercial shipping lanes as transit volumes begin to stabilize.',
    'A coalition of naval forces led by US and UK commands has formally expanded its maritime security operations in the southern Red Sea. The security desk reported a 15% increase in commercial transit volumes over the past ten days, indicating that shippers are beginning to regain confidence in the patrol coverage.

Senior military officers stated that patrols are now utilizing advanced air-defense sweeps and coordinated drone interception capabilities. The goal is to provide a continuous security umbrella for container ships passing through the Bab-el-Mandeb strait.

Diplomatic sources in Riyadh and Cairo have welcomed the expansion, noting that stable transit routes are essential for global trade stability and for preventing inflation in regional food and energy supplies.',
    '11111111-1111-1111-1111-111111111111',
    'Red Sea',
    NULL,
    'published',
    'breaking',
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?q=80&w=1200',
    now()
  ),
  (
    'f2222222-2222-2222-2222-222222222222',
    'exclusive-interview-zhang-wei',
    'Exclusive: UN Ambassador Zhang Wei on Multilateral Reform',
    'In a wide-ranging interview, Ambassador Zhang calls for a renewed focus on G20 cooperation and sovereign debt security.',
    'We sat down with Chinese Ambassador Zhang Wei at the UN headquarters to discuss the rising tensions in multilateral frameworks and the prospects of global financial governance reform.

Zhang stressed that international bodies must adapt to the economic realities of the global south. He argued that the current structures, built in the mid-20th century, no longer fully reflect the interests of emerging economies.

"Our goal should not be to dismantle the existing system, but to reform it from within. We need structures that prioritize cooperative development and shield developing nations from abrupt economic shocks," Zhang remarked during the 45-minute discussion.',
    '22222222-2222-2222-2222-222222222222',
    'New York',
    NULL,
    'published',
    'exclusive',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1200',
    now() - interval '1 hour'
  ),
  (
    'f3333333-3333-3333-3333-333333333333',
    'future-of-global-cooperation-g20',
    'The Future of Global Cooperation Lies in BRICS and G20 Integration',
    'An analysis of how emerging alliances are reshaping traditional trade treaties and diplomatic negotiations.',
    'Traditional global institutions are facing unprecedented structural headwinds. As polarization increases between major power blocs, alternative platforms like the G20 and BRICS are emerging as the main venues for substantive policy coordination.

Sovereign debt restructuring, climate finance, and digital trade rules are no longer being decided solely within western-led organizations. Instead, consensus is being built across wider networks.

This shift represents a democratization of global governance, but it also increases the complexity of achieving binding global treaties. Diplomats must prepare for a more fragmented, yet highly interconnected, international landscape.',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Global',
    NULL,
    'published',
    'opinion',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200',
    now() - interval '4 hours'
  ),
  (
    'f4444444-4444-4444-4444-444444444444',
    'pakistan-secures-new-green-energy-grants',
    'Pakistan Secures New Green Energy Infrastructure Grants',
    'The funding will support solar and wind grid installations in Balochistan and Sindh provinces.',
    'The Ministry of Energy has finalized a new round of funding grants with international development banks to expand renewable energy capacity. The grants, totaling $450M, will go directly toward grid integration for solar and wind arrays in southwestern Pakistan.

This initiative is expected to reduce reliance on imported fossil fuels and provide stable, low-cost power to remote regional sectors. Construction is slated to begin early next year, with full operation targeted by 2028.',
    '44444444-4444-4444-4444-444444444444',
    'Islamabad',
    NULL,
    'published',
    'none',
    NULL,
    now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;
