-- Food Network - Supabase Schema
-- Run this in Supabase Dashboard → SQL Editor → New query

-- ============================================
-- 1. Profiles table (extends auth.users)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  preferences text,
  friends uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists, then create (idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS for profiles
alter table public.profiles enable row level security;
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================
-- 2. Restaurants table
-- ============================================
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  place_id text unique,
  name text not null,
  formatted_address text,
  latitude float,
  longitude float,
  cuisine text,
  rating_avg float,
  user_ratings_total int default 0,
  price_level int,
  atmosphere text,
  photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PostGIS for nearby search
create extension if not exists postgis;
alter table public.restaurants 
  add column if not exists location geography(point, 4326);

-- Index for nearby search
create index if not exists restaurants_location_idx 
  on public.restaurants using gist(location);

-- Auto-update the PostGIS location column whenever latitude/longitude change.
-- This means backend upserts from Google Places automatically keep the
-- geography column in sync without any extra RPC calls.
create or replace function public.sync_restaurant_location()
returns trigger as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_restaurant_location_trigger on public.restaurants;
create trigger sync_restaurant_location_trigger
  before insert or update of latitude, longitude on public.restaurants
  for each row execute function public.sync_restaurant_location();

-- RLS: public read for now
alter table public.restaurants enable row level security;
drop policy if exists "Anyone can read restaurants" on public.restaurants;
create policy "Anyone can read restaurants"
  on public.restaurants for select
  using (true);

-- ============================================
-- 3. RPC for nearby search (optional, for backend)
-- ============================================
create or replace function public.search_nearby_restaurants(
  search_lat float,
  search_lng float,
  radius_m int default 5000,
  result_limit int default 20,
  min_rating float default 4.0
)
returns table (
  place_id text,
  name text,
  formatted_address text,
  latitude float,
  longitude float,
  cuisine text,
  rating_avg float,
  user_ratings_total int,
  price_level int,
  photo_url text,
  distance_meters float
)
language plpgsql
as $$
begin
  return query
  select
    r.place_id,
    r.name,
    r.formatted_address,
    r.latitude,
    r.longitude,
    r.cuisine,
    r.rating_avg,
    r.user_ratings_total,
    r.price_level,
    r.photo_url,
    st_distance(r.location::geography, st_setsrid(st_makepoint(search_lng, search_lat), 4326)::geography)::float as distance_meters
  from public.restaurants r
  where r.rating_avg >= min_rating
    and r.location is not null
    and st_dwithin(
      r.location::geography,
      st_setsrid(st_makepoint(search_lng, search_lat), 4326)::geography,
      radius_m
    )
  order by distance_meters
  limit result_limit;
end;
$$;

-- ============================================
-- 4. Seed sample restaurants (for testing)
-- ============================================
insert into public.restaurants (place_id, name, formatted_address, latitude, longitude, cuisine, rating_avg, user_ratings_total, photo_url)
values 
  ('ch1', 'Thai House', '123 Main St, Cambridge MA', 42.3736, -71.1097, 'Thai', 4.5, 200, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400'),
  ('ch2', 'Sushi Place', '456 Mass Ave, Cambridge MA', 42.3650, -71.1040, 'Japanese', 4.7, 350, 'https://images.unsplash.com/photo-1579584425555-3ce17fd4351?w=400')
on conflict (place_id) do nothing;

-- Update location from lat/lng (run after inserts)
update public.restaurants 
set location = st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
where latitude is not null and longitude is not null and location is null;
