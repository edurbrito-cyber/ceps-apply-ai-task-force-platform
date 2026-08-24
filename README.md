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

## Editing page content

Each platform page is a separate React component in `src/pages`. Edit the
matching `.tsx` file to change its headings, paragraphs, links or sections. The
shared footer, track hero and session-card layout are in
`src/pages/PlatformPageParts.tsx`.

The interactive Automotive Speedometer remains in
`src/tracks/automotive/AutomotiveSpeedometer.tsx` because it contains the
simulator state, calculations and drawers. `src/App.tsx` is limited to routing,
authentication and selecting the current page.

## Supabase

New installations first run `speedometer/web/SUPABASE_SETUP.sql`, followed by
`SUPABASE_TRACK_ROLES_MIGRATION.sql`. Existing installations using the five-table
role model then run `SUPABASE_SIMPLIFY_USERS_MIGRATION.sql` once.

The final public schema has two tables:

- `allowed_users` stores the participant email, active status, track access and
  track moderation switches;
- `comments` stores annotations and includes readable `author_email` and
  `moderated_by_email` columns alongside stable Auth user IDs.

Add a participant or update their access with:

```sql
insert into public.allowed_users (
  email,
  display_name,
  automotive_access,
  healthcare_access,
  automotive_moderator,
  healthcare_moderator
)
values (
  'participant@example.org',
  'Participant name',
  false,
  true,
  false,
  false
)
on conflict (email) do update
set display_name = excluded.display_name,
    automotive_access = excluded.automotive_access,
    healthcare_access = excluded.healthcare_access,
    automotive_moderator = excluded.automotive_moderator,
    healthcare_moderator = excluded.healthcare_moderator,
    active = true;
```

Access can also be managed directly in the Supabase Table Editor by changing the
four boolean switches on the participant row. To suspend all access while
retaining the participant record and comment history, set `active` to `false`.

For security, comment UUIDs remain linked to `auth.users`. The readable email
columns are populated automatically from the authenticated session.

Remove access to one track with:

```sql
update public.allowed_users
set healthcare_access = false,
    healthcare_moderator = false
where email = 'participant@example.org'
;
```

## Content still needed

The Healthcare team’s source folders and approved files have not been added to
this repository. The platform therefore provides the agreed information
architecture and clear content placeholders. The next content pass can attach
the actual Session 1 files and additional resources without changing the page
structure.
