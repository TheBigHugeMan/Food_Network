-- Food Network - Social Graph Seed Data
-- Run after supabase/schema.sql
-- This script populates:
-- 1) restaurants (extra demo rows)
-- 2) profiles.preferences (tasteProfile + cuisineFrequency)
-- 3) profiles.friends (ring-style friend links among existing profiles)
-- 4) user_restaurant_visits (overlap to power explainable similarity)

-- Extra restaurants so visits overlap is easier to demo.
insert into public.restaurants (place_id, name, formatted_address, latitude, longitude, cuisine, rating_avg, user_ratings_total, photo_url)
values
  ('sg1', 'Umami House', '1 Demo Ave, Cambridge MA', 42.3722, -71.1188, 'Japanese', 4.6, 114, 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=400'),
  ('sg2', 'Pasta Works', '2 Demo Ave, Cambridge MA', 42.3711, -71.1083, 'Italian', 4.5, 96, 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400'),
  ('sg3', 'Seoul Bites', '3 Demo Ave, Cambridge MA', 42.3696, -71.1020, 'Korean', 4.4, 88, 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400'),
  ('sg4', 'Spice Route', '4 Demo Ave, Cambridge MA', 42.3658, -71.1047, 'Indian', 4.7, 103, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400'),
  ('sg5', 'Taco District', '5 Demo Ave, Cambridge MA', 42.3677, -71.1125, 'Mexican', 4.3, 77, 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400')
on conflict (place_id) do nothing;

update public.restaurants
set location = st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
where latitude is not null and longitude is not null and location is null;

do $$
declare
  profile_ids uuid[];
  restaurant_ids uuid[];
  profiles_count int;
  restaurants_count int;
  i int;
  self_id uuid;
  f1 uuid;
  f2 uuid;
  f3 uuid;
  r1 uuid;
  r2 uuid;
  r3 uuid;
begin
  select array_agg(p.id order by p.created_at)
  into profile_ids
  from (
    select id, created_at
    from public.profiles
    order by created_at
    limit 12
  ) p;

  profiles_count := coalesce(array_length(profile_ids, 1), 0);
  if profiles_count = 0 then
    raise notice 'No profiles found. Create at least one account and rerun this script.';
  else

  select array_agg(r.id order by r.created_at)
  into restaurant_ids
  from public.restaurants r;

  restaurants_count := coalesce(array_length(restaurant_ids, 1), 0);
  if restaurants_count = 0 then
    raise exception 'No restaurants found. Run schema.sql first.';
  end if;

  -- 1) Preferences
  for i in 1..profiles_count loop
    self_id := profile_ids[i];
    update public.profiles
    set preferences =
      case ((i - 1) % 6)
        when 0 then '{"tasteProfile":{"bitter":42,"umami":91,"sour":58,"sweet":35,"salty":76},"cuisineFrequency":[{"cuisine":"Japanese","count":41},{"cuisine":"Italian","count":29},{"cuisine":"Thai","count":17}]}'::text
        when 1 then '{"tasteProfile":{"bitter":38,"umami":84,"sour":49,"sweet":42,"salty":72},"cuisineFrequency":[{"cuisine":"Japanese","count":34},{"cuisine":"Korean","count":24},{"cuisine":"Thai","count":19}]}'::text
        when 2 then '{"tasteProfile":{"bitter":28,"umami":67,"sour":62,"sweet":44,"salty":58},"cuisineFrequency":[{"cuisine":"Italian","count":38},{"cuisine":"Mexican","count":27},{"cuisine":"Indian","count":14}]}'::text
        when 3 then '{"tasteProfile":{"bitter":35,"umami":73,"sour":55,"sweet":47,"salty":63},"cuisineFrequency":[{"cuisine":"Indian","count":33},{"cuisine":"Thai","count":21},{"cuisine":"Chinese","count":19}]}'::text
        when 4 then '{"tasteProfile":{"bitter":31,"umami":69,"sour":51,"sweet":60,"salty":57},"cuisineFrequency":[{"cuisine":"Mexican","count":32},{"cuisine":"American","count":26},{"cuisine":"Italian","count":18}]}'::text
        else '{"tasteProfile":{"bitter":45,"umami":79,"sour":48,"sweet":37,"salty":74},"cuisineFrequency":[{"cuisine":"Korean","count":30},{"cuisine":"Japanese","count":28},{"cuisine":"Chinese","count":22}]}'::text
      end,
      updated_at = now()
    where id = self_id;
  end loop;

  -- 2) Friend links (ring + two-hop neighbors)
  for i in 1..profiles_count loop
    self_id := profile_ids[i];
    if profiles_count = 1 then
      update public.profiles
      set friends = '{}',
          updated_at = now()
      where id = self_id;
      continue;
    end if;

    f1 := profile_ids[((i) % profiles_count) + 1];
    f2 := profile_ids[((i + 1) % profiles_count) + 1];
    f3 := profile_ids[((i + 2) % profiles_count) + 1];

    update public.profiles
    set friends = (
      select array_agg(friend_id)
      from (
        select f1 as friend_id
        union
        select f2
        union
        select f3
      ) q
      where friend_id is not null and friend_id <> self_id
    ),
    updated_at = now()
    where id = self_id;
  end loop;

  -- 3) Visit overlap (works best when user_restaurant_visits exists)
  for i in 1..profiles_count loop
    self_id := profile_ids[i];

    r1 := restaurant_ids[((i - 1) % restaurants_count) + 1];
    r2 := restaurant_ids[((i) % restaurants_count) + 1];
    r3 := restaurant_ids[((i + 1) % restaurants_count) + 1];

    insert into public.user_restaurant_visits (user_id, restaurant_id)
    values
      (self_id, r1),
      (self_id, r2),
      (self_id, r3)
    on conflict (user_id, restaurant_id) do nothing;
  end loop;

    raise notice 'Social graph seed complete for % profile(s).', profiles_count;
  end if;
end $$;
