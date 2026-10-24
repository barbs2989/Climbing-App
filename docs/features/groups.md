# Groups

`tab==="groups"` in `ClimbMatch.jsx`, opened from the Menu's Groups tile (NAV marks it `bar:false`). Five
views under `groupsTab`: For you · Your groups · Your activity · Discover · Events. A group opens as the
`openGroupId` overlay over it.

## 1. What it does today
- **Who may change what.** Only a group's **managers** (the owner and its moderators) can change its settings,
  including **public / private**. The *Make private / Make public* switch and the *Edit group* button render only
  for a manager (`isMod`, which also requires an active membership), and the server refuses anyone else:
  `groups update by manager` (0090) admits `is_group_manager()` only, and `setGroupVisibility` /
  `updateGroupSettings` report a zero-row update as a refusal rather than a success. Deleting a group is the
  owner's alone.
- **Who may host events** is the group's own setting, *Who can create events?* — *Any member* or *Moderators only*
  (`groups.event_policy`), enforced by the `group events created per the group's event policy` insert policy (0230).
  **New groups default to Moderators only** (2026-10-16), as Meetup (organizer team), Strava clubs (admins) and
  Facebook groups (admins, members only if allowed) do; an organizer can open it to every member. Older groups keep
  the value they stored (a null still reads as Any member, on the screen and in the policy). A member of a
  moderators-only group sees a line saying so where *+ Create event* would be.
- **Discover — search.** One box matches every word typed against a group's name, disciplines, typed location, its
  **state or province in both spellings** ("Washington" and "WA" both find "Seattle, WA"), and its About text,
  through the shared `searchMatches` rule (`lib/search.js`).
- **Discover — explore by state.** Under *Explore by discipline*, *Explore by state* offers one chip per state or
  province that has a group you could join, with its count. Your **home** state comes first, then the states of the
  areas you listed yourself at for partners (`partner_areas`, 0300) — marked *You climb here* — then the rest. A
  chip filters the list to that whole state and combines with the search box. The dropdown below browses
  *Anywhere*, *All of <state>*, or one exact typed location. (This replaced one chip per CITY, ranked by your own
  town, which could only ever reach groups where you already live.)
- **Recommended** order on Discover and For you: groups sharing a discipline with you first, then home state, then
  where you climb.
- Private groups are listed only to their members; an invitee finds one under Requests.

## 2. How it works
`useMyGroups` reads every group the viewer may see (RLS: public, or one you belong to) and copies it into
`createdGroups`. `discoverGroupList(q, sort, where)` filters that list by the text query and by `where`
(`""`, `"st:<region>"` or `"city:<location>"`, held in the `groupPlace` state), and drops groups you are in. A
group's region comes from `regionOfPlace(location)` (`lib/db.js`), which reads a trailing two-letter code first and
then the longest full state/province name; `regionAbbr` gives the code back for search. Your climbing regions are
your `partner_areas` paths matched against `useStates()`.

A group's feed is live (0326): `useGroupFeed` is a `useLiveQuery` (`lib/live.js`) subscribed over Supabase Realtime to
`group_posts` and `group_post_reactions`, so a post, edit, pin, delete or reaction another member makes refetches the
feed within about a second. Realtime applies the same member-only RLS; a DELETE carries only the id, so it is matched
against the posts already held.

## 3. Files
| File | Key symbols |
|---|---|
| `ClimbMatch.jsx` | `discoverGroupList`, `groupDiscoverCard`, `groupHomeRegion`, `groupClimbRegions`, `groupRegionRank`, `groupPlace`, `groupsTab`, `openGroupId` |
| `lib/db.js` | `useMyGroups`, `createGroupRow`, `updateGroupSettings`, `setGroupVisibility`, `createGroupEvents`, `regionOfPlace`, `regionAbbr`, `useMyPartnerAreas`, `useStates`, `useGroupFeed` |
| `lib/search.js` | `searchMatches` |
| `lib/live.js` | `useLiveQuery` — the Realtime subscription behind the live feed |
| `supabase/migrations` | 0090, 0178, 0230, 0258, 0260, 0318, 0326 |

## 4. Data
`groups` (`visibility`, `event_policy`, `policy`, `location`, `blurb`), `group_members` (`role`, `status`),
`group_posts`, `group_post_reactions` (both in the `supabase_realtime` publication since 0326), `group_events`, `group_event_rsvps`, `partner_areas`, `areas` (state rows and `path`).

## 5. Known gaps
- A group's location is free text; one typed with no state ("Squamish") has no region and is listed under *Other*.
- Distance from you is not measured: groups have no coordinate, so browsing is by state, not by radius.
