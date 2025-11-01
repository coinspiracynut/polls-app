-- =====================================================
-- POLLS APP - POLL STATUS & DRAFT/LIVE FUNCTIONALITY
-- Paste this into Supabase SQL Editor AFTER 05_realtime.sql
-- =====================================================

-- Add status tracking to polls
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Add constraint for valid statuses
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'polls_status_check'
  ) THEN
    ALTER TABLE public.polls ADD CONSTRAINT polls_status_check 
      CHECK (status IN ('draft', 'live', 'closed'));
  END IF;
END $$;

-- Add index for performance on discovery feed
CREATE INDEX IF NOT EXISTS polls_status_published_idx 
  ON public.polls(status, published_at DESC) 
  WHERE is_public = true;

-- Update existing polls to 'live' status (backwards compatibility)
-- Only update polls that don't have a status set yet
UPDATE public.polls 
SET 
  status = 'live', 
  published_at = created_at,
  edited_at = NULL
WHERE status = 'draft' AND created_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.polls.status IS 'Poll status: draft (not published), live (active voting), closed (ended)';
COMMENT ON COLUMN public.polls.published_at IS 'When the poll was published and went live';
COMMENT ON COLUMN public.polls.edited_at IS 'Last time poll was edited (shows "edited" badge if after published_at)';

