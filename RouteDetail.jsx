// The route-detail screen and every helper used only by it — split out of
// ClimbMatchCore.jsx so this ~290KB of source loads as its own lazy chunk the
// first time a route is opened, not at startup. Mechanically extracted (the
// dependency closure of RouteDetail minus everything reachable from any other
// export); shared helpers stay in core and are imported below.
import { tripRowToActivity, anonRowToActivity } from "./lib/tripReportRow.js";
import { useState, useEffect, useRef, useMemo, useCallback, useContext, Suspense, lazy} from "react";
import { ConfidenceCtx } from "./lib/confidence.jsx";
import { createPortal } from "react-dom";
/* rackFromText / _rackEdited / contribRack / routeRackFor / DISC_RACK moved to lib/rack.js so
   the crew card can answer the same question without core importing this lazy-loaded file.
   Moved verbatim; the correction-precedence rule and its history live beside them there. */
import { _rackEdited } from "./lib/rack";
import { withRecordedTrackOnly, withCragWalkIn } from "./lib/track";
import { USE_DB} from "./lib/supabase";
import {useArea,recordRouteView,useAreaPath,useRouteStarSummary,usePartnersByObjective,usePartnersInArea,useMatchObjectivesOfUsers,useRouteBaseCheckins, dbRouteToCamel, useAreaRoutes, useProfilesByIds, useRoutesByIds, useObjectiveCounts, useProfileSearch, useRouteTripReports, useRoutePrivateConditions,    useRouteTracks, useRouteStats} from "./lib/db";
import RouteTracksPanel from "./lib/RouteTracksPanel.jsx";
import { TRACK_COLORS, trackPoints, trackStats } from "./lib/routeTracks.js";
import FireNearRoute from "./lib/FireNearRoute";
import { CRAG_SCORE_DISCIPLINES } from "./lib/conditionsScore";


import { clickable } from "./lib/clickable";

import AlpineConditionsCard, { forecastPoint } from "./lib/AlpineConditionsCard.jsx";
import { ALPINE_COND_DISCIPLINES } from "./lib/alpineConditions.js";
import {routeLink,CRAG_CATS,printSheet,climbsAPeak,wpPlaced,trailheadPoint,_uNum,catOf,C,CAT,ME,routeAscentFt,uElev,uDist,uDistMi,buildConsensus,MOUNTAINS,enrichRoute,onImgErr,FALLBACK_COVER,RSL as SL,ROUTE_GAP,DLOCALE,shortDate,ALL_CLIMBERS,ROUTES,isHazardTag,gradeLabel,protOf,isRecent,pubName,missingFacts,shapeOf,useRealAuthors} from "./ClimbMatchCore.jsx";
import RouteMapProfile from "./src/components/RouteMapProfile.tsx";
import { SaveMapOffline } from "./lib/SaveMapOffline.jsx";
import DiscIcon from "./src/components/DiscIcon.tsx";
import ActionIcon from "./src/components/ActionIcon.tsx";
import Pill from "./src/components/Pill.tsx";
import Lbl from "./src/components/Lbl.tsx";
import SectionJumps from "./src/components/SectionJumps.tsx";
import { useWideScreen, useFullWidth } from "./lib/wideLayout.js";
import { routeSheetHtml } from "./lib/routeSheet.js";
import DrawRouteView from "./lib/DrawRoute.jsx";
import { recShapeOf, effDistIsWholeTrip, effDistKm } from "./lib/outing.js";
import { approachOptions, defaultApproachKey, viaRouteOf, applyApproach } from "./lib/approaches.js";
import { POP_CLOSE, POP_BACK_MEDIA } from "./lib/popupChrome.js";
import { BTN } from "./lib/buttonStyles.js";
import GapNote from "./src/components/GapNote.tsx";
import ClimateSeasonCard from "./src/components/ClimateSeasonCard.tsx";
import RoadReports from "./src/components/RoadReports.tsx";
import { EMPTY_ARR } from "./lib/emptyArr.js";
import ClimbingRouteTable from "./src/components/ClimbingRouteTable.tsx";
import Capped from "./src/components/Capped.tsx";
import PitchComments from "./src/components/PitchComments.tsx";
import ApproachPicker from "./src/components/ApproachPicker.tsx";
import { samePlaceCamp, campNightsOf, campNightsLabel, campWalkHrs, campSites, campRouteOrder, campOrderNote, campRoleLabel, campFromPrev, campFromTrailhead, campDetail, campReportsOf, campSleptLine } from "./lib/camps.js";
import { APPROACH_CROSSING_RE, APPROACH_LOG_CROSSING_RE, approachHasCrossing, primaryApproachIndex, longFormApproachIndex } from "./lib/approachIndex.js";
import ApproachVariants from "./src/components/ApproachVariants.tsx";
import { HAZ_KW, routeKw } from "./lib/routeKw.js";
import { seasonTidy, seasonShort, routeSeasonShort } from "./lib/seasonText.js";
import { avyCenterFor } from "./lib/avyCenter.js";
import { topoEmptyCopy } from "./lib/topoEmptyCopy.js";
import TopoDrawer from "./src/components/TopoDrawer.tsx";
import TopoSection from "./src/components/TopoSection.tsx";
import ConsensusPanel from "./src/components/ConsensusPanel.tsx";
import TechStats from "./src/components/TechStats.tsx";
import WeatherPanel from "./src/components/WeatherPanel.tsx";
import ConditionsScoreCard from "./src/components/ConditionsScoreCard.tsx";
import { campingGate } from "./lib/campingGate.js";
import SuggestFix from "./src/components/SuggestFix.tsx";
import RoutePlanTab from "./src/components/RoutePlanTab.tsx";
import RoutePhotosTab from "./src/components/RoutePhotosTab.tsx";
import RouteReportsTab from "./src/components/RouteReportsTab.tsx";
import RoutePartnersTab from "./src/components/RoutePartnersTab.tsx";
import RouteSafetyTab from "./src/components/RouteSafetyTab.tsx";
import RouteOverviewTab from "./src/components/RouteOverviewTab.tsx";
import RouteShareSheet from "./src/components/RouteShareSheet.tsx";
import RoutePhotoLightbox from "./src/components/RoutePhotoLightbox.tsx";
export { SuggestFix };
export { campingGate };
export { ConsensusPanel };
export { TopoSection };
export { TopoDrawer };
export { topoEmptyCopy };
export { seasonTidy, seasonShort };
export { ApproachVariants };
export { APPROACH_CROSSING_RE, APPROACH_LOG_CROSSING_RE, approachHasCrossing, primaryApproachIndex, longFormApproachIndex };
export { samePlaceCamp, campNightsOf, campNightsLabel, campWalkHrs, campSites, campRouteOrder, campOrderNote, campRoleLabel, campFromPrev, campFromTrailhead, campDetail, campReportsOf, campSleptLine };
export { PitchComments };
export { ClimbingRouteTable };
export { overnightPermitOf } from "./lib/overnightPermit.js";
const GpsSubmissionModal = lazy(() => import("./lib/GpsSubmissionModal"));

/* MOVED TO lib/outing.js, unchanged, so the peak page's ACROSS EVERY ROUTE HERE panel can ask the
   same question this page does. It read `dist_km` raw and therefore showed a different approach
   distance for the same climb — on 128 of the 198 WA peak pages, usually by a factor of two. */
// A shortfall may only be claimed when the route claims more pitches than the page describes
// ANYWHERE. The rule is older than the structure it now sits on, and the reasoning behind it is
// worth keeping: while roped pitches and travel stages rendered in TWO boxes, the heading read
// "N of M" with N the ROPED half and M whatever the route was recorded as having — two counts of
// different things. Measured 2026-09-02: 55 routes claimed a shortfall and on 52 of them
// `route.pitches` was EXACTLY the pitch_detail entry count, i.e. the denominator was counting
// the very stages the table had removed. wa_monte_cristo_peak_scramble read "1 of 3" with all
// three entries on screen.
//
// THE SPLIT IS GONE — ROUTE BREAKDOWN is one ordered list — so `shown` is now every entry and
// this reduces to "the route claims more than it describes". That is a real question and it
// still fires: measured 2026-09-09, 129 of the 904 routes carrying `pitch_detail` claim more
// pitches than their own breakdown describes. Do not read the simplification as the rule
// becoming vacuous.
//
/* Whether the Plan and Safety tabs are offered used to be decided by discipline alone:
   trad/sport/bouldering => cragOnly => both tabs filtered out of the strip, and a deep link
   to either bounced back to Overview. That is right for the bare crag import (99.5% of the
   catalog is name + grade + pitches, and an empty Plan tab is worse than no Plan tab) and
   wrong for the researched one. Red Mountain's South Face is filed `trad` — it is a class
   3-4 unroped ramp on a WA peak — and carried an approach, a descent, permits, a land
   manager, a parking pass, four hazards and two watch-outs, none of which the app rendered
   anywhere. The tabs were the only place that content lived.

   So gate on the content, not the label. Both predicates list ONLY fields that were measured
   to actually render on that tab for a crag-discipline route — several planner sections
   (itinerary, timing, the route track, the time-to-summit model) sit behind their own
   !cragOnly checks inside the tab body, so gating on those would open a tab that stays
   blank. Re-measure with scripts/oneoff/measure-which-tab-renders-each-field.mjs before adding a field here.

   `access` and `hazards` are deliberately NOT in these lists even though both render. At
   Index, Skykomish and other enriched crags they hold area-level boilerplate replicated
   verbatim onto every route in the crag ("Northwest Forest Pass required…", one shared
   loose-rock sentence), so counting them opened a Plan or Safety tab on 4,568 routes whose
   whole payload was one copied paragraph. They still render once a route qualifies on
   something route-specific. */
/* The CRAG disciplines: a single crag climb rather than an outing to a summit. TOPROPE and AID are
   crag routes too (owner decision, 2026-10-01) — they used to fall through to the alpine layout and
   showed "Season TBD", a dash under Dist and Gain, and an itinerary for a climb that has none. catOf()
   already folds trad-on-a-peak into alpine, so a big wall filed `aid` on a PEAK is still alpine here. */
/* hasPlanContent() lived here and gated the Plan tab on whether a route carried any plan field. It went when #2223 made the gate `!cragOnly`: every non-crag route has a Plan tab, and a crag route has none — its plan content renders on Overview (planBody). */

// "alpine" spans a 5.8 rock rib at Washington Pass and a glaciated north face, so
// assuming one kit for both put a glacier/crevasse kit, an ice axe, crampons and
// mountaineering boots onto pure rock climbs that never touch snow — reported from
// the app on South Early Winters Spire's SW Rib, whose own stored rack is correct.
// Joined with "; " rather than " " so each field, and each entry of a gear/hazard array, is
// its own clause. The regexes above do not care, but _snowEvidence splits on sentence
// punctuation, and a gear array flattened with spaces welds "ice axe and crampons in early
/* Hedged evidence still earns a line — a packing checklist should over-include rather than
   send someone up short — but as a condition to check before you drive, not as kit you are
   assumed to be carrying. Mountaineering boots are deliberately NOT carried over: the hedged
   sentences say axe and crampons, and neither the catalog nor the published sources mention
   boots for these routes. Late season on the Beckey Route you walk in in approach shoes. */
/* GEAR & ESSENTIALS used to print the route's own `what_to_bring` under its own heading,
   "Specific to this route", below the standard per-discipline kit. Measured on 40 WA routes
   carrying the column, that heading was mostly a second copy of the list above it: "helmet"
   appears in what_to_bring on 20 of them and is in EVERY discipline's standard kit; crampons
   8, ice axe 6, navigation 5, rope 4. The old dedupe was an exact normalised-string match, so
   it caught "helmet" against "Helmet" and missed every qualified spelling — "Crampons
   (early/mid-season or lingering-snow years)", "ice axe (early season)", "navigation
   (map/gps)" — which is precisely the form enrichment writes. One packing list is now built
   from both.

   `gearKey` reduces an entry to the THING, dropping the qualifier that says when or why to
   carry it. A qualifier does not make it a different piece of gear; it is the half worth
   KEEPING, which is why a collision resolves to the longer text rather than to the stock
   wording. Splitting on the first bracket/dash/comma is what does the work: enrichment
   writes "Helmet — rock at this crag is loose", the stock list writes "Helmet". */
/* The Edit button used to open a textarea whose Save wrote to `gearEdits`, a bare
   useState({}) in App. It never reached `contributions`, never hit the DB, was invisible to
   every other climber and was gone on reload — an edit affordance on a route's most
   safety-relevant field that quietly did nothing. It now opens the real Suggest-a-fix flow
   at the rack section, seeded with what is on screen, so a prose rack can actually be
   corrected and goes through the same 3-agree merge as every other field. */
/* The caption is the route page's per-section confidence read, and it speaks only when it
   has something to say. Three states, not a grade: no route-specific rack (`rackGeneric`),
   a rack the gear audit INFERRED, or a rack it verified — and the verified case says
   nothing extra, deliberately. Two page-level graders (ProvenancePanel's DATA CONFIDENCE
   and EnrichmentPanels' DATA QUALITY) were deleted for grading every route whether or not
   they had anything to report, and check:field-renders' KNOWN map records the condition for
   bringing that read back: it "belongs next to the data it grades, not above it". This is
   that, so praise on the other 275 routes would just rebuild the noise lower down.
   `data_quality.confidence` cannot drive this — measured 2026-08-12, it is MEDIUM on 7,864
   of 7,981 populated WA routes (97.9%), so a chip fed by it says one word everywhere.
   check:field-renders CANNOT prove this one: it proves a column by finding its literal value
   on screen, and "inferred"/"verified" are short enough to match by accident, so it reports
   gear_confidence as UNPROVABLE rather than as rendering. The proof is
   scripts/oneoff/prove-gear-confidence-caption.mjs — it renders all three states and asserts
   the silent ones stay silent. Re-run it if you touch this caption; it fails if the caption
   text moves, rather than passing over a box it never mounted. */
/* Every rappel count a route can state, so the two boxes cannot print different numbers.
   Forbidden Peak's West Ridge is the case: its rappelDetail lists 3 stations, its `rappels`
   prose says "~5 single-rope raps via East Ledges/NE Face", and its rappelCountNote says
   late-season parties need "as many as 6-7". Overview and the table header both said "3",
   the prose box beside them said 5, and nothing reconciled them. The documented count stays
   the headline \u2014 it is the one backed by station-by-station data \u2014 but when another field on
   the same row reports more, the label says so instead of quietly disagreeing. (Forbidden's own
   row was repaired on 2026-10-01 to 8 stations that every field agrees on.) */
/* CLIMATE & SEASON. Renders on the Conditions tab after the forecast; on Plan / a crag's Overview
   only for a discipline with no Conditions tab. Gated on `climate`, NOT `season`. */
/* ROUTE FACTS label -> the SuggestFix field that fills it, so "Add what you know" opens on the first
   missing one rather than at Grade with every group collapsed. */
/* LOCATION, GEAR & SAFETY and CONDITIONS are their own Overview sections on a crag route (owner, 2026-10-15:
   "move lower, create individual sections"), the way Mountain Project heads a route page with its numbers and
   then gives Location and Protection a heading each further down. TechStats still builds every fact once, so a
   placeholder means the same thing wherever it lands; `part` picks which slice this mount draws. A fact that is
   a TILE when on file (Bolts, Protection, Landing, Crash pads, Start) moves into its section too, so a fact
   sits in ONE place whether or not the route states it. */
/* The first section is WHERE THIS LINE STARTS on its wall (`location`, and the start type), drawn directly above BASE OF THE CLIMB, which marks that start on the ground. It is the route's, not the crag's: where the CRAG is and where to park is CragLocationCard (owner, 2026-10-21). */
/* THE ONE DISTANCE A ROUTE LEADS WITH, and what it is: TechStats' tile and the header strip both
   print it. The strip printed the stored ONE-WAY figure under a bare "Dist" while the tile under it
   said "Round trip" and twice the number, so one page showed one climb two ways. */
function headlineDist(route){const km=effDistKm(route);if(!(km>0))return null;const rs=recShapeOf(route);const ob=rs?rs==="outback":shapeOf(route)==="outback";return ob?["Round trip",km*2]:effDistIsWholeTrip(route)?[rs==="point"?"Total distance":"Round trip",km]:["Distance",km];}
/* This panel called itself "Crowd-verified beta" and had no crowd, no verification and no
   beta leaving the component. Every part of it was local React state:

   - "Confirm" set `confirmed[label]` and said "your confirmation was recorded". Nothing was
     recorded — no ledger write, no contribution, gone on unmount.
   - "Suggest a fix" wrote to a local `fixes` map and said "the page updates once 3 climbers
     agree", while the vote counter incremented on `ex.value===v` — the SAME value from the
     SAME person. One climber tapping Submit three times reached the threshold alone, and the
     panel then displayed their typed value under a "community update" badge.
   - "✓ confirmed by N climbers" counted that self-vote, so the provenance shown on bolt
     counts and anchor type — safety beta — was manufactured by the reader.

   The route page already has a real contribution path: the SuggestFix modal, which routes
   through onContribute -> submitContribution and reaches consensus by counting DISTINCT
   contributors (see the SS/CONV merge in ClimbMatch.jsx). So the fake local one is deleted
   and the button opens the real one, via the same `onEdit` the pitch table header uses.
   The facts themselves stay — they were never the problem. See PR #514's sibling fix in
   ProvenancePanel, which kept its Confirm because it actually has somewhere to record it. */
/* THE PITCH'S ANCHOR AND GEAR, EACH IN A FULL-WIDTH BOX (owner's note, 2026-10-25: "the anchor box when you click on a
   pitch is too small"). The anchor was a tile a third of the row wide, so "two bolts and a chain under the chockstone,
   lower off" was cut to its first few words. Both boxes now wrap in full, and the button beneath opens THIS pitch in the
   editor, where anchor and gear are typed. Bolts stay in the tile row above. An empty card says so and offers the editor
   rather than vanishing, when the editor is open to the climber. */
/* A PITCH ROW IS A CONTROL, and its "CRUX" badge is a separate <span> held off the grade by
   `marginLeft:6`. The accessibility tree has no margins, so a pitch graded "5.9" announced as
   "5.9CRUX" — the #740 defect, on a row where the glued half is the word that says this is the
   hardest and most consequential pitch on the climb.
   check:a11y-badges exists for exactly this and is GREEN, because it reaches the route page with
   `?zr=1`, which opens ROUTES[0] — `kings_hf`, a scramble whose `pitchDetail` is null, so no pitch
   row renders in that walk at all. Seven of the fourteen seed routes WOULD render it. A screen
   nobody opens is not a screen with no findings; see check:screen-lists for the same shape one
   level up.
   Note "5.9+" was already safe and "5.9" was not: the rule is a word character on BOTH sides, and
   `+` separates the two fragments on its own. Built from the row's own values so the announced
   name cannot drift from the visible one.
   THE STAGE ROW IS A CONTROL TOO NOW (it used to expand only from its own tiny ▸), so it carries
   the same defence: its label and CRUX are also two spans held apart by a margin. */
/* A coordinate you can read out, and one tap to copy it. Shared by both rows of CragLocationCard. */



/* BIVY — where you sleep if the route runs long. Alpine and mountaineering only: the question
   "where would I spend the night" is not a real one on a single-pitch crag, and rendering an
   empty prompt for it there is noise. Sites carrying coordinates are also mirrored into
   waypoints (type "Bivy") by the enrichment, so the same site is a pin on the route track —
   this panel is the detail the map pin has no room for. */
/* CAMPING & BIVY is ONE section over TWO stores, and that is deliberate.
   `route.bivy` holds researched sites (capacity/water/permit/notes); a Campsite WAYPOINT is
   the same fact recorded on the track by whoever drew the line. Rendering them apart meant a
   route could show a pin for a camp in WAYPOINTS and claim no camping here in this panel —
   two answers to one question. `campSites()` merges them, and a site recorded in both places
   lists ONCE (matched on name, which is the only field both stores reliably carry).
   It renders on EVERY route that has a site, day-trippable or not: a party benighted on a
   "day route" is exactly who needs this, so absence of a bivy plan is not absence of a bivy. */
/* "Trad is alpine when it climbs a peak." A 20-pitch line on an 8,322 ft Picket summit is filed
   `trad` in this catalog by convention, and catOf() folds trad into the crag family — so
   wa_mount_fury_east_direct_east_ridge recorded Access Creek Basin and Luna Col and showed them
   NOWHERE. Discipline answers "what kind of climbing"; it does not answer "can this benight a
   party", and the camping panel is asking the second question.
   The catalog's own record of peak-ness is `areaType`, spelled the same on the seed MOUNTAINS
   tree and on a DB route's `_dbArea`. It is deliberately the ONLY signal: gain and pitch-count
   thresholds are a heuristic that one more adjective defeats, and this file already records
   area_type being unreliable in ONE direction — a genuine peak typed `crag` (Tiffany Mountain).
   That direction is the safe one: such a route keeps today's behaviour rather than gaining a
   panel it should not have. Measured before shipping: across a 1,000-route crag-discipline
   sample, ZERO sit on a peak-typed area, so this cannot leak camping onto roadside crags. */
/* The gate itself, exported so a guard can ask it directly rather than inferring it from a
   rendered screen. Note it does NOT decide whether anything is drawn: CampingPanel returns null
   with no sites, so widening this cannot put an empty section anywhere. */
export {climbsAPeak};
/* A COMMENT SOMEONE TYPED AT LENGTH opens at three lines with a Read more (owner's note, 2026-10-25: "if someone types
   too much so it doesn't fill the screen"). Short comments render whole, with no button. */
// The per-discipline safety boxes ("Spotting & landing", "Clipping & lowering", "Gear & anchors"…
// and "Watch out for on this type of climb") were REMOVED: canned lines chosen by discipline
// alone, the same four sentences on every route of a kind, which is advice about climbing in
// general rather than about THIS climb. The Safety tab still carries the route's own hazards,
// the forecast links and the nearby-fire panel. What stays here is the one control that acts
/* A grade marker is its TEXT on the photo ("5.10-" beside the pitch), not an icon: the climber
   reads the grade straight off the rock, as on a printed topo. Bold white with a dark halo so it
   reads on snow and on shadowed rock alike. */
/* The number a marker carries on the photo AND in the key beside it. Three belay stations on
   one line are three identical icons; without a shared number, a note ("2 bolts, chains") in
   the key cannot be matched to the station it describes. */
/* Every icon and what it means, so a climber reading a topo never has to guess one. */
/* A variation is DASHED as well as yellow: colour alone fails a colour-blind climber and washes out
   on sunlit rock, and a dashed line is how theCrag's users and the alpine topo legends mark a
   variant. The dark edge stays solid so the dashes still read against pale granite. Dash lengths
   are screen pixels, like the widths (non-scaling-stroke). */
/* The key under an enlarged topo. A pin's note ("2 bolts, chains", "tree with slings") was
   collected by the editor and then drawn nowhere — the photo shows an icon, not text. Each row
   carries the number its marker wears on the photo (TopoLineOverlay `numbered`), in the order
   they were placed, which is how a climber drops them going up the line. */

/* Its own component so it can hold the loaded photo's aspect ratio — a hook cannot live in
   the .map that renders the strip. 132 wide with the photo's own aspect rather than a 132
   square crop: the square cropped the sides away while the overlay still spanned the full
   width, which is the drift documented on TopoLineOverlay. */
/* A photo or topo image that reads the ON-DEVICE copy when the climber saved one (lib/offline.js
   `media`), else the URL. Same props as <img>; only `src` is swapped. */
/* SAVE ONE PHOTO OR TOPO TO THIS DEVICE (owner decision 2026-10-07: images are never part of a state
   download — each is chosen by hand). The label flips only once the bytes are stored, never before,
   and a failure is shown here beside the button rather than swallowed. */
/* A topo photo's CAPTION (topos.caption, 0362): context from the climber who posted it — which face,
   when, what has changed — for everyone who opens the topo. No length cap (owner, 2026-10-23: "no
   limit to the text amount"). Not the photo DESCRIPTION, which is alt text for a screen reader and
   stays a separate box. Line breaks are kept; past ~5 lines it folds behind "Show more", the
   route page's own pattern for long text (#2206), so a long caption cannot push the photo's key
   off the sheet. */
/* Per-section gap flags. These used to feed one "This route's info has gaps" banner pinned to the
   top of every route page, which ate the first screenful and told you nothing about where to look.
   Each flag is now read by the section that owns the missing field, so the notice sits next to the
   empty space it describes. Only the flags a section cannot already express live here — description
   and approach are the plain else-branch of the ternary that renders them, so they need no helper.
   gapTrack keys on gpxPts, not gpx: dbRouteToCamel maps the `gpx` column onto `gpxPts`, so the old
   `!route.gpx` test was true for every DB-backed route, whether or not it had a track. */
function gapSeason(r){return !!r&&!r.season&&!r.climate&&!["trad","sport"].includes(catOf(r));}
/* `descent` is frequently a one-line stub ("Reverse with a short rappel") while `descent_text`
   holds the researched paragraph that actually gets you down. In a 200-row sample of routes
   carrying both, 178 had a materially longer descent_text — and
   scripts/oneoff/measure-which-tab-renders-each-field.mjs scored descentText as rendering on
   NO tab, so the text a contributor typed into the fix form is write-only. Prefer whichever
   says more; they describe the same descent, so showing both would just duplicate it. */
/* `max` is per CALL, because the two places this renders have different room. The HEADER STRAP
   sits beside elevation and pitch count and wants 30; the APPROACHES pill owns its own row and
   can hold more, and 33 of the 132 approach seasons that were being truncated already fitted 48
   characters — chopped for no reason but a budget borrowed from the other surface. 48 is also
   what check:token-boxes still counts as a token rather than a paragraph, so a value shown in
   full here can never trip that guard.
   The last resort now breaks on a WORD boundary: "Roughly January through the…" reads as a
   sentence that stops, where "Roughly January through the e…" reads as a bug. */
/* Route tags — list membership ("Fifty Classic Climbs", "Bulger"), what the climbing is
   like (from routes.features), and the derived warnings. Rendered from the SAME slugs
   Challenges and Lists match on, so a chip a climber can see is a chip a challenge can
   count — the two cannot drift into disagreeing about whether this route is a classic.
   `detail` ("#19", "tied #51") is the rank the slug cannot carry; it rides beside the
   label rather than inside it, so the announced name stays the tag and not "Bulger#19".
   See lib/routeTags.js for why the column it reads had to be normalised first. */
/* A chip's blurb is the only thing that says what the tag MEANS, and it used to live solely in
   `title` - a hover tooltip, on an app built for a 390px phone, where there is no hover. So on
   the target device it was unreachable, and that is every explanation the row carries. The chip
   is a real control now (clickable() gives it the role, the tab stop and Enter/Space) and
   reveals its own blurb below the row.

   `aria-expanded` rather than `aria-pressed`: this is a disclosure, not a toggle that changes
   anything. The accessible NAME carries the blurb too, so a screen reader gets the meaning
   without having to open anything. */
/* trad and sport deliberately omit the season, which left the strap ending in a bare "3p · ". */
function strapTrim(s){return String(s||"").replace(/\s*·\s*$/,"").replace(/^\s*·\s*/,"").trim();}
/* A gap is now the *quietest* thing in its section, not a dashed card competing with the
   content around it. This used to be a filled, dashed, bordered box at 12.5px bold — on a
   bare route (the shape ~99.5% of them have) six of them stacked up and the page read as a
   list of absences rather than a climb. Same words, same fix link, one thin rule and muted
   11.5px text. The button keeps a 30px tap target via padding, since shrinking type must
   not shrink the touch area. */
/* The one thing worth keeping out of the DATA CONFIDENCE box. That box graded every route
   ("Not reviewed", "no community confirmations yet") whether or not it had anything to say,
   which is what made it noise. On 19 routes `verif` says something specific and worth
   knowing — "UNVERIFIED LOCATION: the parent area could not be found on Mountain Project" —
   and that is a caveat about a real climb, not a completeness score. It renders only when
   there is a note AND the verdict is not "verified", so 205,465 routes show nothing, and it
   renders as one muted line rather than a panel. `corrections` and `data_quality` went with
   the box on purpose: both are graded bookkeeping, and 501 of the corrections rows say
   "None — consistent across sources." Recorded in check:field-renders' KNOWN map. */
/* Shows how far a route's data has been checked. It used to print `verif.source` beside that —
   a citation on seed routes ("Mountain Project + AAJ") and, on DB routes, an internal review note
   that named sources and leaked working language at climbers ("recommend spot-checking this
   route_id", "identity review 2026-07-30"). The app carries no sources, so the note is gone and
   the STATUS stays: this is the only place the route page discloses that its data is unchecked,
   and dropping the signal to remove the citation would be the wrong trade.
   It also stops calling a community-reported route "Unverified", which it did for every status
   that was not literally "verified". */
/* AN EMPTY SECTION IS STILL A SECTION (owner, 2026-10-15). A bare GapNote, one muted line with no
   heading, is what a missing pitch breakdown and missing rappels used to be, and on Castleton Tower's
   4-pitch Kor-Ingalls Route the owner read that as "the sections are not there". So a section a climber
   fills in keeps the SAME heading and pencil empty as full: the empty card says what is missing and
   opens the editor at that field, and the section does not move or rename itself when data arrives. */


function RouteDetail({route:routeRow,onBlockClimber,cragPanels,condPanels,safetyPanels,who,onFloatPlan,presence,autoFix,onAutoFixDone,onAddPhotos,onRemovePhoto,onReportPhoto,canModeratePhotos,dbPhotos,photosUnavailable,onSubTab,initialSubTab,myReports,onBack,onPlan,onViewProfile,connections,onConnect,friendState,saved,saveHint,onToggleSave,onLog,onOpenReport,onOpenRoute,hzVotes,onVoteHazard,onShareRoute,onContribute,onRequestJoin,requested,dbCrews,blocked,onFindPartners,diffRatings,onRateDifficulty,diffMeta,logged,comments,commentsUnavailable,commentApi={},onAddTopo,topoConsensus,myItin,onSaveMyItin,crewsForRoute,onShareItinToCrew,myStars,onRateRoute,onOpenFireMap,notify,onFindPartnersInArea,onListMe,myListings,onOpenArea,inCompare,onToggleCompare}){/* THE WEBSITE (lib/wideLayout.js): at 1024px+ the header is facts beside a photo under a breadcrumb, and at 1280px+ the route map moves into the right rail (App renders #cm-route-rail there) so it stays in view on every tab. */const deskWide=useWideScreen(),deskFull=useFullWidth();const [drawOpen,setDrawOpen]=useState(false);const [gpsInitPts,setGpsInitPts]=useState(null);const crumbQ=useAreaPath(deskWide&&USE_DB&&routeRow&&routeRow._dbArea?routeRow.mountainId:null);const [railEl,setRailEl]=useState(null);useEffect(function(){setRailEl(deskWide&&deskFull?document.getElementById("cm-route-rail"):null);},[deskWide,deskFull]);
  /* WHICH WAY IN. `routeRow` is the route as stored (plus merged contributions); `route` is that
     route with the climber's chosen approach laid over it (lib/approaches.js). Every panel below
     reads `route`, so the trailhead, map, waypoints, camps, gain/distance, planner and trip plan
     all follow one pick — and the ONE reader that must not is SuggestFix: an edit is a claim
     about the stored row, and seeding it from the overlay would write the Fisher Chimneys pins
     into the Southeast Ridge's own waypoints column. The sibling read is the same query the
     "More on this peak" list makes below, so it costs no second request. */
  const {data:_apPeakSibs,isError:_apPeakErr}=useAreaRoutes(routeRow.mountainId);
  /* A way in can be a route filed on ANOTHER peak — the Fury ridge traverse starts on East Fury's summit, reached by East Fury's own route — so any linked route this peak's list lacks is read by id. */
  const _apFarIds=useMemo(function(){if(!_apPeakSibs)return EMPTY_ARR;var ids=(Array.isArray(routeRow.approachVariants)?routeRow.approachVariants:EMPTY_ARR).map(function(v){return v&&v.viaRouteId;}).filter(function(id){return id&&!_apPeakSibs.some(function(r){return r.id===id&&!r._thin;});});return ids.length?ids:EMPTY_ARR;},[_apPeakSibs,routeRow.approachVariants]);
  const _apFarQ=useRoutesByIds(_apFarIds);
  const _apSibs=useMemo(function(){/* The peak's list rows are THIN (lib/db.js useAreaRoutes); a via route needs its approach data, so every via id is read in full by id and its thin row drops out until that lands — ApproachPicker says "Loading the route this approach follows…" meanwhile, never a thin row's missing fields. */if(!_apPeakSibs||!_apFarIds.length)return _apPeakSibs;return _apPeakSibs.filter(function(r){return _apFarIds.indexOf(r.id)<0;}).concat(_apFarQ.data||EMPTY_ARR);},[_apPeakSibs,_apFarIds,_apFarQ.data]);const approachSibsUnavailable=!!(_apPeakErr||(_apFarIds.length&&_apFarQ.isError));
  const approachOpts=useMemo(function(){return approachOptions(routeRow);},[routeRow]);
  const [approachKey,setApproachKey]=useState(function(){var l=routeRow._linkApproach;return l&&approachOpts.some(function(o){return o.key===l;})?l:defaultApproachKey(approachOpts);});
  const approachOpt=approachOpts.find(function(o){return o.key===approachKey;})||null;
  const approachVia=useMemo(function(){return viaRouteOf(approachOpt&&approachOpt.variant,_apSibs,dbRouteToCamel);},[approachOpt,_apSibs]);
  /* withRecordedTrackOnly: the route line is a recorded track or nothing (owner, 2026-10-25), so a stored line that is only the pins joined up leaves here, AFTER the approach overlay, which can swap in another row's line. *//* ONE WALK-IN PER CRAG (0397): an approved trail to the crag is saved on the crag's AREA (areas.walkin_gpx), as theCrag attaches an approach path to the crag, so every climb there draws it. A crag climb with a recorded line of its own keeps that line (it may run on to this climb's start); the area's line fills only an empty map, under the same recorded-track-or-nothing test. */const _walkQ=useArea(USE_DB&&CRAG_CATS.includes(catOf(routeRow))?routeRow.mountainId:null);const _walkGpx=_walkQ.data&&_walkQ.data.walkin_gpx,_walkKind=_walkQ.data&&_walkQ.data.walkin_kind;const route=useMemo(function(){return withCragWalkIn(withRecordedTrackOnly(applyApproach(routeRow,approachOpt,approachVia)),_walkGpx,_walkKind);},[routeRow,approachOpt,approachVia,_walkGpx,_walkKind]);
  /* "N lists saved" counted the example CLIMBERS' objectives only, so real climbers saving this climb never moved it.
     objectives is public-read (0031): one grouped count for this route. */
  const savedCountQ=useObjectiveCounts(routeRow&&routeRow.id?[routeRow.id]:[]);
  /* ROUTE STATS' page views (0353): one per visitor, route and day, counted on whichever sub-tab the page opens on. The server dedupes, so a re-render or a reload adds nothing. */
  const _viewId=USE_DB&&route&&route.id?route.id:null;useEffect(()=>{if(_viewId)recordRouteView(_viewId);},[_viewId]);
  /* The reverse link: siblings that name THIS route as their way in (Sulphide Glacier lists the
     Southeast Ridge). Read off the siblings' own variants, so it needs no column on this row and
     cannot drift from the forward link. */
  /* What the approach editor offers as "By the … route on this peak". */
  const approachSibOpts=useMemo(function(){return (_apSibs||EMPTY_ARR).filter(function(r){return r&&r.id!==routeRow.id;}).map(function(r){return {id:r.id,name:r.name};});},[_apSibs,routeRow.id]);
  const approachFinishes=useMemo(function(){return (_apSibs||EMPTY_ARR).filter(function(r){return r&&r.id!==routeRow.id&&Array.isArray(r.approach_variants)&&r.approach_variants.some(function(v){return v&&v.viaRouteId===routeRow.id;});}).map(dbRouteToCamel);},[_apSibs,routeRow.id]);
  /* Other climbers' trip reports. Until now the consensus was built from seed `activity`
     (empty for every DB-backed route) plus the CURRENT USER'S own logs — so a "community
     consensus" was really a solo view, and a second climber reporting the same route saw
     nothing of the first. RLS ("view crew logs", 0081) decides whose rows come back — public
     to anyone including signed-out, crew to confirmed members — so this widens nothing on its
     own. It reads climb_logs directly rather than through `get_trip_reports_for_consensus`,
     which returned five columns and therefore threw away everything the reporter actually
     wrote; see useRouteTripReports for why the RPC was left behind rather than widened. */
  /* Tapping a waypoint row focuses that pin on the map above it. Two details are
     load-bearing. The nonce makes a SECOND tap on the same row re-fire — an index alone is
     unchanged and the map's effect would not run, which reads as the row having stopped
     working. And the map is scrolled back into view first: on a phone the waypoint list runs
     well below the fold, so panning a map the climber cannot see is indistinguishable from
     the tap doing nothing at all. */
  const mapWrapRef=useRef(null);
  /* The base check-ins (0188) are read ONCE here and handed to both the map, which draws them, and
     the panel under it, which lists and records them. */
  const baseQ=useRouteBaseCheckins(USE_DB?route.id:null);const baseSpots=baseQ.data||EMPTY_ARR;
  const [wpFocus,setWpFocus]=useState(null);
  const focusWaypoint=useCallback(function(i){
    setWpFocus(function(p){return {i:i,n:((p&&p.n)||0)+1};});
    const el=mapWrapRef.current;
    if(el&&el.scrollIntoView){try{el.scrollIntoView({behavior:"smooth",block:"center"});}catch(e){el.scrollIntoView();}}
  },[]);
  const tripQ=useRouteTripReports(USE_DB?route.id:null);/* Derived here rather than beside any other declaration: `tripQ` is a `const`, so a flag reading it from higher up the component is a temporal dead zone — the #1206 blank screen. */const anonQ=useRoutePrivateConditions(USE_DB?route.id:null);/* ...and the reports kept to friends, a crew or the climber alone, as conditions with no author (0329). A failed read of THESE is a partial consensus too. */const reportsUnavailable=!!(USE_DB&&((tripQ&&tripQ.isError)||(anonQ&&anonQ.isError)));/* NO SIGNAL, PACKED ROUTE: the reports below are the copy saved with the pack (lib/db.js stamps `_packedAt`), so every line that describes them says how old they are instead of passing them off as live. */const reportsPackedAt=(tripQ&&tripQ.data&&tripQ.data._packedAt)||null;/* ...and WHICH saved copy: a state download carries reports too now (lib/offline.js), and calling that copy "your trip pack" would name something the climber never made. */const reportsSavedWith=tripQ&&tripQ.data&&tripQ.data._savedFrom==="state"?"saved when you downloaded "+(tripQ.data._savedState||"this state"):"saved on this device";
  const _tripRows=tripQ&&tripQ.data||EMPTY_ARR;
  const _reporterIds=useMemo(function(){return [...new Set(_tripRows.map(function(r){return r.user_id;}).filter(Boolean))];},[_tripRows]);
  const _reporterQ=useProfilesByIds(_reporterIds);const _reporterData=_reporterQ&&_reporterQ.data;
  /* CLIMBERS' TRACKS (lib/RouteTracksPanel.jsx): every recording attached to a readable report here, and which of them the reader has
     switched onto the map. A shown track keeps its colour while it is shown; the selection belongs to this route and starts empty on the next. */
  const tracksQ=useRouteTracks(USE_DB?route.id:null);const tracksUnavailable=!!(USE_DB&&tracksQ.isError);/* a failed read says so; it never reads as "no tracks yet" */
  const trackRows=useMemo(function(){return (tracksQ.data||EMPTY_ARR).map(function(r){var st=trackStats(r.gpx_track,r.car_to_car_minutes);return st?{id:r.id,user_id:r.user_id,date:r.date_climbed,stats:st,pts:trackPoints(r.gpx_track)}:null;}).filter(Boolean);},[tracksQ.data]);
  const _trackerQ=useProfilesByIds(useMemo(function(){return [...new Set(trackRows.map(function(r){return r.user_id;}).filter(Boolean))];},[trackRows]));
  const trackProfiles=useMemo(function(){var m={};(_trackerQ.data||EMPTY_ARR).forEach(function(p){m[p.id]=p;});return m;},[_trackerQ.data]);
  const [shownTrk,setShownTrk]=useState({rid:route.id,on:[]});const shownIds=shownTrk.rid===route.id?shownTrk.on:EMPTY_ARR;
  const trackColor=useCallback(function(id){var e=shownIds.find(function(x){return x.id===id;});return e?e.color:null;},[shownIds]);
  const toggleTrack=useCallback(function(id){setShownTrk(function(p){var on=p.rid===route.id?p.on:[];if(on.some(function(x){return x.id===id;}))return {rid:route.id,on:on.filter(function(x){return x.id!==id;})};var color=TRACK_COLORS.find(function(c){return !on.some(function(x){return x.color===c;});});return color?{rid:route.id,on:on.concat([{id:id,color:color}])}:p;});},[route.id]);
  const dbReports=useMemo(function(){
    var byId={};(_reporterData||EMPTY_ARR).forEach(function(p){byId[p.id]=p;});
    /* Shaped exactly like a seed `activity` row, because every consumer downstream — the trip
       report card, the full-report modal, ReportStats, the rack-beta extractor, buildConsensus —
       already reads that shape and none of them needed changing. What is new is that these
       rows now carry what the reporter actually WROTE. They used to arrive with stars and
       cond_tags only, so a route's whole community record was a star average and some chips.
       `cond` is rebuilt with the same key names LogAscent uses (approachMin/climbMin/snow/…),
       which is what ReportStats reads.
       A reporter whose profile row is missing gets no invented name: buildConsensus weights
       an unknown author at the neutral default instead of fabricating one. */
    return _tripRows.map(function(r){return tripRowToActivity(r,byId[r.user_id]||null);});
  },[_tripRows,_reporterData]);
  const activity=useMemo(function(){var out=[],seen=new Set(),ids=new Set();(route.activity||[]).concat(myReports||[]).concat(dbReports).forEach(function(a){if(!a||seen.has(a))return;var k=a._dbId!=null?a._dbId:a.id;if(k!=null){if(ids.has(k))return;ids.add(k);}seen.add(a);out.push(a);});return out.sort(function(x,y){return (y.date||"").localeCompare(x.date||"");});},[route.activity,myReports,dbReports]);const hzVoteFor=useCallback(function(label){if(!hzVotes||!label)return null;var direct=hzVotes[route.id+"|"+label];if(direct)return direct;var lc=String(label).toLowerCase();var cat=Object.keys(HAZ_KW).find(function(k){return k.toLowerCase()===lc||HAZ_KW[k].some(function(kw){return lc.indexOf(kw)>=0;});});return cat?hzVotes[route.id+"|"+cat]:null;},[hzVotes,route.id]);const ovAuthorsV=useRealAuthors(activity.map(function(a){return a&&a._authorId;}));/* The CONDITIONS read every report, shared or not; the lists of reports read `activity` only. */const anonRows=anonQ.data;const condActivity=useMemo(function(){return anonRows&&anonRows.length?activity.concat(anonRows.map(anonRowToActivity)):activity;},[activity,anonRows]);const ovCC=useMemo(()=>buildConsensus(condActivity,hzVoteFor),[condActivity,hzVoteFor,ovAuthorsV]);const topRef=useRef(null),jumpsRef=useRef(null);const _ovRouteId=route&&route.id;useEffect(()=>{try{if(topRef.current&&topRef.current.scrollIntoView)topRef.current.scrollIntoView({block:"start"});if(typeof window!=="undefined"&&window.scrollTo)window.scrollTo(0,0);}catch(e){}},[_ovRouteId]); // eslint-disable-line react-hooks/exhaustive-deps -- ovAuthorsV is deliberate: the author cache fills after render and buildConsensus reads it
  const {data:dbSibs,isError:dbSibsErr,isPending:dbSibsPending}=useAreaRoutes(route.mountainId);/* A failed sibling read used to state, as a fact about the catalog, that this was the only route on the peak. `useAreaRoutes` throws, so `dbSibs` stays undefined and `cragSibs` falls through to filtering the SEED array by a DB area id — which matches nothing — so `sibs` is empty for the same reason a genuinely single-route peak is. Measured on production against a 4-route area: 'The only route catalogued on 19 Mile Wall so far.' */const sibsUnavailable=!!(USE_DB&&dbSibsErr);const sibsPending=!!(USE_DB&&dbSibsPending&&!dbSibsErr);const cragOnly=CRAG_CATS.includes(catOf(route));/* A crag route (trad/sport/bouldering) gets no WAYPOINTS list and no "What to expect" card: a single-pitch line off a roadside cliff has no approach sequence worth a waypoint list, and the per-discipline "typical conditions" card only restated generic rock advice. Trad that climbs a PEAK is not caught here: catOf() calls it alpine, so it keeps its waypoints and card. The map, its pins and the Directions button are untouched. */const noWaypoints=cragOnly;/* A crag route has NO Plan tab: its plan content renders on Overview (see planBody). */const showPlan=!cragOnly;/* CONDITIONS is its own tab on a scored crag route (sport, trad, top-rope, bouldering): the forecast score is a
   different thing from what climbers REPORTED, which stays on Send Reports (owner decision 2026-10-07). */const showScore=CRAG_SCORE_DISCIPLINES.includes(catOf(route));/* ALPINE, MOUNTAINEERING, SCRAMBLING, ICE AND MIXED get a Conditions tab too, with FLAGS and a start time instead of stars (owner decision 2026-10-07: no published alpine go/no-go standard exists to score against). The two never meet on one route: the sets are disjoint, and check:alpine-conditions holds that. */const showAlpineCond=!showScore&&ALPINE_COND_DISCIPLINES.includes(catOf(route));/* ASPECT & SUN and SEASONAL GUIDANCE (condPanels, mounted by ClimbMatch.jsx) sit on the Conditions tab when the route has one (owner, 2026-10-23); a route without one (aid, or a discipline neither set covers) keeps them where they were: the Overview foot on a crag, the Plan tab elsewhere. */const condTab=showScore||showAlpineCond;/* Safety is offered on EVERY route, deliberately unlike Plan. An empty Plan tab is worse than no Plan tab — it promises an approach and a descent and delivers a blank — but the Safety tab is never empty: it carries the per-discipline advice, the forecast links and, since #769, the nearby-fire panel, none of which come from the route's own record. Plan stays content-gated for exactly that reason. This replaced `showSafety=!cragOnly||hasSafetyContent(route)`, which meant 99.5% of the catalog was offered no Safety tab and so had nowhere to put a live wildfire. */const techStatsEl=<div style={{marginBottom:12}}><TechStats route={enrichRoute(route)} onEdit={(f)=>{openFix(typeof f==="string"?f:"grade");}}/></div>;const cragFactsEl=(part)=><TechStats route={enrichRoute(route)} part={part} onEdit={(f)=>{openFix(typeof f==="string"?f:"grade");}}/>;
  /* The tab bar scrolls sideways and its last tabs (Partners, Photos) sit past the right edge on a phone, with nothing to say so (owner, 2026-10-23). tabEdge says which ends hide a tab, so the bar can fade that edge and put a ‹ / › button on it, as MUI's scrollable tabs and Notion do; a bar that fits shows neither. Re-measured on scroll, on resize, and when the set of tabs changes. */const tabBarRef=useRef(null);const [tabEdge,setTabEdge]=useState({l:false,r:false});useEffect(()=>{const el=tabBarRef.current;if(!el)return;const upd=()=>{const l=el.scrollLeft>4,r=el.scrollLeft+el.clientWidth<el.scrollWidth-4;setTabEdge(p=>p.l===l&&p.r===r?p:{l,r});};upd();el.addEventListener("scroll",upd,{passive:true});const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(upd):null;if(ro){ro.observe(el);Array.from(el.children).forEach(c=>ro.observe(c));}return ()=>{el.removeEventListener("scroll",upd);if(ro)ro.disconnect();};},[route.id,cragOnly,showPlan,showScore,showAlpineCond]);const nudgeTabs=dir=>{const el=tabBarRef.current;if(el)el.scrollBy({left:dir*Math.max(120,el.clientWidth*0.7),behavior:"smooth"});};
/* "About this peak" (peakMetadata.geology) used to sit in its own PEAK panel far down the
     Overview, under the range/county rows — so the paragraph that tells you what the mountain
     IS was separated from the paragraph that tells you what the route is by everything in
     between. It is merged into the top description card instead: one block of prose at the
     top of the page. PeakMetadataPanel keeps range/county/first-ascent and no longer renders
     geology, so the text has exactly one home and check:field-renders still finds it. */
  /* Deliberately NOT an IIFE. check:fire identifies the fire panel's element by matching
     `const <name>=(function(){ … <FireNearRoute`, lazily, so ANY earlier `(function(){` in
     this component captures that match — this const sits ~1.2k chars above `fireEl` and made
     the guard hunt for `{_peakGeo}` on the Safety tab and report the panel both missing there
     and double-mounted on Overview. A plain destructure keeps the guard pointed at fireEl. */
  const _peakGeoPm=enrichRoute(route).peakMetadata,_peakGeo=(_peakGeoPm&&_peakGeoPm.geology)||"";
  /* Nearby active fire. It lives on the SAFETY tab — a fire that can close your approach road is a
     hazard, and it belongs beside the float plan, the forecasts and the hazard matrix rather than
     in the middle of a description of the climb. Rendered second there, straight under the forecast
     (owner, 2026-10-24), as a dropdown whose closed row still names the nearest fire.
     It renders THERE AND NOWHERE ELSE, which is only safe because every route is offered a Safety tab.
     While that tab was content-gated this had to fall back to Overview, or the panel disappeared for the
     99.5% of the catalog that is name + grade + pitches. If the gate ever returns, restore the fallback.
     The coordinate comes from the route's area the same way peakCoord does elsewhere: MOUNTAINS for the
     seed catalog, _dbArea for the DB one (which openRoute backfills asynchronously). With neither,
     FireNearRoute renders NOTHING — "no fires near here" about a place we cannot locate would be worse
     than silence. */
  const fireEl=(function(){const _m=MOUNTAINS.find(function(mm){return mm.id===route.mountainId;})||route._dbArea||{};const _c=(_m.lat!=null&&_m.lng!=null)?{lat:_m.lat,lng:_m.lng,name:route.name}:null;/* The map opens CLOSE, on a pin named for this climb: zoom 13 is where the topo layer prints peak names, and at FireMap's default 9 a climber had to zoom in four steps to find Vesper Peak at all. The point is the route's own place, so it gets the pin an area focus does not, and on a PEAK the pin carries the peak's name ("Vesper Peak", not "Standard Route (Headlee Pass)") because the peak is what a climber looks for on a map; a crag sector's name is the label problem above, so everywhere else it stays the route's. */const _open=_c?{lat:_c.lat,lng:_c.lng,name:_c.name,pinLabel:(_m.areaType==="peak"&&_m.name)?_m.name:_c.name,zoom:13,pin:true}:null;/* the ROUTE's name, not the area's: an area name here is often a crag sector label ("(C) Main Wall, left side"), which the fire map would then print as "Distances from (C) Main Wall, left side" */return <FireNearRoute coord={_c} C={C} ActionIcon={ActionIcon} uDistMi={uDistMi} onOpenFireMap={onOpenFireMap&&_c?function(){onOpenFireMap(_open);}:null}/>;})();
  /* One element, two mounts, defined once so the two cannot drift into different copy:
     beside the BETA box on Overview, and as the page footer on the tabs that have no
     beta block to sit beside. Rendering the same node in two places is safe because
     only one of the two branches is ever live for a given `tab`. */
  /* WEATHER — the live forecast and the outside forecasts to cross-check it. On a crag route it sits on
     CONDITIONS under the score, and since 2026-10-24 it ALSO opens the Safety tab on every route (owner:
     "Forecast should be at the top of safety tab"), superseding 2026-10-07's "weather doesn't need to be
     on Safety if we already have the conditions subtab". */
  /* The forecast links open the climb's OWN page on each site, never a search: Mountain-Forecast's nearest-peak
     redirect (/location_search, the site's own "near me" button) and AirNow's map centred on the summit pin. */
  const wxEl=()=>{const wxLinks=forecastLinksOf(route,mtn,showScore);return <><Capped><WeatherPanel waypoints={showScore?null:route.waypoints} fallback={showScore?cragWxPointOf(route,mtn):wxFallbackOf(route,mtn)} crag={showScore} showPlan={showPlan}/></Capped><div style={{marginTop:14,marginBottom:ROUTE_GAP}}><SL>Weather & mountain forecasts</SL><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>{wxLinks.map(function(a,i,arr){return <a key={i} href={a.u} target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 13px",borderBottom:i<arr.length-1?`1px solid ${C.borderLight}`:"none",textDecoration:"none"}}><span style={{fontSize:13,color:C.text}}>{a.n}</span><span style={{fontSize:12,color:C.blue,fontWeight:700}}>Open →</span></a>;})}</div></div></>};
  /* LOG IT, TWO WAYS: Quick log is the outcome and the date in one small sheet; Full log is the whole seven-section form. A climber who only wants the climb on their record used to have only the long one (owner, 2026-10-15). */
  const logRow=()=><div style={{display:"flex",gap:8}}><button onClick={()=>onLog(route,"quick")} style={{...BTN,flex:1,background:C.blueBg,color:C.onSolid,border:"1px solid "+C.blueDim}}>✓ Quick log</button><button onClick={()=>onLog(route)} style={{...BTN,flex:1,background:C.card,color:C.textSub,border:"1px solid "+C.border}}>Full log</button></div>;
  const roadEl=()=><Capped><RoadReports activity={activity} reportsUnavailable={reportsUnavailable} onReport={onLog?function(){onLog(route,"road");}:undefined}/></Capped>;
  const betaCta=<div style={{margin:ROUTE_GAP+"px 0 4px",padding:"12px 14px",borderRadius:12,border:"1px dashed "+C.border,background:C.surface,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span style={{minWidth:0}}>{(function(){var mf=missingFacts(route);return <><span style={{display:"block",fontSize:13,fontWeight:700,color:C.text,lineHeight:1.35}}>{mf.length?"Know this route?":"Got beta?"}</span><span style={{display:"block",fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:3}}>{mf.length?("Still missing: "+mf.join(", ")+". Add what you know — or fix anything else on this page that looks off."):"Add anything that's missing or fix what's off — every section on this page can be edited."}</span></>;})()}</span><button onClick={()=>setFixOpen(true)} style={{flexShrink:0,padding:"8px 13px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:12.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{<Lbl s={"Contribute"}/>}</button></div>;
  /* The fallback used to guard the OBJECT and not the NAME: `MOUNTAINS.find(...)||route._dbArea
   ||{name:"this area"}`. A `_dbArea` built from a path-only `areas(path)` embed is TRUTHY with
   an undefined `name`, so it won the `||` chain and the header rendered the literal word
   "undefined" (uppercased by CSS to UNDEFINED). Seen live on a wishlisted route. The query is
   fixed too; this is the fail-closed half, so the next path-only embed degrades to "this area"
   rather than showing a climber a bug. */
const mtn=(function(){const _s=MOUNTAINS.find(m=>m.id===route.mountainId);if(_s&&_s.name)return _s;const _d=route._dbArea;if(_d&&_d.name)return _d;return Object.assign({},_d||{},{name:"this area"});})(),dc=CAT[catOf(route)]||{color:C.textSub,bg:C.surface,icon:"",label:catOf(route)};const partners=useMemo(()=>CRAG_CATS.includes(catOf(route))?[]:ALL_CLIMBERS.filter(c=>c.objectiveIds.includes(route.id)),[route.id]);/* REAL climbers who saved this route (0211). The list below was the example profiles only, so a real climber with this route on their objectives was invisible on its own page. */const _isCragR=CRAG_CATS.includes(catOf(route));/* `cragOnly` is declared further down; same test. *//* How many climbers saved it at all (route_stats, the same cached read as the ROUTE STATS card): Partners says how many of them the list below can show, so a tile reading 7 that opens on 3 names explains the other 4 (owner's note, 2026-10-28). */const _statsQ=useRouteStats(USE_DB&&who&&!_isCragR?route.id:null);const _savedN=Number(((_statsQ&&_statsQ.data)||{}).objectives||0);const _rpRes=usePartnersByObjective(USE_DB&&who&&!_isCragR?[route.id]:null,null,null,null,USE_DB&&!!who&&!_isCragR);const realPartners=((_rpRes&&_rpRes.data)||[]).filter(function(p){return p&&p.id&&String(p.id)!==String(who)&&!(blocked||[]).some(function(b){return String(b&&b.id)===String(p.id);});});/* "N climbers have this on their objectives": you are one of them when you saved it, and the rest of the gap is climbers who are unlisted or blocked either way. partners_by_objective returns at most 50, so a full page claims no gap. Empty when the count has not loaded. */const savedNote=function(listed){if(!_savedN)return "";var _cap=((_rpRes&&_rpRes.data)||[]).length>=50;var _rest=Math.max(0,_savedN-listed-(saved?1:0));return _savedN.toLocaleString(DLOCALE)+" climber"+(_savedN!==1?"s have":" has")+" this route on their objectives"+(saved?", you among them":"")+". "+(_cap?"The first "+listed+" are listed here. ":_rest?_rest+" of them "+(_rest!==1?"aren’t":"isn’t")+" shown: they turned off being listed, or can’t be shown to you. ":"");};/* A CRAG route's partners are found by AREA (0300): the climbers listed at this crag, inside it, or across a wider area that contains it — not the climbers who saved this one route. */const _raRes=usePartnersInArea(_isCragR&&route.mountainId?route.mountainId:null,null,null,USE_DB&&!!who&&_isCragR,10);const areaPartners=((_raRes&&_raRes.data)||[]).filter(function(p){return p&&p.id&&String(p.id)!==String(who)&&!(blocked||[]).some(function(b){return String(b&&b.id)===String(p.id);});});const _listedHere=!!(myListings||[]).find(function(l){return l&&l.areaId===route.mountainId;});const _rpObj=useMatchObjectivesOfUsers(realPartners.concat(areaPartners).map(function(p){return p.id;}));/* The route's ★ is the shared rating (0294): one vote per climber, header stars first, else their latest public trip report. Before it the header stars reached nobody, and every report was a vote. The local average stands in only until a climber rates it, or with no database. */const _starQ=useRouteStarSummary(USE_DB&&route?route.id:null);const starSum=_starQ&&_starQ.data;const avgS=useMemo(function(){if(starSum&&starSum.raters>0)return starSum.stars;var rated=activity.filter(function(a){return a&&a.stars>0;});return rated.length?rated.reduce(function(s,a){return s+a.stars;},0)/rated.length:(route.stars||0);},[activity,route.stars,starSum]);const ratedN=useMemo(function(){if(starSum&&starSum.raters>0)return starSum.raters;return activity.filter(function(a){return a&&a.stars>0;}).length;},[activity,starSum]);const climberN=useMemo(function(){return new Set(activity.map(function(a){return a&&(a._authorId||a.user);}).filter(Boolean)).size;},[activity]);const recentN=useMemo(function(){return activity.filter(function(a){return a&&isRecent(a.date);}).length;},[activity]);const rkw=useMemo(()=>routeKw(Object.assign({},route,{activity})),[route.id,activity,route.hazards]);const rkFlagged=useMemo(()=>rkw.hazards.filter(h=>!h.official&&h.count>=2),[rkw.hazards]);const cragSibs=useMemo(()=>USE_DB&&dbSibs?dbSibs.map(dbRouteToCamel):ROUTES.filter(x=>x.mountainId===route.mountainId),[route.mountainId,dbSibs,USE_DB]);const routePhotos=useMemo(()=>activity.flatMap(a=>(a.photos||[]).map(u=>({url:u,alt:(a.photoAlts&&a.photoAlts[u])||null,by:a.user,avatar:a.avatar,date:a.date,ascent:a,cat:(a.condTags||[]).some(function(t){return isHazardTag(t);})?"Hazards":"Conditions"}))).concat((route.photos||[]).map(u=>({url:u,cat:"Conditions"}))),[route.id,activity,route.photos]); // eslint-disable-line react-hooks/exhaustive-deps -- memos are keyed on route.id plus the specific route fields they read (route object is rebuilt each render); USE_DB is a module flag kept as a documented dependency
  /* The planner's own inputs, held here because a sub-tab switch unmounts the component that
     renders them (the float plan form had the same fix before it moved to Crews › Float plans). Keyed per route by RouteDetail's own `key={selRoute.id}`. */
  const [calcInputs,setCalcInputs]=useState({fit:"intermediate",pack:10,party:2,depart:6});
  const _rdRouteId=route&&route.id;const [tab,setTab]=useState(initialSubTab||"overview");useEffect(function(){if(onSubTab)onSubTab(tab);},[tab]);useEffect(()=>{if(tab==="planner"&&!showPlan)setTab("overview");},[_rdRouteId,showPlan,tab]);useEffect(()=>{if(tab==="forecast"&&!showScore&&!showAlpineCond)setTab("overview");},[_rdRouteId,showScore,showAlpineCond,tab]);const [fixOpen,setFixOpen]=useState(false);const [fixOpenSection,setFixOpenSection]=useState(null);/* ROUTE QUALITY CONTROL (0307–0309): every pencil goes through openFix. A field at HIGH confidence is locked — the database would refuse the edit anyway (0308) — so its pencil opens the FLAG sheet, which is the one thing a climber can do about a locked detail. */const _rdCx=useContext(ConfidenceCtx);const openFix=function(k){var _lv=_rdCx&&_rdCx.levels?_rdCx.levels[k]:null;if(_lv==="high"&&_rdCx.onFlag){_rdCx.onFlag(k,null);return;}/* NOT openFix(k): this const IS openFix, so that call recursed until the stack overflowed and every pencil on the route page crashed it ("Maximum call stack size exceeded", #2467). */setFixOpenSection(k);setFixOpen(true);};/* "Brought different gear?" sits directly under the RACK card it corrects (owner note 2026-10-15), not at the foot of the gear section after ROPEWORK and GEAR & ESSENTIALS, or at the end of a crag page far from its rack. Bouldering has pads, not a rack. */const gearUpdateBox=catOf(route)!=="bouldering"?<div {...clickable(()=>{openFix("rack");})} style={{marginTop:8,padding:"9px 12px",borderRadius:10,border:"1px dashed "+C.border,background:C.surface,fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><Lbl s={"✏️ Brought different gear? Suggest a gear update for this route"}/></div>:null;/* Values to seed the fix form with, so a shortcut elsewhere (the bolt-problem chips) can carry its choice into the real contribute flow instead of asserting it filed something. */const [fixPrefill,setFixPrefill]=useState(null);const [fixFocusPitch,setFixFocusPitch]=useState(null);/* autoFix is a route id, or "id#fieldKey" to open the form AT that field (the Overview panels App mounts below this component use it for their "Add" prompts). */useEffect(function(){if(!autoFix||!route)return;var _af=String(autoFix),_h=_af.indexOf("#"),_id=_h<0?_af:_af.slice(0,_h);if(_id!==route.id)return;openFix(_h<0?null:_af.slice(_h+1));onAutoFixDone&&onAutoFixDone();},[autoFix,_rdRouteId]);const [trackOpen,setTrackOpen]=useState(null);const [shareOpen,setShareOpen]=useState(false);const [showGpsModal,setShowGpsModal]=useState(false);const [shareSearch,setShareSearch]=useState("");/* SEND TO A PARTNER reaches REAL climbers by name. The pool was your connections plus the seed CLIMBERS, so a real climber you had not connected with could not be found here at all, while five example people always could. Same search, and same two-letter floor, as Partners' "Find someone by name". */const _shareQ=shareSearch.trim();const shareRes=useProfileSearch(USE_DB&&who&&_shareQ.length>=2?_shareQ:"");const [partnersExpand,setPartnersExpand]=useState(false),[crewsExpand,setCrewsExpand]=useState(false),[sibsExpand,setSibsExpand]=useState(false);const [trackHistOpen,setTrackHistOpen]=useState(false);const [photoLightbox,setPhotoLightbox]=useState(null);const [photoLikes,setPhotoLikes]=useState({});const [quickPhotoOpen,setQuickPhotoOpen]=useState(false);const [quickPhotos,setQuickPhotos]=useState([]);const [quickPhotoPick,setQuickPhotoPick]=useState([]);const [photoBusy,setPhotoBusy]=useState(false);const [photoRemoving,setPhotoRemoving]=useState(false);const [photoReporting,setPhotoReporting]=useState(false);useEffect(()=>{try{if(topRef.current&&topRef.current.scrollIntoView)topRef.current.scrollIntoView({block:"start"});if(typeof window!=="undefined"&&window.scrollTo)window.scrollTo(0,0);}catch(e){}},[tab]);/* routeLink, not the old ?debugRoute= spelling: it carries the way in the climber picked, and the site address (VITE_PUBLIC_URL) every other shared link uses. */const shareLink=routeLink(route.id,route._approach&&route._approach.key); // eslint-disable-line react-hooks/exhaustive-deps -- onSubTab is an unmemoized parent callback and must not re-fire the tab report; the autoFix effect runs per autoFix/route id only (openFix and onAutoFixDone are latest-value reads)
  /* The Plan tab's body, as a function so it has ONE copy and two homes: the Plan tab, and — for a
     crag route (trad/sport/bouldering), which has no Plan tab — the Overview, where the user asked
     for everything about getting to and climbing a crag to sit on one page. A function, not a
     const, so nothing it reads is touched before this render has declared it. */
  const climateEl=<><Capped><ClimateSeasonCard route={route}/></Capped>{gapSeason(route)?<GapNote what="No season guidance" why="Nothing records when this is in — which months hold snow, when the moat opens, or when it dries out." cta="Add the season" onFix={()=>{openFix("season");}}/>:null}</>;
  
  const _trackName=function(r){var p=trackProfiles[r.user_id];return (p&&pubName(p))||"A climber";};
  const _extraTracks=shownIds.map(function(x){var r=trackRows.find(function(t){return t.id===x.id;});return r?{id:r.id,color:x.color,label:_trackName(r)+(r.date?" · "+shortDate(r.date):""),pts:r.pts}:null;}).filter(Boolean);
  const _reportOf=function(id){return activity.find(function(a){return a&&a._dbId===id;})||null;};
  /* CLIMBERS' TRACKS sits under the map it draws on, on every route that reads the database. */
  const _tracksPanel=USE_DB?<RouteTracksPanel rows={trackRows} profiles={trackProfiles} loading={tracksQ.isPending} failed={tracksUnavailable} shown={shownIds.map(function(x){return x.id;})} colorOf={trackColor} onToggle={toggleTrack} canOpen={function(id){return !!_reportOf(id);}} onOpenReport={onOpenReport?function(id){var a=_reportOf(id);if(a)onOpenReport(Object.assign({},a,{route:route,mtn:mtn}));}:null} onLog={onLog?function(){onLog(route);}:null}/>:null;
  const _routeMap=<RouteMapProfile elevPts={route.elevPts} pts={route.gpxPts} waypoints={route.waypoints} derivedTrailhead={(()=>{const _t=trailheadPoint(route);return _t&&_t.derived?_t:null;})()} peakCoord={mtn.lat!=null?{lat:mtn.lat,lng:mtn.lng,name:mtn.name}:null} endpointLabels={["alpine","mountaineering"].includes(catOf(route))?{startLabel:"Trailhead",startColor:C.green,finishLabel:"Summit",finishColor:C.orange}:undefined} focusWp={wpFocus} baseSpots={baseSpots} title={route.name} extraTracks={_extraTracks}/>;/* SAVE THIS MAP OFFLINE sits under the map it saves (lib/SaveMapOffline.jsx). Only a catalog route with somewhere to draw: a seed route has no row to save, and a climb with no point has no map. */const _mapOffline=USE_DB&&route._dbArea&&((route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced)||mtn.lat!=null)?<SaveMapOffline routeId={route.id} notify={notify}/>:null;
  /* The header photo on the website: the first photo any climber shared, or an invitation to add one. A failed photo read is said as such, never as "no photos". */const _hero=routePhotos[0]||(dbPhotos||[])[0]||quickPhotos[0]||null;const _photoN=routePhotos.length+(dbPhotos||[]).length+quickPhotos.length;const _crumbs=deskWide&&crumbQ.data?crumbQ.data.slice(1):[];
  return <div ref={topRef}>{railEl?createPortal(<section aria-label="Route map" style={{background:C.surface,border:"1px solid "+C.border,borderRadius:14,padding:10}}><div style={{fontSize:11,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.textMuted,margin:"2px 2px 8px"}}>Route map</div>{_routeMap}{_mapOffline}{_tracksPanel}</section>,railEl):null}{_crumbs.length?<nav aria-label="Breadcrumb" style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:2,padding:"12px 14px 0"}}>{_crumbs.map(function(c,ci){return <span key={c.id} style={{display:"inline-flex",alignItems:"center",gap:2}}>{ci?<span aria-hidden="true" style={{color:C.textMuted,fontSize:12.5}}>›</span>:null}<button onClick={function(){if(onOpenArea)onOpenArea(c);}} aria-current={ci===_crumbs.length-1?"location":undefined} style={{background:"none",border:"none",padding:"3px 4px",color:ci===_crumbs.length-1?C.text:C.textSub,fontSize:12.5,fontWeight:ci===_crumbs.length-1?700:600,cursor:"pointer"}}>{c.name}</button></span>;})}</nav>:null}{fixOpen?<SuggestFix route={routeRow} approachSibs={approachSibOpts}pending={route._pendingEdits||{}} scrollTo={fixOpenSection} focusPitch={fixFocusPitch} prefill={fixPrefill} peakCoord={mtn.lat!=null?{lat:mtn.lat,lng:mtn.lng,name:mtn.name}:null} onClose={()=>{setFixOpen(false);setFixOpenSection(null);}} onSubmit={onContribute} onLog={onLog?function(){setFixOpen(false);setFixOpenSection(null);onLog(route);}:undefined}/>:null}
    <div style={deskWide?{position:"relative",display:"grid",gridTemplateColumns:"minmax(0,3fr) minmax(0,2fr)",gridTemplateRows:"auto 1fr auto",columnGap:18,padding:"12px 14px 16px",boxSizing:"border-box"}:{minHeight:188,overflow:"hidden",position:"relative",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"11px 11px 14px",boxSizing:"border-box"}}>
      {deskWide?null:<img src={route.cover} className="cover-x" alt={route.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/>}{(()=>{var cur=myStars[route.id]||0;return <div style={{...(deskWide?{position:"relative",gridColumn:1,gridRow:3,justifySelf:"start",marginTop:12}:{position:"absolute",bottom:8,right:10}),zIndex:6,display:"flex",alignItems:"center",background:"rgba(13,17,23,0.66)",borderRadius:11,padding:"0 2px",border:"1px solid rgba(255,255,255,0.16)"}}>{[1,2,3,4,5].map(function(n){return <button key={n} onClick={function(e){e.stopPropagation();onRateRoute(route.id,n);}} aria-label={n+" star"} aria-pressed={n<=cur} style={{background:"none",border:"none",padding:"8px 5px",cursor:"pointer",fontSize:17,lineHeight:1,color:n<=cur?C.amber:"rgba(255,255,255,0.42)"}}>{"★"}</button>;})}<span title={ratedN?"Rated by "+ratedN+" climber"+(ratedN===1?"":"s")+", one vote each":"Nobody has rated this climb yet"} style={{color:"rgba(255,255,255,0.85)",fontSize:11.5,fontWeight:700,padding:"0 8px 0 3px",whiteSpace:"nowrap"}}>{/* How many climbers the rating comes from, beside the stars that cast one (Mountain Project: "from N votes"; AllTrails: "(N)"). Same count as the ★ cell below. */ratedN?ratedN+" vote"+(ratedN===1?"":"s"):"No votes"}</span></div>;})()}
      {deskWide?null:<div style={{position:"absolute",inset:0,background:"linear-gradient(rgba(13,17,23,0.5) 0%,transparent 22%,rgba(13,17,23,0.34) 50%,rgba(13,17,23,0.97) 92%)"}}/>}
      <div style={{position:"relative",zIndex:5,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,...(deskWide?{gridColumn:"1 / -1",gridRow:1,marginBottom:12}:null)}}><button onClick={onBack} style={POP_BACK_MEDIA}>← Back</button><div style={{display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"flex-end",flexWrap:"wrap",gap:6}}>{deskWide?<button onClick={function(){printSheet(route.name,routeSheetHtml(route,mtn.name,_crumbs.map(function(c){return c.name;})),notify);}} title="A one-sheet printout of this climb — approach, pitches, descent, rack, hazards and waypoints" style={{...BTN,background:"rgba(13,17,23,0.85)",color:C.onSolid,border:"1px solid "+C.border,minHeight:44}}>⎙ Print</button>:null}{deskWide?<button onClick={function(){setDrawOpen(true);}} title="Trace the way in on a map — see its length and gain, download it as GPX" style={{...BTN,background:"rgba(13,17,23,0.85)",color:C.onSolid,border:"1px solid "+C.border,minHeight:44,display:"inline-flex",alignItems:"center",gap:6}}><ActionIcon name="map" size={15} color="currentColor"/>Draw approach</button>:null}{onToggleCompare?<button onClick={onToggleCompare} aria-pressed={!!inCompare} title={inCompare?"In your comparison — click to take it out":"Add to a side-by-side comparison (up to four)"} style={{...BTN,background:inCompare?C.blueBg:"rgba(13,17,23,0.85)",color:inCompare?C.onSolid:"white",border:"1px solid "+(inCompare?C.blue:C.border),minHeight:44}}>{inCompare?"✓ Comparing":"+ Compare"}</button>:null}<button onClick={()=>setShareOpen(true)} style={{...BTN,background:"rgba(13,17,23,0.85)",color:C.onSolid,border:"1px solid "+C.border,minHeight:44}}>↗ Share</button><button onClick={onToggleSave} title={saved?"Saved to your objectives — tap to remove":"Save to your objectives"} style={{...BTN,background:saved?C.amberBg:saveHint?C.blueBg:"rgba(13,17,23,0.85)",color:saved?C.amber:"white",border:(saveHint&&!saved?"2px solid "+C.blue:"1px solid "+(saved?C.amber:C.border)),minHeight:44}}>{saved?"Saved":"Save"}</button></div>
      </div>
      <div style={{position:"relative",zIndex:2,marginTop:14,padding:"0 3px",...(deskWide?{gridColumn:1,gridRow:2}:null)}}><div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>{route.classic?<Pill label="★ Classic" color={C.amber} bg={C.amberBg} sm/>:null}<Pill icon={<DiscIcon d={catOf(route)} size={12} color={dc.color}/>} label={dc.label} color={dc.color} bg={dc.bg} sm/>{gradeLabel(route)?<Pill label={gradeLabel(route)} color={C.amber} bg={C.amberBg} sm/>:null}</div><div style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:700,textShadow:"0 1px 4px rgba(0,0,0,0.8)",overflowWrap:"anywhere"}}>{<Lbl s={"📍 "+mtn.name}/>}</div><h1 title={route.name} style={{color:"white",fontSize:(route.name||"").length>52?17.5:(route.name||"").length>34?20.5:25,fontWeight:800,letterSpacing:-0.4,lineHeight:1.14,margin:"3px 0 0",textShadow:"0 2px 9px rgba(0,0,0,0.68)",overflowWrap:"anywhere"}}>{route.name}</h1><div data-header-strap="1" style={{color:"rgba(255,255,255,0.8)",fontSize:12.5,fontWeight:600,marginTop:5,paddingRight:deskWide?0:215,minHeight:30,textShadow:"0 1px 4px rgba(0,0,0,0.7)",lineHeight:1.35,overflowWrap:"anywhere"}}>{strapTrim(route.discipline==="bouldering"?((route.rockType?route.rockType+" · ":"")+routeSeasonShort(route)):((mtn.elevation!=null?uElev(mtn.elevation)+" · ":"")+(route.pitches>0?(route.pitches+"p · "):"")+(cragOnly?routeSeasonShort(route):(routeSeasonShort(route)||"Season TBD"))))}</div></div>
      {deskWide?<div style={{gridColumn:2,gridRow:"2 / span 2",minHeight:200,borderRadius:14,overflow:"hidden",position:"relative",border:"1px "+(_hero?"solid ":"dashed ")+C.border,background:C.surface}}>{_hero?<button onClick={function(){setTab("photos");}} aria-label={"See all "+_photoN+" photo"+(_photoN===1?"":"s")} style={{position:"absolute",inset:0,width:"100%",height:"100%",padding:0,border:"none",background:"none",cursor:"pointer"}}><img src={_hero.url} alt={_hero.alt||route.name} onError={onImgErr(FALLBACK_COVER)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/><span style={{position:"absolute",right:10,bottom:10,background:"rgba(13,17,23,0.8)",color:C.text,fontSize:12,fontWeight:700,borderRadius:9,padding:"5px 9px",border:"1px solid "+C.border}}>{_photoN>1?"See all "+_photoN+" photos":"See photo"}</span></button>:photosUnavailable?<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:18,textAlign:"center"}}><div style={{fontSize:13.5,fontWeight:700,color:C.amber}}>Photos aren’t reachable right now</div><div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45}}>Check your connection — this climb may already have some.</div></div>:<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:18,textAlign:"center"}}><div aria-hidden="true" style={{display:"flex"}}><ActionIcon name="camera" size={28} color={C.blue}/></div><div style={{fontSize:14.5,fontWeight:800,color:C.text}}>Add the first photo</div><div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45,maxWidth:230}}>Show other climbers what this climb looks like.</div><button onClick={function(){setQuickPhotoOpen(true);}} style={{marginTop:4,padding:"9px 14px",borderRadius:10,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add photo</button></div>}</div>:null}
    </div>
    {(()=>{const _hd=headlineDist(route);const cells=(route.discipline==="bouldering"?[["Grade",gradeLabel(route),"amber",C.amber],["Approach",effDistKm(route),"textSub",C.textSub,_hd?_hd[0]:"Approach"],["Height",route.routeFt,"green",C.green],ratedN?["★",avgS,"amber",C.amber,"★ "+ratedN+" vote"+(ratedN===1?"":"s")]:null,["Reports",activity.length,"blue",C.blue]]:[["Grade",gradeLabel(route),"amber",C.amber],cragOnly?null:["Dist",effDistKm(route),"textSub",C.textSub,_hd?_hd[0]:"Distance"],protOf(route)?null:["Gain",routeAscentFt(route),"green",C.green],ratedN?["★",avgS,"amber",C.amber,"★ "+ratedN+" vote"+(ratedN===1?"":"s")]:null,["Reports",activity.length,"blue",C.blue]]).filter(Boolean);return <div style={{display:"grid",gridTemplateColumns:"repeat("+cells.length+",1fr)",background:C.surface,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>{cells.map((x,xi)=>{const hasValue=(x[0]==="Grade"?!!gradeLabel(route):x[0]==="Approach"?!!_hd:x[0]==="Height"?route.routeFt!=null:x[0]==="★"?avgS!=null:x[0]==="Dist"?!!_hd:x[0]==="Gain"?routeAscentFt(route)!=null:x[0]==="Reports"?true:true);const val=(x[0]==="Grade"?gradeLabel(route):x[0]==="Approach"?_hd?uDist(_hd[1]):null:x[0]==="Height"?route.routeFt!=null?uElev(route.routeFt):null:x[0]==="★"?avgS?avgS.toFixed(1):null:x[0]==="Dist"?_hd?uDist(_hd[1]):null:x[0]==="Gain"?routeAscentFt(route)!=null?"↑"+uElev(routeAscentFt(route)):null:x[0]==="Reports"?activity.length:null);return <div key={x[0]} style={{padding:"7px 3px",textAlign:"center",borderRight:xi===cells.length-1?"none":`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:hasValue?x[3]:C.amber}}>{val==null||val===""?"—":val}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{x[4]||x[0]}</div></div>;})}</div>;})()}
    {/* The ‹ prev · Routes next door · next › strip under the header went (owner, 2026-10-21): NEXT DOOR (WallNeighbours, below BASE OF THE CLIMB) is the one place for the climbs either side on the wall. */}<div style={{position:"relative"}}><div ref={tabBarRef} style={{display:"flex",gap:5,background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 8px",overflowX:"auto",scrollPaddingInline:8,WebkitOverflowScrolling:"touch"}}>{[["overview","Overview"],["planner","Plan"],["forecast","Conditions"],["conditions",cragOnly?"Send Reports":"Reports"],["safety","Safety"],["partners","Partners"],["photos","Photos"]].filter(x=>x[0]==="planner"?showPlan:x[0]==="forecast"?(showScore||showAlpineCond):true).map(x=><button key={x[0]} onClick={e=>{setTab(x[0]);/* The six tabs are 399px of a bar that scrolls: 390px on a phone, 360 on a small one. Tapping Photos selected it and left its last 30px under the edge, so the tab you had just picked read "Pho". "nearest" moves the bar only as far as it must, and not at all when the tab is already in view; the page does not scroll. The bar's scrollPaddingInline keeps its 8px inset at whichever end the tab lands. */e.currentTarget.scrollIntoView({block:"nearest",inline:"nearest"});}} aria-current={tab===x[0]?"true":undefined} style={{flex:"1 0 auto",padding:"10px 8px",textAlign:"center",borderRadius:9,border:"1px solid "+(tab===x[0]?C.blue:C.border),background:tab===x[0]?C.blueBg:C.surface,color:tab===x[0]?"#fff":C.textSub,fontSize:11.5,fontWeight:tab===x[0]?"800":"600",cursor:"pointer",whiteSpace:"nowrap"}}>{x[1]}</button>)}</div>{[["l",-1,"‹","Scroll to earlier tabs"],["r",1,"›","Scroll to more tabs"]].filter(s=>tabEdge[s[0]]).map(s=><div key={s[0]} style={{position:"absolute",top:0,bottom:1,[s[0]==="l"?"left":"right"]:0,width:48,display:"flex",alignItems:"center",justifyContent:s[0]==="l"?"flex-start":"flex-end",padding:"0 4px",boxSizing:"border-box",background:"linear-gradient(to "+(s[0]==="l"?"left":"right")+",transparent,"+C.surface+" 58%)",pointerEvents:"none"}}><button onClick={()=>nudgeTabs(s[1])} aria-label={s[3]} title={s[3]} style={{pointerEvents:"auto",width:34,height:34,borderRadius:17,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:19,fontWeight:700,lineHeight:1,padding:0,paddingBottom:2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.35)"}}>{s[2]}</button></div>)}</div>
    <div ref={jumpsRef} style={{padding:"20px 14px 13px"}}><ApproachPicker route={route} opts={approachOpts} sel={approachKey} onSel={setApproachKey} sibs={_apSibs} sibsErr={approachSibsUnavailable} finishes={approachFinishes} showFinishes={tab==="overview"} onOpenRoute={onOpenRoute}/><SectionJumps rootRef={jumpsRef} tabKey={tab}/>
      {shareOpen?<RouteShareSheet _crumbs={_crumbs} _shareQ={_shareQ} blocked={blocked} connections={connections} mtn={mtn} notify={notify} onShareRoute={onShareRoute} route={route} setShareOpen={setShareOpen} setShareSearch={setShareSearch} shareLink={shareLink} shareRes={shareRes} shareSearch={shareSearch} who={who}/>:null}{drawOpen&&route?<DrawRouteView route={route} mtn={mtn} onClose={function(){setDrawOpen(false);}} onSuggest={function(p){setDrawOpen(false);setGpsInitPts(p);setShowGpsModal(true);}}/>:null}{showGpsModal&&route&&createPortal(<Suspense fallback={null}><GpsSubmissionModal initialPts={gpsInitPts} routeId={route.id} routeName={route.name} crag={cragOnly} parkAt={cragOnly?(()=>{const _t=trailheadPoint(route);return _t?{lat:Number(_t.lat),lng:Number(_t.lng)}:null;})():null} cragAt={cragOnly&&mtn&&mtn.lat!=null&&mtn.lng!=null&&mtn.lat!==""&&isFinite(Number(mtn.lat))&&isFinite(Number(mtn.lng))?{lat:Number(mtn.lat),lng:Number(mtn.lng)}:null} onClose={()=>{setShowGpsModal(false);setGpsInitPts(null);}} onSuccess={()=>{/* Deliberately does NOT close the modal. The modal sets showSuccess and calls onSuccess in the same tick, so unmounting here meant its success screen — quality score, review window, emailed-receipt line — could never paint. The user closes it with its own Done button, which calls onClose. */}} /></Suspense>,document.body)}{tab==="overview"?<RouteOverviewTab _mapOffline={_mapOffline} _peakGeo={_peakGeo} _rdCx={_rdCx} _routeMap={_routeMap} _tracksPanel={_tracksPanel} activity={activity} baseQ={baseQ} baseSpots={baseSpots} calcInputs={calcInputs} climateEl={climateEl} climberN={climberN} commentApi={commentApi} comments={comments} commentsUnavailable={commentsUnavailable} condPanels={condPanels} condTab={condTab} cragFactsEl={cragFactsEl} cragOnly={cragOnly} cragPanels={cragPanels} cragSibs={cragSibs} crewsForRoute={crewsForRoute} dbCrews={dbCrews} dbPhotos={dbPhotos} diffMeta={diffMeta} diffRatings={diffRatings} focusWaypoint={focusWaypoint} gearUpdateBox={gearUpdateBox} hzVoteFor={hzVoteFor} logRow={logRow} logged={logged} mapWrapRef={mapWrapRef} mtn={mtn} myItin={myItin} noWaypoints={noWaypoints} notify={notify} onAddPhotos={onAddPhotos} onOpenReport={onOpenReport} onOpenRoute={onOpenRoute} onRateDifficulty={onRateDifficulty} onSaveMyItin={onSaveMyItin} onShareItinToCrew={onShareItinToCrew} onViewProfile={onViewProfile} openFix={openFix} ovCC={ovCC} presence={presence} railEl={railEl} recentN={recentN} reportsPackedAt={reportsPackedAt} reportsSavedWith={reportsSavedWith} reportsUnavailable={reportsUnavailable} rkFlagged={rkFlagged} route={route} saved={saved} savedCountQ={savedCountQ} setCalcInputs={setCalcInputs} setFixFocusPitch={setFixFocusPitch} setFixOpen={setFixOpen} setFixOpenSection={setFixOpenSection} setFixPrefill={setFixPrefill} setShowGpsModal={setShowGpsModal} setSibsExpand={setSibsExpand} setTab={setTab} setTrackHistOpen={setTrackHistOpen} setTrackOpen={setTrackOpen} showPlan={showPlan} sibsExpand={sibsExpand} sibsPending={sibsPending} sibsUnavailable={sibsUnavailable} techStatsEl={techStatsEl} trackHistOpen={trackHistOpen} trackOpen={trackOpen} who={who}/>:null}
      {tab==="forecast"&&showAlpineCond?<div><AlpineConditionsCard route={route} mtn={mtn} calc={calcInputs} activity={condActivity} reportsUnavailable={reportsUnavailable}/>{condPanels?<div style={{marginTop:ROUTE_GAP}}>{condPanels}</div>:null}<div style={{marginTop:ROUTE_GAP}}>{wxEl()}</div><div style={{marginTop:(route.climate||gapSeason(route))?ROUTE_GAP:0}}>{climateEl}</div></div>:null}{tab==="forecast"&&showScore?<div><ConditionsScoreCard route={route} mtn={mtn} onAddAspect={()=>{openFix("aspect");}}/>{condPanels?<div style={{marginTop:ROUTE_GAP}}>{condPanels}</div>:null}<div style={{marginTop:ROUTE_GAP}}>{wxEl()}</div><div style={{marginTop:(route.climate||gapSeason(route))?ROUTE_GAP:0}}>{climateEl}</div>{/* ROAD CONDITIONS closes the Conditions tab (owner, 2026-10-07): the rock, then the weather, then the drive in. */}<div style={{marginTop:ROUTE_GAP}}>{roadEl()}</div></div>:null}
      {tab==="conditions"?<RouteReportsTab activity={activity} climberN={climberN} condActivity={condActivity} cragOnly={cragOnly} hzVotes={hzVotes} logged={logged} onLog={onLog} onOpenReport={onOpenReport} onVoteHazard={onVoteHazard} recentN={recentN} reportsPackedAt={reportsPackedAt} reportsSavedWith={reportsSavedWith} reportsUnavailable={reportsUnavailable} roadEl={roadEl} route={route} showScore={showScore} starSum={starSum} tripQ={tripQ}/>:null}
      {tab==="photos"?<RoutePhotosTab dbPhotos={dbPhotos} onAddTopo={onAddTopo} photosUnavailable={photosUnavailable} quickPhotos={quickPhotos} reportsUnavailable={reportsUnavailable} route={route} routePhotos={routePhotos} setPhotoLightbox={setPhotoLightbox} setQuickPhotoOpen={setQuickPhotoOpen} topoConsensus={topoConsensus}/>:null}
      {tab==="partners"?<RoutePartnersTab _listedHere={_listedHere} _raRes={_raRes} _rpObj={_rpObj} _rpRes={_rpRes} areaPartners={areaPartners} cragOnly={cragOnly} crewsExpand={crewsExpand} dbCrews={dbCrews} friendState={friendState} mtn={mtn} onConnect={onConnect} onFindPartners={onFindPartners} onFindPartnersInArea={onFindPartnersInArea} onListMe={onListMe} onPlan={onPlan} onRequestJoin={onRequestJoin} onViewProfile={onViewProfile} partners={partners} partnersExpand={partnersExpand} realPartners={realPartners} requested={requested} route={route} savedNote={savedNote} setCrewsExpand={setCrewsExpand} setPartnersExpand={setPartnersExpand} who={who}/>:null}
      {tab==="planner"?<>{<RoutePlanTab atTabTop={true} _mapOffline={_mapOffline} _routeMap={_routeMap} _tracksPanel={_tracksPanel} activity={activity} baseQ={baseQ} baseSpots={baseSpots} calcInputs={calcInputs} climateEl={climateEl} commentApi={commentApi} comments={comments} commentsUnavailable={commentsUnavailable} condPanels={condPanels} condTab={condTab} cragFactsEl={cragFactsEl} cragOnly={cragOnly} cragSibs={cragSibs} crewsForRoute={crewsForRoute} dbPhotos={dbPhotos} focusWaypoint={focusWaypoint} gearUpdateBox={gearUpdateBox} logged={logged} mapWrapRef={mapWrapRef} mtn={mtn} myItin={myItin} noWaypoints={noWaypoints} notify={notify} onAddPhotos={onAddPhotos} onOpenRoute={onOpenRoute} onSaveMyItin={onSaveMyItin} onShareItinToCrew={onShareItinToCrew} openFix={openFix} railEl={railEl} route={route} setCalcInputs={setCalcInputs} setFixFocusPitch={setFixFocusPitch} setFixPrefill={setFixPrefill} setShowGpsModal={setShowGpsModal} setTab={setTab} setTrackHistOpen={setTrackHistOpen} setTrackOpen={setTrackOpen} trackHistOpen={trackHistOpen} trackOpen={trackOpen} who={who}/>}{condTab?null:condPanels}</>:null}
      {tab==="safety"?<RouteSafetyTab activity={activity} fireEl={fireEl} hzVotes={hzVotes} mtn={mtn} onFloatPlan={onFloatPlan} onVoteHazard={onVoteHazard} openFix={openFix} route={route} safetyPanels={safetyPanels} setFixPrefill={setFixPrefill} wxEl={wxEl}/>:null}
      {/* "Got beta?" closes the tabs whose content IS route facts a climber can edit — Overview,
    Plan and Safety — as the last thing above Top contributors and the Discussion (owner,
    2026-10-22: "move this to the bottom of relevant tabs … we don't need that box on trip
    report tabs"). It sat mid-Overview at the end of the beta cluster before that. It stays off
    Reports (trip reports are the climber's own, and that tab has its own Log / report button),
    Conditions (a forecast — "Missing gear/rack, length" read as being about the weather, owner
    2026-10-07), Partners and Photos. Crag routes have no Plan tab, so theirs closes Overview and Safety. */}{(tab==="overview"||tab==="planner"||tab==="safety")?betaCta:null}{photoLightbox?<RoutePhotoLightbox blocked={blocked} canModeratePhotos={canModeratePhotos} commentApi={commentApi} comments={comments} connections={connections} mtn={mtn} onBlockClimber={onBlockClimber} onOpenReport={onOpenReport} onRemovePhoto={onRemovePhoto} onReportPhoto={onReportPhoto} onViewProfile={onViewProfile} photoLightbox={photoLightbox} photoLikes={photoLikes} photoRemoving={photoRemoving} photoReporting={photoReporting} route={route} setPhotoLightbox={setPhotoLightbox} setPhotoLikes={setPhotoLikes} setPhotoRemoving={setPhotoRemoving} setPhotoReporting={setPhotoReporting}/>:null}{quickPhotoOpen?createPortal(<div onClick={function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}} role="dialog" aria-modal="true" aria-label="Add a photo" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:410,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",border:"1px solid "+C.border,borderBottom:"none",padding:18,maxHeight:"88vh",overflowY:"auto",overscrollBehavior:"contain"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:16,fontWeight:700,color:C.text}}>Add a photo</div><button aria-label="Close photo picker" onClick={function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}} style={POP_CLOSE}>{"✕"}</button></div><div style={{fontSize:12,color:C.textMuted,marginBottom:12,lineHeight:1.5}}>Just the photo — no need to log a climb for this.{onAddPhotos?" It's shared with everyone who opens this route.":" You're signed out, so this stays on your device for this visit only — sign in to share a photo with other climbers."}</div><label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"22px 12px",borderRadius:11,border:"1px dashed "+C.border,background:C.surface,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:12}}>{<Lbl s={"📷 Choose from camera or library"}/>}<input type="file" accept="image/*" multiple className="cm-file-input" onChange={function(e){var files=Array.from(e.target.files||[]);/* keep the File beside its preview URL: a blob: URL is enough to SHOW a photo and useless for uploading one, and discarding the File here is why this sheet could only ever be local. */setQuickPhotoPick(files.map(function(f){return {url:URL.createObjectURL(f),file:f};}));}}/></label>{/* ONE box on this sheet: the picker. Each picked photo used to carry a second, "Describe this photo (optional)" text box under it, and the owner removed it as redundant (2026-10-24); what was picked shows as thumbnails, and the photo's alt falls back to its route like every route photo without one. */}{quickPhotoPick.length?<div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{quickPhotoPick.map(function(u,i){return <img key={i} loading="lazy" decoding="async" src={u.url} alt={"Selected photo "+(i+1)} style={{width:64,height:64,flexShrink:0,objectFit:"cover",borderRadius:8}}/>;})}</div>:null}{/* The confirm button exists ONLY once something has been picked. It used to render always, disabled, labelled "Choose photos to add" — a second button under the picker that instructed an action it could not perform, so the sheet read as two buttons with a broken one. Choosing is the label above; this is the confirm. */}{quickPhotoPick.length?<button disabled={photoBusy} onClick={function(){/* Two different promises, so two different code paths. With onAddPhotos the parent uploads and files a contributions row, and the photo comes BACK through the route's contributions — so it must NOT also be pushed into quickPhotos, or it renders twice. Without it we are signed out, the sheet has already said the photo stays on this device, and the local blob is all we can honestly offer. */if(onAddPhotos){setPhotoBusy(true);Promise.resolve(onAddPhotos(quickPhotoPick.map(function(u){return u.file;}),quickPhotoPick.map(function(u){return u.alt||"";}))).then(function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}).finally(function(){setPhotoBusy(false);});return;}setQuickPhotos(function(p){return p.concat(quickPhotoPick.map(function(u){return {url:u.url,alt:(u.alt||"").trim()||null,by:ME.name,avatar:ME.avatar,date:"just now"};}));});setQuickPhotoOpen(false);setQuickPhotoPick([]);}} style={{width:"100%",padding:12,background:photoBusy?C.surface:C.blueSolid,color:photoBusy?C.textMuted:C.onSolid,border:"none",borderRadius:11,fontSize:14.5,fontWeight:700,cursor:photoBusy?"default":"pointer"}}>{photoBusy?"Adding…":("Add "+quickPhotoPick.length+" photo"+(quickPhotoPick.length>1?"s":""))}</button>:null}</div></div>,document.body):null}{/* TOP CONTRIBUTORS used to render HERE, which put an area-level
      leaderboard at the foot of EVERY route sub-tab — including Partners, where it reads as
      "people to climb with", and above both the Emergency & rescue card and the Discussion,
      which ClimbMatch.jsx mounts AFTER this component. It now renders from there instead, as
      the last thing before each tab's Discussion, and only on the tabs where an area's
      contributors are relevant. Do not re-add it here: nothing in this file can sit below a
      sibling panel that is mounted outside it. */}

    </div>
  </div>;
}
/* THE SUSTAINED FIGURE ON THE WIND TILE IS THE 80 m WIND -- a ridge-level proxy -- while the
   only gust Open-Meteo publishes is a 10 m SURFACE figure. Gating the gust line on
   `gustMax > windMax` therefore compared two different HEIGHTS, and an 80 m sustained
   routinely exceeds a 10 m gust: measured against the live API over 168 hours, 51% of hours
   had the gust at or below the 80 m sustained and rendered NO gust line, against 8% on the
   honest same-height comparison. So the gust vanished on the windy days -- 2026-09-11 read a
   22 mph sustained with a 22 mph gust and showed nothing.
   Compare like with like: a gust is worth showing when it exceeds the SURFACE sustained.
   THE HEADLINE STAYS AT 80 m, and that is measured rather than assumed -- moving it to 10 m
   takes 2026-09-10 from AMBER to GREEN while a 29 mph gust stands, which is the #641
   under-warning direction on a safety panel.
   With no 10 m series at all (a partial response) it SHOWS the gust rather than hiding it:
   withholding a gust figure is the dangerous way for this to fail. */
/* A route with NO placed waypoints used to get "No forecast yet" here, which was most of the catalog.
   It now reads its area's own coordinate at the route's high point -- the point the Conditions tab's
   flags are read at (lib/AlpineConditionsCard.jsx forecastPoint) -- named as the area, not as a pin. */
/* The outside-forecast links under WEATHER & MOUNTAIN FORECASTS ("are the forecast links accurate to the
   actual location of the climb?", owner, 2026-10-24). Every link that can take a coordinate opens at the ONE
   point the in-app forecast above it reads -- the crag's own coordinate on a crag route (cragWxPointOf), the
   summit/top-out pin else the area at the high point (forecastPoint) -- the way Peakbagger and Mountain
   Project link a point forecast at the place itself. The NWS pair used to read the AREA coordinate while
   Mountain-Forecast read the summit pin, so two links on one card could open two places; and outside the
   US forecast.weather.gov answers with Environment Canada's HOME page, so a BC climb got a national page.
   A Canadian climb now gets Environment Canada's own point forecast (weather.gc.ca ?coords=), and the US-only
   sites (NWS, InciWeb) are not offered off US soil. OpenSnow is gone: it takes no coordinate in a URL, so
   its link could only ever open a search box. An unknown country keeps the US links, as before. */
function countryOf(route,mtn){const p=route&&route._dbArea&&route._dbArea.path;if(p)return String(p).split(".")[0];var a=mtn,g=0;while(a&&a.areaType!=="country"&&a.parentId&&g<12){const pid=a.parentId;a=MOUNTAINS.find(function(x){return x.id===pid;});g++;}return a&&a.areaType==="country"?a.id:null;}
/* InciWeb has no point URL, and its /state/<name> pages render empty; its incident table filters by state
   name (?field_state_target_id=Washington lists that state's active incidents), so a US climb opens its OWN
   state's fires rather than the national home page (owner note: links should open the page, not a search). */
function usStateNameOf(route,mtn){const p=route&&route._dbArea&&route._dbArea.path;if(p){const seg=String(p).split(".");return seg[0]==="usa"&&seg[1]?seg[1].split("_").map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(" "):null;}var a=mtn,g=0;while(a&&a.areaType!=="state"&&a.parentId&&g<12){const pid=a.parentId;a=MOUNTAINS.find(function(x){return x.id===pid;});g++;}return a&&a.areaType==="state"?a.name:null;}
function forecastLinksOf(route,mtn,crag){const pt=crag?cragWxPointOf(route,mtn):forecastPoint(route,mtn);const cc=countryOf(route,mtn),us=cc==null||cc==="usa",ca=cc==="canada";const la=pt?(+pt.lat).toFixed(4):null,lo=pt?(+pt.lng).toFixed(4):null;
  const out=[];
  if(pt&&us){out.push({n:"NWS point forecast",u:"https://forecast.weather.gov/MapClick.php?lat="+la+"&lon="+lo});out.push({n:"NWS hourly graph",u:"https://forecast.weather.gov/MapClick.php?lat="+la+"&lon="+lo+"&FcstType=graphical"});}
  if(pt&&ca)out.push({n:"Environment Canada forecast",u:"https://weather.gc.ca/en/location/index.html?coords="+(+pt.lat).toFixed(3)+","+(+pt.lng).toFixed(3)});
  out.push({n:"Mountain-Forecast.com",u:pt?"https://www.mountain-forecast.com/location_search?lat="+la+"&lon="+lo:"https://www.mountain-forecast.com/"});
  out.push({n:"Fire & smoke — AirNow",u:pt?"https://fire.airnow.gov/#9/"+la+"/"+lo:"https://fire.airnow.gov/"});
  if(us){const stn=usStateNameOf(route,mtn);out.push({n:"Active fires — InciWeb",u:stn?"https://inciweb.wildfire.gov/accessible-view?field_state_target_id="+encodeURIComponent(stn):"https://inciweb.wildfire.gov/"});}
  if(mtn.avyZone)out.push({n:"Avalanche forecast ("+mtn.avyZone+")",u:avyCenterFor(mtn)[2]});
  return out;}
function wxFallbackOf(route,mtn){const pt=forecastPoint(route,mtn);if(!pt||pt.pinned)return null;const a=route._dbArea||mtn||{};return {type:a.areaType==="peak"?"Summit":"Topout",name:pt.name,lat:pt.lat,lng:pt.lng,elev:pt.elevFt};}
/* A CRAG route (sport, trad, top-rope, bouldering) has no trailhead-to-summit line to forecast along,
   so it gets ONE point: the crag's own coordinate, the one its CONDITIONS SCORE card reads (owner,
   2026-10-14: "forecast at crag"). Its pins are not consulted -- a parking pin is not where you climb. */
function cragWxPointOf(route,mtn){const a=route._dbArea||mtn||{};const num=function(v){return v!=null&&v!==""&&isFinite(+v)?+v:null;};const lat=num(mtn&&mtn.lat)!=null?num(mtn.lat):num(a.lat),lng=num(mtn&&mtn.lng)!=null?num(mtn.lng):num(a.lng);if(lat==null||lng==null)return null;const el=num(a.elevation)!=null?num(a.elevation):num(mtn&&mtn.elevation);return {type:"Crag",name:a.name||(mtn&&mtn.name)||"The crag",lat:lat,lng:lng,elev:el};}
export default RouteDetail;
