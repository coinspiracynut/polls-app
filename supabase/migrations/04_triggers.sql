-- =====================================================
-- POLLS APP - TRIGGERS
-- Paste this into Supabase SQL Editor AFTER 03_functions.sql
-- =====================================================

-- ============== AUTO-CREATE PROFILE ON SIGNUP ==============
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, handle, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'user_name',
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'preferred_username',
      'user_' || substr(new.id::text, 1, 8)  -- Fallback: user_12345678
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$;

-- Trigger on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============== UPDATE PROFILE ON USER METADATA CHANGE ==============
create or replace function public.handle_user_update()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.profiles
  set 
    handle = coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'name', handle),
    avatar_url = coalesce(new.raw_user_meta_data->>'avatar_url', avatar_url)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- ============== HANDLE LATE-ARRIVING AUTH METADATA ==============
-- Sometimes OAuth providers send metadata AFTER initial user creation
create or replace function public.handle_auth_metadata_update()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only update if metadata actually changed
  if (old.raw_user_meta_data is distinct from new.raw_user_meta_data) then
    update public.profiles
    set 
      handle = coalesce(
        new.raw_user_meta_data->>'user_name',
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'preferred_username',
        handle  -- Keep existing if new is null
      ),
      avatar_url = coalesce(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture',
        avatar_url  -- Keep existing if new is null
      )
    where id = new.id;
  end if;
  return new;
end;
$$;

-- Trigger specifically when metadata updates
create trigger on_auth_metadata_updated
  after update on auth.users
  for each row 
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute procedure public.handle_auth_metadata_update();

