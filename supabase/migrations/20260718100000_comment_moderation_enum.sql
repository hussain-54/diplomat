-- Step 1/2: add flagged to comment_status.
-- Must be applied and committed before 20260718100001_comment_moderation.sql.
-- Apply after 20260718090000_digital_asset_management.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'comment_status' AND e.enumlabel = 'flagged'
  ) THEN
    ALTER TYPE public.comment_status ADD VALUE 'flagged';
  END IF;
END
$$;
