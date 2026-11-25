# Groups

`tab==="groups"` in `ClimbMatch.jsx`, opened from the Menu's Groups tile (NAV marks it `bar:false`). Five
views under `groupsTab`: For you · Your groups · Your activity · Discover · Events. A group opens as the
`openGroupId` overlay over it, with four tabs: About · Discussion · Events · Members. There is **no Media tab**
(owner 2026-11-23: a photo someone posts already shows in the Discussion).

## 1. What it does today
- **Who may change what.** Only a group's **managers** (the owner and its moderators) can change its settings,
  including **public / private**. The *Make private / Make public* switch and the *Edit group* button render only
  for a manager (`isMod`, which also requires an active membership), and the server refuses anyone else:
  `groups update by manager` (0090) admits `is_group_manager()` only, and `setGroupVisibility` /
  `updateGroupSettings` report a zero-row update as a refusal rather than a success. Deleting a group is the
  owner's alone.
- **Event cards** (`groupEventRow` in `ClimbMatch.jsx`; competitor review batch A, item 7, owner 2026-11-04, Meetup's pattern): under the title, the first four faces of who is going (`_groupPerson`, so a real member's photo shows) with *N going*; a capped event wears an amber *N spots left* badge in that same line, beside *N going* (it hung off the card's top edge until 2026-11-23 and read as cut off), and says *Full* at none; the row's name for a screen reader carries both. **A past event takes no RSVP, invite or share** (owner 2026-11-23): from the day after its date (`daysUntil` < 0) the open-event sheet says *This event has ended* (*· you went* if you had RSVP'd) in place of the RSVP button, and drops *+ Invite* and *Share this event*; the invite sheet refuses to open on one. Since 0506 the database refuses them too, a day later (below).
- **+ Create event leads the Events tab** (owner 2026-11-23): a wide, centred button above *Upcoming events*, for whoever the group's event policy lets create. The Discover view's title names the place once one is picked: *Climbing groups near Index*.
- **Who may host events** is the group's own setting, *Who can create events?* — *Any member* or *Moderators only*
  (`groups.event_policy`), enforced by the `group events created per the group's event policy` insert policy (0230).
  **New groups default to Moderators only** (2026-10-16), as Meetup (organizer team), Strava clubs (admins) and
  Facebook groups (admins, members only if allowed) do; an organizer can open it to every member. Older groups keep
  the value they stored (a null still reads as Any member, on the screen and in the policy). A member of a
  moderators-only group sees a line saying so where *+ Create event* would be.
- **Discover — search.** One box matches every word typed against a group's name, disciplines, typed location, its
  **state or province in both spellings** ("Washington" and "WA" both find "Seattle, WA"), and its About text.
  Signed in, the match runs in the database against `groups.search_text` (0487), which holds those fields in
  `search_norm`'s spelling-forgiving form, so "mount baker" finds "Mt Baker Alpine Club"; a guest's list of example
  groups is matched in the browser by the same rule (`searchMatches`, `lib/search.js`).
- **Discover — explore by state** (reworked 2026-11-13 for scale). Under *Explore by discipline*, at most six state
  chips (`STATE_CHIPS`): your **home** state, then the states of the areas you listed yourself at for partners
  (`partner_areas`, 0300) — marked *You climb here* — then the states with the most groups. A chip filters the list to
  that whole state and combines with the search box. The list below (*Every state* or one state, alphabetical, with
  counts) holds every state with a group **and every state you downloaded**, then, in its own *Every other state* section, **every other US state** at 0 (`US_STATES`; owner 2026-11-23, to find groups outside your home state) (`groupMyStates`, the account's pins, else
  this device's downloads; owner 2026-11-23), a downloaded state with no group yet listed with a 0. It shows whenever
  it has two or more states; before, it was built only from states that already had a group and hidden when the chips
  covered them, so a climber whose only groups were at home could pick nothing but home. It no longer offers each typed town, which ran to hundreds of spellings. A town is found
  by the search box and a distance by *Near a place*. Results show 20 at a time with *Show more groups*, reset
  whenever a filter changes. Signed in, each 20 is its own read (`discover_groups`, 0487) and the heading's count is
  the database's total; the chip counts come from `discover_group_facets`. *Other* lists the groups that picked no
  catalog area and whose typed place names no state (since 0516 the form no longer saves a group that way).
- **Discover — explore by discipline.** One chip per discipline, whatever capitals a group typed it with ("alpine"
  and "Alpine" are one chip, named as most groups spell it; `useDiscoverGroupFacets`). A chip fills the search box.
- **Discover — sorts.** *Recommended* (or *Nearest* with a place picked), *Most active* (the most recent post that
  is still up, newest first) and *Most members*. All three are ordered in the database, over every group the filters
  match, not over the page on screen. A non-member is shown the order only, never a post or when it was made.
- **A group opens on About** (owner 2026-11-13), for members too; closing the group forgets the tab it was left on.
- **Its own avatar and cover photo** (owner 2026-11-18, 0454). The group form's *Photos* section (`GroupPhotoFields`)
  takes an avatar and a cover. Picking a file uploads it at once (`uploadGroupPhoto`: the camera's location stripped,
  scaled to screen size, the uploader's `{uid}/` prefix in `topo-photos`) and the group row takes the address when the
  form is saved, so cancelling keeps the old picture; *Remove* goes back to the drawn one. The avatar replaces the
  initial in `groupMark` (every list row, Requests, the group's page beside its name); the cover replaces the colour
  band in `groupBand` (Discover's cards) and is a 150px banner at the top of the group's page. Only a manager can
  change them (0090's update policy); `groups_avatar_url_ours` / `groups_cover_url_ours` refuse any address outside the
  bucket, so a group's picture cannot be aimed at an outside server. A guest's pick is a preview on the device only,
  as the guest profile photo is.
- **Make it yours** (owner 2026-11-23, "do all", 0506). The group form's section after *Photos* (`GroupCustomizeFields`)
  sets five more things, all optional and saved with the form: a **colour** (`groups.accent`, one of `GROUP_ACCENTS` or
  *Auto*, which stores no colour, at creation as on an edit; it tints `groupBand`, the initial in `groupMark`, and a strip above the name when there is no cover; the
  database holds it to `#rrggbb` since it reaches a style), an **announcement** (≤300, an amber banner under the
  group's name for anyone who opens it), a **welcome message** (≤600, at the top of Discussion for a member until they
  close it, for the session: `grpWelcomeHidden`), up to 4 **links** (`{label, url}`, https only; `cleanGroupLinks` in
  `lib/groupRules.js` adds a missing `https://` and refuses `http://`, as `group_links_valid()` does; listed on About
  and opened in a new tab with no opener), and **what to call moderators** (≤24, `mod_title`, in place of MOD and
  Moderator on Members, its badge capped at 120px). The new text is screened with the group's name and About text
  (`screening_text`'s `group` line), each link's address with its label since 0509, because About prints both; the
  model screen (`supabase/functions/screen-content`) reads the same fields for a group. A link's scheme is lowercased
  before saving (the database's test is case-sensitive), and `club.org:8080` is a host and port, not a scheme. The
  welcome message is shown only to members, but it is a column of the group row, so anyone who can read a public
  group can read it: it is not a place for anything private. Only a manager can change them (0090's update policy).
- **The database refuses a late RSVP or invite** (0506, `guard_group_event_not_past`): for an event dated before the UTC
  date minus one, a day more lenient than the app, so it never refuses what the app offers. The RSVP toast says *This
  event has ended.* Cancelling an RSVP stays allowed. Probe: `scripts/oneoff/probe-group-custom-0506.mjs`.
  **So a new event starts today or later** (`GroupEventForm`, review 2026-11-23): `createGroupEvents` writes the host's
  RSVP with the event, and the database would refuse it for a past date, leaving an event its host is not on. The date
  picker's minimum is today and a past date disables *Create event* with *Pick today or a later date.* An edit may still
  move an event's date.
- **Join / Leave and + Invite** in a group's header are compact pills; the joined state reads *✓ Joined* (its name
  for a screen reader still says tap to leave, and leaving asks first).
- **Removing a member** (the ✕ on Members) is for the owner and moderators only, never on yourself or the owner, and
  a moderator cannot remove another moderator.
- **Repeating events** (`seriesDates` in `lib/eventSeries.js`): Weekly, Every 2 weeks and Monthly write 10, 8 and 6 separate
  `group_events` rows sharing a `series_id`, in one insert; the form says how many and that the series then ends. Monthly keeps
  the day of the month, clamped to a short month's last day (Jan 31, Feb 28, Mar 31).
- **The host's event tools** (owner 2026-11-19; the open-event sheet in `ClimbMatch.jsx`, host only). **Edit** reopens
  `GroupEventForm` on that event (`editId` in its draft: no group or repeat choice) and saves through `updateGroupEvents`;
  on a series, a checkbox applies the title, time, meeting spot, details and cap to the later events too, whose dates
  never move. A series event also shows a *This series* card: how many are left and the last date, **Add N more**
  (`seriesExtension` continues the cadence after the last date, from today on for a series that already ran out, and `createGroupEvents` writes the round under the same `series_id`),
  and **Cancel this and the N after it** (`seriesLater`, `deleteGroupEvents`, one confirm). The host's 10-day reminder
  for the last event of a series says it is the last. Only the host may edit (the `group events edited by the host`
  policy); a group organizer can cancel but sees none of these tools on another host's event.
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
- **Where it climbs** (required since 0516, asked right after the name; `GroupPlaceFields`). A catalog area, or, behind
  *Not in the catalog? Enter a place yourself*, a place name and a **state or province picked from a list**, stored in
  `location` as "Squamish, BC". The group is filed under its area's state first (`groups.region` = `area_region`, else
  what `location` names), so a group placed at Squamish is under British Columbia whatever its text says, and the
  area's name is in its search text. *Based in* (optional, the town it meets from) is `location` when an area is
  picked. A group saved before 0516 with no area reopens its settings on the place it typed, and saving asks for the
  state. The area's state is its level-2 ancestor (`area_state()`); it and the area's name (`area_region`, `area_place`)
  are written only by the trigger below.
- **The area** is one catalog row (`groups.area_id`).
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
  crew starts **private** (0426) when the group is private, so its roster stays as closed as the group's; the climber can
  switch it to *Listed* before starting.
- **Recent posts from your groups shows three** (owner 2026-11-18): *For you* lists the first three of its (up to 15) posts, and a full-width *Show N more posts* dropdown (`recentOpen`, `aria-expanded`, a `Chevron`) opens the rest in place; *Show fewer posts* folds them back. Three or fewer posts draw no button.
- **Long text opens in place** (2026-10-28): a post in *For you* (`groupPostPreview`) stops at five lines with *See more*, and a Discover card's blurb (`groupDiscoverCard`) at three. Both use the `groupPostMore` key the group's own post view uses, so a post opened in the feed is open in the group too.

## 2. How it works
**Two reads, since 0487.** `useMyGroups` reads the groups you have a row in (member, asked to join, or invited),
with their rosters, and copies them into `createdGroups`: Your groups, For you, Events and Requests are built from
that. The groups you are NOT in are never read whole. `useDiscoverGroups` asks `discover_groups()` for one page of
20 (the text query, the state held in `groupPlace` as `"st:<region>"`, the point and radius from `groupNearPt`, the
sort, and what *Recommended* ranks by: your disciplines, home region and climbing regions) and returns the loaded
pages with the total; `useDiscoverGroupFacets` reads the chip counts; For you's *Recommended for you* is the same
function with a limit of 3. App hands the tab one object, `groupDiscover`, and a failed read is
`groupDiscoverUnavailable`, which the list says in place of its empty state. A group you are not in that is open on
its own page or in the join sheet is read by id (`useGroupById`), so a filter change or your own join cannot pull it
out from under the page; `groupsKnown` is the merged list those sheets look a group up in. Whenever your own groups
are re-read (after every join, leave, request and edit) `refreshGroupDiscovery` marks the Discover reads stale.

The database lists public groups that Safety has not taken down and that you are not an active member of. Both
functions are `security definer` because *Most members* and *Most active* need numbers a non-member cannot read row
by row (0318); they return a member count and an order, never a roster row or a post. `groups.region` and
`groups.search_text` are generated columns, so no client can write them.

A guest (and a build with no database) keeps `discoverGroupList(q, sort, where, near)`, which filters the example
groups and the ones made on this device in the browser, and the tab pages that list itself (`DISC_PAGE`). Signed
in, the example groups (`GROUPS`, while `DEMO_FILLERS` is on) are not in the database, so the same function matches
them against the same filters and `groupDiscoverSort` merges them into the database's rows once the last page of
real groups is loaded; they are counted in the total and the chips, as before, and an example group never pushes a
real one onto a later page. If the read of the real groups fails while example groups are listed, a line above the
list says it is not complete. With a
place picked, *Recommended* becomes *Nearest* (`groupNearMi`). `openGroupsNear` is the area page's way in. Your home
region comes from `regionOfPlace(location)` (`lib/db.js`), which reads a trailing two-letter code first and then the
longest full state/province name; `region_of_place` is its SQL twin, and `check:search-norm` section 5 keeps the two
region tables one. Your climbing regions are your `partner_areas` paths matched against `useStates()`.

A group's feed is live (0326): `useGroupFeed` is a `useLiveQuery` (`lib/live.js`) subscribed over Supabase Realtime to
`group_posts` and `group_post_reactions`, so a post, edit, pin, delete or reaction another member makes refetches the
feed within about a second. Realtime applies the same member-only RLS; a DELETE carries only the id, so it is matched
against the posts already held. A post ClimbMatch Safety takes down leaves every member's feed at once too (0380): RLS
stops that UPDATE reaching them, so a trigger broadcasts the bare id on the public `moderation` topic and `lib/live.js`
treats it as a DELETE. Probe: `scripts/oneoff/probe-live-takedown.mjs`.

- **Reactions are emoji, in Facebook's bar (2026-11-05).** On a post, Like gives the thumbs-up; resting the mouse on it, holding it, right-clicking it, or tapping the reaction count pops a floating pill of the 21 emoji over that button (`ReactionPicker`, emoji only, your pick on a blue disc), and the count line stacks the top three emoji on small discs (`reactionEmoji`). The same bar serves every comment thread (`Comments`), whose React button shows your pick as its emoji alone beside an add-reaction face (2026-11-18). Detail in `docs/guards/social-and-crews.md`.
- **Optimistic taps (2026-10-29).** On a real group, a post's reaction, pin and edit, an event RSVP and declining an event invite change the cached rows (`group-feed`, `group-events`, `my-event-invites`) through `patchQueries()` before the write, and the returned undo restores them if it fails. Joining a group, accepting a group invite and *Approve all* still wait for the server, because the server decides the outcome (approval needed, invite withdrawn, how many were approved).

## 3. Files
| File | Key symbols |
|---|---|
| `ClimbMatch.jsx` | `groupDiscover`, `groupDiscoverUnavailable`, `groupRecommended`, `groupsKnown`, `discoverGroupList` (guests), `groupDiscoverCard`, `groupHomeRegion`, `groupClimbRegions`, `groupRegionRank`, `groupPlace`, `groupNear`, `groupNearPt`, `groupNearMi`, `openGroupsNear`, `groupsTab`, `openGroupId` |
| `src/components/GroupPlaceFields.tsx` | `GroupPlaceFields`, the form's *Where it climbs* (a catalog area, or a typed place and its state) and *Based in* (0516) |
| `src/components/GroupPlaceSearch.tsx` | `GroupPlaceSearch`, the catalog search behind *Near a place* and the form's *Where it climbs* |
| `src/components/PartnersHereCard.tsx` | `onGroupsHere`, the area page's *Climbing groups near* link |
| `src/components/GroupDiscussionTab.tsx` | `GroupDiscussionTab`, an open group's Discussion tab (lifted from App, PR62) |
| `src/components/GroupAboutTab.tsx` | `GroupAboutTab`, an open group's About tab |
| `src/components/GroupMembersTab.tsx` | `GroupMembersTab`, an open group's Members tab (roster and member requests); the first `MEMBERS_FIT` (7, the rows that fill a 390x844 phone, measured 2026-11-23), then *Show N more members* unfolds the rest in place; *Search members* by the heading opens a `ListPage` with a name search and a sort (group order, name, moderators first) |
| `src/components/GroupEventsTab.tsx` | `GroupEventsTab`, an open group's Events tab; past three past events, *All N past events →* opens a `ListPage` with a search by name or place and newest/oldest. Both group pages stack at 792, over the group view and under the event (795) or the Remove sheet (860) a row opens |
| `src/components/GroupJoinQuestionsEditor.tsx` | `GroupJoinQuestionsEditor`, the membership-questions editor in the create-group form (PR63) |
| `src/components/GroupCustomizeFields.tsx` | `GroupCustomizeFields`, the form's *Make it yours* section: colour, announcement, welcome message, links, moderator title (0506) |
| `src/components/GroupEventForm.tsx` | `GroupEventForm`, the create-an-event sheet, and the editor for one |
| `lib/eventSeries.js` | `SERIES_COUNTS`, `seriesDates`, `seriesExtension`, `seriesLater`: the dates of a repeating series |
| `lib/groupRules.js` | `groupVisOf`, `groupCanHostEvent`, `groupJoinPath`, `groupJoinLabel`, `GROUP_TOPICS`, `groupWhere` (moved out of `ClimbMatch.jsx`, PR62) |
| `src/components/GroupsTab.tsx` | `GroupsTab`, the Groups screen body (For you / Your groups / Your activity / Discover / Events), lifted from App in PR61; App passes it the helpers above |
| `lib/db.js` | `useMyGroups`, `useDiscoverGroups`, `useDiscoverGroupFacets`, `useGroupById`, `refreshGroupDiscovery`, `createGroupRow`, `updateGroupSettings`, `uploadGroupPhoto`, `setGroupVisibility`, `createGroupEvents`, `updateGroupEvents`, `deleteGroupEvents`, `regionOfPlace`, `regionAbbr`, `groupRegionOf`, `splitTypedPlace`, `PLACE_REGION_LIST`, `knownRegion`, `useMyPartnerAreas`, `useStates`, `useGroupFeed`, `useAreaPoint` |
| `lib/search.js` | `searchMatches` |
| `lib/live.js` | `useLiveQuery` — the Realtime subscription behind the live feed |
| `src/components/GroupCrewPicker.tsx` | Form a crew from this group: pick members, then a saved climb or an area |
| `src/components/GroupPhotoFields.tsx` | `GroupPhotoFields`, the form's avatar and cover photo pickers (0454) |
| `supabase/migrations` | 0090, 0178, 0230, 0258, 0260, 0318, 0326, 0396, 0454 (avatar and cover); 0426 (private crews, used by Form a crew); 0487 (`discover_groups`, `discover_group_facets`, `region_of_place`, `groups.region`, `groups.search_text`); 0516 (`area_state`, `groups.area_region`, `groups.area_place`: the region from the area first) |
| `scripts/oneoff/probe-group-region-from-area-0516.mjs` | Replays the migrations into PGlite: a group placed at Squamish is under British Columbia, a typed "Squamish, BC" too, a forged area state is overwritten |
| `scripts/oneoff/verify-0487-discover-groups-pglite.mjs` | Replays the migrations into PGlite and asks Discover's questions as real callers: who is listed, search, state, distance, each sort, paging, grants |

## 4. Data
`groups` (`visibility`, `event_policy`, `policy`, `location`, `blurb`, `area_id`, `lat`, `lng`, `area_region`, `area_place` (trigger-written), `avatar_url`, `cover_url`; generated: `region`, `search_text`), `group_members` (`role`, `status`),
`group_posts`, `group_post_reactions` (both in the `supabase_realtime` publication since 0326), `group_events`, `group_event_rsvps`, `partner_areas`, `areas` (state rows and `path`).

## 5. Known gaps
- A group saved before 0516 with no area and a place naming no state stays under *Other* until its organizer saves
  its settings (the form then asks for the state).
- A place typed instead of picked has a state but no point, so it is found by state and search, never by distance.
- Discover's pages are cut by offset, so a group created between two reads can shift a row onto the next page (the
  list drops the repeat). *Most members* and *Most active* count members or find the last post for every group the
  filters match before cutting the page; past tens of thousands of groups those two sorts want a stored count and
  last-post time on `groups`.
- A climber in a very large number of groups still reads all of their own groups and rosters at once (`useMyGroups`).
- *Near a place* measures from a catalog area, not from a town or zip; a town-based group picks the crag or region it
  climbs at.
