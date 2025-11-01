-- =====================================================
-- POLLS APP - DATABASE FUNCTIONS
-- Paste this into Supabase SQL Editor AFTER 02_rls.sql
-- =====================================================

-- ============== CAST VOTE FUNCTION ==============
-- Atomic vote insert + tally update (idempotent)
create or replace function public.cast_vote(
  p_question_id uuid,
  p_user_id uuid,
  p_option_key text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_counts jsonb;
  v_inserted boolean := false;
begin
  -- Validate question is live
  if not exists (
    select 1 from public.questions 
    where id = p_question_id and is_live = true
  ) then
    raise exception 'Question is not live';
  end if;

  -- Validate option exists
  if not exists (
    select 1 from public.options 
    where question_id = p_question_id and key = p_option_key
  ) then
    raise exception 'Invalid option key';
  end if;

  -- Insert vote (on conflict do nothing for idempotency)
  insert into public.votes (question_id, user_id, option_key)
  values (p_question_id, p_user_id, p_option_key)
  on conflict (question_id, user_id) do nothing
  returning true into v_inserted;

  -- If vote was inserted, increment tally
  if v_inserted then
    insert into public.tallies (question_id, counts)
    values (p_question_id, jsonb_build_object(p_option_key, 1))
    on conflict (question_id)
    do update set counts = 
      public.tallies.counts || 
      jsonb_build_object(
        p_option_key, 
        coalesce((public.tallies.counts->>p_option_key)::int, 0) + 1
      )
    returning counts into v_counts;
  else
    -- If vote already existed, just return current counts
    select counts into v_counts
    from public.tallies
    where question_id = p_question_id;
  end if;

  return coalesce(v_counts, '{}'::jsonb);
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.cast_vote(uuid, uuid, text) to authenticated;

-- ============== ADVANCE QUESTION FUNCTION ==============
-- Admin switches which question is live
create or replace function public.advance_question(
  p_poll_id uuid,
  p_to_idx int
)
returns void
language plpgsql
security definer
as $$
declare
  v_question_id uuid;
begin
  -- Set all questions to not live
  update public.questions 
  set is_live = false 
  where poll_id = p_poll_id and is_live = true;

  -- Set target question to live
  update public.questions 
  set is_live = true 
  where poll_id = p_poll_id and idx = p_to_idx
  returning id into v_question_id;

  -- Initialize tally if doesn't exist
  if v_question_id is not null then
    insert into public.tallies (question_id, counts)
    values (v_question_id, '{}'::jsonb)
    on conflict (question_id) do nothing;
  end if;
end;
$$;

-- Grant execute to authenticated users (RLS in Edge Function checks admin rights)
grant execute on function public.advance_question(uuid, int) to authenticated;

-- ============== CLOSE QUESTION FUNCTION ==============
-- Close the currently live question
create or replace function public.close_question(
  p_poll_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.questions 
  set is_live = false, closed_at = now()
  where poll_id = p_poll_id and is_live = true;
end;
$$;

grant execute on function public.close_question(uuid) to authenticated;

-- ============== GENERATE UNIQUE SLUG FUNCTION ==============
-- Generate a unique slug from title with collision handling
create or replace function public.generate_unique_slug(p_title text)
returns text
language plpgsql
as $$
declare
  v_base_slug text;
  v_slug text;
  v_counter int := 0;
begin
  -- Create base slug: lowercase, replace spaces/special chars with hyphens
  v_base_slug := lower(trim(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'), '-'));
  v_base_slug := substring(v_base_slug, 1, 50); -- limit length
  v_slug := v_base_slug;

  -- Check for collisions and append number if needed
  while exists (select 1 from public.polls where slug = v_slug) loop
    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  end loop;

  return v_slug;
end;
$$;

grant execute on function public.generate_unique_slug(text) to authenticated;

