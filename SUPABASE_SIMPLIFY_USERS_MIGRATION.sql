-- CEPS Apply AI Task Force participant schema simplification
-- Run once after SUPABASE_TRACK_ROLES_MIGRATION.sql.
--
-- Final public tables:
--   allowed_users: participant identity, track access and moderation rights
--   comments: annotations with readable author and moderator emails
--
-- The migration runs in one transaction. Any failed preservation check rolls
-- back every change, including the removal of the legacy role tables.

begin;

lock table public.allowed_users in share row exclusive mode;
lock table public.comments in share row exclusive mode;
lock table public.allowed_user_tracks in share row exclusive mode;
lock table public.track_moderators in share row exclusive mode;
lock table public.moderators in share row exclusive mode;

-- Put access and moderation controls directly beside each participant email.
alter table public.allowed_users
  add column if not exists automotive_access boolean not null default false,
  add column if not exists healthcare_access boolean not null default false,
  add column if not exists automotive_moderator boolean not null default false,
  add column if not exists healthcare_moderator boolean not null default false;

update public.allowed_users u
set
  automotive_access = exists (
    select 1
    from public.allowed_user_tracks t
    where t.email = u.email
      and t.track_id = 'automotive'
  ),
  healthcare_access = exists (
    select 1
    from public.allowed_user_tracks t
    where t.email = u.email
      and t.track_id = 'healthcare'
  ),
  automotive_moderator = exists (
    select 1
    from public.track_moderators tm
    join auth.users au on au.id = tm.user_id
    where lower(au.email) = u.email
      and tm.track_id = 'automotive'
  ) or exists (
    select 1
    from public.moderators m
    join auth.users au on au.id = m.user_id
    where lower(au.email) = u.email
  ),
  healthcare_moderator = exists (
    select 1
    from public.track_moderators tm
    join auth.users au on au.id = tm.user_id
    where lower(au.email) = u.email
      and tm.track_id = 'healthcare'
  );

-- A moderator must also have access to the corresponding track.
update public.allowed_users
set automotive_access = true
where automotive_moderator;

update public.allowed_users
set healthcare_access = true
where healthcare_moderator;

alter table public.allowed_users
  drop constraint if exists allowed_users_moderator_access_check;

alter table public.allowed_users
  add constraint allowed_users_moderator_access_check
  check (
    (not automotive_moderator or automotive_access)
    and (not healthcare_moderator or healthcare_access)
  );

-- Keep UUIDs as stable Auth references and add emails for administration.
alter table public.comments
  add column if not exists author_email text,
  add column if not exists moderated_by_email text;

update public.comments c
set author_email = lower(au.email)
from auth.users au
where au.id = c.author_id
  and c.author_email is null;

update public.comments c
set moderated_by_email = lower(au.email)
from auth.users au
where au.id = c.moderated_by
  and c.moderated_by_email is null;

-- Move annotations from the standalone Speedometer identifier to the canonical
-- page identifier used by the shared platform.
update public.comments
set page_path = 'automotive-speedometer'
where page_path = 'speedometer-main'
  and track_id = 'automotive';

-- Preserve the six existing annotations after the editorial changes made in
-- response to the first review. This statement is safe to run more than once.
update public.comments as comment
set
  selected_text = anchor.selected_text,
  text_before = anchor.text_before,
  text_after = anchor.text_after
from (
  values
    (
      '22ffbaec-3ad4-43e2-a269-88f80bcc0b28'::uuid,
      'focus',
      'Hover or ',
      ' a marker for details.'
    ),
    (
      '271e2317-67b6-4881-8651-0941e2ee92a1'::uuid,
      'mixed',
      '',
      ''
    ),
    (
      '87c38225-fe7d-4385-a4f8-10d5dc92016d'::uuid,
      'Contribute a pathway, its milestones and the readiness channels it could advance.',
      'Imagine another route to acceleration?',
      ''
    ),
    (
      '8ed522b6-e804-4c8a-b666-5fd00604f963'::uuid,
      'The declaration commits participating countries to work towards common approval principles, coordinated permitting and practical cross-border deployment.',
      '',
      ''
    ),
    (
      'e4feac44-e253-46f4-aebc-d06ca7628d70'::uuid,
      'Transparent on uncertainty',
      'Evidence-led Participant-reviewed Versioned over time',
      ''
    ),
    (
      'ec43453a-89c6-42ab-a402-1bdb0271c8c8'::uuid,
      'focus',
      'Hover or ',
      ' a marker for details.'
    )
) as anchor(id, selected_text, text_before, text_after)
where comment.id = anchor.id;

do $$
begin
  if exists (select 1 from public.comments where author_email is null) then
    raise exception 'Migration stopped: at least one comment has no matching Auth email.';
  end if;

  if exists (
    select 1
    from public.allowed_user_tracks t
    left join public.allowed_users u on u.email = t.email
    where u.email is null
      or (t.track_id = 'automotive' and not u.automotive_access)
      or (t.track_id = 'healthcare' and not u.healthcare_access)
  ) then
    raise exception 'Migration stopped: at least one participant track was not preserved.';
  end if;

  if exists (
    select 1
    from public.track_moderators tm
    join auth.users au on au.id = tm.user_id
    left join public.allowed_users u on u.email = lower(au.email)
    where u.email is null
      or (tm.track_id = 'automotive' and not u.automotive_moderator)
      or (tm.track_id = 'healthcare' and not u.healthcare_moderator)
  ) then
    raise exception 'Migration stopped: at least one track moderator was not preserved.';
  end if;
end;
$$;

alter table public.comments
  alter column author_email set not null;

alter table public.comments
  drop constraint if exists comments_author_email_check,
  drop constraint if exists comments_moderated_by_email_check;

alter table public.comments
  add constraint comments_author_email_check
    check (author_email = lower(trim(author_email)) and char_length(author_email) between 3 and 320),
  add constraint comments_moderated_by_email_check
    check (
      moderated_by_email is null
      or (
        moderated_by_email = lower(trim(moderated_by_email))
        and char_length(moderated_by_email) between 3 and 320
      )
    );

create index if not exists comments_author_email_created_idx
  on public.comments (author_email, created_at desc);

-- Derive readable emails from the authenticated session. Clients do not need
-- to submit these columns and cannot impersonate another participant.
create or replace function public.set_comment_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_user_id uuid;
  session_email text;
begin
  session_user_id := auth.uid();
  session_email := lower(coalesce(auth.jwt()->>'email', ''));

  if tg_op = 'INSERT' and session_user_id is not null then
    new.author_id := session_user_id;
    new.author_email := session_email;
    new.moderated_by := null;
    new.moderated_by_email := null;
  elsif tg_op = 'UPDATE' then
    new.author_id := old.author_id;
    new.author_email := old.author_email;

    if new.status is distinct from old.status and session_user_id is not null then
      new.moderated_by := session_user_id;
      new.moderated_by_email := session_email;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_comment_identity_before_write on public.comments;
create trigger set_comment_identity_before_write
before insert or update on public.comments
for each row execute function public.set_comment_identity();

-- Access helpers now read one clear participant row.
create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = lower(coalesce((select auth.jwt()->>'email'), ''))
      and active
      and (automotive_access or healthcare_access)
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = lower(coalesce((select auth.jwt()->>'email'), ''))
      and active
      and (automotive_moderator or healthcare_moderator)
  );
$$;

create or replace function public.can_access_track(requested_track text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = lower(coalesce((select auth.jwt()->>'email'), ''))
      and active
      and case requested_track
        when 'automotive' then automotive_access
        when 'healthcare' then healthcare_access
        when 'platform' then automotive_access or healthcare_access
        else false
      end
  );
$$;

create or replace function public.get_my_tracks()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(track.track_id order by track.track_id), array[]::text[])
  from public.allowed_users u
  cross join lateral (
    values
      ('automotive', u.automotive_access),
      ('healthcare', u.healthcare_access)
  ) as track(track_id, has_access)
  where u.email = lower(coalesce((select auth.jwt()->>'email'), ''))
    and u.active
    and track.has_access;
$$;

create or replace function public.is_track_moderator(requested_track text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_users
    where email = lower(coalesce((select auth.jwt()->>'email'), ''))
      and active
      and case requested_track
        when 'automotive' then automotive_access and automotive_moderator
        when 'healthcare' then healthcare_access and healthcare_moderator
        when 'platform' then automotive_moderator or healthcare_moderator
        else false
      end
  );
$$;

-- Registration remains limited to active participants with track access.
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
    from public.allowed_users
    where email = requested_email
      and active
      and (automotive_access or healthcare_access)
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

grant select on table public.allowed_users to supabase_auth_admin;
grant execute on function public.hook_allow_listed_user(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_allow_listed_user(jsonb) from anon, authenticated, public;

drop policy if exists "Auth hook checks allowed users" on public.allowed_users;
create policy "Auth hook checks allowed users"
on public.allowed_users
for select
to supabase_auth_admin
using (true);

-- The helper functions no longer depend on these normalized role tables.
drop table public.allowed_user_tracks;
drop table public.track_moderators;
drop table public.moderators;

commit;

-- A compact result for checking the completed migration in SQL Editor.
select
  (select count(*) from public.allowed_users) as participants,
  (select count(*) from public.allowed_users where automotive_access) as automotive_participants,
  (select count(*) from public.allowed_users where healthcare_access) as healthcare_participants,
  (select count(*) from public.allowed_users where automotive_moderator) as automotive_moderators,
  (select count(*) from public.allowed_users where healthcare_moderator) as healthcare_moderators,
  (select count(*) from public.comments) as comments,
  (select count(*) from public.comments where author_email is null) as comments_without_email;
