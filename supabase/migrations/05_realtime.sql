-- =====================================================
-- POLLS APP - REALTIME SETUP
-- Paste this into Supabase SQL Editor AFTER 04_triggers.sql
-- =====================================================

-- Enable realtime on key tables by adding them to the publication
-- IMPORTANT: You MUST also enable Realtime in the UI:
-- Go to Table Editor → Click each table → Toggle "Realtime" ON

-- This migration is idempotent - safe to run multiple times
do $$
begin
  -- Add questions to realtime publication if not already added
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'questions'
  ) then
    alter publication supabase_realtime add table public.questions;
  end if;

  -- Add tallies to realtime publication if not already added
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'tallies'
  ) then
    alter publication supabase_realtime add table public.tallies;
  end if;

  -- Add participants to realtime publication if not already added
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;

  -- Add votes to realtime publication if not already added
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'votes'
  ) then
    alter publication supabase_realtime add table public.votes;
  end if;
end $$;

