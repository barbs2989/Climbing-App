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
- **Event cards** (`groupEventRow` in `ClimbMatch.jsx`; competitor review batch A, item 7, owner 2026-11-04, Meetup's pattern): under the title, the first four faces of who is going (`_groupPerson`, so a real member's photo shows) with *N going*; a capped event wears an amber *N spots left* badge at its top-right corner and says *Full* at none; the row's name for a screen reader carries both. The Discover view's title names the place once one is picked: *Climbing groups near Index*.
- **Who may host events** is the group's own setting, *Who can create events?* — *Any member* or *Moderators only*
  (`groups.event_policy`), enforced by the `group events created per the group's event policy` insert policy (0230).
  **New groups default to Moderators only** (2026-10-16), as Meetup (organizer team), Strava clubs (admins) and
  Facebook groups (admins, members only if allowed) do; an organizer can open it to every member. Older groups keep
  the value they stored (a null still reads as Any member, on the screen and in the policy). A member of a
  moderators-only group sees a line saying so where *+ Create event* would be.
- **Discover — search.** One box matches every word typed against a group's name, disciplines, typed location, its
  **state or province in both spellings** ("Washington" and "WA" both find "Seattle, WA"), and its About text,
  through the shared `searchMatches` rule (`lib/search.js`).
- **Discover — explore by state** (reworked 2026-11-13 for scale). Under *Explore by discipline*, at most six state
  chips (`STATE_CHIPS`): your **home** state, then the states of the areas you listed yourself at for partners
  (`partner_areas`, 0300) — marked *You climb here* — then the states with the most groups. A chip filters the list to
  that whole state and combines with the search box. The list below (*Every state* or one state, alphabetical, with
  counts) holds every state; it no longer offers each typed town, which ran to hundreds of spellings. A town is found
  by the search box and a distance by *Near a place*. Results show 20 at a time with *Show more groups*
  (`DISC_PAGE`), reset whenever a filter changes.
- **A group opens on About** (owner 2026-11-13), for members too; closing the group forgets the tab it was left on.
- **Join / Leave and + Invite** in a group's header are compact pills; the joined state reads *✓ Joined* (its name
  for a screen reader still says tap to leave, and leaving asks first).
- **Removing a member** (the ✕ on Members) is for the owner and moderators only, never on yourself or the owner, and
  a moderator cannot remove another moderator.
- **Share an event** (owner 2026-11-13). A public group's event sheet offers *Share this event*: Text, Email,
  Facebook, Copy link and More… (`ShareVia` with `facebook`). Facebook's dialog takes only the link, so the message is
  copied first, to paste into a post or a Facebook group. The message carries the title, date, time, place and group,
  because events are members-only (RLS): `?group=<id>&event=<id>` opens the event sheet for a member, and the group's
  About with *Join … to see this event and RSVP* for anyone else. A private group's events offer + Invite only.
- **Discover — near a place** (0396). *Near a place* searches every crag, peak and area in the catalog (`GroupPlaceSearch`),
  then lists the groups whose home area lies within 25, 50, 100 or 250 mi of it (shown in the climber's units), nearest
  first; each card says how far it is. It combines with the search box and the state chip. A crag or region page's
  partners card links to *Climbing groups near <area>*, which opens Discover already set to that area. This is
  Meetup's model (search any location, then a distance around it), on the places the app already knows, for the
  climber planning a trip somewhere they do not live.
- **Where it climbs.** A group's form has an optional *Where it climbs* field: one catalog area (`groups.area_id`).
  Its point (`lat`, `lng`) is written only by the `groups_place_from_area` trigger from `area_point()` (the area's
  own coordinate, else its descendants' average, else its nearest ancestor's), so a client cannot place a group
  somewhere its area is not. The About tab reads *Climbs around <area>*. A group without one is never claimed to be
  near anywhere; it is still found by state and by search.
- **Recommended** order on Discover and For you: groups sharing a discipline with you first, then home state, then
  where you climb.
- Private groups are listed only to their members; an invitee finds one under Requests.
- **Form a crew from a group** (owner 2026-11-14): any active member sees *Form a crew from this group* at the top of the
  *Members* tab once someone else is in it. `GroupCrewPicker` lists the roster (you and blocked climbers left out), up to
  11 picks (a crew holds 12), then *where*: one of your saved climbs (`crewPickGroups`, as *Climb again with a past crew*)
  goes straight to `formCrew`; *At an area…* hands the picks to `StartCrewSheet`. Picks get ordinary crew invites they
  accept or decline. The group is only where the names came from: the crew has no `group_id` and does not name it. The
  crew starts **private** (0421) when the group is private, so its roster stays as closed as the group's; the climber can
  switch it to *Listed* before starting.
- **Long text opens in place** (2026-10-28): a post in *For you* (`groupPostPreview`) stops at five lines with *See more*, and a Discover card's blurb (`groupDiscoverCard`) at three. Both use the `groupPostMore` key the group's own post view uses, so a post opened in the feed is open in the group too.

## 2. How it works
`useMyGroups` reads every group the viewer may see (RLS: public, or one you belong to) and copies it into
`createdGroups`. `discoverGroupList(q, sort, where, near)` filters that list by the text query, by `where`
(`""`, `"st:<region>"` or `"city:<location>"`, held in the `groupPlace` state) and by `near` (`groupNearPt`: the
picked area's point from `useAreaPoint`, with the radius held in `groupNear`), and drops groups you are in. With a
place picked, *Recommended* becomes *Nearest* (`groupNearMi`). `openGroupsNear` is the area page's way in. A
group's region comes from `regionOfPlace(location)` (`lib/db.js`), which reads a trailing two-letter code first and
then the longest full state/province name; `regionAbbr` gives the code back for search. Your climbing regions are
your `partner_areas` paths matched against `useStates()`.

A group's feed is live (0326): `useGroupFeed` is a `useLiveQuery` (`lib/live.js`) subscribed over Supabase Realtime to
`group_posts` and `group_post_reactions`, so a post, edit, pin, delete or reaction another member makes refetches the
feed within about a second. Realtime applies the same member-only RLS; a DELETE carries only the id, so it is matched
against the posts already held. A post ClimbMatch Safety takes down leaves every member's feed at once too (0380): RLS
stops that UPDATE reaching them, so a trigger broadcasts the bare id on the public `moderation` topic and `lib/live.js`
treats it as a DELETE. Probe: `scripts/oneoff/probe-live-takedown.mjs`.

- **Reactions are emoji, in Facebook's bar (2026-11-05).** On a post, Like gives the thumbs-up; resting the mouse on it, holding it, right-clicking it, or tapping the reaction count pops a floating pill of the 21 emoji over that button (`ReactionPicker`, emoji only, your pick on a blue disc), and the count line stacks the top three emoji on small discs (`reactionEmoji`). The same bar serves every comment thread (`Comments`). Detail in `docs/guards/social-and-crews.md`.
- **Optimistic taps (2026-10-29).** On a real group, a post's reaction, pin and edit, an event RSVP and declining an event invite change the cached rows (`group-feed`, `group-events`, `my-event-invites`) through `patchQueries()` before the write, and the returned undo restores them if it fails. Joining a group, accepting a group invite and *Approve all* still wait for the server, because the server decides the outcome (approval needed, invite withdrawn, how many were approved).

## 3. Files
| File | Key symbols |
|---|---|
| `ClimbMatch.jsx` | `discoverGroupList`, `groupDiscoverCard`, `groupHomeRegion`, `groupClimbRegions`, `groupRegionRank`, `groupPlace`, `groupNear`, `groupNearPt`, `groupNearMi`, `openGroupsNear`, `groupsTab`, `openGroupId` |
| `src/components/GroupPlaceSearch.tsx` | `GroupPlaceSearch`, the catalog search behind *Near a place* and the form's *Where it climbs* |
| `src/components/PartnersHereCard.tsx` | `onGroupsHere`, the area page's *Climbing groups near* link |
| `src/components/GroupDiscussionTab.tsx` | `GroupDiscussionTab`, an open group's Discussion tab (lifted from App, PR62) |
| `src/components/GroupAboutTab.tsx` | `GroupAboutTab`, an open group's About tab |
| `src/components/GroupMembersTab.tsx` | `GroupMembersTab`, an open group's Members tab (roster and member requests) |
| `src/components/GroupEventsTab.tsx` | `GroupEventsTab`, an open group's Events tab |
| `src/components/GroupMediaTab.tsx` | `GroupMediaTab`, an open group's Media grid |
| `src/components/GroupJoinQuestionsEditor.tsx` | `GroupJoinQuestionsEditor`, the membership-questions editor in the create-group form (PR63) |
| `src/components/GroupEventForm.tsx` | `GroupEventForm`, the create-an-event sheet |
| `lib/groupRules.js` | `groupVisOf`, `groupCanHostEvent`, `groupJoinPath`, `groupJoinLabel`, `GROUP_TOPICS`, `groupWhere` (moved out of `ClimbMatch.jsx`, PR62) |
| `src/components/GroupsTab.tsx` | `GroupsTab`, the Groups screen body (For you / Your groups / Your activity / Discover / Events), lifted from App in PR61; App passes it the helpers above |
| `lib/db.js` | `useMyGroups`, `createGroupRow`, `updateGroupSettings`, `setGroupVisibility`, `createGroupEvents`, `regionOfPlace`, `regionAbbr`, `useMyPartnerAreas`, `useStates`, `useGroupFeed`, `useAreaPoint` |
| `lib/search.js` | `searchMatches` |
| `lib/live.js` | `useLiveQuery` — the Realtime subscription behind the live feed |
| `src/components/GroupCrewPicker.tsx` | Form a crew from this group: pick members, then a saved climb or an area |
| `supabase/migrations` | 0090, 0178, 0230, 0258, 0260, 0318, 0326, 0396; 0421 (private crews, used by Form a crew) |

## 4. Data
`groups` (`visibility`, `event_policy`, `policy`, `location`, `blurb`, `area_id`, `lat`, `lng`), `group_members` (`role`, `status`),
`group_posts`, `group_post_reactions` (both in the `supabase_realtime` publication since 0326), `group_events`, `group_event_rsvps`, `partner_areas`, `areas` (state rows and `path`).

## 5. Known gaps
- A group's location is free text; one typed with no state ("Squamish") has no region and is listed under *Other*.
- Only groups that picked *Where it climbs* have a point; the rest are found by state and search, never by distance.
- Discover still reads every visible group into the browser (`useMyGroups`) and filters there; paging the screen does
  not page the read. Past a few thousand groups this wants a server-side search (state, text, distance) with paging.
- *Near a place* measures from a catalog area, not from a town or zip; a town-based group picks the crag or region it
  climbs at.
