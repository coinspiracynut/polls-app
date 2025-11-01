-- =====================================================
-- POLLS APP - ROW LEVEL SECURITY (RLS) POLICIES
-- Paste this into Supabase SQL Editor AFTER 01_schema.sql
-- =====================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.polls enable row level security;
alter table public.poll_admins enable row level security;
alter table public.questions enable row level security;
alter table public.options enable row level security;
alter table public.votes enable row level security;
alter table public.tallies enable row level security;
alter table public.participants enable row level security;

-- ============== PROFILES ==============
-- Users can read all (for avatars) and update self.
create policy "read profiles" on public.profiles for select using (true);

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- ============== POLLS ==============
-- Public polls are readable by all; owners/admins manage.
create policy "read public polls" on public.polls
  for select using (
    is_public 
    or owner_id = auth.uid() 
    or exists (
      select 1 from public.poll_admins a 
      where a.poll_id = id and a.user_id = auth.uid()
    )
  );

create policy "create polls" on public.polls
  for insert to authenticated with check (owner_id = auth.uid());

create policy "update own/admin polls" on public.polls
  for update to authenticated using (
    owner_id = auth.uid() 
    or exists (
      select 1 from public.poll_admins a 
      where a.poll_id = id and a.user_id = auth.uid()
    )
  );

create policy "delete own polls" on public.polls
  for delete to authenticated using (owner_id = auth.uid());

-- ============== POLL ADMINS ==============
-- Owner writes; everyone can read to check admin badges
create policy "read poll_admins" on public.poll_admins 
  for select using (true);

create policy "owner manages admins" on public.poll_admins
  for all to authenticated
  using (
    exists (
      select 1 from public.polls p 
      where p.id = poll_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.polls p 
      where p.id = poll_id and p.owner_id = auth.uid()
    )
  );

-- ============== QUESTIONS ==============
-- Readable if poll is readable; writable by owner/admins.
create policy "read questions" on public.questions
  for select using (
    exists (
      select 1 from public.polls p
      where p.id = poll_id 
        and (
          p.is_public 
          or p.owner_id = auth.uid() 
          or exists (
            select 1 from public.poll_admins a 
            where a.poll_id = p.id and a.user_id = auth.uid()
          )
        )
    )
  );

create policy "write questions (admins)" on public.questions
  for all to authenticated
  using (
    exists (
      select 1 from public.polls p
      where p.id = poll_id 
        and (
          p.owner_id = auth.uid() 
          or exists (
            select 1 from public.poll_admins a 
            where a.poll_id = p.id and a.user_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.polls p
      where p.id = poll_id 
        and (
          p.owner_id = auth.uid() 
          or exists (
            select 1 from public.poll_admins a 
            where a.poll_id = p.id and a.user_id = auth.uid()
          )
        )
    )
  );

-- ============== OPTIONS ==============
create policy "read options" on public.options
  for select using (
    exists (
      select 1 from public.questions q
      join public.polls p on p.id = q.poll_id
      where q.id = question_id
        and (
          p.is_public 
          or p.owner_id = auth.uid() 
          or exists (
            select 1 from public.poll_admins a 
            where a.poll_id = p.id and a.user_id = auth.uid()
          )
        )
    )
  );

create policy "write options (admins)" on public.options
  for all to authenticated
  using (
    exists (
      select 1 from public.questions q
      join public.polls p on p.id = q.poll_id
      where q.id = question_id 
        and (
          p.owner_id = auth.uid() 
          or exists (
            select 1 from public.poll_admins a 
            where a.poll_id = p.id and a.user_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.questions q
      join public.polls p on p.id = q.poll_id
      where q.id = question_id 
        and (
          p.owner_id = auth.uid() 
          or exists (
            select 1 from public.poll_admins a 
            where a.poll_id = p.id and a.user_id = auth.uid()
          )
        )
    )
  );

-- ============== VOTES ==============
-- Any authenticated user can vote ONCE per question; EVERYONE can see ALL votes
create policy "insert vote once" on public.votes
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.questions q 
      where q.id = question_id and q.is_live = true
    )
  );

create policy "read all votes" on public.votes
  for select using (true);

-- ============== TALLIES ==============
-- Readable by everyone; updates only via Edge Function (service key)
create policy "read tallies" on public.tallies 
  for select using (true);

-- ============== PARTICIPANTS ==============
-- Anyone can read (for avatar wall); users upsert their own presence
create policy "read participants" on public.participants 
  for select using (true);

create policy "upsert own presence" on public.participants
  for all to authenticated
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

