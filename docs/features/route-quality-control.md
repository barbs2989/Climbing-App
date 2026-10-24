# Route quality control

How climber edits to route pages are held, agreed, checked, locked and flagged. Decided by the owner on
2026-10-15: route data is safety data, so accuracy comes before speed — and, later the same day, that an
empty field fills at once and two climbers who agree are enough to change one (0325).

## 1. What it does today

- **Area edits are held for review (0319)** — route edits follow the 0325 rule below. An area edit (About, Walk in, Walk-in time, Drive & park, Rock, Faces, Season; `lib/areaFields.js`) is a `contributions` row with `area_id` and no `route_id`; the same queue, approve/reject functions, notices and strikes apply. One difference: an approved AREA value is written to its `areas` column by `apply_approved_area_field` (there is no client overlay for area pages), and area rows get no confidence lock.
- **A route edit goes live by itself in two cases (0325).** A climber's edit on the route page's
  "Add or fix info" sheet is written to `contributions` (kind `field`). The database decides at
  insert (`trg_contribution_vote` → `contribution_consensus`):
  - **The field is empty** (`route_field_is_empty`: its column is empty and no edit to it was ever
    approved) → the row is born `approved`, review note *Added to an empty field*. The page shows it
    on the next read.
  - **A second, different climber sends the same value** as a waiting edit (`_edit_value_norm`:
    case-, whitespace- and trailing-full-stop-blind, a numeric string equals its number, no
    tolerance on numbers — stricter than `sameEditValue`) → both rows become `approved`, review note
    *Agreed by 2 climbers*, and the first climber gets a "Your route edit is live" notice. One
    account can never agree with itself.
  - **Otherwise** the row stays `pending`: the owner can still approve it alone from the queue.
  Auto-applied rows keep `reviewed_by` NULL (the owner's approvals set it) and do **not** raise the
  field to high — only the owner's check locks a field. A field a climber filled stops reading as
  "empty → low". Area edits are unchanged: still held (0319).
- **A removal always waits for the owner (0351, owner note 2026-10-22: "people shouldn't be able to
  delete waypoints when editing").** An edit *removes something* when the page holds a value and the
  edit is empty, or both are lists and the edit has fewer rows, or fewer rows with a map pin
  (`_edit_removes`, against `route_field_page_value`: the latest approved edit, else the column).
  Such a row stays `pending` however many climbers send it — it is never approved by agreement and
  never counted as the second climber for another row — and carries `review_note` `REMOVAL_NOTE`
  (`lib/db.js`). The edit sheet (`SuggestFix`, `editRemoves` / `REMOVABLE_LISTS` — waypoints,
  pitches, rappel stations, camps, ways in, climbing sections, hazards) says so before sending and
  **requires a reason** (≥10 characters), sent as `contributions.reason`; the toast, the climber's
  own waiting line and the Agree box say a removal waits for ClimbMatch. The owner's queue marks the
  card *Removes something from the page* in red above the struck-through rows and shows each
  climber's *Why*. A reckless removal the owner turns down is a strike like any other (3 →
  restricted, 5 → banned). Modelled on theCrag (no delete of a referenced route; merge instead),
  Mountain Project (deletions go to the regional admin) and OpenStreetMap's OSMCha (mass deletions
  flagged for review).
- **Other climbers' waiting suggestions are shown in the edit sheet**, each with an **Agree**
  button that sends the value verbatim — Google Maps' "Check the facts" model; that tap is the
  second climber, so it goes live at once. The climber's own waiting value reads "You suggested: …
  — it goes live when a second climber sends the same, or once ClimbMatch checks it". The toast
  after a submit says what the database decided: "Added — it’s on the page now", "You and another
  climber agree — it’s on the page now", or "Sent — it goes live when a second climber agrees, or
  once ClimbMatch checks it".
- **Approved edits reach the page**, as the owner applied them (`applied_value` when the owner
  adjusted the value, else `value`), through the same client-side overlay the page always used.
  An approved field becomes **high confidence**. A `grade` approval also writes `routes.grade`
  (rewritten `apply_agreed_grade`).
- **Every field has a confidence level** — high / medium / low — computed from the route row
  (`route_field_level`) unless the owner set it by hand (`route_field_confidence`). **High = locked**:
  the database refuses an edit to it ("This detail is locked at high confidence; flag it instead").
  Identity fields, crag-discipline grades and guidebook-verified fields start high; empty fields,
  inferred gear and auto-written prose start low; everything else medium. Discipline stays
  medium on scrambling / mountaineering / alpine / trad routes (the owner's stated ambiguity).
- **Rejection is a strike.** The owner rejects with a reason (≥10 characters); the climber is
  told the reason. Strikes drive `contribution_standing`: 1 → warned, 3 → restricted for 90 days
  (no field edits; flags still allowed), 5 → banned from contributing (no edits, no flags). A
  restricted or banned climber can appeal (`file_appeal` kind `contributing`); a reversal resets
  the standing. Flags by other climbers never count as strikes.
- **Flags.** A climber can file "this looks wrong" on a section without the right value
  (`route_flags`, one open flag per reporter per target, ≤5 a day). An open flag drops a
  medium field to low until the owner marks it fixed or dismissed; it never lowers a high field.
- **Rate limit.** 20 field edits a day per account, 5 for accounts under 7 days old.
- **Notices.** Approvals, rejections (with the reason), warnings, standing changes and flag
  outcomes land in `user_notices` and appear in the bell panel; dismissing one marks it read.
- **Your contributions** (Menu → Profile) shows each edit as Awaiting review / Added — live /
  Not applied with the owner's reason.

- **The owner's queues** (Menu › Review tiles, admin only; `lib/RouteQualityQueues.jsx`): *Route edits to review*
  clusters pending rows by route, field and `sameEditValue` so three climbers who sent the same value
  are one card; shows the page's current value beside the proposed one with a row-by-row diff for
  pitch / rappel / waypoint tables; Approve, Edit &amp; approve (the owner's value becomes
  `applied_value`), Turn down (reason ≥10 chars, canned reasons, "honest mistake" skips the strike),
  Keep &amp; lock (field locked high, edit turned down without a strike), Open route. *Flagged route
  details*: fixed / no change needed, with a note to the reporter. *Contributor standing*: reset,
  warn, restrict 90 days, ban, each with a reason.
- **The climber's standing on the edit sheet** (`ContributionStandingNotice` in `lib/SafetyNotices.jsx`):
  warned / restricted-until / banned with the reason and an Appeal button (kind `contributing`).

- **The level on the page** (`lib/confidence.jsx`): App provides `ConfidenceCtx` ({levels, routeId,
  onFlag}) around `RouteDetail`; the shared heading components `SL` (core) and `CardHead` (`src/components/CardHead.tsx`) map their
  text to a form key through `headKey` / `HEAD_KEYS` and render `ConfChip` (High · locked / Medium /
  Low, with a ⚑ Flag button — the only place it renders); `ConfidenceLegend` explains the three levels once under the
  verification note. Every pencil on the page goes through `openFix` in `RouteDetail.jsx`: a HIGH
  field's pencil opens the flag sheet instead of the editor. In `SuggestFix` each field row shows its
  chip (no ⚑ Flag button there, owner 2026-10-15) and a HIGH row cannot be opened.
- **The flag sheet** (`lib/FlagRouteInfo.jsx`, `FlagRouteSheet`, mounted by App beside the appeal
  sheet): a note of 5–1000 characters on one field or the whole route → `fileRouteFlag`; refusals show
  the database's sentence.

- **Pitches and rappels** (`SuggestFix`): each ROUTE BREAKDOWN row has its own "✎ Edit this pitch",
  which opens the sheet scrolled to that pitch (`focusPitch`); pitches can be moved up and down;
  clustering compares every pitch key (grade, gear, length, note, anchor, bolts, crux). The rappel
  table has an editor at last — `rappelDetail`, type `rappels`: one row per station with length (in
  the climber's units, stored in metres), anchor, how to find the station, hazards one per line and
  notes; rows are prefilled from `rappel_detail`, can be added, removed and reordered, and the queue
  shows them row by row.

- **Everything a climber can see, a climber can correct** (`check:editable-coverage`): seven
  columns that rendered with no editor — alternative names, variations, first free and first winter
  ascent, high point, sun, pro tips — have edit-sheet entries and `contribution_fields` rows (0317);
  every other column is either editable or declared with a reason. The log form offers "⚑ Something
  on this route page is wrong?", which opens the flag sheet through `openFlag` (`lib/reportBus.js`).

- **Add-a-climb asks for the same seven** (`lib/AddRoute.jsx`, 0327): first free / first winter
  ascent, other names, variations, sun and pro tips in group 8, the high point in the numeric row
  (in the climber's units, stored in feet like gain); `approve_new_route` writes all seven, and
  the owner's proposal queue (`lib/RouteProposals.jsx`) shows them. `check:add-route-fields` and
  `check:approve-route-columns` hold the form, the applier and the queue's keys together.

- **Add-a-climb asks, per discipline, what the edit sheet takes** (`lib/AddRoute.jsx`, 0352,
  2026-10-22): the walk-in **Approach** (a sentence) on every type; **Location on the wall**, **Anchor**,
  **Rock quality** and **Wet / seepage** on crags and aid; **Bolts** on sport; **Fixed gear** on trad
  and aid; **Rope length** (50–80 m chips, stored as metres) on roped types; the split **Hardest rock /
  Hardest ice / Alpine grade** dropdowns and the **Steepest angle** off crags; and the facts the edit
  sheet already offered that type (rock, style, crux grade, distance/gain/loss on ice and mixed,
  pitches on alpine…). `FIELDS` now carries per-crag-type extras (`trad`/`sport`/`toprope`) on top of
  `rock`, and `sf()` reads both. The gear steppers (quickdraws, ice screws, cams, nuts) and the ticked
  items now become **rack lines** — they used to land only in the `gear` object, which no screen reads
  — and a non-rack item (helmet, crampons) goes to Route-specific essentials; crag types are offered
  only rack items, since a crag page has no GEAR & ESSENTIALS card. The **Crux** box asks for a crux
  *grade*: `routes.crux` prints in a stat tile, and it used to ask for a sentence.
  `check:add-route-fields` §3b evaluates the edit sheet's `DROP` per type and fails on any fact the add
  form does not ask, unless `NOT_AT_CREATION` / `NOT_FOR` names it with a reason (the multi-part
  builders — waypoints, approach variants, rappel table, rescue card… — are added on the live route).

- **Add-a-climb finds the area by searching the whole catalog** (`DbAreaPicker` in
  `ClimbMatchCore.jsx`, `useCatalogAreaSearch` in `lib/db.js`): the first box searches every
  area in every state and province, with no country or state needed first. It uses the Climbs tab's
  spelling rules, so "jack mtn" finds Jack Mountain. Each hit names its type, its climb count and
  its full trail ("Washington › Northwest Region › … › North Cascades Core"). The country → state
  → area tree stays below it for browsing. The *Not in the catalog?* box lists existing areas
  matching what is typed into it ("Already in the catalog? Tap it…") before treating it as a new
  crag, and picking an existing area clears it. Opened from an area page, the form no longer
  prefills that box with the area's own name, which used to file the area as a *new* crag. Each
  field carries one line of context, shared with the route page's edit sheet through
  `lib/fieldHints.js`.

Deferred by the owner (2026-10-15): CAPTCHA on sign-up.

## 2. How it works

1. **Submit.** `SuggestFix` (`RouteDetail.jsx`) calls `onContribute` in `ClimbMatch.jsx`, which
   calls `submitContribution` (`lib/db.js`). The row is forced `pending` by `trg_contribution_status`
   (0127). `contributions_guard_field_edit` (0308) refuses a high field, the 21st edit of the day,
   and the restrictive policy "contribution standing allows field edits" refuses a restricted or
   banned contributor. A refusal's sentence is shown as the toast; the local "Awaiting review"
   entry is withdrawn.
   Opening a field in `SuggestFix` shows **On the app now**: the field's full stored text
   (`curRefStr`, fed by the `FULL` map), line breaks kept and list fields one item per line, in a
   box that scrolls past ~260px. The row's collapsed summary and the contribution's `meta` line
   keep the 44-character clip in `cur`.
2. **Overlay.** The route memo in `ClimbMatch.jsx` groups `kind='field'` rows by field: approved
   rows are applied (latest by `reviewed_at`; `_contribFields` and `_contribAgreed` record them);
   the caller's own pending rows feed `_pendingEdits` only.
3. **Level.** `route_field_confidence_map(route_id)` returns `{field: level, …, _reasons}` over every
   `contribution_fields` key; `useRouteFieldConfidence` reads it. The insert guard asks
   `route_field_level` for the same answer.
4. **Review.** `approve_field_contribution(id, value, also)` / `reject_field_contribution(id,
   reason, also, strike)` (0309) move the row and its clustered siblings, upsert the field's level,
   log to `moderation_actions`, notify through `_notify`, and (on reject) call
   `_add_contribution_strike`. `set_contribution_standing` is the owner's override;
   `set_route_field_confidence` locks or unlocks a field by hand.
5. **Flags.** `file_route_flag` / `resolve_route_flag` (0309); `useMyRouteFlags`,
   `useOpenRouteFlags`.
6. **Notices.** `useMyNotices` is merged into `mergedNotifs` in `ClimbMatch.jsx` with
   `cat:"contributions"`; `markNoticeRead` sets `read_at`.

## 3. Files

| File | What lives there |
|---|---|
| `ClimbMatch.jsx` | `onContribute` (submit + toast), the route memo's approved-only merge (`_contribFields`, `_pendingEdits`), `mergedNotifs` with notices |
| `RouteDetail.jsx` | `SuggestFix`: the edit sheet, `FIELDS`, the "Awaiting review" line, the standing notice; `openFix` |
| `lib/RouteQualityQueues.jsx` | `FieldContributionQueue`, `RouteFlagQueue`, `ContributorStandingQueue` |
| `lib/confidence.jsx` | `ConfidenceCtx`, `HEAD_KEYS`, `headKey`, `ConfChip`, `ConfidenceLegend` |
| `lib/FlagRouteInfo.jsx` | `FlagRouteSheet` |
| `ClimbMatchCore.jsx` | `SL` (renders the chip on a route page); `DbAreaPicker` (Add a climb's area step) |
| `lib/AddRoute.jsx` | `AddRoute`: the add-a-climb form, its per-field context lines (`Lab`) |
| `lib/fieldHints.js` | `HINTS`: one line of context per field, shared by the edit sheet and Add a climb |
| `lib/db.js` | `useCatalogAreaSearch`: area search over the whole catalog |
| `src/components/CardHead.tsx` | `CardHead` (the card heading; renders the chip on a route page — extracted from core, PR19) |
| `lib/SafetyNotices.jsx` | `ContributionStandingNotice`, `AppealSheet` |
| `ClimbMatchCore.jsx` | `sameEditValue` (clustering), the "Your contributions" ledger (`ST` statuses) |
| `lib/db.js` | `submitContribution`, `useRouteContributions`, `useRouteFieldConfidence`, `setRouteFieldConfidence`, `useFieldContributions`, `approveFieldContribution`, `rejectFieldContribution`, `useMyContributionStanding`, `useContributionStandings`, `setContributionStanding`, `fileRouteFlag`, `useMyRouteFlags`, `useOpenRouteFlags`, `resolveRouteFlag`, `useMyNotices`, `markNoticeRead`, `useAdminQueueCounts`, `useContributionFields`, `useRouteRowsByIds` |
| `scripts/check-contrib-field-columns.mjs` | the guard that keeps `contribution_fields` equal to the form |
| `supabase/migrations/0307_route_quality_control_tables.sql` | `contribution_fields`, `route_field_confidence`, `contribution_standing`, `route_flags`, `user_notices`, `applied_value` |
| `supabase/migrations/0351_a_removal_waits_for_the_owner.sql` | `contributions.reason`, `route_field_page_value`, `_edit_removes`, `contribution_consensus` with the removal exit |
| `supabase/migrations/0308_field_confidence_and_edit_guards.sql` | `route_field_level`, `route_field_confidence_map`, `can_contribute_fields`, `can_flag`, `guard_field_contribution` |
| `scripts/check-editable-coverage.mjs` | the guard that keeps every rendered column editable or explained |
| `supabase/migrations/0317_seven_more_editable_fields.sql` | the seven field rows |
| `supabase/migrations/0325_two_climbers_agree_or_an_empty_field.sql` | `_edit_value_norm`, `route_field_is_empty`, `contribution_consensus` (trigger `trg_contribution_vote`), the consensus exit in `guard_contribution_status`, the grade write-back on insert |
| `supabase/migrations/0309_field_contribution_review.sql` | `approve_field_contribution`, `reject_field_contribution`, `set_contribution_standing`, `set_route_field_confidence`, `file_route_flag`, `resolve_route_flag`, `apply_agreed_grade`, `file_appeal`, `decide_appeal` |

## 4. Data

- **`contributions`** (0002 … 0307): `status` pending | approved | rejected, `review_note`,
  `reviewed_by/at`, **`applied_value`** (owner-edited value). Value cap 20000 characters.
- **`contribution_fields`**: form key → `routes` column, `is_prose`, `is_gear`, `label`. Static;
  76 rows; public read.
- **`route_field_confidence`**: overrides only (`route_id`, `field`, `level`, `reason`, `set_by`).
- **`contribution_standing`**: `status` ok | warned | restricted | banned, `strikes`, `until`,
  `reason`. Read own or admin.
- **`route_flags`**: `route_id`, `field` (null = whole route), `note`, `reporter`, `status` open |
  fixed | dismissed, resolution. Read own or admin.
- **`user_notices`**: `kind`, `title`, `body`, `link`, `read_at`. Read / mark-read / delete own;
  inserted only by definer functions.
- **`moderation_actions`**: every approve, reject, strike, lock, unlock and flag outcome.

## 5. Connections

- **Route page** ([route-page.md](route-page.md)): the overlay and the edit sheet.
- **Moderation**: `account_standing` (0264) is the whole-account ladder; this one is
  contribution-scoped and separate. Appeals share `moderation_appeals`.
- **Home badge**: `useAdminQueueCounts` counts held edits and open flags into the admin total.

## 6. Guards

`check:contrib-field-columns` (the DB field list = the form), `check:contrib-fields`,
`check:contrib-shapes`, `check:consensus-clustering` (clusters now serve the queue),
`check:correction-readers`, `check:rls`, `check:function-columns`, `check:migration-replay`.

## 7. Last significant change

0325 (2026-10-15): an empty route field fills on the first edit, and two climbers who send the same
value change a filled one without the owner; the edit sheet shows other climbers' waiting
suggestions with an Agree button. Before that, steps 2–5: the owner's three queues, the climber's standing notice, the confidence chips and the flag sheet on the route page, per-pitch editing and the rappel-table editor. Step 1 shipped
the hold-for-review gate, the computed confidence rule with the server-side lock, strikes and
standing, flags, and notices (0307–0309). The page chips follow.

## 8. Known gaps / open decisions

- Field rows that were `pending` before 0307 and had been shown on pages under the old
  "empty field → live" rule are no longer shown until approved; they are in the queue.
- The queue clusters pending rows in JavaScript (`sameEditValue`); the server only checks that
  clustered ids share a route and field.
- Top contributors count only approved field edits and approved new climbs (0317, 0333); the scoring is in
  `docs/features/ranks.md` › Contribution points.
