-- Shared CEPS Apply AI Task Force platform roles
-- Run after speedometer/web/SUPABASE_SETUP.sql.

create table if not exists public.allowed_user_tracks (
  email text not null references public.allowed_users (email) on delete cascade,
  track_id text not null check (track_id in ('automotive', 'healthcare')),
  created_at timestamptz not null default now(),
  primary key (email, track_id)
);

create table if not exists public.track_moderators (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_id text not null check (track_id in ('automotive', 'healthcare')),
  created_at timestamptz not null default now(),
  primary key (user_id, track_id)
);

alter table public.comments
  add column if not exists track_id text;

update public.comments
set track_id = 'automotive'
where track_id is null;

alter table public.comments
  alter column track_id set default 'automotive';

alter table public.comments
  alter column track_id set not null;

alter table public.comments
  drop constraint if exists comments_track_id_check;

alter table public.comments
  add constraint comments_track_id_check
  check (track_id in ('automotive', 'healthcare', 'platform'));

create index if not exists comments_track_page_status_created_idx
  on public.comments (track_id, page_path, status, created_at desc);

-- Preserve every existing participant's access to the Automotive track.
insert into public.allowed_user_tracks (email, track_id)
select email, 'automotive'
from public.allowed_users
where active
on conflict (email, track_id) do nothing;

-- Preserve existing moderators as Automotive moderators.
insert into public.track_moderators (user_id, track_id)
select user_id, 'automotive'
from public.moderators
on conflict (user_id, track_id) do nothing;

alter table public.allowed_user_tracks enable row level security;
alter table public.track_moderators enable row level security;

revoke all on table public.allowed_user_tracks from anon, authenticated;
revoke all on table public.track_moderators from anon, authenticated;

create or replace function public.can_access_track(requested_track text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when requested_track = 'platform' then public.is_allowed_user()
      else exists (
        select 1
        from public.allowed_users u
        join public.allowed_user_tracks t on t.email = u.email
        where u.email = lower(coalesce((select auth.jwt()->>'email'), ''))
          and u.active
          and t.track_id = requested_track
      )
    end;
$$;

create or replace function public.get_my_tracks()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(t.track_id order by t.track_id), array[]::text[])
  from public.allowed_users u
  join public.allowed_user_tracks t on t.email = u.email
  where u.email = lower(coalesce((select auth.jwt()->>'email'), ''))
    and u.active;
$$;

create or replace function public.is_track_moderator(requested_track text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when requested_track = 'platform' then public.is_moderator()
      else exists (
        select 1
        from public.track_moderators
        where user_id = (select auth.uid())
          and track_id = requested_track
      )
    end;
$$;

create or replace function public.can_reply_to_track_comment(
  requested_parent_id uuid,
  requested_page_path text,
  requested_track text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.comments
    where id = requested_parent_id
      and parent_id is null
      and page_path = requested_page_path
      and track_id = requested_track
      and status = 'approved'
  );
$$;

revoke all on function public.can_access_track(text) from public;
revoke all on function public.get_my_tracks() from public;
revoke all on function public.is_track_moderator(text) from public;
revoke all on function public.can_reply_to_track_comment(uuid, text, text) from public;
grant execute on function public.can_access_track(text) to authenticated;
grant execute on function public.get_my_tracks() to authenticated;
grant execute on function public.is_track_moderator(text) to authenticated;
grant execute on function public.can_reply_to_track_comment(uuid, text, text) to authenticated;

-- Registration requires an active participant record with at least one track.
create or replace function public.hook_allow_listed_user(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  requested_email text;
begin
  requested_email := lower(coalesce(event->'user'->>'email', ''));

  if exists (
    select 1
    from public.allowed_users u
    join public.allowed_user_tracks t on t.email = u.email
    where u.email = requested_email
      and u.active
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'This email has not been assigned to a Task Force track.'
    )
  );
end;
$$;

grant select on table public.allowed_user_tracks to supabase_auth_admin;
grant execute on function public.hook_allow_listed_user(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_allow_listed_user(jsonb) from anon, authenticated, public;

drop policy if exists "Auth hook checks allowed user tracks" on public.allowed_user_tracks;
create policy "Auth hook checks allowed user tracks"
on public.allowed_user_tracks
for select
to supabase_auth_admin
using (true);

drop policy if exists "Authenticated users read approved or own comments" on public.comments;
drop policy if exists "Track users read approved or own comments" on public.comments;
create policy "Track users read approved or own comments"
on public.comments
for select
to authenticated
using (
  (select public.can_access_track(track_id))
  and (
    status = 'approved'
    or author_id = (select auth.uid())
    or (select public.is_track_moderator(track_id))
  )
);

drop policy if exists "Authenticated users submit pending comments" on public.comments;
drop policy if exists "Track users submit pending comments" on public.comments;
create policy "Track users submit pending comments"
on public.comments
for insert
to authenticated
with check (
  (select public.can_access_track(track_id))
  and author_id = (select auth.uid())
  and status = 'pending'
  and moderated_at is null
  and moderated_by is null
  and (
    parent_id is null
    or (select public.can_reply_to_track_comment(parent_id, page_path, track_id))
  )
);

drop policy if exists "Moderators review comments" on public.comments;
drop policy if exists "Track moderators review comments" on public.comments;
create policy "Track moderators review comments"
on public.comments
for update
to authenticated
using (
  (select public.can_access_track(track_id))
  and (select public.is_track_moderator(track_id))
)
with check (
  (select public.can_access_track(track_id))
  and (select public.is_track_moderator(track_id))
);

-- Assign either or both tracks by email.
-- The email must already exist in allowed_users.
--
-- insert into public.allowed_user_tracks (email, track_id)
-- values
--   ('participant@example.org', 'automotive'),
--   ('participant@example.org', 'healthcare')
-- on conflict (email, track_id) do nothing;

-- Assign a moderator for one track after the account has been created.
--
-- insert into public.track_moderators (user_id, track_id)
-- select id, 'healthcare'
-- from auth.users
-- where lower(email) = 'moderator@example.org'
-- on conflict (user_id, track_id) do nothing;

-- Example: give Eduardo access to both tracks and moderation in both tracks.
insert into public.allowed_user_tracks (email, track_id)
values
  ('eduardo.brito@ceps.eu', 'automotive'),
  ('eduardo.brito@ceps.eu', 'healthcare')
on conflict (email, track_id) do nothing;

insert into public.track_moderators (user_id, track_id)
select id, requested_track
from auth.users
cross join (values ('automotive'), ('healthcare')) as tracks(requested_track)
where lower(email) = 'eduardo.brito@ceps.eu'
on conflict (user_id, track_id) do nothing;
