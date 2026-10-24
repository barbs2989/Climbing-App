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
- **Logbook > Saved > Itineraries** (`My itineraries`): every plan saved on a climb's Plan tab (*+ Plan your own itinerary* → *Save my plan*, `user_itineraries` via `saveItineraryRow`, read back by `useMyItineraries`) is a row here, with View / edit, Share… and Save as PDF; it survives a reload. Verified end to end with a real signed-in account on 2026-10-22. A plan whose climb row has not loaded yet says *Loading a N-day plan…*, and one whose climb read failed says so in amber (`dbListRoutesFailed`), instead of leaving the card blank under its heading.
- **Logbook > Completed**: `MyAscents` (`lib/MyAscents.jsx`) lists logged climbs (`climb_logs`); `LogAscent` is the logging form,
  `TripReport` the opened trip report, `LogTagConfirmations` lets a tagged partner confirm or decline being named on a log.
- **Quick log** (`QuickLog`, `src/components/QuickLog.tsx`; App state `quickLogFor`): the short way to log — style/outcome (no default, so nothing claims an onsight by accident), date, optional rating. The route page offers it beside *Full log* (`logRow` in `RouteDetail.jsx`, `onLog(route,"quick")`), and a crew card opens it for sport/trad/bouldering crews (`openCrewLog`). It saves a normal `climb_logs` row through `syncLogToDb`; *Add more details* opens `LogAscent` pre-filled with what was picked, and the log can be filled in later from Completed.
  `TripReport` shows ONLY what the reporter entered, in the form's own seven sections and order (The climb, Getting there, On the route,
  Hazards, The descent, The write-up, Climbed with — plus the recorded track); a section with nothing in it is not drawn, and no
  route fact (grade, gain, distance, the route's GPS line) stands in for the reporter's. The reporter's own track is read
  on open through `useLogTrack` (`lib/db.js`), since the route page's report read leaves `gpx_track` out. The descent section draws
  the three logged legs as a proportional bar with the total; an avalanche rating below Considerable files under On the route as a
  reading, Considerable and above under Hazards. The form says, under typed partner names, that a typed name cannot confirm the climb.
  `LogAscent` also offers *Add topo photo* (signed in, DB on): the climber draws the route line with the route page's
  `TopoDrawer` (lazy import from `RouteDetail.jsx`) and on save App's `addLogTopo` files the photo under the climb
  (`uploadTopoPhoto`, `topos.route_id`, 0364) and the line on the route (`submitTopoLine`), so it reaches that climb's Photos tab for everyone, and no other climb's.
- **Where you camped (0358)**: on a route where `campingGate(route)` is true, `LogAscent`'s *Getting there* asks *Nights out*
  (`cond.nights`, a STRING so a day trip "0" survives the save filter → `climb_logs.nights_out`) and *Where did you camp?*
  (`cond.camps`, the camps in the order slept in → `climb_logs.camp_names text[]`). The chips are the route's own CAMPING & BIVY
  list (`campSites`, imported from `RouteDetail.jsx`); *Somewhere else* types a name. `TripReport` shows it under Getting there
  and `ReportStats` as a chip (`campSummary`/`campLabel` in core). Model: Peakbagger's ascent form asks "nights camped", WTA's
  trip reports tag day hike / overnight / multi-night; neither lets you pick the camp, which is what lets the route page count it.
- **A logged climb and a trip report are ONE `climb_logs` row** (reviewed 2026-10-21). The difference is how much the climber filled in and which way they answered *DID YOU CLIMB IT?*:
  - *Quick log* = a climb with a style, a date and maybe stars. *Full log* (`LogAscent`) = the same row with the seven sections filled in; its write-up box (`notes`) is what makes it read as a trip report, and `TripReport` is how any row opens.
  - *Conditions only* (`tick_type` `Conditions`, App's `condReports` rather than `logs`) = a report from someone who may not have climbed: road, snow, crowds. It feeds conditions and is never counted as a climb. It does count toward your *Log conditions on 5 routes* challenge (`Challenges` takes `condReports`).
  - Every row, climb or conditions only, feeds the route page: the Reports tab, the conditions consensus (`buildConsensus` over `activity`; a report kept to friends or to yourself still counts, anonymously, through `route_private_conditions`), the crowd readout and the alpine Conditions card's freshness. It also feeds Home's recent condition reports and offline state downloads (`state_trip_reports`). Saving one of either kind raises the *still missing …* alert that opens the contribute form (`missingFacts`), and records a sun vote if one was cast.
  - Only a climb (not Conditions) feeds the climber's side: Completed, Challenges, the profile résumé, sends and points on Ranks (`leaderboard()`; Attempt, Turned around, Fell, Hung and Project are logged but are not sends), Unfinished business (`RetryReminder`), *Logged the same day* pairings (`route_logged_with`, Conditions excluded since 0336), a crew's past state and recap, partner tags and the vouch prompt, a belay catch, a first-ascent credit and the send celebration. A public report's stars are the route rating's fallback vote (`route_star_summary`), and Ranks › *Top climbs* counts public reports per route.
  - Both earn contribution points since 0338 (owner: "reward all"): a logged climb or attempt 1, once per route; a trip report (a write-up, conditions tags, beta, or a Conditions-only report) 2, once per route per month. Only a row shared with Everyone counts, because the boards are public and name the climber per area; this is Strava's rule for public leaderboards. A private log still counts toward your own Challenges.
- **Sharing a list** (`ListsManager`'s *Share…*, `onShareList` → App's list share sheet): **Send to a friend in ClimbMatch** first (a chat from you in their Messages), then `ShareVia` (Text, Email, Copy link, More…), then Save as PDF (`printSheet` + `listSheetHtml`, a new tab with *← Back to ClimbMatch*). A list shown on your profile goes as one `?list=` link (`listLink`) that anyone can open, with or without an account; a private one goes as each climb with its own `?route=` link (`listShareText`). In a chat both draw as *Open the list ›* / *Open the climb ›* and open in place.
- **Sharing a trip report** (`TripReport`'s 🔗, 2026-10-22): the sheet offers Share everything (the native share sheet, with photos where the device allows), Copy link, Copy text, Email, Facebook, Instagram (copies the caption) and Download (.txt). The link is `?report=<climb_logs id>`, which App's shared-links effect reads through `fetchTripReportById` (`lib/db.js`) and opens as that report over its climb, as Strava's activity link opens the activity. climb_logs' policy (0273) decides who can open it: anyone, signed out included, for Everyone; friends or the crew for theirs. Anyone else gets a toast saying it is not shared with them, and a failed read says so separately. The sheet says who can open your own report's link. A report kept to Just me (or one with no stored row) links its climb (`?route=`) instead, since nobody else could open it; Strava will not share an "Only you" activity either. It used to link the climb in every case, so a recipient never saw the report they were sent.
- **Logbook > Challenges**: named tick-lists from `lib/lists.js` (`LISTS`, `routeInList`, `listPeaks`, `peakClimbed`).
  The lists and their progress are built by ONE hook, `useCuratedLists` (`ClimbMatchCore.jsx`), which Challenges and Home's `TrackedLists` both call.
  Every list counts every log; an expanded list in your own Logbook (signed in) has a **Show on Home** switch that only decides whether Home shows it
  (`profile_tracked_lists`, 0337, owner-only; `useMyTrackedLists`/`saveMyTrackedLists`; App's `trackedLists`/`toggleTrackedList`).
  The **Fifty Classics** rows come from the book's roster (`FIFTY_CLASSICS`, each entry naming its catalog `id`): numbered 1–50, the book's route name
  over "peak · region", a missing grade left out. All fifty are in the catalog (2026-10-21).
  Peak lists (2026-10-22): **Colorado Centennials** (`co_cent`, 99 = the 52 fourteeners + 47 thirteeners, Mount Bross excluded as on the
  14ers card), **Adirondack 46** (`adk46`) and **Sierra Peaks Section** (`sps`, 247 active peaks in list order). Their rosters are in
  `lib/lists.js` (`CO_CENTENNIAL_PEAKS`, `ADK_46_PEAKS`, `SPS_PEAKS`); the summits the catalog lacked were ADDED with a standard route by
  0344 (38 Colorado 13ers, 34 Adirondack peaks) and 0345 (155 Sierra peaks), and list peaks held only as climbing walls got a
  peak-bagger's route, so every entry can be ticked. A roster entry may carry `also`: the face sub-areas of a peak whose climbs sit
  on faces (Half Dome, Cathedral Peak); `peakClimbed` and `routeInList` count a log on any of them.
  0347 gave four fourteeners (Handies, Bierstadt, Blue Sky, Quandary) a walk-up; the 14ers, Bulgers and Cascade rosters had four dead ids
  and six faces-only peaks re-pointed the same day, and `audit:list-coverage` now counts only peaks that can be ticked.
  `Challenges` (`ClimbMatchCore.jsx`) has three parts: personal challenges (climbs this year, `pitchesClimbed`, conditions reported,
  vouches given, catches), curated lists, badges. All are DERIVED from the logs it is handed, so a new log updates them the moment it is
  saved (`setLogs`; the logged route's row arrives through `useRoutesByIds`), and nothing is stored. Another climber's profile sheet
  (`FullProfile`) renders the same component with their logs (`__theirLogs`, read by `useUserLogs`, so only what their trip-report
  visibility lets you read) and `self={false}`: *Their challenges* shows the log-derived rows, never the vouch, catch or log-conditions rows, which are only
  drawn where the caller passed them. `pitchesClimbed` counts a log's route pitches; Attempt/Turned around/Project add 0, a route with
  no count is 1 pitch only on a roped crag discipline, an unresolved route adds 0.
- **Badges** are built by ONE hook, `useBadges` (`ClimbMatchCore.jsx`), on top of `useCuratedLists`, for three readers: the
  Badges grid at the foot of `Challenges` (`BadgeGrid`), the trophy case at the top of a profile (`FullProfile`, through `trophies()`),
  and App's *Badge earned* overlay (`BadgeWatcher`). The owner's bar (2026-10-22): a badge marks a REAL accomplishment, never a
  first step. The set: crag sends (sport, trad, top-rope, boulder, aid; different routes) 50/100/250/500; alpine summits (alpine,
  mountaineering, scrambling) 10/25/50/100, counting ONLY a log ticked *Summit*; ice & mixed 10/25/50; pitches 100/500/1,000;
  a 6/12/24-month logging streak (`monthRuns`); 50/100 climbs in one calendar year (`yearCounts`); Onsight ace (10 onsights or
  flashes); All-rounder (5 disciplines); First ascent; Route developer; and one *finisher* badge per curated list. No badge for a
  first send, a single peak or a vouch. Each earned badge carries `on`, the date of the log that crossed the line (a list: the last
  objective's first tick; null when that log has no date), shown as *✓ Earned <date>* when tapped. Tiers share a `fam`; a profile
  shows the highest earned tier of each, newest first. Your Logbook shows every badge, earned or not, with `cur / tgt` under a
  locked one (a list's finisher only once you have started it); another climber's shows only what they earned, and an empty trophy
  case renders nothing for them. The log form's save stamps `badgeAt`; `BadgeWatcher` (mounted while the log form is open, so it
  holds the badges from before the save) celebrates any badge that appears within 6 s, once each.
- **Crew**: your crews around ONE PLACE — a `routeId`, or since 0302 an `areaId` + `discipline` (a crag session: started from the area page's "Start a crew here",
  the Crews tab's "+ Create a crew → At an area…", or a past crew's picker, through `StartCrewSheet`; `formCrew` takes a route id or a place) — with members, proposed dates,
  per-member day acks and a "Ready" state (`datesAgreed`/`agreedDate`). Every surface that names a crew resolves its place through `crewPlace` (`placeTrip`, `placeCap`,
  `placeLabel`, `placeSub`, `placeMatchesLog`), wrapped by App as `placeOf`; `check:crew-place` holds every reader on it.
  **+ Create a crew** is the first control on the tab for every climber (above pending requests and the crew cards): an area (`StartCrewSheet`), a saved climb with no ACTIVE crew, or *A climb — find it in Climbs…* (opens Climbs to save one); *Find partners* sits beside it.
  A climb's crew is its ACTIVE crew (`activeCrews`): the create picker, the invite prompt, the partner rows' *+ Invite to crew*, a shared objective's *Open crew* and `ListsManager`/`PartnerSearch` (handed `activeCrews`) never reach a past crew, so a past crew's climb can be crewed again.
  Each crew renders as `CrewCard`: members, invite (by profile or email), itinerary, `CrewGearList` (who brings what), meet time/place, float plan.
  **Who is free**: the card's *Step 1 · Your typical week* grid and the crew Safety tab's heatmap read each member's SAVED profile availability (`availWeek`, else the coarse `availability` tags) through `hasSlot`/`weekOf`. A real crewmate's comes from `fetchProfilesByIds` (`lib/db.js`), which selects `availability` + `avail_week` for exactly this, and `crewMemberById` carries both; your own row starts from your saved week.
  **Itinerary** (`CrewCard`, props `myItin` and `onShareMyItin`): *Import from Plan* lists *Your plan* first (`myItineraries[routeId]`, saved on the Plan tab through `saveMyItin` in App), then `getAvailableItineraries(route)`, and *Build your own*. The builder (`openItinBuilder`) starts from your plan; *Share with the crew* (`shareItinDraft`) saves it as your plan for the climb (`saveMyItin(..., quiet)`) and shares it (`shareItinToCrew` → `share_crew_itinerary`). *Remove* (`removeCrewItin`) clears the crew's plan with `itinerary:null` after a confirm; your own saved plan is untouched.
  Every card starts COLLAPSED (`collapsed={!isOpen}` in App; `openCrewId` is set only by `openCrewCard` and the create flows): the header, Log the climb, join requests, Steps to get ready, Crew chat and **View plan ▾**. View plan opens the rest; a link that names a crew opens that one.
  Crew chat and direct messages (`useCrewMessages`, `useDirectMessages`); unread counts via `countCrewUnread`; `Inbox` and `NotifPanel` surface them.
- **Crew › Requests** (`crewView==="requests"`) is the one place for everything pending: crew invites, **climbers asking to join your crews** (`allJoinIn`, with Accept / Decline / Crew), friend requests, group invites and join requests to groups you run, then **Waiting on others** — every request YOU sent, each marked Pending with its own Withdraw: friend requests (signed in), crews you asked to join (`myCrewAsks`, the same list the Crews tab's Pending requests reads) and groups you asked to join (`pendingGroups`). The Menu tile's badge counts incoming join requests too.
- **The bell** (`NotifPanel`) leads with a **Requests** section — friend requests plus every notice under the *requests* switch (crew invites and crew join requests via `_crewReqNotifs`, group and event invites, join requests, accepted friend requests) — with *See all requests ›* opening Crew › Requests; everything else is under Activity. The bell button's accessible name carries the new count ("Notifications, 3 new"). **Archive and delete** (owner 2026-10-23; Mail and Gmail pair the two swipes): swipe a row RIGHT to archive it (`onArchive` → `dismissedNotifs`, plus `markNoticeRead` for a `user_notices` row); it moves under *Archived*, where *Restore* brings it back (`markNoticeUnread` clears `read_at`). Swipe LEFT to delete it (`onDelete` → `deletedNotifs`, plus `deleteNotice` for a stored notice, which throws when RLS deleted nothing); it leaves both lists, and archived rows swipe left to delete too. The header is ← Back (top left, no ✕), the title, and *Archive all* alone at the right; a muted line under it names both swipes.
- **Past crews** (#2395): a crew whose day has passed, that has a log tied to it, or that was dismissed counts as past (`isArchivedCrew`).
  Past-crew members can be vouched for (`GiveVouch`, `givenVouches`). **Archive** and **Clear** (`archiveCrew`, `clearPastCrew`) only hide the crew
  on this device until reload and say so in the toast ("Crew archived on this device until you reload").
  *View all past crews* is a full-screen portal (`pastExpand`, zIndex 9500), so anything opened from inside it must land ON TOP of it:
  **Stay in touch › + Add** opens `ConnectModal`, which is portalled to `document.body` (zIndex 9950) like `FullProfile`; Vouch, Log this climb
  and the trip report close the list first; **Climb with them again** closes it too before the Start a crew sheet (zIndex 1200) or the new crew's
  card opens, which it used to cover until Back (2026-10-23).
- **Crew safety check** (`SafetyTab`, 0314): the pre-climb questionnaire and "mark me safety-ready" are stored per crew for real crews (`saveCrewSafetyAnswers`, `markCrewSafetyReady`) in `crew_safety_answers`, readable by their owner alone. The crew's Team Alignment comes from `crew_alignment()` (`useCrewAlignment` → `alignmentFromServer`): counts per risk level and per flag, never anyone's answers, as the questionnaire promises. Flags are anonymous on every path (`alignmentFromCounts`). The crew card's per-member "reviewed the safety plan" mark reads `crew_ready_ids()` (`useCrewReadyIds`). Example crews keep the local path.
- **Float plans**: `FloatPlans` (`lib/FloatPlans.jsx`) lists plans for `activeCrews`; the plan text is stored on the crew (`createCrew({floatPlan})`).
  **Crew ⇄ plan** (2026-10-22): a crew's facts come INTO its plan — `crewFloatFill` (App) maps the place, the confirmed partners' public names,
  the party size, `meetPlace` and the agreed day + `meetTime` onto the form's route/partner/party/lot/depart; a new crew plan starts with them and an
  existing one offers *Fill in from the crew (N empty fields)*, which only ever fills EMPTY fields. A plan with no crew (a route Safety tab's
  `route:<id>`, or *+ New*'s `trip:<ms>`) can be MOVED onto an active crew without one (*Climbing this with a crew? Move the plan to it*): saved under
  `crew:<id>` first, the old scope deleted second, and a saved plan files the crew stub. A saved crew plan has *Send to the crew chat*
  (`FloatPlan`'s `onSendToCrew`, wired in both `FloatPlans` and the crew `SafetyTab`), which posts the plan text through `sendCrewMsg` — the
  climber's own send, so the Privacy Policy's "stays on your phone until you send it" still holds; `crews.float_plan` is unchanged.
  **Chat → plan**: the plan text is ONE format, `floatPlanText` (core), and `parseFloatPlanText` reads it back (null for any other message).
  In a crew thread `MessageRow` (given `onSaveFloatPlan`) draws a posted plan as `FloatPlanCard` (`src/components/FloatPlanCard.tsx`): the climb,
  Leaves / Back by (amber) / Parking / Vehicle / Party / Comms / Contact where filled, notes, coordinate. A crewmate's card has *Save to my float
  plans* → App's `saveFloatPlanFromChat` opens Float plans on `crew:<id>` with the trip facts copied, the partner line taken from the reader's own
  view of the crew, and the poster's EMERGENCY CONTACT never copied; an existing plan for that crew gets empty fields only (`focus.merge`), and a
  note above the form asks for their own contact until the plan is saved.
- **Home (`today`)**: greeting; **Finish setting up** checklist (`gaps`, shows 2 until `showSetupAll`; the grades, bio, availability, zip and photo rows call `openEdit(<field>)`, which opens the profile editor on that field, highlighted, under a card saying what to do and why); **Alerts** (phone only, `alertsOpen`: the newest 8, each swiping right to archive and left to delete through the same `archiveNotif`/`deleteNotif` the bell uses, then *View all N alerts* opening the bell's panel, which scrolls and has *Archive all*); **Unfinished business** (`unfinishedOpen`);
  **Jump back in** tiles; **Your lists** (`TrackedLists`, signed in: the curated lists the climber chose with *Show on Home*, in the order picked, each with the same progress Logbook › Challenges shows; with none picked, a one-line *Follow a climbing list here* that opens the lists; a row opens Logbook › Challenges with that list expanded); **Best day to climb** (`BestDayTile`, also a Menu tile); **Recent condition reports** (one card per objective with a report in the last 90 days: the newest report in full — author, date, outcome, the labelled `ReportStats` chips, every tag with hazards first, three lines of text, photo count — then up to three more recent reports by other climbers, each opening its own report, and *All trip reports on this climb*, which opens the route on its Reports tab via `setPendingSubTab("conditions")`; reads `useRecentReportsOnRoutes`); **Recent friend activity** (each row has TWO targets: the avatar + name header opens the friend's profile, the climb line under it opens that trip report; Crew › Friends' `FriendsFeed` splits the same way, its climb line opening the route); the pinned/downloaded states card (`#pinned-downloads`, which the Menu's Downloads tile scrolls to).
  Below that, the **Nothing needs you right now** card: the all-caught-up state, shown only when there is no pending request or invite (`reqN`), no unread DM or crew chat, no crew waiting on your day, no unread alert and no friend activity. A climber with no objectives yet gets "Explore climbs and save one as an objective to get started" and an *Explore climbs* button; anyone with objectives gets the plain all-clear and no button (the *Jump back in* tile already offers it).
- **All friends (`FriendsList`, `lib/FriendsList.jsx`, opened by *See all friends (N)* on Crew › Friends)**: a **Search friends** box sits at the top for any list with a friend in it (it used to appear only past four). It matches the name on screen and the @handle (`pubName`, never a hidden real name), has a clear ✕ (Escape also clears), hides *Recent friend activity* while a query is typed so the matches sit under the box, and an empty result names the query. Sort chips (Shared goals · Active · A–Z) and *Shares an objective with me* filter the same list.

- **Download as CSV (desktop website)**: My Ascents has a *⤓ Download as CSV* button — every logged climb as one row (date, climb, where, grade, discipline, style, stars, partners, notes), newest first; disabled while your climbs could not load (`downloadLogbookCsv` in `lib/DesktopShell.jsx`).

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
   A download lives in IndexedDB, asks the browser to keep it (`navigator.storage.persist()`), and is read back by
   `offlineDownloads()` on every launch, so it survives closing the app; a pin made on another device downloads here.
   It comes from the nightly state file (`scripts/build-state-snapshots.mjs`) when that file is under 3 days old, else
   live from the database (`downloadStateLive`), which reads routes BY AREA id (`AREA_BATCH`): the old path-join read
   timed out on every state. A state the nightly build cannot read is left out of that night's file, not the whole set.
   A downloaded state answers the Climbs tab from the device first (`deviceFirst` in `lib/db.js`), except the Route finder's
   list and count over more than 2,000 climbs (`deviceFirstScan`, `DEVICE_SCAN_MAX_ROUTES`): the device has no index to filter
   or sort on, so a whole pinned state scanned all its climbs and the Washington page's Suggested climbs waited seconds for it.
   Those ask the database first and keep the device copy as the no-signal fallback. A smaller subtree reads only its own
   areas' climbs (`localSubtreeRouteCount`; `matchingRoutes` by the `area_id` index), not the whole state's.
   **Manage areas** (`manageAreasOpen`, from Home's pinned card) lists every state or province of the picked country with its
   catalog count from `useStates()`. With the database on, a count is the database's or nothing: while that read is in flight a
   row says *Loading the catalog…* (`statesLoading`), and a failed read says so (`statesUnavailable`); neither falls back to
   the four-state seed tree, which used to grey out 46 states as "No climbs in the catalog" until the read landed.
   The country choice (United States · Canada) is always shown: `KNOWN_COUNTRIES` and `CA_PROVINCES` in `lib/countries.js`
   list every country and province before the read lands and when it fails, so Canada is offered at once, offline included;
   it used to appear only once `useStates()` returned, so the screen read as US-only for the first 8-28s.
5a. **Saved areas and peaks** follow the account (0322): one `bookmarks` list in `App` feeds the area page's Save button, Logbook › Saved's ✕, the Home and Menu tiles, so they always agree.
   `toggleBookmark` writes `saveAreaRow`/`removeAreaRow` (`saved_areas`, owner-only) and toasts only after the write; a failure restores the list. `useMySavedAreas` is copied into `bookmarks`;
   `lib/offline.js` (`saveAreaIds`, `savedAreaIds`, `savedAreasSynced`) is the offline mirror, and a device's pre-0322 saves are uploaded the first time the account is read there.
6. **Logs**: a log can name partners (`saveLogPartnerNames`, `useMyLogPartnerNames`); tagged climbers answer with `respondToLogTag` (RPC `respond_to_log_tag`, `useLogTagsForMe`).
7. **Vouches**: `giveVouch`, `updateVouch`, `revokeVouch`; read with `useClimberVouches`, `useUserVouches`.

## 3. Files
| File | Key symbols |
|---|---|
| `ClimbMatch.jsx` | `tab` branches for `today`/`crew`/`logbook`, `logbookTab`, `crewView`, `pinnedStates`, `archiveCrew`, `clearPastCrew`, `givenVouches`, `activeCrews`, setup `gaps`, `unfinishedOpen`, `renderObjectives` |
| `ClimbMatchCore.jsx` | `Challenges`, `useCuratedLists`, `useBadges`, `trophies`, `BadgeGrid`, `BadgeWatcher`, `monthRuns`, `yearCounts`, `pitchesClimbed`, `datesAgreed`, `agreedDate`, `isArchivedCrew`, `crewPlace`, `placeTrip`, `placeCap`, `placeLabel`, `placeSub`, `placeMatchesLog` |
| `src/components/ItineraryEditor.tsx` | `ItineraryEditor` — the day-by-day itinerary editor (and its `TIME_PRESETS`), rendered by the crew plan, the log, add-a-climb and the route page |
| `src/components/TrackedLists.tsx` | `TrackedLists` — YOUR LISTS on Home: the followed curated lists with the Logbook's progress for each (`useCuratedLists`) |
| `src/components/CrewInviteModal.tsx` | `CrewInviteModal` — the Invite to crew sheet (who, which climb, an optional note); `ClimbMatch.jsx` opens it from a partner's profile |
| `src/components/ConnectModal.tsx` | `ConnectModal` — the Connect sheet (who, the objectives you share, an optional note), portalled to `document.body`; `ClimbMatch.jsx` opens it from Stay in touch › + Add and a profile's Connect |
| `src/components/TickList.tsx` | `TickList` — LOGGED CLIMBS on a profile: the climber's logs (plus seed history for a seed identity, `seedHistoryFor`), sortable and filterable by discipline; `FullProfile` renders it |
| `lib/ListsManager.jsx` | Objectives/Saved UI, per-discipline filter chips (Alpine first; Mountaineering and Aid separate); a crag row's Find partners goes to the crag (`onFindPartnersInArea`) |
| `lib/MyAscents.jsx`, `lib/LogAscent.jsx` (no visibility chooser since 2026-10-21: one line names the Settings choice; a new report sends `visibilityFromSetting` and `syncLogToDb` leaves the column out so 0272's insert trigger fills it from the stored setting), `lib/TripReport.jsx`, `lib/tripReportRow.js`, `lib/LogTagConfirmations.jsx` | Completed climbs, logging, trip reports, partner tag confirmation |
| `lib/lists.js` | `LISTS`, `routeInList`, `listPeaks`, `peakClimbed`, `FIFTY_CLASSICS` (Challenges) |
| `lib/CrewCard.jsx`, `lib/CrewGearList.jsx` | Crew card, gear list |
| `lib/CrewFinder.jsx` | Crew discovery (`inMyAreas`: "My climbs & areas" also matches a crew at, or inside, an area you listed or saved — `savedAreaIds`, signed in only; `initialArea` from the area page's "Crews here") |
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
All friends search: the *Search friends* box shows for any friends list, clears with ✕, and the activity feed steps aside while searching.
Saved areas sync (0322): an area or peak unsaved in Logbook › Saved on one device is unsaved on its area page everywhere.
Real climbers, batch 4 (0314): a real crew's safety questionnaire and safety-ready marks persist; alignment is computed server-side from owner-only answers and every flag is anonymous. Real climbers, batch 3: crew roster, plan, nudge and invite chips name members by `pubFirst`; the invite list treats a real friend as real (server trust, sorted by it); Home's unread line, past crews and the itinerary message use public names; `FriendsFeed` and FriendsList's activity include real friends' shared logs (`realFriendFeed`) with real kudos (`giveKudos` + log target); MyAscents never matches a real log's typed partner name to an example climber.
#2441 / #2443 / Step 7 (0302): a crew has one place, a route or an area; `crewPlace()` is the one resolver for every surface that names a crew; area crews
(crag sessions) are started from the area page, the Crews tab and a past crew, found under "My climbs & areas" / By Area, and listed on a crag route's Partners sub-tab. Before that
#2395: Crews audit: past-crew vouching, honest Archive/Clear, serialized gear writes, migration 0291 tightens `assign_crew_gear`.

## 8. Known gaps (verified)
- Archive and Clear of a past crew are not persisted; the code comment in `archiveCrew` calls per-member persistence a follow-up.
- `docs/guards` and CLAUDE.md describe crews as in-memory seed; `lib/db.js` shows they are DB-backed, so that older claim is stale.
