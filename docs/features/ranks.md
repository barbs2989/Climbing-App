# Ranks — the Leaderboards tab

`tab==="ranks"` in `ClimbMatch.jsx`: a `ScreenHero` titled *Leaderboards* whose `?` opens Help at its
**Ranks** section (`setHelpOpen("Ranks")`), the partner-confirmation queue (`LogTagConfirmations`), then
`lib/Leaderboards.jsx`, loaded lazily.

## 1. What it does today
- **Scope** row: Overall · Near me (home zip + radius) · Friends · By area (area tree, down from the countries; the breadcrumb's last crumb is the current area, plain text with `aria-current`, not a control) —
  four equal-width boxes across the full row, 46px tall at 14px type (a 44px touch target), not small scrolling chips.
- **Climbing type** (All, Sport, Trad, Top rope, Bouldering, Alpine, Mountaineering, Scrambling, Ice, Mixed, Aid)
  and **Ranking**, grouped Performance · Lists · Reliability · Community. Which boards a type offers is the `ids`
  list in `Leaderboards`: Send points on every graded type (not Mountaineering/Scrambling, whose class grades weigh
  nothing), Onsight points on sport/trad/bouldering, Peaks on the three peak types.
- **The table**: a header row (`#` · Climber · the board's unit), one row per climber with the rank, avatar, name,
  location and "N of M backed", the value in a fixed right-hand column, and a ⚑ Report column on real rows.
  Rows alternate shading; yours is tinted with a blue edge. Only climbers with a score above 0 on that board are
  ranked; equal scores share a rank (1, 2, 2, 4). The list shows 15 at a time up to the **top 100**, and your own
  row is pinned under it whenever the visible part does not include you. *You're #N of M* sits above the table, or
  *You're not ranked on this board yet* when nothing you logged counts toward it.
- **Backed climbs only** (signed in, log-counted boards): ranks on partner-confirmed / photo / GPS-backed climbs only.
- **The climbs behind a number (0357)**: on every board counted from logs (not Belay, Vouched, Contributions
  or Top climbs), a real row's value is a button that opens `RankBreakdown`, *How N points add up*: a sentence on
  how that board scores, then one line per counted climb — name, grade, date, tick, area, its backing tier
  (Partner confirmed ×1 · Photo or GPS ×0.75 · Self-logged ×0.5) on the points boards, and what it added. Send
  points lists each route's best log; Days lists days with their climbs; Peaks lists summits. It reads
  `rank_breakdown(p_user, p_area_id)`, which repeats `leaderboard()`'s counting for one climber, so the lines
  add up to the row (checked on live data: 8 = 8). The sheet follows the board's type, scope area and *Backed
  climbs only* switch. Logs the viewer could not read under climb_logs' own select policy come back hidden —
  no route, name, grade, date or tick — with route/day/summit keys salted per call so different routes and days
  still count; the sheet sums them into one "N more climbs they keep private" line. Modelled on 8a.nu's
  scorecard (the ascents a score is summed from) and theCrag's CPR timeline (the ascent list under a column).
- **Top climbs**: routes, not climbers, from `leaderboard_top_climbs`.
- Signed out (or `USE_DB` off) the board is the seed example set plus you, never mixed with real climbers.

## 2. How it works — the scoring (audited 2026-10-15, 0323)
Every number for a real climber comes from `leaderboard()` on the server; the client only picks a column and sorts.
- **Which logs count**: `rankable_logs()` (0203/0208) — catalog routes only, no future dates, one log per route per
  day, 30 a day, a climb a tagged partner denied is dropped; each log is tiered confirmed (1.0) / evidence (0.75) /
  self (0.5). A **Conditions** tick (a scouting report) is not a climb and counts on no board.
- **Sent** = any tick except Attempt, Turned around, Fell, Hung, Project (case-insensitive).
- **Send points**: per DIFFERENT sent route, its best log scores `(8 + g² × 0.35) × tier`, where g is the route's
  grade on ONE scale (`rank_grade()` / `rankGrade()`: 5.10a = 10, a letter = 0.25; V, WI and M converted; class,
  snow and aid grades 0). A Top-rope or Follow tick scores one letter lower (`styleGrade`).
- **Onsight points**: an Onsight/Flash that is your FIRST log on the route, `(10 + g² × 0.3) × tier`; sport, trad
  (also as rock) and bouldering only.
- **Sends 1yr / Total sends**: different routes sent in the type (12 months / all time).
- **Peaks**: different summit areas with a Summit tick, or a log marked *Also reached the summit* (`climb_logs.summited`, 0373), on a mountaineering, alpine or scrambling route. `leaderboard()` and `rank_breakdown()` both read `tick_type = 'summit' OR summited`.
- **Vert 1yr**: for SENT logs in the last 365 days, the route's `gain_ft`, else its length (`length_m`).
- **Days 1yr**: different dates with a counted log. **Logged**: counted logs, attempts included.
- **Classic climbs**: different classic routes sent.
- **Per type**: on any type but All, Logged, Days, Vert, Classics and Peaks read `stats.<all|backed>.by.<type>`
  (sport and trad also roll up as `rock`), so the Bouldering board's Days are bouldering days.
- **Belay** `counted_catch_count` (a catch both climbers recorded, 0361), **Vouched** distinct vouchers,
  **Contributions** points from `contribution_points()` (0333) — all server-side.
- **Contribution points (0333)**: ONE ledger, `contribution_points()`, feeds this board, every area's and route's
  TOP CONTRIBUTORS (`area_top_contributors`, rendered by `TopContributors` in `src/components/TopContributors.tsx`) and the profile's
  ★ Top Contributor badge (`user_top_contributor_areas`). Only live work scores: an approved new climb 10, a photo of
  a route 5 (once per route), a topo 5 (once per area, while moderation leaves it visible), a line drawn on a topo 2
  (once per route), an approved new area 2 (0360), an approved correction or area detail 2 (once per place and field), a sun vote, start location
  or pairing 1 (once per route; a pairing per pair). Pending and rejected work scores 0. Each item sits in its area,
  and a board sums the points of its area and EVERY place inside it (`path <@`), so a route edit counts on the crag,
  the area, the state and the country. On Ranks By area only that area's points count, and a climber who
  contributed there without logging a climb there is listed. Since 0338 a logged climb (1, once per route) and a trip report (2, once per route per month) count too, only when shared with Everyone.
  Weights follow Mountain Project (area 15 · route 10 · photo 5 · comment 1); once-per-place follows theCrag's karma.
- The demo board mirrors the same rules in `meStats` for your own row.

## 3. Files
| File | Key symbols |
|---|---|
| `lib/Leaderboards.jsx` | `Leaderboards`, `meStats`, `rowToPP`, `byOf`, `rankAt`, `lbRow`, `DISCS`, `NOT_SENT` |
| `lib/RankBreakdown.jsx` | `RankBreakdown`, `itemsFor` |
| `lib/rankGrade.js` | `rankGrade`, `styleGrade` |
| `lib/Help.jsx` | `Help` (its `topic` prop opens one section) |
| `lib/db.js` | `useLeaderboard`, `useTopClimbs`, `useRankBreakdown` |
| `ClimbMatchCore.jsx` | `HELP_FEATS` (the Ranks section holds the scoring text), `tickTypesFor`, `NONCOMPLETION_TICKS`, `lbRowName` |
| `supabase/migrations` | 0194, 0203, 0208, 0235, 0323, 0333, 0338, 0357 (`rank_breakdown`) |

## 4. Data
`climb_logs`, `climb_log_confirmations`, `routes` (`grade_system`, `grade_num`, `gain_ft`, `length_m`, `classic`,
`discipline`), `areas` (`path` for By area), `profiles.show_on_ranks` (0177), `profile_zips`/`zip_centroids`,
`connections`, `blocked_users`, `vouches`, `belay_catches`, `contributions`.

## 5. Connections
- **Logbook**: the log form's tick types (`tickTypesFor`) decide what a board can see, and each discipline offers only its own words (2026-10-25 audit). Alpine: Summit, Turned around, Lead, Follow, Hung, Fell. Ice and mixed: those plus Top-rope. Top rope: Top-rope, Hung, Attempt. Aid: Lead, Follow, Top-rope, Hung, Fell, Attempt. Sport and trad keep the full roped list (Onsight, Flash, Redpoint included). A summit and a style on one climb: pick the style, then tap *Also reached the summit*. The client reads both through `summitedLog()` in `ClimbMatchCore.jsx`.
- **Profile**: tapping a row opens `FullProfile`; friend and message actions live there, not on the row.
- **Moderation**: ⚑ opens the report sheet (`setReportUser`).
- **No Trusted board**: it went with the trust score (2026-10-21). 0335 dropped `leaderboard()`'s `trust` column with `compute_trust_score`.

## 6. Guards
`check:grade-parser` holds `lib/rankGrade.js` equal to `rank_grade()` in the newest migration that defines it.
Hand-run probes: `scripts/oneoff/probe-ranks-anti-padding.sql`, `probe-ranks-anti-collusion.sql`,
`probe-ranks-0323.sql`; `scripts/oneoff/probe-ranks-renders.mjs`.

## 7. Last significant change
- **Ranks audit (0323)**: one grade scale across V/WI/M, top-rope/follow a letter lower, conditions reports out,
  vert = finished climbs and crag height, per-type stats, Top rope/Mixed/Aid boards, zero scores unranked, tied
  ranks, a table layout with ⚑ in its own column, the scoring text moved into Help › Ranks behind the header's `?`.

- **The climbs behind a number (0357)**: a row's value opens the counted climbs and what each scored.

## 8. Known gaps
- `rank_breakdown()` copies `leaderboard()`'s counting rather than sharing it; a change to the scoring must
  change both (no guard holds them equal yet).
- `leaderboard()` returns at most 500 climbers per scope, ordered by climbs logged, and each board is ranked from
  those. Correct while a scope holds ≤ 500 visible climbers (3 profiles on 2026-10-15); past that, a climber
  outside the 500 who leads, say, Vouched is missed. Ranking per board on the server is the fix.
- Grade conversions between systems are approximate by nature (theCrag and 8a.nu publish their own tables).
- A Peaks count is per summit AREA; two faces of one peak filed as two areas count twice.
