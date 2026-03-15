-- Run this in Supabase Dashboard → SQL Editor if you already have profiles + restaurants
-- and only need: updated trigger, profile read policy, friend_requests, reviews

-- 1. Updated trigger (display_name from full_name, fallback to email prefix)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  name_val text;
begin
  name_val := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  if name_val is null and new.email is not null then
    name_val := nullif(split_part(new.email, '@', 1), '');
  end if;
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(name_val, 'User'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Allow authenticated users to read all profiles (for friends list + search by name)
drop policy if exists "Users can read all profiles" on public.profiles;
create policy "Users can read all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- 3. Friend requests
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz default now(),
  unique(from_user_id, to_user_id)
);
create index if not exists friend_requests_to_user_id on public.friend_requests(to_user_id);
create index if not exists friend_requests_from_user_id on public.friend_requests(from_user_id);

alter table public.friend_requests enable row level security;
drop policy if exists "Users can see requests they sent or received" on public.friend_requests;
create policy "Users can see requests they sent or received"
  on public.friend_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);
drop policy if exists "Users can send friend requests" on public.friend_requests;
create policy "Users can send friend requests"
  on public.friend_requests for insert
  with check (auth.uid() = from_user_id);
drop policy if exists "Receivers can update (accept/decline)" on public.friend_requests;
create policy "Receivers can update (accept/decline)"
  on public.friend_requests for update
  using (auth.uid() = to_user_id);

-- 4. Reviews: not touched here – teammate is building the reviews feature.
--    Friend profile screen will show "No reviews yet" until reviews table exists.
