-- =====================================================
-- POLLS APP - SCHEMA MIGRATION
-- Paste this into Supabase SQL Editor
-- =====================================================

-- USERS come from auth.users. We'll mirror minimal profile metadata:
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text,
  avatar_url text,
  created_at timestamptz default now()
);

-- A poll has many questions. Owner can add co-admins.
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,               -- human link, e.g. "love-symposium-2025"
  title text not null,
  description text,
  is_public boolean not null default true, -- if false, only admins can view
  owner_id uuid not null references auth.users(id),
  created_at timestamptz default now()
);

create table public.poll_admins (
  poll_id uuid references public.polls(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (poll_id, user_id)
);

-- Questions belong to a poll. One can be live at a time (optional).
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  idx int not null,                         -- display order
  prompt text not null,
  is_live boolean not null default false,
  closed_at timestamptz,
  created_at timestamptz default now(),
  unique (poll_id, idx)
);

-- Options are configurable (A/B/U by default)
create table public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  key text not null,                        -- short key "A" | "B" | "U" | "C"...
  label text not null,                      -- long label shown to users
  unique(question_id, key)
);

-- One vote per user per question.
create table public.votes (
  id bigserial primary key,
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  option_key text not null,
  created_at timestamptz default now(),
  unique (question_id, user_id)
);

-- Aggregated counts to avoid re-aggregating on stage.
create table public.tallies (
  question_id uuid primary key references public.questions(id) on delete cascade,
  counts jsonb not null default '{}'::jsonb -- {"A": 10, "B": 8, "U": 2}
);

-- OPTIONAL: presence for showing who's in the room (avatars)
create table public.participants (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  handle text,
  avatar_url text,
  last_seen timestamptz default now(),
  primary key (poll_id, user_id)
);

-- Helpful indexes
create index on public.questions (poll_id, is_live);
create index on public.votes (question_id);
create index on public.tallies (question_id);
create index on public.polls (is_public, created_at desc);
create index on public.participants (poll_id, last_seen desc);

