# CEPS Apply AI Task Force platform

This folder contains the shared participant platform for:

- Track 1: Healthcare and Pharmaceuticals
- Track 2: Automotive, Transport and Mobility

The application provides a common landing page, track-specific access, shared
authentication and a reusable text-annotation discussion system. A participant
can be assigned to either track or both tracks.

## Current structure

- The Automotive workspace contains the canonical Speedometer implementation,
  track hub and session-materials structure.
- The Healthcare workspace implements the proposed landing page, session pages,
  five use-case sections, Defining Success placeholder, resource-library
  placeholder, timeline and rapporteur contacts.
- Readable hash routes keep the static site compatible with GitHub Pages, for
  example `#/healthcare/use-cases` and `#/automotive/speedometer`.
- Comments are separated by track and page while sharing one Supabase project.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Supabase migration

The existing Speedometer Supabase setup remains the foundation. Run
`SUPABASE_TRACK_ROLES_MIGRATION.sql` once to add:

- `allowed_user_tracks` for Automotive, Healthcare or dual access;
- `track_moderators` for track-specific moderation;
- a `track_id` on comments;
- track-aware access and row-level security functions.

The migration assigns all current participants to Automotive so existing access
continues. It assigns Eduardo Brito to both tracks and both moderation groups.

Add another track role with:

```sql
insert into public.allowed_user_tracks (email, track_id)
values ('participant@example.org', 'healthcare')
on conflict (email, track_id) do nothing;
```

Remove a track role with:

```sql
delete from public.allowed_user_tracks
where email = 'participant@example.org'
  and track_id = 'healthcare';
```

The participant must remain active in `allowed_users` to access any track.

## Content still needed

The Healthcare team’s source folders and approved files have not been added to
this repository. The platform therefore provides the agreed information
architecture and clear content placeholders. The next content pass can attach
the actual Session 1 files and additional resources without changing the page
structure.
