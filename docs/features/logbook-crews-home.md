# Logbook, Crews and Home — `logbook`, `crew`, `today` tabs

Three top-level `tab` values in `ClimbMatch.jsx` (`tab==="today"`, `tab==="crew"`, `tab==="logbook"`).
`logbook` is split by `logbookTab` (`useState("objectives")`: `objectives`, `lists`, `completed`, `challenges`);
`crew` by `crewView` (`crews`, `friends`, `requests`; Friends and Requests open from the Menu tiles).

## 1. What it does today
- **Logbook > Objectives / Saved**: `ListsManager` (`lib/ListsManager.jsx`) holds the objectives (wishlist) and saved lists. The Objectives filter
  chips, in order: **Alpine, Mountaineering, Sport, Trad, Aid, Ice & Mixed, Boulder, Scrambling** — Alpine leads, and alpine,
  mountaineering and aid are each their own chip rather than folded into Alpine or Trad (#2409, then this split). Saved no longer repeats a "Pinned states" card;
  Home already shows it (#2408).
- **Logbook > Saved filter**: chips **All · Routes · Peaks · Areas · Itineraries · Searches** (`savedKind`, default All) show one kind of saved thing at a time; opening Saved from the Menu or Home resets it to All.
- **Logbook > Completed**: `MyAscents` (`lib/MyAscents.jsx`) lists logged climbs (`climb_logs`); `LogAscent` is the logging form,
  `TripReport` the opened trip report, `LogTagConfirmations` lets a tagged partner confirm or decline being named on a log.
- **Quick log** (`QuickLog`, `ClimbMatchCore.jsx`; App state `quickLogFor`): the short way to log — style/outcome (no default, so nothing claims an onsight by accident), date, optional rating. The route page offers it beside *Full log* (`logRow` in `RouteDetail.jsx`, `onLog(route,"quick")`), and a crew card opens it for sport/trad/bouldering crews (`openCrewLog`). It saves a normal `climb_logs` row through `syncLogToDb`; *Add more details* opens `LogAscent` pre-filled with what was picked, and the log can be filled in later from Completed.
  `TripReport` shows ONLY what the reporter entered, in the form's own seven sections and order (The climb, Getting there, On the route,
  Hazards, The descent, The write-up, Climbed with — plus the recorded track); a section with nothing in it is not drawn, and no
  route fact (grade, gain, distance, the route's GPS line) stands in for the reporter's. The reporter's own track is read
  on open through `useLogTrack` (`lib/db.js`), since the route page's report read leaves `gpx_track` out. The descent section draws
  the three logged legs as a proportional bar with the total; an avalanche rating below Considerable files under On the route as a
  reading, Considerable and above under Hazards. The form says, under typed partner names, that a typed name cannot confirm the climb.
  `LogAscent` also offers *Add topo photo* (signed in, DB on): the climber draws the route line with the route page's
  `TopoDrawer` (lazy import from `RouteDetail.jsx`) and on save App's `addLogTopo` files the photo under the climb's
  area (`uploadTopoPhoto`) and the line on the route (`submitTopoLine`), so it reaches the Photos tab for everyone.
- **A logged climb and a trip report are ONE `climb_logs` row** (reviewed 2026-10-21). The difference is how much the climber filled in and which way they answered *DID YOU CLIMB IT?*:
  - *Quick log* = a climb with a style, a date and maybe stars. *Full log* (`LogAscent`) = the same row with the seven sections filled in; its write-up box (`notes`) is what makes it read as a trip report, and `TripReport` is how any row opens.
  - *Conditions only* (`tick_type` `Conditions`, App's `condReports` rather than `logs`) = a report from someone who may not have climbed: road, snow, crowds. It feeds conditions and is never counted as a climb. It does count toward your *Log conditions on 5 routes* challenge (`Challenges` takes `condReports`).
  - Every row, climb or conditions only, feeds the route page: the Reports tab, the conditions consensus (`buildConsensus` over `activity`; a report kept to friends or to yourself still counts, anonymously, through `route_private_conditions`), the crowd readout and the alpine Conditions card's freshness. It also feeds Home's recent condition reports and offline state downloads (`state_trip_reports`). Saving one of either kind raises the *still missing …* alert that opens the contribute form (`missingFacts`), and records a sun vote if one was cast.
  - Only a climb (not Conditions) feeds the climber's side: Completed, Challenges, the profile résumé, sends and points on Ranks (`leaderboard()`; Attempt, Turned around, Fell, Hung and Project are logged but are not sends), Unfinished business (`RetryReminder`), *Logged the same day* pairings (`route_logged_with`, Conditions excluded since 0336), a crew's past state and recap, partner tags and the vouch prompt, a belay catch, a first-ascent credit and the send celebration. A public report's stars are the route rating's fallback vote (`route_star_summary`), and Ranks › *Top climbs* counts public reports per route.
  - Both earn contribution points since 0338 (owner: "reward all"): a logged climb or attempt 1, once per route; a trip report (a write-up, conditions tags, beta, or a Conditions-only report) 2, once per route per month. Only a row shared with Everyone counts, because the boards are public and name the climber per area; this is Strava's rule for public leaderboards. A private log still counts toward your own Challenges.
- **Logbook > Challenges**: named tick-lists from `lib/lists.js` (`LISTS`, `routeInList`, `listPeaks`, `peakClimbed`).
  The lists and their progress are built by ONE hook, `useCuratedLists` (`ClimbMatchCore.jsx`), which Challenges and Home's `TrackedLists` both call.
  Every list counts every log; an expanded list in your own Logbook (signed in) has a **Show on Home** switch that only decides whether Home shows it
  (`profile_tracked_lists`, 0337, owner-only; `useMyTrackedLists`/`saveMyTrackedLists`; App's `trackedLists`/`toggleTrackedList`).
  The **Fifty Classics** rows come from the book's roster (`FIFTY_CLASSICS`, each entry naming its catalog `id`): numbered 1–50, the book's route name
  over "peak · region", a missing grade left out. All fifty are in the catalog (2026-10-21).
  `Challenges` (`ClimbMatchCore.jsx`) has three parts: personal challenges (climbs this year, `pitchesClimbed`, conditions reported,
  vouches given, catches), curated lists, badges. All are DERIVED from the logs it is handed, so a new log updates them the moment it is
  saved (`setLogs`; the logged route's row arrives through `useRoutesByIds`), and nothing is stored. Another climber's profile sheet
  (`FullProfile`) renders the same component with their logs (`__theirLogs`, read by `useUserLogs`, so only what their trip-report
  visibility lets you read) and `self={false}`: *Their challenges* shows the log-derived rows, never the vouch, catch or log-conditions rows, which are only
  drawn where the caller passed them. `pitchesClimbed` counts a log's route pitches; Attempt/Turned around/Project add 0, a route with
  no count is 1 pitch only on a roped crag discipline, an unresolved route adds 0.
- **Crew**: your crews around ONE PLACE — a `routeId`, or since 0302 an `areaId` + `discipline` (a crag session: started from the area page's "Start a crew here",
  the Crews tab's "+ Create a crew → At an area…", or a past crew's picker, through `StartCrewSheet`; `formCrew` takes a route id or a place) — with members, proposed dates,
  per-member day acks and a "Ready" state (`datesAgreed`/`agreedDate`). Every surface that names a crew resolves its place through `crewPlace` (`placeTrip`, `placeCap`,
  `placeLabel`, `placeSub`, `placeMatchesLog`), wrapped by App as `placeOf`; `check:crew-place` holds every reader on it.
  **+ Create a crew** is the first control on the tab for every climber (above pending requests and the crew cards): an area (`StartCrewSheet`), a saved climb with no ACTIVE crew, or *A climb — find it in Climbs…* (opens Climbs to save one); *Find partners* sits beside it.
  A climb's crew is its ACTIVE crew (`activeCrews`): the create picker, the invite prompt, the partner rows' *+ Invite to crew*, a shared objective's *Open crew* and `ListsManager`/`PartnerSearch` (handed `activeCrews`) never reach a past crew, so a past crew's climb can be crewed again.
  Each crew renders as `CrewCard`: members, invite (by profile or email), itinerary, `CrewGearList` (who brings what), meet time/place, float plan.
  Every card starts COLLAPSED (`collapsed={!isOpen}` in App; `openCrewId` is set only by `openCrewCard` and the create flows): the header, Log the climb, join requests, Steps to get ready, Crew chat and **View plan ▾**. View plan opens the rest; a link that names a crew opens that one.
  Crew chat and direct messages (`useCrewMessages`, `useDirectMessages`); unread counts via `countCrewUnread`; `Inbox` and `NotifPanel` surface them.
- **Past crews** (#2395): a crew whose day has passed, that has a log tied to it, or that was dismissed counts as past (`isArchivedCrew`).
  Past-crew members can be vouched for (`GiveVouch`, `givenVouches`). **Archive** and **Clear** (`archiveCrew`, `clearPastCrew`) only hide the crew
  on this device until reload and say so in the toast ("Crew archived on this device until you reload").
- **Crew safety check** (`SafetyTab`, 0314): the pre-climb questionnaire and "mark me safety-ready" are stored per crew for real crews (`saveCrewSafetyAnswers`, `markCrewSafetyReady`) in `crew_safety_answers`, readable by their owner alone. The crew's Team Alignment comes from `crew_alignment()` (`useCrewAlignment` → `alignmentFromServer`): counts per risk level and per flag, never anyone's answers, as the questionnaire promises. Flags are anonymous on every path (`alignmentFromCounts`). The crew card's per-member "reviewed the safety plan" mark reads `crew_ready_ids()` (`useCrewReadyIds`). Example crews keep the local path.
- **Float plans**: `FloatPlans` (`lib/FloatPlans.jsx`) lists plans for `activeCrews`; the plan text is stored on the crew (`createCrew({floatPlan})`).
- **Home (`today`)**: greeting; **Finish setting up** checklist (`gaps`, shows 2 until `showSetupAll`); alerts; **Unfinished business** (`unfinishedOpen`);
  **Jump back in** tiles; **Your lists** (`TrackedLists`, signed in: the curated lists the climber chose with *Show on Home*, in the order picked, each with the same progress Logbook › Challenges shows; with none picked, a one-line *Follow a climbing list here* that opens the lists; a row opens Logbook › Challenges with that list expanded); **Best day to climb** (`BestDayTile`, also a Menu tile); **Recent condition reports**; recent friend activity; the pinned/downloaded states card (`#pinned-downloads`, which the Menu's Downloads tile scrolls to).
  Below that, the **Nothing needs you right now** card: the all-caught-up state, shown only when there is no pending request or invite (`reqN`), no unread DM or crew chat, no crew waiting on your day, no unread alert and no friend activity. A climber with no objectives yet gets "Explore climbs and save one as an objective to get started" and an *Explore climbs* button; anyone with objectives gets the plain all-clear and no button (the *Jump back in* tile already offers it).

## 2. How it works
1. `App` reads server state through React Query hooks in `lib/db.js`: `useMyObjectives`, `useUserLogs`, `useMyCrews`, `useMyItineraries`,
   `useMyCrewInvites`, `useMyObjectiveSavedAt`. Writes are `saveObjective`/`removeObjective`, `createClimbLog`/`updateClimbLog`/`deleteClimbLog`,
   `createCrew`/`updateCrewRow`/`deleteCrewRow`, `addCrewMember`/`updateCrewMemberStatus`/`removeCrewMember`, `ackCrewDay`/`unackCrewDay`.
2. **Ready state**: `datesAgreed(c)` / `agreedDate(c)` in `ClimbMatchCore.jsx`: a crew is Ready only when every confirmed member (ME included)
   has acked the same proposed day (`dayAcks`, persisted in `crew_day_acks`). `isArchivedCrew(c,logs)` in the same file decides "past".
3. **Crew gear**: `CrewGearList` calls `addCrewGearItem`, `assignCrewGear`, `removeCrewGearItem` (RPCs `add_crew_gear_item`, `assign_crew_gear`, `remove_crew_gear_item`);
   `useCrewGearSync` and `pingCrewGear` refresh other members. #2395 serialized gear writes and migration 0291 made `assign_crew_gear` accept only confirmed, listed members.
   Since 0328 an item can carry how many the crew wants (`setCrewGearWanted`, RPC `set_crew_gear_wanted`, `crew_members.gear_wanted`) and each bringer how many they bring
   (`setCrewGearCount`, RPC `set_crew_gear_count`, `crew_members.gear_counts`); several climbers can bring one item and the counts add up, so "Quickdraws · 12 wanted" is
   covered only at 12. The list is only what the crew typed: nothing is drawn from the route or the members' profiles, and the card suggests no gear.
4. **Messaging**: `sendCrewMessage`/`fetchCrewMessages`/`fetchOlderCrewMessages`, `sendDirectMessage`/`fetchMyDirectMessages`, read markers via `markCrewRead`/`fetchCrewLastReads`/`markMessageAsRead`.
5. **Pinned states** follow the account (0187): `pinnedStates` state in `App`, saved by `savePinnedStates` (`profiles.pinned_states`). Offline downloads stay on the device
   (`downloadedStates`, `dlLoaded`, `lib/offline.js`: `downloadStateOffline`, `removeStateOffline`, `packRouteOffline`).
5a. **Saved areas and peaks** follow the account (0322): one `bookmarks` list in `App` feeds the area page's Save button, Logbook › Saved's ✕, the Home and Menu tiles, so they always agree.
   `toggleBookmark` writes `saveAreaRow`/`removeAreaRow` (`saved_areas`, owner-only) and toasts only after the write; a failure restores the list. `useMySavedAreas` is copied into `bookmarks`;
   `lib/offline.js` (`saveAreaIds`, `savedAreaIds`, `savedAreasSynced`) is the offline mirror, and a device's pre-0322 saves are uploaded the first time the account is read there.
6. **Logs**: a log can name partners (`saveLogPartnerNames`, `useMyLogPartnerNames`); tagged climbers answer with `respondToLogTag` (RPC `respond_to_log_tag`, `useLogTagsForMe`).
7. **Vouches**: `giveVouch`, `updateVouch`, `revokeVouch`; read with `useClimberVouches`, `useUserVouches`.

## 3. Files
| File | Key symbols |
|---|---|
| `ClimbMatch.jsx` | `tab` branches for `today`/`crew`/`logbook`, `logbookTab`, `crewView`, `pinnedStates`, `archiveCrew`, `clearPastCrew`, `givenVouches`, `activeCrews`, setup `gaps`, `unfinishedOpen`, `renderObjectives` |
| `ClimbMatchCore.jsx` | `Challenges`, `useCuratedLists`, `TrackedLists`, `pitchesClimbed`, `datesAgreed`, `agreedDate`, `isArchivedCrew`, `CrewInviteModal`, `ItineraryEditor`, `crewPlace`, `placeTrip`, `placeCap`, `placeLabel`, `placeSub`, `placeMatchesLog` |
| `lib/ListsManager.jsx` | Objectives/Saved UI, per-discipline filter chips (Alpine first; Mountaineering and Aid separate); a crag row's Find partners goes to the crag (`onFindPartnersInArea`) |
| `lib/MyAscents.jsx`, `lib/LogAscent.jsx` (no visibility chooser since 2026-10-21: one line names the Settings choice; a new report sends `visibilityFromSetting` and `syncLogToDb` leaves the column out so 0272's insert trigger fills it from the stored setting), `lib/TripReport.jsx`, `lib/tripReportRow.js`, `lib/LogTagConfirmations.jsx` | Completed climbs, logging, trip reports, partner tag confirmation |
| `lib/lists.js` | `LISTS`, `routeInList`, `listPeaks`, `peakClimbed`, `FIFTY_CLASSICS` (Challenges) |
| `lib/CrewCard.jsx`, `lib/CrewGearList.jsx` | Crew card, gear list |
| `lib/CrewFinder.jsx` | Crew discovery (`inMyAreas`: "My climbs & areas" also matches a crew at an area you listed; `initialArea` from the area page's "Crews here") |
| `lib/StartCrewSheet.jsx` | `StartCrewSheet` — start a crew at an AREA: the place, the session's discipline, a day, a size, a note; hands `formCrew` a place |
| `lib/FloatPlans.jsx`, `lib/GiveVouch.jsx`, `lib/Inbox.jsx`, `lib/NotifPanel.jsx` | Float plans, vouch sheet, messages, notifications |
| `lib/SafetyTab.jsx` | `SafetyTab` — crew safety check: Team Alignment (server counts for a real crew) and the float plan |
| `lib/BestDayTile.jsx` | Home "Best day to climb" |
| `lib/offline.js` | Pinned/downloaded states and route packs |
| `lib/db.js` | All hooks and writes named above |

## 4. Data
- **Supabase tables read/written in `lib/db.js`**: `profile_tracked_lists` (0337, the lists Home shows), `objectives`, `climb_logs`, `climb_log_partner_names`, `crews`, `crew_members`, `crew_day_acks`,
  `crew_email_invites`, `crew_listings`, `crew_reads`, `crews_messages`, `messages`, `vouches`, `user_lists`, `user_itineraries`, `saved_searches`, `saved_areas`, `profiles` (`pinned_states`).
- **RPCs**: `add_crew_gear_item`, `assign_crew_gear`, `remove_crew_gear_item`, `claim_my_crew_email_invites`, `share_crew_itinerary`, `log_tags_for_me`, `respond_to_log_tag`, `route_logged_with`, `state_trip_reports`.
- **Migrations**: 0031 objectives, 0036 crews, 0037/00400/00540/00730/0121 climb logs, 0038/0238 vouches, 00420 messaging, 0075 crew locked day, 0086/0227 invite rules,
  0187 pinned states, 0199 itineraries, 0209 crew gear, 0286/0287/0289/0291 `assign_crew_gear` and gear claims, 0092 `user_lists`,
  0302 `crews.area_id` + `crews.discipline` (exactly one of route/area; `crew_listings` appends both; an area fold must repoint `crews.area_id`).
- **Device-only**: Archive/Clear of a past crew (React state `archived`, lost on reload); offline downloads (browser storage via `lib/offline.js`).
- **Seed**: `ROUTES`/`CLIMBERS` fallbacks and `DEMO_FILLERS` sample crews/logs exist for the non-DB path; with `USE_DB` on, the lists above come from Supabase.

## 5. Connections
- Route page (`RouteDetail.jsx`): saving an objective, logging a climb, opening a crew's route via `openRoute`; Planner reads logged times (`check:logged-times`).
- Partners (Discover): `partners_by_objective` reads the objectives that still count (0303: not crag-family, or a peak); `onInvite` and `crews` feed crew invites (`docs/features/partners.md`).
  Saving a crag route stays a tick list; it no longer feeds the match %.
- Profile: vouches and logs feed the profile and the résumé; Menu opens Friends/Requests views and Settings.
- Offline: pinned states and route packs (`packRouteOffline`) are what Home's pinned card lists.

## 6. Guards
All verified present in `package.json`: `check:crew`, `check:crew-member-readers`, `check:log`, `check:logged-times`, `check:challenge-rows`,
`check:count-matches-its-list`, `check:claims`, `check:writes`, `check:write-readers`, `check:offline-claims`, `check:float-plan-persistence`,
`check:read-failures`, `check:outage-flag-reach`, `check:seed-only-surfaces`, `check:dead-flag-gates`, `check:schema`, `check:rls`, `check:toast-reachable`.
Notes: `docs/guards/social-and-crews.md`, `contributions-and-logbook.md`, `honesty-claims.md`, `outage-and-read-failures.md`.
(Matched by name; not re-run.)

## 7. Last significant change
Saved areas sync (0322): an area or peak unsaved in Logbook › Saved on one device is unsaved on its area page everywhere.
Real climbers, batch 4 (0314): a real crew's safety questionnaire and safety-ready marks persist; alignment is computed server-side from owner-only answers and every flag is anonymous. Real climbers, batch 3: crew roster, plan, nudge and invite chips name members by `pubFirst`; the invite list treats a real friend as real (server trust, sorted by it); Home's unread line, past crews and the itinerary message use public names; `FriendsFeed` and FriendsList's activity include real friends' shared logs (`realFriendFeed`) with real kudos (`giveKudos` + log target); MyAscents never matches a real log's typed partner name to an example climber.
#2441 / #2443 / Step 7 (0302): a crew has one place, a route or an area; `crewPlace()` is the one resolver for every surface that names a crew; area crews
(crag sessions) are started from the area page, the Crews tab and a past crew, found under "My climbs & areas" / By Area, and listed on a crag route's Partners sub-tab. Before that
#2395: Crews audit: past-crew vouching, honest Archive/Clear, serialized gear writes, migration 0291 tightens `assign_crew_gear`.

## 8. Known gaps (verified)
- Archive and Clear of a past crew are not persisted; the code comment in `archiveCrew` calls per-member persistence a follow-up.
- `docs/guards` and CLAUDE.md describe crews as in-memory seed; `lib/db.js` shows they are DB-backed, so that older claim is stale.
