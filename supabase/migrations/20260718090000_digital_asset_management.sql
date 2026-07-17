-- Digital Asset Management: folders, multi-type assets, usage tracking.
-- Apply after 20260718080000_staff_management.sql.

-- ============ FOLDERS ============

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

CREATE INDEX IF NOT EXISTS media_folders_parent_idx
  ON public.media_folders(parent_id, sort_order, name);

-- ============ EXPAND media_assets ============

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_bucket_check;

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_mime_type_check;

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_size_bytes_check;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS asset_type text,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS copyright text,
  ADD COLUMN IF NOT EXISTS folder_id uuid,
  ADD COLUMN IF NOT EXISTS width integer,
  ADD COLUMN IF NOT EXISTS height integer,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.media_assets
SET asset_type = CASE
  WHEN mime_type LIKE 'video/%' THEN 'video'
  WHEN mime_type LIKE 'audio/%' THEN 'audio'
  WHEN mime_type LIKE 'image/%' THEN 'image'
  ELSE 'document'
END
WHERE asset_type IS NULL;

ALTER TABLE public.media_assets
  ALTER COLUMN asset_type SET DEFAULT 'image',
  ALTER COLUMN asset_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_asset_type_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_asset_type_check
      CHECK (asset_type IN ('image', 'video', 'audio', 'document'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_bucket_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_bucket_check
      CHECK (bucket IN ('article-hero', 'avatars', 'media-library'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_size_bytes_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_size_bytes_check
      CHECK (size_bytes > 0 AND size_bytes <= 52428800);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_folder_id_fkey'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_folder_id_fkey
      FOREIGN KEY (folder_id) REFERENCES public.media_folders(id) ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS media_assets_type_idx
  ON public.media_assets(asset_type, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_folder_idx
  ON public.media_assets(folder_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_file_name_idx
  ON public.media_assets(lower(file_name));

-- ============ USAGE TRACKING ============

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

CREATE INDEX IF NOT EXISTS media_asset_usages_asset_idx
  ON public.media_asset_usages(asset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_asset_usages_entity_idx
  ON public.media_asset_usages(entity_type, entity_id);

-- ============ STORAGE BUCKET ============

INSERT INTO storage.buckets (id, name, public)
VALUES ('media-library', 'media-library', true)
ON CONFLICT (id) DO NOTHING;

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

DROP POLICY IF EXISTS "public read media library" ON storage.objects;
CREATE POLICY "public read media library"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-library');

DROP POLICY IF EXISTS "permitted staff upload media library" ON storage.objects;
CREATE POLICY "permitted staff upload media library"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media-library'
  AND app_hidden.has_permission(auth.uid(), 'media:upload')
);

DROP POLICY IF EXISTS "owners and media managers update media library" ON storage.objects;
CREATE POLICY "owners and media managers update media library"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media-library'
  AND (
    owner = auth.uid()
    OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
  )
)
WITH CHECK (
  bucket_id = 'media-library'
  AND (
    owner = auth.uid()
    OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
  )
);

DROP POLICY IF EXISTS "owners and media managers delete media library" ON storage.objects;
CREATE POLICY "owners and media managers delete media library"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media-library'
  AND (
    owner = auth.uid()
    OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
  )
);

-- ============ RLS ============

ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permitted staff read media folders" ON public.media_folders;
CREATE POLICY "permitted staff read media folders"
ON public.media_folders FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'media:view'));

DROP POLICY IF EXISTS "permitted staff manage media folders" ON public.media_folders;
CREATE POLICY "permitted staff manage media folders"
ON public.media_folders FOR ALL TO authenticated
USING (
  app_hidden.has_permission(auth.uid(), 'media:upload')
  OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
)
WITH CHECK (
  app_hidden.has_permission(auth.uid(), 'media:upload')
  OR app_hidden.has_permission(auth.uid(), 'media:manage_all')
);

DROP POLICY IF EXISTS "permitted staff read media usages" ON public.media_asset_usages;
CREATE POLICY "permitted staff read media usages"
ON public.media_asset_usages FOR SELECT TO authenticated
USING (app_hidden.has_permission(auth.uid(), 'media:view'));

DROP POLICY IF EXISTS "permitted staff write media usages" ON public.media_asset_usages;
CREATE POLICY "permitted staff write media usages"
ON public.media_asset_usages FOR ALL TO authenticated
USING (
  app_hidden.has_permission(auth.uid(), 'media:view')
  OR app_hidden.has_permission(auth.uid(), 'articles:edit_own')
  OR app_hidden.has_permission(auth.uid(), 'articles:edit_all')
)
WITH CHECK (
  app_hidden.has_permission(auth.uid(), 'media:view')
  OR app_hidden.has_permission(auth.uid(), 'articles:edit_own')
  OR app_hidden.has_permission(auth.uid(), 'articles:edit_all')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_folders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_asset_usages TO authenticated;
