-- =====================================================
-- POLLS APP - UPDATE RLS FOR DRAFT POLLS
-- Paste this into Supabase SQL Editor AFTER 06_poll_status.sql
-- This migration is IDEMPOTENT - safe to run multiple times
-- =====================================================

-- ============== SECURITY DEFINER FUNCTIONS ==============
-- These functions bypass RLS to prevent infinite recursion

-- Function to check if user is poll admin (bypasses RLS on poll_admins)
CREATE OR REPLACE FUNCTION public.is_poll_admin(poll_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.poll_admins
    WHERE poll_id = poll_uuid AND user_id = user_uuid
  );
$$;

-- Function to check if user is poll owner (bypasses RLS on polls)
CREATE OR REPLACE FUNCTION public.is_poll_owner(poll_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.polls
    WHERE id = poll_uuid AND owner_id = user_uuid
  );
$$;

-- ============== UPDATE POLLS POLICIES ==============

-- Drop and recreate the read policy to include drafts for owners
DROP POLICY IF EXISTS "read public polls" ON public.polls;
DROP POLICY IF EXISTS "read polls" ON public.polls;

CREATE POLICY "read polls" ON public.polls
  FOR SELECT USING (
    -- Public live polls
    (is_public AND status = 'live')
    -- OR public closed polls (for results)
    OR (is_public AND status = 'closed')
    -- OR owner can see their own drafts/private polls
    OR (owner_id = auth.uid())
    -- OR admins can see polls they manage (use security definer function to avoid recursion)
    OR public.is_poll_admin(id, auth.uid())
  );

-- Drop and recreate the update policy
DROP POLICY IF EXISTS "update own/admin polls" ON public.polls;

CREATE POLICY "update own/admin polls" ON public.polls
  FOR UPDATE TO authenticated USING (
    owner_id = auth.uid() 
    OR public.is_poll_admin(id, auth.uid())
  )
  WITH CHECK (
    owner_id = auth.uid() 
    OR public.is_poll_admin(id, auth.uid())
  );

-- ============== UPDATE POLL_ADMINS POLICIES ==============

-- Drop and recreate poll_admins policies to use security definer function
DROP POLICY IF EXISTS "owner manages admins" ON public.poll_admins;

CREATE POLICY "owner manages admins" ON public.poll_admins
  FOR ALL TO authenticated
  USING (
    -- Use security definer function instead of EXISTS query to avoid recursion
    public.is_poll_owner(poll_id, auth.uid())
  )
  WITH CHECK (
    public.is_poll_owner(poll_id, auth.uid())
  );
