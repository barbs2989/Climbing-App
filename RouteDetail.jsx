// The route-detail screen and every helper used only by it — split out of
// ClimbMatchCore.jsx so this ~290KB of source loads as its own lazy chunk the
// first time a route is opened, not at startup. Mechanically extracted (the
// dependency closure of RouteDetail minus everything reachable from any other
// export); shared helpers stay in core and are imported below.
import { tripRowToActivity, anonRowToActivity } from "./lib/tripReportRow.js";
import { useState, useEffect, useRef, useMemo, useCallback, useContext, Suspense, lazy} from "react";
import { ConfidenceCtx, ConfChip, ConfidenceLegend } from "./lib/confidence.jsx";
import { ROAD_KEYS, ACCESS_KEYS, TIMING_KEYS, CROWDS_KEYS, PARTNER_KEYS, SEASONAL_KEYS, EMERGENCY_KEYS, LOGISTICS_KEYS, CLIMATE_KEYS, SEASHAZ_KEYS, MONTH_NAMES, cleanMonths } from "./lib/objKeys.js";
import { createPortal } from "react-dom";
import { DISC_LABELS as DL } from "./lib/discLabels";
/* rackFromText / _rackEdited / contribRack / routeRackFor / DISC_RACK moved to lib/rack.js so
   the crew card can answer the same question without core importing this lazy-loaded file.
   Moved verbatim; the correction-precedence rule and its history live beside them there. */
import { _rackEdited, _ropeEdited, fmtRopeLen, contribRack, routeRackFor, DISC_RACK, rackRows, rackQty, rackItemLine, rackItemKind, isRackItem } from "./lib/rack";
import { ropeworkFacts } from "./lib/ropework";
import { waypointCaveat, trackCoverage, trackCoverageCaveat, trackStubCaveat, withRecordedTrackOnly } from "./lib/track";
import { accessCheckedLine } from "./lib/road";
import { navTarget, navLinks } from "./lib/navLinks";
import { USE_DB} from "./lib/supabase";
import {recordRouteView,useAreaPath,useRouteStarSummary,usePartnersByObjective,usePartnersInArea,useMatchObjectivesOfUsers,checkInAtRouteBase, withdrawBaseCheckin, useRouteBaseCheckins, dbRouteToCamel, useAreaRoutes, useProfilesByIds, useRoutesByIds, useRouteTopos, topoPhotoUrl, uploadTopoPhoto, updateTopoAlt, updateTopoCaption, submitTopoLine, updateTopoLine, deleteTopoLine, deleteTopoPhoto, useObjectiveCounts, useProfileSearch, useRouteTripReports, useRoutePrivateConditions,    useMyContributionStanding, useRouteTracks, useRouteStats} from "./lib/db";
import RouteTracksPanel from "./lib/RouteTracksPanel.jsx";
import { TRACK_COLORS, trackPoints, trackStats } from "./lib/routeTracks.js";
import FireNearRoute from "./lib/FireNearRoute";
import ShadeMap from "./lib/ShadeMap";
import { savedAgo } from "./lib/offline";
import { nwsHeightShiftF, fetchForecastRaw, fetchCragForecastMeasured, fetchCragAir, fetchCragClimate, fetchAlpineSpread } from "./lib/forecast";
import { scoreForecast, starsLabel, WEIGHTS, FACTOR_LABEL, CRAG_SCORE_DISCIPLINES, OPEN_DAY, aqiCategory, clockAt } from "./lib/conditionsScore";
import { useCondPrefs, scorePrefs, CondPrefsControls } from "./lib/CondPrefs.jsx";
import { routeRock, ROCK_OPTIONS } from "./lib/rockType";
import { EditIconButton as AreaEditIconButton, editBtnStyle, EditPencil } from "./lib/areaChrome";
import { useSession } from "./src/AuthContext.tsx";
import { ContributionStandingNotice } from "./lib/SafetyNotices.jsx";
import { openAppeal } from "./lib/reportBus.js";


import { clickable } from "./lib/clickable";
import { PeakMetadataPanel, splitParagraphs, monthRank } from "./EnrichmentPanels";

import { gradeDetail, cruxGrade, displayGrade, singleGrade, gradeRangeNote } from "./lib/grade";
import { routeTerrain, saysNotApplicable } from "./lib/terrain";
import { knownHazards } from "./lib/hazards";
import { acquireBaseFix, baseCheckinMessage, baseGuide, pendingBaseCheckins, savePendingBaseCheckins, distM, BASE_CONFIRM_MIN, bearingDeg, headingFromOrientation, relativeBearing, turnWord, smoothHeading } from "./lib/baseCheckin";
import { declinationDeg } from "./lib/declination";
import { planTimes, realPitches } from "./lib/planTimes";
import AlpineConditionsCard, { forecastPoint } from "./lib/AlpineConditionsCard.jsx";
import { ALPINE_COND_DISCIPLINES, modelSpread } from "./lib/alpineConditions.js";
import { clockHr, spanEnding, compass } from "./lib/HourTiles.jsx";
import { usableFa } from "./lib/fa";
import {routeLink,realProfileId,CRAG_CATS,parseGpxText,SUB_LABEL,shareOrCopy,printSheet,itinShareText,itinSheetHtml,climbsAPeak,photoAlt,wpType,wpIs,wpPlaced,trailheadPoint,uImp,_uNum,catOf,DISC_GEAR,C,CAT,ME,routeAscentFt,gainBelowOwnPins,uElev,uDist,uDistMi,CLIMBERS,ago,scarfHrs,techHrs,pitchedFraction,loggedTimeStats,fmtDurMin,gn,seedAuthor,isRoadTag,buildConsensus,SZ3,MONTHS,MOUNTAINS,enrichRoute,onImgErr,FALLBACK_COVER,getAvailableItineraries,itinDaysToDraft,blankItinDay,itinDraftToStructured,uMass,RSL as SL,ROUTE_GAP,DLOCALE,shortDate,MAX_WAYPOINTS,MAX_BIVY,ADDR_GRADES,ADDR_HAZ,ADDR_STYLE,ADDR_YDS,ADDR_AIDS,intOnly,WP_SINGLE_TYPES,WP_TYPES,wpColor,wpGlyph,mtnOf,ALL_CLIMBERS,ROUTES,isHazardTag,gradeLabel,protOf,OPEN_CREWS,FALLBACK_AV,isRecent,RECENT_DAYS,rxOf,condRep,uTemp,uTempN,uTempDelta,uTempU,uWind,uWindN,uPrecip,uSnowfall,renderMD,compat,pubName,uRate,gpxDownload,missingFacts,shapeOf,gainCoversWholeOuting,itinDraftVal,itinStoreVal,uElevUnit,uDistMiUnit,uLenUnit,uLenN,uLenIn,rappelReportsOf,sunReadout,realAuthor,useRealAuthors} from "./ClimbMatchCore.jsx";
import CardHead from "./src/components/CardHead.tsx";
import ShareVia from "./src/components/ShareVia.tsx";
import Hr from "./src/components/Hr.tsx";
import Stars from "./src/components/Stars.tsx";
import Bar from "./src/components/Bar.tsx";
import RouteMapProfile from "./src/components/RouteMapProfile.tsx";
import { SaveMapOffline } from "./lib/SaveMapOffline.jsx";
import Av from "./src/components/Av.tsx";
import DiscIcon from "./src/components/DiscIcon.tsx";
import ActionIcon from "./src/components/ActionIcon.tsx";
import Chevron from "./src/components/Chevron.tsx";
import Pill from "./src/components/Pill.tsx";
import CountUp from "./src/components/CountUp.tsx";
import Lbl from "./src/components/Lbl.tsx";
import SectionJumps from "./src/components/SectionJumps.tsx";
import { useWideScreen, useFullWidth } from "./lib/wideLayout.js";
import { routeSheetHtml } from "./lib/routeSheet.js";
import DrawRouteView from "./lib/DrawRoute.jsx";
import ReportStats from "./src/components/ReportStats.tsx";
import ItineraryEditor from "./src/components/ItineraryEditor.tsx";
import RealClimberRow from "./src/components/RealClimberRow.tsx";
import RouteStats from "./lib/RouteStats.jsx";
import { recShapeOf, effDistIsWholeTrip, effDistKm, isMultiDayOuting, itinDayCount } from "./lib/outing.js";
import { approachOptions, defaultApproachKey, viaRouteOf, applyApproach, tripTrailheadDraft, tripTrailheadMerge, viaPitchSpans, spanLabel } from "./lib/approaches.js";
import { POP_CLOSE, POP_BACK_MEDIA, POP_REMOVE } from "./lib/popupChrome.js";
import { BTN, BTN_SM,  CHIP } from "./lib/buttonStyles.js";
import { askConfirm } from "./lib/ConfirmSheet.jsx";
import WaypointMapPicker from "./src/components/WaypointMapPicker.tsx";
import Comments from "./src/components/Comments.tsx";
import { photoThumb} from "./lib/photoThumb";
import { HINTS } from "./lib/fieldHints.js";
import LoadingRows from "./src/components/LoadingRows.tsx";
import EmptyState from "./src/components/EmptyState.tsx";
import GradeTag from "./src/components/GradeTag.tsx";
import PinNum from "./src/components/PinNum.tsx";
import TopoSwatch from "./src/components/TopoSwatch.tsx";
import MediaImg from "./src/components/MediaImg.tsx";
import CragWalkIn from "./src/components/CragWalkIn.tsx";
import SaveOfflineChip from "./src/components/SaveOfflineChip.tsx";
import TopoCaptionBox from "./src/components/TopoCaptionBox.tsx";
import BetaDiff from "./src/components/BetaDiff.tsx";
import CRow from "./src/components/CRow.tsx";
import GapNote from "./src/components/GapNote.tsx";
import VerifNote from "./src/components/VerifNote.tsx";
import RouteTagRow from "./src/components/RouteTagRow.tsx";
import CragSafetyNotes from "./src/components/CragSafetyNotes.tsx";
import PitchConsensus from "./src/components/PitchConsensus.tsx";
import FloatPlanFold from "./src/components/FloatPlanFold.tsx";
import ClimateSeasonCard from "./src/components/ClimateSeasonCard.tsx";
import PhotoRow from "./src/components/PhotoRow.tsx";
import EditIconButton from "./src/components/EditIconButton.tsx";
import PinIcon from "./src/components/PinIcon.tsx";
import TopoPinLegend from "./src/components/TopoPinLegend.tsx";
import TopoLineOverlay from "./src/components/TopoLineOverlay.tsx";
import TopoThumb from "./src/components/TopoThumb.tsx";
import EmptySection from "./src/components/EmptySection.tsx";
import PitchPhotos from "./src/components/PitchPhotos.tsx";
import TopoPhotoModal from "./src/components/TopoPhotoModal.tsx";
import AccessFold from "./src/components/AccessFold.tsx";
import CragRack from "./src/components/CragRack.tsx";
import CragLocationCard from "./src/components/CragLocationCard.tsx";
import PairsWellWith from "./src/components/PairsWellWith.tsx";
import WeatherIcon from "./src/components/WeatherIcon.tsx";
import BreakdownHandoff from "./src/components/BreakdownHandoff.tsx";
import CragFactRows from "./src/components/CragFactRows.tsx";
import CragFactSection from "./src/components/CragFactSection.tsx";
import WallNeighbours from "./src/components/WallNeighbours.tsx";
import BoulderNeighbours from "./src/components/BoulderNeighbours.tsx";
import RoadReports from "./src/components/RoadReports.tsx";
import SummitLegsCard from "./src/components/SummitLegsCard.tsx";
import DescentLegStrip from "./src/components/DescentLegStrip.tsx";
import TripProfileCard from "./src/components/TripProfileCard.tsx";
import { TOPO_RED, TOPO_VAR, PIN_CATEGORIES, pinColor, pinLabel, useImgAspect, TOPO_IMG, pinNums, LOUPE_Z, TAP_SLOP, ZOOM_MAX, clampTopoView, zoomTopoView } from "./lib/topoMarks.jsx";
import { isPitched, breakdownRows } from "./lib/breakdownRows.js";
import { EMPTY_ARR } from "./lib/emptyArr.js";
import { FACT_FIELD } from "./lib/cragFactField.js";
import { ROAD_TONE, roadReportsOf } from "./lib/roadReports.js";
import { uLen } from "./lib/uLen.js";
import ClimbingRouteTable from "./src/components/ClimbingRouteTable.tsx";
import Capped from "./src/components/Capped.tsx";
import GradePicker from "./src/components/GradePicker.tsx";
import RappelTable from "./src/components/RappelTable.tsx";
import PitchComments from "./src/components/PitchComments.tsx";
import WaypointList from "./src/components/WaypointList.tsx";
import { fmtSlingVal } from "./lib/slingFormat.js";
import RouteGearCheck from "./src/components/RouteGearCheck.tsx";
import DiffRadar from "./src/components/DiffRadar.tsx";
import TrailheadCard from "./src/components/TrailheadCard.tsx";
import ApproachPicker from "./src/components/ApproachPicker.tsx";
import { wxTempColor, wxWindColor, skyWord } from "./lib/wxColors.js";
import { condRow, condNote } from "./lib/condRows.jsx";
import HourlyChart from "./src/components/HourlyChart.tsx";
import SeasonChart from "./src/components/SeasonChart.tsx";
import { samePlaceCamp, campNightsOf, campNightsLabel, campWalkHrs, campSites, campRouteOrder, campOrderNote, campRoleLabel, campFromPrev, campFromTrailhead, campDetail, campReportsOf, campSleptLine } from "./lib/camps.js";
import CampingPanel from "./src/components/CampingPanel.tsx";
import { APPROACH_CROSSING_RE, APPROACH_LOG_CROSSING_RE, approachHasCrossing, primaryApproachIndex, longFormApproachIndex } from "./lib/approachIndex.js";
import ApproachVariants from "./src/components/ApproachVariants.tsx";
export { ApproachVariants };
export { APPROACH_CROSSING_RE, APPROACH_LOG_CROSSING_RE, approachHasCrossing, primaryApproachIndex, longFormApproachIndex };
export { samePlaceCamp, campNightsOf, campNightsLabel, campWalkHrs, campSites, campRouteOrder, campOrderNote, campRoleLabel, campFromPrev, campFromTrailhead, campDetail, campReportsOf, campSleptLine };
export { PitchComments };
export { ClimbingRouteTable };
export { overnightPermitOf } from "./lib/overnightPermit.js";
const GpsSubmissionModal = lazy(() => import("./lib/GpsSubmissionModal"));
const uGain=m=>uImp()?Math.round(m*3.28084).toLocaleString()+" ft":Math.round(m).toLocaleString()+" m";

/* The stored vocabulary is exactly three codes — measured against the live catalog, where
   outing_shape is populated on 172 routes and holds only outback (141), loop (20), point (11).
   These labels are the ones the planner already uses in prose a few hundred lines down
   ("retracing its approach" / "loops back to the trailhead by a different line" / "finishes at
   a different trailhead"), so the contribute form names each shape the same way the screen
   explains it. A code with no entry falls through to "—" rather than rendering the raw token. */
const SHAPE_LABEL={outback:"Out and back",loop:"Loop",point:"Point to point"};
/* MOVED TO lib/outing.js, unchanged, so the peak page's ACROSS EVERY ROUTE HERE panel can ask the
   same question this page does. It read `dist_km` raw and therefore showed a different approach
   distance for the same climb — on 128 of the 198 WA peak pages, usually by a factor of two. */
/* HOW MANY ROPED PITCHES the route has, by the larger of what it STATES (`pitches`) and what it DESCRIBES
   (the roped rows of pitchDetail). A gate that asks "is this multi-pitch?" reads this, not `pitches` alone:
   a route stored with 0 or 1 that a climber then describes pitch by pitch is multi-pitch from that moment,
   and a contributed pitch count reaches `pitches` through routeEdits, so either way the multi-pitch
   sections (ROUTE BREAKDOWN, RAPPELS) appear as soon as the route gains a second pitch. */
function pitchCountOf(r){if(!r)return 0;var n=+r.pitches>0?+r.pitches:0;var d=(Array.isArray(r.pitchDetail)&&r.pitchDetail.length)?breakdownRows(r).pitchCount:0;return Math.max(n,d);}
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
// The paragraph this replaces still described the two boxes and named `splitPitchDetail`, a
// function the merge removed — so it sent a reader looking for a structure that no longer
// exists. `check:pitch-split` pins both directions of the surviving rule.
function pitchShortfall(route,shown){const described=(route&&Array.isArray(route.pitchDetail))?route.pitchDetail.length:0;return !!(route&&route.pitches>described&&route.pitches>shown);}
const ENV_HAZ_RE=/raptor|nesting closure|nesting season|bear activity|black bear|grizzly|mountain goat|rattlesnake|tick season|poison oak|poison ivy|wasp nest|hornet|hunting season|elk rut/i;
const TYPICAL={
olympus_wf:{summary:"A 1,600-ft quartzite slab above Salt Lake — easy (around 5.4) but sustained and exposed, and often soloed. The crux is heat, dry rock, and a loose descent gully, not the climbing.",patterns:[{label:"Best window",when:"late spring to fall",detail:"Best once the slab and the approach couloir melt out and dry; spring and fall climb coolest."},{label:"Dry rock",detail:"The slab is pure friction — wet or icy rock turns an easy scramble serious. Wait for it to dry."},{label:"Early-season snow",when:"spring",detail:"Snow lingers in the shaded approach couloir into early summer, with weak snow bridges and old avalanche debris off the face above."},{label:"Afternoon sun bakes it",when:"summer",detail:"The west-facing slab bakes in the afternoon — start at dawn and carry plenty of water."},{label:"Loose descent gully",detail:"The descent couloir is loose, sandy 4th-class with rappel anchors; slow down and avoid knocking rock onto parties below."}]},
angels_chains:{summary:"The chain-assisted spine to Angels Landing — a Class 3+ scramble on Navajo sandstone with enormous drop-offs. A timed-entry permit is required, and heat, ice, and crowds are the real hazards.",patterns:[{label:"Permit required",detail:"The chains section runs on a seasonal lottery — you need a timed-entry permit before you go."},{label:"Best window",when:"spring & fall",detail:"Spring and fall are ideal; midsummer is dangerously hot with almost no shade."},{label:"Heat & sun",when:"summer",detail:"The spine is fully exposed and bakes past 100°F in summer — start at dawn, carry water, and watch for heat illness."},{label:"Ice makes it deadly",when:"winter",detail:"When the sandstone or chains are wet, icy, or sandy the exposed scramble becomes very dangerous — skip it in those conditions."},{label:"Crowds & bottlenecks",detail:"The single chain line sees two-way traffic and bottlenecks; go early and be patient on the exposed sections."}]},
octopussy:{summary:"One of America's most famous hard mixed routes — steep drytooling out to a free-hanging ice dagger. It forms in winter and the dagger and ice quality vary a lot year to year.",patterns:[{label:"In condition",when:"deep winter",detail:"The hanging dagger and ice need sustained cold to form and touch down; early and late season they are thin, detached, or absent."},{label:"Sun and warmth degrade it",detail:"Warm spells and sun make the dagger and curtain brittle and prone to shedding — climb cold."},{label:"Falling ice",detail:"The free-hanging dagger and the leader's tools shed ice into the cave; the belayer and any parties below are exposed."},{label:"Conditions vary",detail:"The drytool holds are well-traveled but the ice changes daily — check very recent reports before committing."}]},
washington_column_sf:{summary:"A classic beginner big wall — mostly C1 aid with moderate free climbing, often done over a day-plus with a bivy on Dinner Ledge. Heat and sun on the wall are the limiting factors.",patterns:[{label:"Best window",when:"spring & fall",detail:"Spring and fall are prime; midsummer bakes in the sun and winter is cold and often wet."},{label:"Afternoon sun",detail:"The face catches strong afternoon sun and gets hot — carry plenty of water and time pitches for shade where you can."},{label:"Fixed gear varies",detail:"Fixed pieces and anchors are popular but age and shift — back them up and bring a full rack."},{label:"Seeps after rain",detail:"Cracks and the roof can seep and stay wet for a day or two after rain or snowmelt."}]},
kings_hf:{summary:"Utah's highpoint by the Henry's Fork trail: a long, non-technical high-altitude trek that finishes with off-trail boulder-hopping on the summit ridge. The crux here is weather and distance, not climbing.",patterns:[{label:"Best window",when:"mid-Jul to early Sep",detail:"Snow is usually off the route by mid-July; outside this window expect lingering snow, postholing, and a snowed-up summit ridge."},{label:"Afternoon thunderstorms",when:"Jun to Sep",detail:"Storms build over the High Uintas most summer afternoons, often with little warning. Summit early and aim to be off the exposed ridge by late morning."},{label:"Early-season snow",when:"May to Jul",detail:"Snowfields linger on the Gunsight to Anderson Pass shortcut and upper basin into early July, with muddy trail lower down."},{label:"Water",detail:"Reliable at Dollar Lake and along Henry's Fork, but the upper basin and summit push are dry: carry enough for the ridge."},{label:"Trailhead road",detail:"The Henry's Fork dirt road is fine for 2WD when snow-free, but turns slick and impassable when wet or snowy."},{label:"Mosquitoes",when:"Jul to Aug",detail:"Thick in the basin in mid-summer: bring repellent."},{label:"Snow stability & freeze",when:"early/late season",detail:"When snow lingers, the snowpack needs a good overnight freeze — soft or isothermal snow, recent avalanche activity, and forming moats are signs to back off."}]},
bridalveil_falls:{summary:"A serious multi-pitch waterfall-ice testpiece. Fat years climb around WI5+, lean years stiffen to overhanging WI6. Short approach, but a big committing line with lots of overhead ice.",patterns:[{label:"In condition",when:"Dec to Feb",detail:"Forms in early winter and is best in the cold heart of the season; thin or unformed in early December and late season."},{label:"Shaded and cold",when:"winter",detail:"It sits on the shaded south wall where sun barely touches it all winter, which keeps the ice solid. Cold temps mean better-bonded ice."},{label:"Hanging ice and daggers",detail:"Car-sized icicles and mushrooms hang off the route. Falling ice is a real hazard, worse during warm spells or any afternoon sun."},{label:"Lean vs fat",detail:"Conditions swing year to year: lean is harder, overhanging and less protectable; fat is lower-angle with better screws."},{label:"Access",detail:"Short paved-then-dirt approach, crowded on weekends. On private land with a history of closures: check current access before you go."}]},
_lcc:{summary:"White quartz-monzonite (Wasatch granite): technical, friction-dependent climbing right outside Salt Lake. Conditions live and die by temperature and how dry the rock is.",patterns:[{label:"Best window",when:"Apr to Oct, fall best",detail:"Spring through fall, with fall usually the prime window for friction and temps."},{label:"Friction is temperature-dependent",detail:"Granite climbs far better cool. Hot rock means greasy holds and blown feet; pick cooler days or shade for hard friction."},{label:"Seeps after rain",detail:"The rock stays damp and seeps for a day or so after rain or snowmelt: give it time to dry before friction climbing."},{label:"Afternoon sun bakes it",when:"summer",detail:"South-facing walls get very hot and bright (over 100°F on summer afternoons, no shade). Start early or pick north-facing options, and don't get pinned mid-route midday."},{label:"Winter road closures",when:"Nov to Mar",detail:"After storms the canyon road closes for avalanche control; rock is out, but ice comes in from late December to early March."},{label:"Approach",detail:"Short approaches. Some crags cross private and LDS Church land: be respectful of access."}]},
_rock:{summary:"Friction-dependent rock climbing where temperature and dryness set the conditions.",patterns:[{label:"Friction is temperature-dependent",detail:"Cooler, dry days climb far better than hot ones, when holds turn greasy."},{label:"Seeps after rain",detail:"Expect damp rock and seepage for a day or more after rain or snowmelt."},{label:"Sun and aspect",detail:"South-facing walls bake in the sun most of the day and west-facing walls cook in the afternoon; shaded or north-facing lines stay far cooler. Match the wall to the day."}]},
_ice:{summary:"Waterfall ice that depends on a sustained cold spell to form and stay bonded.",patterns:[{label:"In condition",when:"deep winter",detail:"Needs cold to form and is best in the heart of winter; thin or hollow early and late season."},{label:"Sun degrades it",detail:"Afternoon sun and warm spells make ice brittle, wet, and prone to shedding. Climb in the cold and shade, ideally early."},{label:"Falling ice",detail:"Overhead icicles and the leader's tools shed ice: a real hazard for anyone below."},{label:"Lean vs fat",detail:"Difficulty and protection swing year to year with how fat it comes in."}]},
_alpine:{summary:"A snow and glacier objective where the season, the overnight freeze, and time of day decide whether it is safe.",patterns:[{label:"Season sets the picture",detail:"Early season means more snow cover and avalanche concern; late season melts out, opening crevasses, moats, and loose rock."},{label:"Start early for the freeze",detail:"A good overnight freeze firms snow and locks rock and ice in place. As the day warms, expect softening snow, rockfall, and icefall: be high early and moving."},{label:"Afternoon storms",when:"summer",detail:"Thunderstorms commonly build over high terrain in the afternoon: plan to be off exposed ground by midday."},{label:"Glacier hazards",when:"mid to late season",detail:"Crevasses open and snow bridges thin as the season goes; the bergschrund can become hard to cross."}]},
_scrambling:{summary:"Non-roped scrambling where dry rock and a snow-free route make the difference.",patterns:[{label:"Best window",when:"summer to fall",detail:"Best once the route melts out; shaded and north aspects hold snow and ice well into early summer."},{label:"Dry rock",detail:"Wet or icy rock makes exposed moves dangerous: wait for it to dry."},{label:"Afternoon storms",when:"summer",detail:"Build over high terrain most afternoons: start early."}]},
_hiking:{summary:"A trail objective where snow cover, water, and afternoon weather shape the day.",patterns:[{label:"Snow-free window",detail:"Best once the trail melts out; outside that window expect snow, postholing, and slick footing."},{label:"Afternoon storms",when:"summer",detail:"Common over high or exposed terrain in the afternoon: get an early start."},{label:"Water and access",detail:"Water sources are often seasonal, and trailhead roads can be gated or snowbound outside the main season."}]},
_mixed:{summary:"Mixed ice-and-rock climbing that depends on a cold spell and how the ice has formed.",patterns:[{label:"In condition",when:"winter",detail:"Needs cold for the ice; rock sections go in any temp but the ice dictates safety."},{label:"Sun and warmth degrade it",detail:"Warm spells and afternoon sun loosen ice and raise the falling-ice hazard."},{label:"Conditions vary",detail:"Ice thickness and protection swing year to year and through the season."}]},
_aid:{summary:"A big-wall objective where heat and sun exposure are the limiting factors.",patterns:[{label:"Best window",when:"spring and fall",detail:"Summer can be brutally hot in the sun; spring and fall, or shaded aspects, are far more comfortable."},{label:"Afternoon sun",detail:"Sun-baked walls sap energy and water: track the shade and carry plenty."},{label:"Fixed gear varies",detail:"Fixed pieces and anchors age: expect to back them up and bring a full rack."}]}
};
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
/* hasSafetyContent() lived here and gated the Safety tab the way hasPlanContent once gated Plan. It
   was removed when the Safety tab became unconditional: unlike Plan, that tab is never empty — the
   per-discipline advice, the forecast links and the nearby-fire panel all render without the route
   carrying a single safety field of its own. The predicate was `objHaz || watchOut || comms || bail ||
   waypoints`, if it is ever needed again. */
function routeHasGlacierTravel(route){if(!route)return false;const hay=[(route.hazards||[]).join(" "),route.approach,route.descent,route.descentText,route.overview,route.desc].filter(Boolean).join(" ").toLowerCase();return /glacier|crevasse|bergschrund|icefall|serac/.test(hay);}
function typicalFor(route){if(!route)return null;if(TYPICAL[route.id])return TYPICAL[route.id];if((route.id||"").indexOf("lcc_")===0)return TYPICAL._lcc;const c=catOf(route);const cat=(c==="sport"||c==="trad"||c==="toprope")?"rock":(c==="alpine"||c==="mountaineering")?"alpine":c;if(!c)return null;const tp=TYPICAL["_"+cat]||TYPICAL._rock;if(cat==="alpine"&&tp===TYPICAL._alpine&&!routeHasGlacierTravel(route)){return {...tp,summary:"An alpine objective on snow and rock where the season, the overnight freeze, and time of day decide whether it is safe.",patterns:tp.patterns.filter(p=>p.label!=="Glacier hazards").map(p=>p.label==="Season sets the picture"?{...p,detail:"Early season means more snow cover and avalanche concern; late season melts out, exposing loose rock and reducing snow travel options."}:p)};}return tp;}
const PATTERN_CHECKS={
"Snow stability & freeze":{match:["No freeze (soft)","Isothermal","Wet/slushy","Recent avalanche","Avy: Considerable","Avy: High","Avy: Extreme","Moats forming","Postholing"],counter:["Good overnight freeze","Refreezing","Firm/névé"]},
"Heat & sun":{match:["Sunny/baking","Too hot","Hot/exposed","Too warm"],counter:["Shady/cool","In the shade"]},
"Ice makes it deadly":{match:["Icy patches","Wet rock","Verglas","Snow on route"],counter:["Dry","Solid"]},
"Early-season snow":{match:["Snow on route","Postholing","Approach snowy","Snow-covered","Patchy snow"],counter:["Snow-free","Bare/melted out","Melted out"]},
"Snow-free window":{match:["None"],counter:["Continuous","Postholing","Patchy"]},
"Afternoon sun bakes it":{match:["Sunny/baking","Too hot","Sun-affected"],counter:["Shady/cool","In the shade"]},
"Sun and aspect":{match:["Sunny/baking","Too hot"],counter:["Shady/cool"]},
"Afternoon sun":{match:["Hot/exposed","Sunny/baking"],counter:["Shady"]},
"Seeps after rain":{match:["Wet","Seeping","Damp","Greasy/humid","Running water/wet","Wet rock"],counter:[]},
"Dry rock":{match:["Dry","Snow-free","Solid"],counter:["Wet rock","Snow on route","Icy patches"]},
"Trailhead road":{match:["Road/trailhead open"],counter:["Road/trailhead closed","Road/trailhead gated","4WD/snow to trailhead"]},
"Approach":{match:["Approach dry","Road/trailhead open","Trail snow-free"],counter:["Approach muddy","Approach snowy","Road/trailhead closed","Trail snowy"]},
"Water":{match:["Running water available"],counter:["Dry — carry water","Snowmelt only"]},
"Water and access":{match:["Road/trailhead closed","Road/trailhead gated"],counter:["Road/trailhead open"]},
"In condition":{match:["Fat/fully formed","Touching down","Plastic/good","Takes screws well","Well-bonded"],counter:["Not in","Thin","Forming","Detached/dangerous","Chandeliered","Brittle"]},
"Shaded and cold":{match:["In the shade","Good freeze"],counter:["Sun-affected","Warming/melting"]},
"Hanging ice and daggers":{match:["Icefall / falling ice"],counter:[]},
"Falling ice":{match:["Icefall / falling ice"],counter:[]},
"Sun degrades it":{match:["Sun-affected","Warming/melting","Brittle"],counter:["In the shade","Good freeze"]},
"Sun and warmth degrade it":{match:["Sun-affected","Warming/melting","Warming"],counter:["Good freeze","In the shade"]},
"Start early for the freeze":{match:["Good overnight freeze","Refreezing","Firm/névé"],counter:["No freeze (soft)","Isothermal","Wet/slushy"]},
"Glacier hazards":{match:["Crevasses opening","Bergschrund open","Bergschrund impassable","Thin snow bridges","Moats forming"],counter:["Bergschrund bridged","Snow-covered","Dry glacier"]},
"Fixed gear varies":{match:["Manky fixed gear","Missing gear","Bolts spinning"],counter:["Fixed gear good"]}
};
function patternStatus(label,rtags){const ck=PATTERN_CHECKS[label];if(!ck||!rtags||!rtags.size)return null;const m=(ck.match||[]).filter(t=>rtags.has(t));const c=(ck.counter||[]).filter(t=>rtags.has(t));if(!m.length&&!c.length)return null;return{matched:m,countered:c,status:(m.length&&c.length)?"mixed":m.length?"confirmed":"differs"};}
const VOLATILE_DISC=["alpine","mountaineering","ice","mixed"];
const COMMITMENT_EXPLAINERS={I:"A few hours — backing off is quick and low-consequence.",II:"Half a day — retreat is straightforward.",III:"Most of a day — retreat takes real time and planning.",IV:"Full day+ — committing. Retreat is difficult once you're in it.",V:"Multi-day — big commitment. Retreat can mean an overnight out.",VI:"Multi-day, remote, or high-altitude — retreat is a serious undertaking on its own."};

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
/* A track-coverage gap, in the reader's own units. Rounded to a tenth deliberately: the gap
   is a measurement between a hand-placed pin and a recorded line, and two decimals would
   claim a precision neither record has. uImp() is the real boolean — uDistMi is a FORMATTER
   and is always truthy, the #641 trap. */
function _gapDist(m){return uImp()?((Math.round(m/1609.344*10)/10)+" mi"):((Math.round(m/100)/10)+" km");}
/* A STUB IS MEASURED IN METRES, NOT IN TENTHS OF A KILOMETRE. _gapDist above is for the kilometre
   scale a partial track is short by; feeding it seven metres prints "0 km", which undercuts the one
   fact the sentence carries. uImp() is the real boolean here too — uDistMi is a FORMATTER and is
   always truthy, the #641 trap this file records. */
function _shortDist(m){return uImp()?(Math.round(m*3.28084)+" ft"):(Math.round(m)+" m");}
/* A distance in the climber's units, switching to mi/km past a kilometre so "1,998 m" reads as "1.2 mi". */
function _baseDist(m){return m>=1000?(uImp()?((m/1609.34).toFixed(1)+" mi"):((m/1000).toFixed(1)+" km")):_shortDist(m);}
/* A request that never reached the server — the one failure worth keeping on the phone for later. */
function _isNoSignal(e){if(typeof navigator!=="undefined"&&navigator.onLine===false)return true;var m=String((e&&e.message)||e||"");return /failed to fetch|network|load failed|fetch failed/i.test(m);}
/* "I'm at the base" (0188). The phone judges whether its own GPS fix is good, steady and still; the
   DATABASE judges whether that point is at this climb, because a rule the browser applies can be
   skipped by a crafted request. So the screen reports the server's answer, never its own guess.
   Other climbers see each checked-in spot and how many climbers stood there — never who, never when.
   ONE CONSENSUS, THE DATABASE'S (0363 route_base_spots): the spots arrive already clustered, the
   top one CONFIRMED once BASE_CONFIRM_MIN climbers agree and are a majority, and a confirmed spot
   becomes the route's own Base pin — so the map, this card, the waypoint list and the GPX all read
   the same start. An unconfirmed spot is shown as what it is and never outranks the recorded pin.
   It sits UNDER THE ROUTE MAP, which draws the same spots (GPXMap's baseSpots); `q` and `spots` are
   read once by RouteDetail and handed to both, so the map and this card cannot disagree.
   FIND THE BASE: a live distance and compass direction from the phone to the best-known start — a
   confirmed spot, else the Base pin the route records, else a spot not yet confirmed. Inside GPS error it
   stops pointing and shows the route's own LOCATION note (0243), because that, not GPS, is what tells
   two neighbouring lines apart. */
function BaseCheckinPanel({route,who,spots,q}){
  const [st,setSt]=useState({phase:"idle"});const [prog,setProg]=useState(null);
  const [guide,setGuide]=useState(null);const guideRef=useRef(null);
  const stopGuide=useCallback(function(){if(guideRef.current!=null){try{navigator.geolocation.clearWatch(guideRef.current);}catch(e){}guideRef.current=null;}},[]);
  /* POINT THE WAY: the phone's compass, corrected from magnetic to TRUE north by the declination at the base (lib/declination.js), turns an arrow toward the start. */
  const [compass,setCompass]=useState(null);const compassRef=useRef(null);
  const stopCompass=useCallback(function(){var c=compassRef.current;if(c){try{window.removeEventListener(c.type,c.fn);}catch(e){}clearTimeout(c.timer);compassRef.current=null;}},[]);
  useEffect(function(){return function(){stopGuide();stopCompass();};},[stopGuide,stopCompass]);
  useEffect(function(){stopGuide();setGuide(null);stopCompass();setCompass(null);},[route.id,stopGuide,stopCompass]);
  const area=route._dbArea||{};
  const baseWp=(route.waypoints||[]).find(function(w){return wpPlaced(w)&&wpType(w)==="Base";});
  const hasAnchor=(area.lat!=null&&area.lng!=null&&Number.isFinite(+area.lat)&&Number.isFinite(+area.lng))||!!baseWp;
  /* Check-ins taken with no signal wait on this phone. Send them whenever this panel mounts with a
     connection or the browser comes back online; the server still judges each one. */
  const refetch=q.refetch;
  const flush=useCallback(function(){if(!who||!USE_DB)return;var list=pendingBaseCheckins(who);if(!list.length)return;var keep=[];var chain=Promise.resolve();list.forEach(function(p){chain=chain.then(function(){return checkInAtRouteBase(p.routeId,p.fix).then(function(res){if(p.routeId===route.id)setSt(res.ok?{phase:"done",late:true}:{phase:"refused",res:res});}).catch(function(e){if(_isNoSignal(e))keep.push(p);});});});chain.then(function(){savePendingBaseCheckins(who,keep);if(refetch)refetch();});},[who,route.id,refetch]);
  useEffect(function(){flush();if(typeof window==="undefined")return;window.addEventListener("online",flush);return function(){window.removeEventListener("online",flush);};},[flush]);
  if(!USE_DB)return null;
  const clusters=spots||EMPTY_ARR;const mineAny=clusters.some(function(p){return p.mine===true;});
  if(!hasAnchor&&!clusters.length)return null;
  const go=function(){if(!who||st.phase==="locating"||st.phase==="sending")return;setSt({phase:"locating"});setProg(null);
    acquireBaseFix(typeof navigator!=="undefined"?navigator.geolocation:null,{onProgress:setProg}).then(function(fix){
      if(!fix.ok){setSt({phase:"refused",res:fix});return;}
      setSt({phase:"sending"});
      checkInAtRouteBase(route.id,fix).then(function(res){setSt(res.ok?{phase:"done"}:{phase:"refused",res:res});if(res.ok&&refetch)refetch();}).catch(function(e){
        if(_isNoSignal(e)){var list=pendingBaseCheckins(who).filter(function(p){return p.routeId!==route.id;}).concat([{routeId:route.id,fix:fix}]);setSt(savePendingBaseCheckins(who,list)?{phase:"queued"}:{phase:"error"});}
        else setSt({phase:"error"});});});};
  const withdraw=function(){if(!who)return;setSt({phase:"withdrawing"});withdrawBaseCheckin(who,route.id).then(function(){setSt({phase:"idle"});if(refetch)refetch();}).catch(function(){setSt({phase:"error",withdraw:true});});};
  const busy=st.phase==="locating"||st.phase==="sending"||st.phase==="withdrawing";
  const top=clusters[0];const confirmed=!!(top&&top.confirmed);
  /* Held (0363): a confirmed spot more than 200 m from the recorded pin is a different place, not a correction, so the pin waits for a review. */
  const pinGap=confirmed&&baseWp?distM(top,{lat:+baseWp.lat,lng:+baseWp.lng}):null;const held=pinGap!=null&&pinGap>200;
  const target=confirmed?{lat:top.lat,lng:top.lng,what:"the spot "+top.n+" climbers confirmed on-site"}:baseWp?{lat:+baseWp.lat,lng:+baseWp.lng,what:"the start this route records"}:top?{lat:top.lat,lng:top.lng,what:"the spot "+(top.n===1?"one climber":top.n+" climbers")+" checked in at — not confirmed yet"}
    /* Last, a CRAG's own coordinate: a base pin on a crag sits 0–1 m from it (measured for 0188), so it
       gets a climber to the wall. Never a PEAK's — that is the summit, kilometres from any start. */
    :(area.areaType==="crag"&&Number.isFinite(+area.lat)&&Number.isFinite(+area.lng)&&area.lat!=null&&area.lng!=null)?{lat:+area.lat,lng:+area.lng,what:"the crag’s location on file, not this climb’s own start — nobody has marked that yet"}:null;
  const startGuide=function(){if(!target)return;var geo=typeof navigator!=="undefined"?navigator.geolocation:null;if(!geo||!geo.watchPosition){setGuide({err:baseCheckinMessage({reason:"unsupported"},_baseDist)});return;}
    stopGuide();setGuide({phase:"locating"});
    guideRef.current=geo.watchPosition(function(pos){var c=pos.coords||{};setGuide({fix:{lat:c.latitude,lng:c.longitude,accuracy:c.accuracy}});},
      function(err){if(err&&err.code===1){stopGuide();setGuide({err:baseCheckinMessage({reason:"denied"},_baseDist)});}else setGuide(function(g){return g&&g.fix?g:{err:baseCheckinMessage({reason:"unavailable"},_baseDist)};});},
      {enableHighAccuracy:true,maximumAge:0,timeout:30000});};
  /* iOS (and Chrome since 151) hand out orientation only after a permission asked from a tap, so this runs from the button. A reading that is not north-referenced is ignored (headingFromOrientation), and a phone that gives none in 4 s is told so. */
  const startCompass=function(){if(!target||typeof window==="undefined")return;var DOE=window.DeviceOrientationEvent;if(!DOE){setCompass({err:"This browser can’t read a compass. Use the direction above."});return;}
    var decl=declinationDeg(target.lat,target.lng);
    var listen=function(){stopCompass();var type="ondeviceorientationabsolute" in window?"deviceorientationabsolute":"deviceorientation";
      var angle=function(){var o=window.screen&&window.screen.orientation;return o&&Number.isFinite(o.angle)?o.angle:0;};
      var fn=function(ev){var h=headingFromOrientation(ev,angle(),decl);if(!h)return;setCompass(function(c){var prev=c&&Number.isFinite(c.heading)?c.heading:null;var next=smoothHeading(prev,h.heading);return prev!=null&&Math.abs(((next-prev+540)%360)-180)<1.5&&c.acc===h.accuracy?c:{heading:next,acc:h.accuracy};});};
      var timer=setTimeout(function(){setCompass(function(c){return c&&Number.isFinite(c.heading)?c:{err:"This phone isn’t giving a compass reading. Use the direction above."};});},4000);
      window.addEventListener(type,fn);compassRef.current={type:type,fn:fn,timer:timer};setCompass({waiting:true});};
    if(typeof DOE.requestPermission==="function")DOE.requestPermission().then(function(r){if(r==="granted")listen();else setCompass({err:"Compass access is off for this site. Allow motion and orientation in your browser settings to use it."});}).catch(function(){setCompass({err:"Couldn’t turn the compass on. Use the direction above."});});
    else listen();};
  const g=guide&&guide.fix&&target?baseGuide(guide.fix,target,_baseDist):null;
  const rel=g&&!g.arrived&&compass&&Number.isFinite(compass.heading)?relativeBearing(bearingDeg(guide.fix,target),compass.heading):null;
  const locNote=String(route.location||"").trim();
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:ROUTE_GAP,marginBottom:12}}>
    <CardHead style={{marginBottom:8}}>BASE OF THE CLIMB</CardHead>
    {q.isError?<div style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>Couldn’t load check-ins at the base — try again in a moment.</div>
    :top?<div style={{marginBottom:9}}>
      <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:3}}>{top.lat.toFixed(5)+", "+top.lng.toFixed(5)}</div>
      <div style={{fontSize:12,color:confirmed?C.green:C.textSub,fontWeight:confirmed?600:400,marginBottom:3}}>{(confirmed?"✓ Confirmed on-site by ":"Checked in on-site by ")+top.n+" climber"+(top.n!==1?"s":"")+(top.mine?", including you":"")+(clusters.length>1?" · "+(clusters.length-1)+" other spot"+(clusters.length-1!==1?"s":"")+" reported":"")}</div>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:5}}>{confirmed?(held?"That is "+_baseDist(Math.round(pinGap))+" from the start this route records, so ClimbMatch checks it before the Base pin moves.":"The route’s Base pin on the map follows this spot."):(baseWp?"The Base pin on the map is still the start this route records. ":"")+"A spot becomes this route’s Base pin once "+BASE_CONFIRM_MIN+" climbers check in within 25 m of each other and are most of those who checked in."}</div>
      <a href={"https://www.google.com/maps/search/?api=1&query="+top.lat.toFixed(6)+","+top.lng.toFixed(6)} target="_blank" rel="noopener noreferrer" style={{fontSize:12.5,color:C.blue,fontWeight:600,textDecoration:"none"}}>Open the base in maps ›</a>
    </div>
    :q.isPending?<LoadingRows C={C} label="Loading check-ins…" style={{marginBottom:8}}/>
    :<div style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{baseWp?"Nobody has checked in at the base yet — the Base pin on the map is where this route records its start.":"Nobody has checked in at the base yet."}</div>}
    {target?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 11px",marginBottom:10}}>
      {!guide?<button onClick={startGuide} style={{...BTN,width:"100%",background:C.blueBg,color:"#fff",border:`1px solid ${C.blueDim}`}}>How far am I from the base?</button>
      :<div><div role="status" aria-live="polite">
        <div style={{fontSize:13,color:guide.err?C.amber:g&&g.arrived?C.green:C.text,fontWeight:600,lineHeight:1.45}}>{guide.err?guide.err:g?g.line:"Finding you — this works best out in the open…"}</div>
        {g?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:3}}>{"Measured to "+target.what+". Updates as you walk."}</div>:null}
        {g&&locNote&&g.d<=100?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,marginTop:6}}><span style={{fontWeight:700,color:C.text}}>Where it starts: </span>{locNote}</div>:null}
        </div>
        {/* Outside the live region: the arrow's words change with every turn of the phone, and announcing each would drown out the distance. */}
        {g&&!g.arrived?(!compass?<button onClick={startCompass} style={{...BTN,width:"100%",marginTop:8,background:"transparent",color:C.blue,border:`1px solid ${C.blueDim}`}}>Point the way with your compass</button>
          :compass.err?<div style={{fontSize:12,color:C.amber,lineHeight:1.45,marginTop:6}}>{compass.err}</div>
          :rel!=null?<div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}>
            <svg aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" style={{flexShrink:0}}><circle cx="22" cy="22" r="20" fill="none" stroke={C.border} strokeWidth="2"/><path d="M22 5 L31 31 L22 25 L13 31 Z" fill={C.blue} transform={"rotate("+rel.toFixed(1)+" 22 22)"}/></svg>
            <div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{turnWord(rel)}</div>
              <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:2}}>{"Hold your phone flat in front of you. Metal gear and the rock itself can pull a compass off"+(Number.isFinite(compass.acc)&&compass.acc>25?" — it is unsure right now (±"+Math.round(compass.acc)+"°); move the phone in a figure eight to recalibrate":"")+"."}</div></div>
          </div>
          :<div style={{fontSize:12,color:C.textSub,marginTop:6}}>Waiting for the compass…</div>):null}
        <button onClick={function(){stopGuide();setGuide(null);stopCompass();setCompass(null);}} style={{marginTop:7,padding:0,background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Stop</button>
      </div>}
    </div>:null}
    {st.phase==="done"?<div role="status" style={{fontSize:12.5,color:C.green,fontWeight:600,marginBottom:8}}>{st.late?"✓ Your saved check-in was sent and accepted — thanks for marking the start.":"✓ You’re checked in at the base — thanks for marking the start for the next party."}</div>
    :st.phase==="refused"?<div role="status" style={{fontSize:12.5,color:C.amber,lineHeight:1.45,marginBottom:8}}>{baseCheckinMessage(st.res,_baseDist)}</div>
    :st.phase==="queued"?<div role="status" style={{fontSize:12.5,color:C.textSub,lineHeight:1.45,marginBottom:8}}>No signal here — your GPS reading is saved on this phone and will be sent, and checked, the next time you open this climb with a connection.</div>
    :st.phase==="error"?<div role="status" style={{fontSize:12.5,color:C.red,marginBottom:8}}>{st.withdraw?"Couldn’t remove your check-in — try again.":"Couldn’t check you in — try again."}</div>
    :st.phase==="locating"?<div role="status" style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{"Getting a steady GPS fix — stand still"+(prog?" ("+prog.good+" good reading"+(prog.good!==1?"s":"")+")":"")+"…"}</div>
    :st.phase==="sending"?<div role="status" style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>Checking your position against this climb…</div>:null}
    {who?<div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <button onClick={go} disabled={busy} aria-busy={busy?"true":undefined} style={{padding:"8px 12px",background:busy?C.border:C.blueSolid,color:C.onSolid,border:"none",borderRadius:9,fontSize:12.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{mineAny?"I’m at the base — check in again":"I’m at the base — check in"}</button>
      {mineAny?<button onClick={function(){askConfirm({title:"Remove your check-in?",body:"Checking in again means being back at the base of the climb.",confirmLabel:"Remove check-in"}).then(function(ok){if(ok)withdraw();});}} disabled={busy} style={{padding:"8px 12px",background:C.surface,color:C.textSub,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:busy?"default":"pointer"}}>Remove my check-in</button>:null}
    </div>:<div style={{fontSize:12,color:C.textMuted}}>Sign in to check in when you’re standing at the start of the climb.</div>}
    {who?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:8}}>Uses your phone’s GPS, and only works at the start of the climb: your position is checked against where this climb is on file. Other climbers see the spot and how many climbers stood there — never who, or when.</div>:null}
  </div>;
}
const DISC_HAZ={sport:["Loose rock","Runout","Warms up / sun-affected"],trad:["Rockfall","Loose rock","Runout","Serious exposure","Warms up / sun-affected"],bouldering:["Bad landing zone","Loose rock","Warms up / sun-affected"],aid:["Rockfall","Loose rock","Runout","Serious exposure"],ice:["Avalanche terrain","Rockfall","Serious exposure"],mixed:["Rockfall","Loose rock","Avalanche terrain","Serious exposure"],alpine:["Rockfall","Loose rock","Lightning / storms","Avalanche terrain","Crevasse hazard","Cornices","Serious exposure","Complex route-finding","River / creek crossing"],mountaineering:["Rockfall","Lightning / storms","Avalanche terrain","Crevasse hazard","Cornices","Serious exposure","Complex route-finding","River / creek crossing"],hiking:["Avalanche terrain","River / creek crossing","Complex route-finding","Serious exposure"],scrambling:["Rockfall","Loose rock","Serious exposure"]};
/* Does this text ASSERT the agency, or disclaim it? Scans every occurrence and accepts
   the keyword only if at least one is not sitting behind a negation in the ~60 chars
   before it. Per-occurrence, not per-string, for the same reason rackMentions is:
   "Okanogan-Wenatchee NF, not North Cascades NP, but Enchantment permits apply" has a
   real Enchantment mention sharing a sentence with a disclaimed one. */
const PERMIT_NEG=/\b(?:not|no|outside|other than|isn'?t|aren'?t|rather than|instead of|unlike|excluding|except|nor)\b[^.;]{0,40}$/i;
/* Second way an agency name lies about who governs a route: not disclaimed, but PERIPHERAL —
   named as somewhere the line brushes past. 108 Mt. Baker Ranger District routes read
   "Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park",
   and a bare /north cascades/ sent every one of those National Forest climbs to the Park
   Service's backcountry-permit page. Same wrong-agency outcome PERMIT_NEG was written for,
   which is why it lives beside it rather than in a second mechanism. Each alternative below is
   a phrase observed in the live column, not a guess at English. Measured: 103 NOCA and 2
   Olympic links drop to none, 1 moves to Recreation.gov. The Icy Peak case is a real (small)
   loss — overnight there does cross into NOCA — accepted against 105 wrong links removed.
   On that Mt. Baker boilerplate specifically, "peripheral" turned out to be generous: #468's
   data audit found it is frequently just FALSE. Twin Sisters sits entirely within Mount Baker
   Wilderness, ~40mi from the NCNP boundary; wa_the_pleiades_scramble's own access.permit reads
   "...not North Cascades National Park" while its land_manager asserted the crossing. #468
   repairs such rows in the DB. This guard stays regardless — it is app-side, it covers the
   ~106 rows that audit does not reach, and enrichment can re-emit the phrase. So expect the
   108 to shrink over time; suppression is right whether the mention is peripheral or wrong. */
const PERMIT_PERIPHERAL=/\b(?:crossing into|crosses into|cross into|partly (?:in|within|inside)|partially (?:in|within)|some (?:upper )?routes?|upper routes?|adjacent to|borders?(?: on)?|boundary (?:of|with)|near(?:by)?|approach (?:partly )?crosses|just outside|edge of)\b[^.;]{0,60}$/i;
function _pmSays(hay,re){if(!hay)return false;re.lastIndex=0;var m;while((m=re.exec(hay))!==null){var before=hay.slice(Math.max(0,m.index-70),m.index);if(!PERMIT_NEG.test(before)&&!PERMIT_PERIPHERAL.test(before))return true;if(m.index===re.lastIndex)re.lastIndex++;}return false;}
/* [4,5,6] -> "May–Jul"; [10,11,0,1] -> "Nov–Feb" (a run may wrap the new year); gaps split with ", ". */
function monthSpan(ms){var s=ms.slice().sort(function(a,b){return a-b;});if(!s.length)return "";var runs=[];s.forEach(function(m){var last=runs[runs.length-1];if(last&&m===last[1]+1)last[1]=m;else runs.push([m,m]);});if(runs.length>1&&runs[0][0]===0&&runs[runs.length-1][1]===11){var w=runs.pop();runs[0][0]=w[0];}return runs.map(function(r){return r[0]===r[1]?MONTHS[r[0]]:MONTHS[r[0]]+"–"+MONTHS[r[1]];}).join(", ");}
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
/* `essentials` is route.whatToBring, which is CATALOG ENRICHMENT — import-alpine.mjs maps it
   from catalog/ JSON, the same path as approach/descent/beta. It is not submitted by app
   users and there is no editor for it (the RACK box above has a pencil; this list has none).
   So it must not be attributed to people: #732 shipped this block captioned "Called out by
   climbers who have been up it", which reads as first-hand testimony from named ascensionists
   the row does not contain. Same family as #756 printing a real partner as "Climber" and the
   hash-fabricated user data before it — enrichment described as if a person said it. "on
   file" is the vocabulary the rest of the screen already uses for this, including the
   standard-kit caption two elements down. Do not warm it back up. */
function fmtRappels(r){if(r==null)return null;if(typeof r!=="object")return r;var n=r.count!=null?r.count+"x":"";var len=r.lengthM!=null?r.lengthM+"m":(r.lengthFt!=null?r.lengthFt+"ft":"");return [n,len].filter(Boolean).join(" · ")||null;}
/* The rappel summary worth printing NEXT TO the pitch-by-pitch table. `rappels` is either a
   count, a {count,lengthM} object, or free prose ("Typically 0-1 short rappel, or a
   down-climb, on the South Ridge descent"). When a RappelTable is already on screen its
   header states the count and total length, so a bare count here would just repeat it —
   keep only the prose that says something the table cannot. */
/* `_rappelsFromContrib` is set by the contribution merge in ClimbMatch.jsx when climbers have
   agreed a correction to the rappel count/length. All FIVE readers below prefer `rappelDetail`
   (the station-by-station enrichment) over `rappels`, so on the 155 routes that carry it an
   accepted correction passed the 3-agree gate and then displayed nothing at all — rappelCount
   returned the stale station count and rappelNoteText suppressed the new value outright. The
   station list is not deleted; it just stops out-voting the humans who climbed it.

   The count was three when #787 wrote this and is five now — #784 added rappelsAreNone and
   rappelHeadingCount, and both shipped without the guard. Nothing catches a reader that
   forgets it: that merge was clean and every gate stayed green. If you add a sixth, the
   `!_rapEdited(route)&&` prefix is the whole contract. */
function _rapEdited(route){return !!(route&&route._rappelsFromContrib);}
function rappelNoteText(route){var s=fmtRappels(route&&route.rappels);if(s==null)return null;var t=String(s).trim();if(!t)return null;if(!_rapEdited(route)&&route&&route.rappelDetail&&route.rappelDetail.length&&/^\d+(?:\.\d+)?x?(?:\s*·\s*\d+(?:\.\d+)?\s*(?:m|ft))?$/i.test(t))return null;return t;}
/* Every rappel count a route can state, so the two boxes cannot print different numbers.
   Forbidden Peak's West Ridge is the case: its rappelDetail lists 3 stations, its `rappels`
   prose says "~5 single-rope raps via East Ledges/NE Face", and its rappelCountNote says
   late-season parties need "as many as 6-7". Overview and the table header both said "3",
   the prose box beside them said 5, and nothing reconciled them. The documented count stays
   the headline \u2014 it is the one backed by station-by-station data \u2014 but when another field on
   the same row reports more, the label says so instead of quietly disagreeing. (Forbidden's own
   row was repaired on 2026-10-01 to 8 stations that every field agrees on.) */
/* "Does this route have rappels at all?" is a yes/no question, and for 435 catalog routes the
   stored answer is NO — 195 store rappels:"0" and 240 store prose that says it in words
   ("None — unroped scramble; no rappels reported by parties ascending or descending"). Both
   still drew a RAPPELS heading with a box under it, and on the 195 the box's entire body was
   the character "0". A section header is a claim that there is something to read; on a
   walk-off there is not.

   The table wins over the summary when both exist, so a route that HAS rappels is never
   silenced by prose that opens with the word "No" — that phrasing is common and usually
   introduces which anchors are missing, not whether you rappel at all
   ("No fixed rappel anchors down the couloir itself — descend via the bolted West Face"). */
const RAP_NONE_RE=/^\s*(?:none|no\b|n\/a|not required|zero|0)\b/i;
/* A denial that still offers a numbered alternative is not a denial. wa_lexington_tower_east_face
   stores "0 -- the standard descent is a walk-off ... A ~7-rappel line straight down the face is
   a documented but non-standard alternative some parties use in bad weather", and
   wa_garfield_mountain_preiss_route says "No fixed rappel line on the route — ... or rappel
   Infinite Bliss (~20 raps)". Suppressing those would delete real descent beta. Suppress only
   when the row denies rappels AND names no numbered rappel line anywhere in the value. */
const RAP_ALT_RE=/\b\d+\s*(?:-|\s)?\s*(?:short\s+|full\s+)?raps?(?:pels?)?\b/i;
function rappelsAreNone(route){
  if(!route)return false;
  // `!_rapEdited` for the reason #787 records: a climber who has agreed a correction must not
  // be out-voted by the stale station list. Without it, a route corrected to a walk-off would
  // keep rendering its old rappel table.
  if(!_rapEdited(route)&&route.rappelDetail&&route.rappelDetail.length)return false;
  const r=route.rappels;
  if(r==null)return false;
  if(typeof r==="object")return r.count===0;
  const s=String(r).trim();
  if(/^0+(?:\.0+)?$/.test(s))return true;
  if(!RAP_NONE_RE.test(s))return false;
  return !RAP_ALT_RE.test(s)&&!rapProseAffirms(s);
}
/* ...AND A DENIAL THAT GOES ON TO DESCRIBE A RAPPEL IS NOT A DENIAL EITHER, numbered or not. "No fixed
   anchors on the face ... Descending over the top involves one rappel of about 50 ft" (wa_fantasy_falls),
   "No published count. The descent is a full day of rappelling back down the line" (East McMillan NE
   Buttress), "No fixed rappel line. Descent is ... by rappelling the North Face" (Little Sister): the
   opening "No" says which ANCHORS or which LINE is missing, and the RAPPELS section was hidden with the beta
   in it. Measured 2026-10-15: 292 denials, 25 of which describe a rappel; those now render, the other 267
   (incl. "None — the route is down-climbed, not rappelled", "a walk-off, not a rappel descent") stay hidden.
   A match right after "not"/"than"/"no"/"instead of" is the denial itself, and "a rappel" before
   descent/line/station/route names the thing that is absent. */
const RAP_AFFIRM_RE=/\b(?:rappelling|rappelled|(?:one|two|three|four|five|six|a|single|series of|couple of|several|few)\s+(?:short\s+|long\s+|full[- ]length\s+|double[- ]rope\s+|single[- ]rope\s+)?rappels?|rappels?\s+(?:the|back|down|off|from|to|of|leads?|into)|raps?\s+(?:the|back|down|off|from|to|into))\b/gi;
function rapProseAffirms(s){var re=new RegExp(RAP_AFFIRM_RE.source,"gi"),m;while((m=re.exec(s))){var before=s.slice(Math.max(0,m.index-14),m.index);if(/\b(?:not|than|no|instead of)\s+(?:a\s+)?$/i.test(before))continue;if(/^a\s+rappels?$/i.test(m[0])&&/^\s*(?:descent|line|station|route)\b/i.test(s.slice(m.index+m[0].length)))continue;return true;}return false;}
/* The heading takes a count ONLY from an unambiguous source: a rappel table, a stored
   {count}, a bare number, or an explicit range. Free prose gets no numeric heading — it
   renders in full underneath instead.

   Deriving one from prose is how "~100 ft rappel from Sharkfin Col" became "~100 rappels" and
   "75 feet (single rappel possible on descent)" became "~75 rappels": rappelLabel falls back
   to rappelCount, whose last resort takes the leading integer of any sentence, and that
   integer is a LENGTH about as often as it is a count. The same mistake produced 56 fake
   conflicts in audit-rappel-count-conflicts.mjs. It mattered less when this fed a small stat
   tile and matters more now that it is a section heading — a heading is a claim, and the prose
   below it is the evidence. */
function rappelHeadingCount(route){
  const plural=function(n){return n+" rappel"+(String(n)==="1"?"":"s");};
  // Same guard as the other readers, and this is the sharpest case: the heading states a
  // NUMBER, so a stale station count here silently contradicts the correction the climber
  // just watched pass the 3-agree gate.
  if(!_rapEdited(route)&&route&&route.rappelDetail&&route.rappelDetail.length)return plural(route.rappelDetail.length);
  const r=route&&route.rappels;
  if(r==null)return null;
  if(typeof r==="object")return r.count!=null?plural(r.count):null;
  const s=String(r).trim();
  if(/^\d+$/.test(s))return plural(parseInt(s,10));
  const m=s.match(/^~?\s*(\d+)\s*[-–]\s*(\d+)\b(?!\s*(?:ft|foot|feet|m|meter|metre)s?\b)/i);
  return m?(m[1]+"–"+m[2]+" rappels"):null;
}
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
/* "rack" has no heading of its own: its rows (the bolt count and the G/PG-13/R/X protection rating) open the
   RACK card, so a crag route states its protection in ONE place (owner note: "remove protection and just move
   that info to the rack section. Consolidate and remove duplicates"), as Mountain Project's one Protection box does. */
const CRAG_FACT_SECTIONS=[["location","WHERE IT STARTS",["Location","Start"]],["rack","RACK",["Bolts","Protection"]],["gear","GEAR & SAFETY",["Anchor","Rope","Rope notes","Fixed gear","Landing","Crash pads","Descent"]],["cond","CONDITIONS",["Aspect","Sun","Season","Wet","Rock quality"]]];
/* THE ONE DISTANCE A ROUTE LEADS WITH, and what it is: TechStats' tile and the header strip both
   print it. The strip printed the stored ONE-WAY figure under a bare "Dist" while the tile under it
   said "Round trip" and twice the number, so one page showed one climb two ways. */
function headlineDist(route){const km=effDistKm(route);if(!(km>0))return null;const rs=recShapeOf(route);const ob=rs?rs==="outback":shapeOf(route)==="outback";return ob?["Round trip",km*2]:effDistIsWholeTrip(route)?[rs==="point"?"Total distance":"Round trip",km]:["Distance",km];}
function TechStats({route,onEdit,part}){
  const disc=catOf(route);
  const hasElevPts=route.elevPts&&route.elevPts.length>0;
  const maxEl=hasElevPts?Math.max(...route.elevPts):(route.highPointFt||0),minEl=hasElevPts?Math.min(...route.elevPts):0,relief=maxEl-minEl;
  const rawAscent=routeAscentFt(route);
  const hasAscent=rawAscent!=null&&rawAscent>0;
  const totalAscentFt=rawAscent||0;const gainIsWholeOuting=gainCoversWholeOuting(route);
  const distKm=effDistKm(route);
  const hasDist=distKm!=null&&distKm>0;
  const roundTripKm=hasDist?distKm*2:null;
  const avgGrade=(hasDist&&hasAscent)?((totalAscentFt/3.28084/(distKm*1000))*100):null;
  const waterCount=(route.waypoints||[]).filter(w=>wpIs(w,"Water")).length;
  const usePitchSumForLen=!route.routeFt&&route.pitchDetail&&route.pitchDetail.length;
  const climbLenRaw=route.routeFt||(route.pitchDetail&&route.pitchDetail.length?route.pitchDetail.reduce((a,pp)=>a+(pp.lengthM||0),0):null);
  const climbDisp=climbLenRaw?(usePitchSumForLen?uLen(climbLenRaw):uElev(climbLenRaw)):null;
  // A loop or point-to-point outing has no "same trail back", so distKm*2 is not a round
  // trip for it — show the distance without inventing a return leg.
  //
  // `outing_shape` (migration 0087) is the recorded answer and wins when a route has one.
  // shapeOf() is the fallback guess, and it is a weak one: it reads name+blurb+summary, and
  // `blurb`/`summary` have no column in `routes`, so on a DB route it sees the NAME alone and
  // defaults to "outback" — 480 of 496 WA alpine routes with a distance, and its `loop` branch
  // never fires because nothing is named "loop". Doubling is still right for most of them (the
  // approach is retraced even when the CLIMB descends another line), which is why the fallback
  // is left as-is rather than made stricter: a prose classifier over `descent` was measured and
  // would have deleted 376 round-trip figures, most of them correct.
  const recShape=recShapeOf(route);const distIsWholeTrip=effDistIsWholeTrip(route);
  const isOutBack=recShape?recShape==="outback":shapeOf(route)==="outback";
  const rtNote=isOutBack?(recShape?" Round trip: this route is recorded as retracing its approach.":" Round trip assumes the same trail back to the trailhead.")
    :recShape==="loop"?" This route loops back to the trailhead by a different line, so doubling the approach would overstate it."
    :recShape==="point"?" This route finishes at a different trailhead, so the total runs from one trailhead to the other."
    :" This route is a loop or point-to-point outing, so no round-trip distance is shown.";
  /* ONE distance tile, and never the one-way figure. It used to print "Distance"/"Approach"
     (the walk IN) beside "Round trip" (the same number doubled) — two tiles for one fact, and the
     one-way one is not what a party plans a day around. What shows now is the whole outing:
     doubled for a route that retraces its approach, and as stored for a recorded loop/point,
     whose distance is the whole outing (effDistIsWholeTrip records how that was established). A
     loop/point GUESSED from the name alone keeps a plain "Distance": it claims neither. */
  const distTile=!hasDist?null:isOutBack?["Round trip",uDist(roundTripKm),C.blue]
    :distIsWholeTrip?[recShape==="point"?"Total distance":"Round trip",uDist(distKm),C.blue]
    :["Distance",uDist(distKm),C.blue];
  let stats,note;
  if(disc==="bouldering"){
    stats=[["Crux grade",cruxGrade(route.cruxGrade||route.grade),C.amber]];
    if(distTile)stats.unshift(distTile);
    if(route.routeFt)stats.unshift(["Boulder height",uElev(route.routeFt),C.orange]);
    note="Height is the boulder itself. The distance is just the walk in and out — there is no meaningful elevation gain to a single boulder."+rtNote+"";
  }else if(disc==="hiking"||disc==="mountaineering"){
    stats=[];
    if(hasAscent)stats.push(["Total ascent","↑ "+uElev(totalAscentFt),C.green]);
    if(distTile)stats.push(distTile);
    if(maxEl>0)stats.push(["High point",uElev(maxEl),C.amber]);
    if(route.peakMetadata&&route.peakMetadata.prominence)stats.push(["Prominence",uElev(route.peakMetadata.prominence),C.purple]);
    if(avgGrade!=null)stats.push(["Avg grade",avgGrade.toFixed(1)+"%",C.textSub]);
    if(hasElevPts)stats.push(["Vertical relief",uElev(relief),C.purple]);
    if(route.maxAngle)stats.push(["Max slope",route.maxAngle+"°",C.orange]);
    if(waterCount)stats.push(["Water sources",waterCount,C.blue]);
    note="For a summit objective, total ascent from the trailhead is the number that matters most."+rtNote+"";
  }else if(disc==="alpine"){
    stats=[];
    if(hasAscent)stats.push(["Total ascent","↑ "+uElev(totalAscentFt),C.green]);
    if(climbDisp)stats.push(["Climb length",climbDisp,C.teal]);
    if(route.pitches>0)stats.push(["Pitches",route.pitches,C.blue]);
    if(distTile)stats.push(distTile);
    if(route.maxAngle)stats.push(["Max slope",route.maxAngle+"°",C.orange]);
    if(route.cruxGrade||route.grade)stats.push(["Crux grade",cruxGrade(route.cruxGrade||route.grade),C.amber]);
    if(maxEl>0)stats.push(["High point",uElev(maxEl),C.purple]);
    if(route.peakMetadata&&route.peakMetadata.prominence)stats.push(["Prominence",uElev(route.peakMetadata.prominence),C.purple]);
    /* The Rappels tile used to sit here, at the top of Overview, while every other rappel
       fact — the table, its total length, the prose — sat further down the same tab. It said
       the same thing the RAPPELS heading now says, and it said it on routes that have none:
       rappelCount("0") is 0, not null, so 195 walk-offs rendered a red "0x". Count and
       content are together in one place now; see rappelsAreNone. */
    note="Total ascent is the whole day from the trailhead; climb length is just the technical climbing within it."+rtNote+"";
  }else{
    const climbLabel=disc==="aid"?"Wall height":disc==="scrambling"?"Scramble section":"Route length";
    stats=climbDisp?[[climbLabel,climbDisp,C.teal]]:[];
    /* A scramble is never roped, so it has no pitches: a stored count on a scrambling row is not printed here (owner note, 2026-10-25). Its climbing sections stay on Plan. */
    if(route.pitches>0&&disc!=="scrambling")stats.push(["Pitches",route.pitches,C.blue]);
    if(hasAscent)stats.push([gainIsWholeOuting?"Total ascent":"Approach gain","↑ "+uElev(totalAscentFt),C.green]);
    if(distTile)stats.push(distTile);
    /* On sport, trad and top-rope the route's grade IS its crux (a YDS grade rates the hardest move), so a
       "Crux grade" tile repeated the Composite Grade panel above it, value for value. Mountain
       Project and theCrag print one grade for these. The tile stays only when a stored crux
       disagrees with the route's displayed grade (displayGrade, the header pill), which is
       information rather than an echo. */
    const _cx=(route.cruxGrade||route.grade)?cruxGrade(route.cruxGrade||route.grade):null;
    const _cxEcho=_cx&&(disc==="sport"||disc==="trad"||disc==="toprope")&&displayGrade(route)===_cx;
    if(_cx&&!_cxEcho)stats.push(["Crux grade",_cx,C.amber]);
    if(route.maxAngle)stats.push(["Max slope",route.maxAngle+"°",C.orange]);
    if(route.peakMetadata&&route.peakMetadata.prominence)stats.push(["Prominence",uElev(route.peakMetadata.prominence),C.purple]);
    /* Second copy of the Rappels tile — same reasoning as the pitched branch above. */
    const _gainClause=!hasAscent?"":(gainIsWholeOuting?"Total ascent is the whole day from the trailhead, not just the walk in.":"Approach gain is the hike in to the base.");const _distClause=!hasDist?"":(distIsWholeTrip?" Distance is the whole outing, not just the walk in.":isOutBack?" Round trip is the walk in to the base and back out.":"");note=(hasAscent||hasDist)?(climbLabel+" is the climbing itself. "+(_gainClause+_distClause).trim()+rtNote+""):null;
  }
  /* Discipline-agnostic tiles, appended after BOTH branches above so they cannot be lost to
     whichever branch a route falls into. Every one of these is offered in SuggestFix and, until
     now, rendered nowhere at all: protRating (trad/sport), landing/pads/startType (the WHOLE
     bouldering group of the contribute form). A contributor could pass the 3-agree gate on a
     runout X-rated line and the route would still say nothing about it. protRating is coloured
     by consequence rather than uniformly, because "R" and "X" are the reason the field exists. */
  if(route.protRating)stats.push(["Protection",route.protRating,(/^(R|X)$/i.test(String(route.protRating).trim())?C.red:/PG/i.test(String(route.protRating))?C.amber:C.green)]);
  if(route.startType)stats.push(["Start",route.startType,C.blue]);
  if(route.landing)stats.push(["Landing",route.landing,(/bad|danger/i.test(String(route.landing))?C.red:/slop/i.test(String(route.landing))?C.amber:C.green)]);
  if(route.pads!=null&&route.pads!=="")stats.push(["Crash pads",String(route.pads),C.teal]);
  /* 0131 gave `rock` and `crux` columns. They join the tiles rather than getting a section of
     their own, because both are a short noun or phrase — a rock type and "what the hard bit
     is" — and a column that lands somewhere nothing reads is the failure this block was
     written to fix. Neither is coloured: there is no hazard reading to make of "granite". */
  /* Since 0248 the AREA carries a rock type too, so a route that states none still shows its crag's.
     A MAPPED one (the bedrock at the crag's coordinate) reads plainly as "Rock", the way Mountain
     Project and theCrag print a crag's rock: the owner removed the mapped qualifier 2026-10-15. */
  const _rk=routeRock(route);
  if(_rk)stats.push(["Rock",_rk.label,C.textSub]);
  if(route.crux)stats.push(["Crux",String(route.crux),C.textSub]);
  /* ROUTE FACTS. On a crag discipline (sport, trad, toprope, aid, bouldering) this card is the ONE
     place the guidebook facts live, so every crag route reads the same set in the same order rather
     than each discipline growing its own box. Every row is gated on its own value: a bare route —
     name, grade, pitches — gains nothing here, because a row that says "unknown" under every fact
     is a placeholder, not a fact. Bolts is `bolts` (0240), never counted out of pitch prose. Aspect
     and season are here because a crag route without a Plan tab had nowhere else to show them.
     STAR RATING, ALSO CALLED, VARIATIONS and the first FREE ascent are facts about any line, so they
     render on every discipline. Star rating is `guide_stars` (0-4), a guidebook rating kept apart from
     `stars` (a different scale, and the climbers' average falls back to it) and never attributed. */
  const crag=CRAG_CATS.includes(disc);const facts=[];var _missN=0,_firstMiss=null;
  const _gsRaw=route.guideStars!=null?route.guideStars:route.guide_stars;const _gs=(_gsRaw==null||_gsRaw===""||!isFinite(+_gsRaw))?null:Math.max(0,Math.min(4,Math.round(+_gsRaw)));
  if(_gs!=null)stats.unshift(["Star rating","★".repeat(_gs)+"☆".repeat(4-_gs),C.amber]);
  const _alt=(function(a){return (Array.isArray(a)?a:(a?[a]:[])).map(function(x){return String(x==null?"":x).trim();}).filter(Boolean);})(route.altNames!=null?route.altNames:route.alt_names);
  if(_alt.length)facts.push(["Also called",_alt.join(", ")]);
  const _vars=(Array.isArray(route.variations)?route.variations:[]).map(function(v){if(v==null)return "";if(typeof v!=="object")return String(v).trim();return [v.name,v.grade].filter(Boolean).join(" · ")+(v.note?" — "+v.note:"");}).filter(Boolean);
  if(_vars.length)facts.push(["Variations",<>{_vars.map(function(v,i){return <div key={i} style={{marginTop:i?3:0}}>{v}</div>;})}</>]);
  if(crag){
    if(disc!=="bouldering"&&+route.bolts>0)stats.push(["Bolts",String(Math.round(+route.bolts)),C.blue]);
    /* ANCHOR is `anchor` (0242): a short value ("2-bolt chains", "tree, walk off"), the route's TOP
       anchor — a pitch's own anchor stays on its ROUTE BREAKDOWN row. Style is NOT here: `features`
       already draws as the tag chips (RouteTagRow), and a row would print it twice. */
    /* A multipitch crag line whose belays differ says so: the top anchor, then each kind by pitch. */
    const _anc=String(route.anchor||"").trim();const _pAnc=disc!=="bouldering"?pitchAnchorSummary(route):null;if(disc!=="bouldering"&&((_anc&&_anc.length<=80)||_pAnc))facts.push(["Anchor",_pAnc?((_anc&&_anc.length<=80?_anc+" at the top · ":"")+"by pitch: "+pitchAnchorText(_pAnc)):_anc]);var _longOnFile=[];if(_anc.length>80)_longOnFile.push("Anchor");
    /* LOCATION is `location` (0243): where the line starts on its wall, which is how a climber finds it
       at the base. First among the facts, because it is the first thing needed at the crag. */
    const _loc=String(route.location||"").trim();const _locAll=CRAG_CATS.includes(disc);/* on a crag it has a section of its own, so it is never too long to show */if(_loc&&(_locAll||_loc.length<=160))facts.unshift(["Location",_loc]);if(!_locAll&&_loc.length>160)_longOnFile.push("Location");
    const _dsc=String(route.descent||"").trim();if(_dsc&&_dsc.length<=140)facts.push(["Descent",_dsc]);
    /* SUN is `sun` (0247): when this wall is in sun or shade, as stated for it. Where it exists it
       replaces the sun line computed from the aspect — the stated hours are the better fact. */
    const _sun=String(route.sun||"").trim();
    const _aspOwn=String(route.aspect||"").trim();const _aspWall=_aspOwn?"":String((route._dbArea&&route._dbArea.aspect)||"").trim();const _asp=_aspOwn||_aspWall;if(_asp){const _sr=_sun?null:sunReadout(_asp,disc);facts.push(["Aspect",(/^[NSEW]{1,3}([\/ -][NSEW]{1,3})*$/i.test(_asp)?_asp+"-facing":_asp.replace(/\.$/,""))+(_aspWall?" (the crag's wall)":"")+"."+(_sr&&_sr.line?" "+_sr.line:"")]);}
    if(_sun)facts.push(["Sun",_sun]);
    /* WET, ROCK QUALITY and FIXED GEAR (0247): seepage after rain, loose or polished rock, and the
       pitons/bolt ladders already in place. Short stated values, so each is a facts row, not a tile. */
    [["Wet",route.wet],["Rock quality",route.rockQuality],["Fixed gear",route.fixedGear]].forEach(function(f){const v=String(f[1]||"").trim();if(v&&v.length<=160)facts.push([f[0],v]);else if(v)_longOnFile.push(f[0]);});
    const _sea=String(route.season||"").trim();if(_sea)facts.push(["Season",_sea]);
    /* ROPE. Rope length, rope type and the ropework note were read only by RouteRackBox and RopeworkBox,
       which mount OFF the crag disciplines, so on a trad, sport or aid route all three reached no screen
       (122 crag routes carry one) and the editor's rope length had nowhere to show. Same precedence as
       the RACK box: an agreed correction wins, else the enrichment number. */
    if(disc!=="bouldering"&&disc!=="toprope"){var _rc=route.ropeLen?fmtRopeLen(route.ropeLen):"";var _rl=(_ropeEdited(route)&&_rc)?_rc:(route.ropeLengthM?(route.ropeLengthM+"m"):_rc);var _rope=[route.ropeType,_rl].filter(Boolean).join(" ").trim();if(_rope)facts.push(["Rope",_rope]);var _rf=ropeworkFacts(route);if(_rf.link)facts.push(["Pitches link",_rf.link]);if(_rf.simul)facts.push(["Simul-climbing",_rf.simul]);}
    /* EMPTY IS A PLACEHOLDER (owner, 2026-10-07): every fact THIS DISCIPLINE has is listed whether or
       not the route states it, so a climber sees what is missing and can add it. Only facts that
       pertain to the discipline — no bolts on a boulder, no landing on a sport line. A missing fact
       reads "Not on file yet", never "unknown" or a guess, and one link under the list opens the editor. */
    const _have=new Set(facts.map(function(f){return f[0];}).concat(stats.map(function(t){return t[0];})).concat(_longOnFile));
    /* Each of these is a field the contribute form offers for this discipline (its DROP rules match),
       so every "Not on file yet" can actually be filled. Descent is not here: the DESCENT section
       below carries its own placeholder. */
    const _want=disc==="bouldering"?["Location","Landing","Crash pads","Start","Aspect","Season","Rock quality","Wet"]
      :["Location"].concat(disc==="toprope"?[]:["Pitches",disc==="aid"?"Wall height":"Route length"]).concat(disc==="sport"?["Bolts"]:[]).concat(disc==="sport"||disc==="trad"?["Protection"]:[]).concat(["Anchor"]).concat(disc==="toprope"?[]:["Rope"]).concat(["Aspect","Season","Rock quality","Wet"]).concat(disc==="trad"||disc==="aid"?["Fixed gear"]:[]);
    _want.forEach(function(k){if(_have.has(k))return;facts.push([k,<span style={{color:C.textMuted,fontStyle:"italic"}}>Not on file yet</span>,true]);});
    const _secL=new Set(CRAG_FACT_SECTIONS.flatMap(function(s){return s[2];}));
    for(let i=stats.length-1;i>=0;i--){if(_secL.has(stats[i][0])){facts.push([stats[i][0],<span style={{color:stats[i][2],fontWeight:700}}>{stats[i][1]}</span>]);stats.splice(i,1);}}
    if(part){const sec=CRAG_FACT_SECTIONS.find(function(s){return s[0]===part;});const rows=sec?sec[2].map(function(l){return facts.find(function(f){return f[0]===l;});}).filter(Boolean):[];return !rows.length?null:part==="rack"?<div style={{marginTop:-6,marginBottom:6,borderBottom:"1px solid "+C.border}}><CragFactRows rows={rows} onEdit={onEdit}/></div>:<CragFactSection title={sec[1]} rows={rows} onEdit={onEdit}/>;}
    facts.splice(0,facts.length,...facts.filter(function(f){return !_secL.has(f[0]);}));
    const _mt=facts.filter(function(f){return f[2];});_missN=_mt.length;_firstMiss=_mt.length?_mt[0][0]:null;
  }
  if(part)return null;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><CardHead>{crag?"ROUTE FACTS":"TECHNICAL STATS"}</CardHead>{onEdit?<EditIconButton onClick={onEdit} title={crag?"Edit route facts":"Edit technical stats"}/>:null}</div>{(function(){var ag=route.alpineGrade||route.alpine_grade,rg=route.rockGrade||route.rock_grade,ig=route.iceGrade||route.ice_grade,adg=route.aidGrade||route.aid_grade,cm=route.commitment,gg=route.grade;var P=[];if(rg)P.push(["Rock",rg]);if(cm)P.push(["Commitment",cm]);if(ag)P.push(["Alpine",ag]);if(ig)P.push(["Ice",ig]);if(adg)P.push(["Aid",adg]);if(P.length<1&&gg)P.push(["Grade",gg]);var notes=[];[["Rock",rg],["Commitment",cm],["Alpine",ag],["Ice",ig],["Aid",adg],["Grade",gg]].forEach(function(p){var d=p[1]?gradeDetail(p[1]):"";if(!d||notes.some(function(n){return n[1]===d;}))return;notes.push([p[0],d]);});if(P.length<1)return null;/* A class RANGE is one grade on screen (its top, or the headline it contains) plus this notice — see gradeRangeNote. */var rangeNote=gradeRangeNote(route);var cmExp=cm?COMMITMENT_EXPLAINERS[String(cm).replace(/^Grade\s*/i,"").trim()]:null;return <div style={{marginBottom:11,paddingBottom:11,borderBottom:"1px solid "+C.border}}><div style={{...SUB_LABEL,marginBottom:7}}>Composite Grade</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{P.map(function(p){return <span key={p[0]} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:13,fontWeight:700,color:C.text,background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"3px 9px"}}><span style={{color:C.textMuted,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.3}}>{p[0]}</span>{singleGrade(p[1],route)}</span>;})}</div>{rangeNote?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:8}}>{rangeNote}</div>:null}{notes.length?<div style={{marginTop:8}}>{notes.map(function(n){return <div key={n[0]} style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:4}}><span style={{fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3}}>{n[0]}</span>{" · "+n[1]}</div>;})}</div>:null}{cmExp?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:8}}>{cmExp}</div>:null}{cmExp?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:4}}>{"Commitment counts the climb, not the walk in — a long approach can make a Grade II a multi-day trip."}</div>:null}</div>;})()}<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>{stats.map(st=><div key={st[0]} style={{background:C.surface,borderRadius:9,padding:"8px 10px"}}><div style={{fontSize:15,fontWeight:700,color:st[2]}}><CountUp value={st[1]}/></div><div style={{fontSize:11,color:C.textMuted,marginTop:2,textTransform:"uppercase",letterSpacing:0.4}}>{st[0]}</div></div>)}</div>{facts.length?<div style={{marginTop:stats.length?14:4}}>{(function(){/* GROUPED, so ten facts do not read as one undifferentiated run: what the line IS, what protects it,
     and when it is in shape. The label column is 92px and wraps at spaces — at 62px "PROTECTION" and
     "ROCK QUALITY" ran under their own values. A heading shows only when more than one group renders. */var G=[["The line",["Also called","Variations","Location","Start"]],["Gear & safety",["Bolts","Protection","Anchor","Rope","Rope notes","Fixed gear","Landing","Crash pads","Descent"]],["Conditions",["Aspect","Sun","Season","Wet","Rock quality"]]];var placed=new Set();var groups=G.map(function(g){var rows=g[1].map(function(l){return facts.find(function(f){return f[0]===l;});}).filter(Boolean);rows.forEach(function(f){placed.add(f[0]);});return [g[0],rows];});var rest=facts.filter(function(f){return !placed.has(f[0]);});if(rest.length)groups[0][1]=groups[0][1].concat(rest);groups=groups.filter(function(g){return g[1].length;});return groups.map(function(g,gi){return <div key={g[0]} style={{marginTop:gi?14:0}}>{groups.length>1?<div style={{...SUB_LABEL,color:C.textSub,paddingBottom:6,marginBottom:2,borderBottom:"1px solid "+C.border}}>{g[0]}</div>:null}{g[1].map(function(f,i){return <div key={f[0]} style={{display:"flex",gap:12,alignItems:"baseline",padding:"8px 0",borderTop:i===0?"none":"1px solid "+C.borderLight}}><span style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.35,width:92,flexShrink:0}}>{f[0]}</span><span style={{fontSize:13,color:C.text,lineHeight:1.5,flex:1,minWidth:0,overflowWrap:"anywhere"}}>{f[1]}</span></div>;})}</div>;});})()}</div>:null}{_missN&&onEdit?<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap",marginTop:12,paddingTop:10,borderTop:"1px solid "+C.border}}><span style={{fontSize:12,color:C.textMuted,lineHeight:1.4}}>{_missN+(_missN===1?" fact":" facts")+" not on file yet"}</span><button onClick={function(){onEdit(FACT_FIELD[_firstMiss]);}} style={{padding:"6px 0",border:"none",background:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{"Add what you know →"}</button></div>:null}{route.fa&&!(route.peakMetadata&&route.peakMetadata.firstAscent)?<div style={{marginTop:10,fontSize:12.5,color:C.textSub,lineHeight:1.4}}><span style={{...SUB_LABEL}}>First Ascent</span>{" · "+route.fa}</div>:null}{(function(){/* The first FREE and first WINTER ascent sit under the first-ascent line, each only when present and
   different from it. Both go through usableFa(), the same placeholder test `fa` gets ("unknown", "??"). */var fa0=String(route.fa||"").trim();var rows=[["First Free Ascent",route.ffa],["First Winter Ascent",route.fwa]].map(function(p){var v=usableFa(p[1]);return [p[0],v==null?"":String(v).trim()];}).filter(function(p){return p[1]&&p[1]!==fa0;});if(!rows.length)return null;return <>{rows.map(function(p,i){return <div key={p[0]} style={{marginTop:(i||route.fa)?4:10,fontSize:12.5,color:C.textSub,lineHeight:1.4}}><span style={{...SUB_LABEL}}>{p[0]}</span>{" · "+p[1]}</div>;})}</>;})()}{note?<div style={{fontSize:11.5,color:C.textMuted,marginTop:8,lineHeight:1.5}}>{note}</div>:null}</div>;
}
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
/* THE STATE IS `aria-expanded`, NOT WORDS IN THE NAME. These rows are disclosures — tapping one
   reveals its own detail and changes nothing else — and this file already states the convention
   on TagChip: "`aria-expanded` rather than `aria-pressed`: this is a disclosure, not a toggle
   that changes anything". The stage row's old ▸ carried it and lost it when the whole row became
   the control, which is a regression rather than a gap; the pitch row spelled "collapsed" into
   its own label instead, which announces the state to a screen reader and to nothing else — no
   automation, and no user agent that offers "expand" as an action. So the attribute carries it
   and the name stops repeating it: with both, a reader hears "collapsed" twice. */
function pitchRowName(p){
  const bits=["Pitch "+p._badge];
  if(p.grade)bits.push(String(p.grade));
  if(p.crux)bits.push("crux");
  if(p._title)bits.push(String(p._title));
  return bits.join(", ");
}
function stageRowName(r){
  const bits=["Section "+r._seq,r._label];
  if(r.crux)bits.push("crux");
  if(r.grade)bits.push(String(r.grade));
  return bits.filter(Boolean).join(", ");
}
/* ANCHORS CHANGE BY PITCH (owner's note, 2026-10-24: "some use trees or gear and some are bolted").
   anchorKind() files a stored anchor string under the editor's own PITCH_ANCHORS vocabulary, so a
   "2-bolt anchor (alcove)" lights the Bolted chip and the page can say which pitches end where.
   Walk-off first (a "walk off, no anchor" must not read as bolted), then fixed anchors, then the
   natural ones; gear last because "gear" also appears as a qualifier. Null when nothing matches. */
function anchorKind(s){const t=String(s||"").toLowerCase();if(!t.trim())return null;
  if(/walk[\s-]?off|no belay|unroped/.test(t))return "Walk-off (no belay)";
  if(/bolt|chain|ring|glue[\s-]?in|fixed anchor|rap station/.test(t))return "Bolted";
  if(/tree|bush|shrub/.test(t))return "Tree";
  if(/horn|block|chockstone|boulder/.test(t))return "Slung horn / block";
  if(/piton|fixed pin|\bpins?\b/.test(t))return "Fixed pin";
  if(/picket|deadman|snow anchor|bollard/.test(t))return "Picket";
  if(/screw|v[\s-]?thread|abalakov/.test(t))return "Ice screws";
  if(/gear|cam|nut|natural|trad/.test(t))return "Gear";
  return null;}
/* A pitch label that is a plain number (3, "3") — not a range ("3-4") or a named leg ("Approach gully"). */
function isNumLbl(v){return typeof v==="number"?isFinite(v):(typeof v==="string"&&/^\s*\d+\s*$/.test(v));}
/* The pitch editor's rows in the PAGE's order, plus a not-described row for each pitch the route
   claims and does not describe (see routePitches in SuggestFix). `rows` is the draft built from
   pitch_detail, or [blank(1)] when there is none; `r` carries only pitchDetail and pitches. */
function padPitchRows(rows,r,blank){const pd=(r.pitchDetail&&r.pitchDetail.length)?r.pitchDetail:[];let out=pd.length?rows.slice():[];
  if(out.length&&out.every(function(x){return isNumLbl(x.pitch);}))out.sort(function(a,b){return +a.pitch-+b.pitch;});
  const described=pd.length?breakdownRows(r).pitchCount:0;const claimed=+r.pitches>0?Math.round(+r.pitches):0;
  if(claimed>described&&(!pd.length||pitchShortfall(r,pd.length))&&(pd.length||claimed>1)){const top=out.reduce(function(m,x){return isNumLbl(x.pitch)?Math.max(m,+x.pitch):m;},0);for(let k=0;k<claimed-described;k++)out.push(Object.assign(blank(top+k+1),{_pad:true}));}
  return out.length?out:rows;}
/* "P1–3, P5" from a list of pitch numbers. */
function pitchSpanText(ns){const s=ns.slice().sort(function(a,b){return a-b;});const out=[];for(let i=0;i<s.length;i++){let j=i;while(j+1<s.length&&s[j+1]===s[j]+1)j++;out.push(j>i?"P"+s[i]+"–"+s[j]:"P"+s[i]);i=j;}return out.join(", ");}
/* The route's anchors, pitch by pitch, grouped by kind in climbing order: [[kind, "P1–3, P5"], …].
   Null unless at least two roped pitches carry a classifiable anchor AND they are not all one kind —
   a route whose every belay is bolted says nothing a single Anchor value does not. */
function pitchAnchorSummary(route){const rows=breakdownRows(route).rows.filter(function(r){return r._kind==="pitch"&&anchorKind(r.anchor);});if(rows.length<2)return null;const by={};const order=[];rows.forEach(function(r){const k=anchorKind(r.anchor);const n=parseInt(r._badge,10);if(!isFinite(n))return;if(!by[k]){by[k]=[];order.push(k);}by[k].push(n);});if(order.length<2)return null;return order.map(function(k){return [k,pitchSpanText(by[k])];});}
const pitchAnchorText=function(sum){return sum.map(function(x){return x[0]+" "+x[1];}).join(" · ");};
/* A PITCH'S PHOTOS, WITH AN ADD BUTTON ON THE PITCH ITSELF (owner's note, 2026-10-25: "a photo right there of the pitch").
   The upload is a route photo tagged with the pitch's label (contributions value.pitch), so the route's Photos tab still
   lists it with the rest. Signed out there is no upload, and the box says so rather than offering a button that does nothing. */
function RouteBreakdown({route,focus,onEdit,comments,commentsUnavailable,onCommentAdd,dbPhotos,onAddPitchPhoto,logged}){
  const [open,setOpen]=useState(null);
  const photosOf=function(r){return (dbPhotos||[]).filter(function(p){return p._pitch!=null&&String(p._pitch)===String(r._n);});};
  const {rows,pitchCount,stageCount}=breakdownRows(route);
  useEffect(function(){if(focus==null)return;const hit=rows.filter(r=>r._kind==="pitch")[focus];if(hit)setOpen(hit._i);},[focus]); // eslint-disable-line react-hooks/exhaustive-deps -- opens the pitch row only when the focus request changes; rows is rebuilt every render and must not re-fire it
  if(!rows.length)return null;
  const hasPitchLen=rows.some(r=>r._kind==="pitch"&&r.lengthM!=null);
  const hasStageLen=rows.some(r=>r._kind==="stage"&&r.lengthM!=null);
  /* THE SHORTFALL IS pitchShortfall()'s, NOT A COUNT OF PITCHES. #1440 measured the mismatched
     version on the live catalog: comparing `route.pitches` against the ROPED half told 55 routes
     that entries were undescribed while every one of them was on screen, because the denominator
     was counting the very stages the old table filtered out. Merging the two sections removes the
     mechanism — everything described is in this list — but the rule stays the rule, and passing
     `rows.length` is what says so: a shortfall may only be claimed when the route claims more
     pitches than the page describes ANYWHERE. */
  /* STATE THE GAP, not both totals. This read "The route lists 20 pitches and 18 sections are
     described here." — a run-on whose "and" joins a noun phrase to a clause, and which then
     REPEATS the count the intro has just given ("18 roped pitches, in route order.") under a
     different noun. Captured verbatim on CI's demo walk. What a climber wants from this line is
     the number of pitches with no description; `pitchCount` is the described roped pitches, so
     the subtraction is in one unit. It cannot go zero or negative here: pitchShortfall only
     fires when route.pitches exceeds pitchDetail.length, and pitchCount is at most that. */
  const _anchors=pitchAnchorSummary(route);
  const _undesc=route.pitches-pitchCount;
  const short=pitchShortfall(route,rows.length)?(" The route lists "+route.pitches+" pitches, so "+_undesc+(_undesc===1?" is":" are")+" not described here."):"";
  const intro=(pitchCount&&stageCount)
    ?("The whole climb in order — "+rows.length+" sections, of which "+pitchCount+" are roped pitches and "+stageCount+" are travel or route-finding legs."+short)
    :(pitchCount
      ?(pitchCount+" roped pitch"+(pitchCount!==1?"es":"")+", in route order."+short)
      :("How the route goes, section by section — "+stageCount+" leg"+(stageCount!==1?"s":"")+". These are stages of travel and route-finding, not roped pitches."));
  return <div id="route-breakdown" style={{marginBottom:ROUTE_GAP,scrollMarginTop:"80px"}}>
    <SL action={<div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11.5,color:C.textMuted,whiteSpace:"nowrap"}}>Tap a row for detail</span>{onEdit?<EditIconButton onClick={onEdit} title="Edit the route breakdown"/>:null}</div>}>ROUTE BREAKDOWN</SL>
    <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>{intro}</div>
      {/* ASK THE CLIMBER WHO WAS THERE (owner note 2026-10-25, belay stations; multipitch audit proposal 2,
          "prompt for pitches after logging a multipitch"). Online research could place a belay on 449
          pitches and no further, so the rest can only come from climbers. Someone who has logged this
          route sees how many pitches still lack one and a button that opens the editor at the first. */}
      {(function(){const _noBelay=rows.filter(function(r){return r._kind==="pitch"&&!String(r.belay||"").trim();});
        if(!logged||!onEdit||!_noBelay.length)return null;
        return <div data-belay-ask="" style={{background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
          <div style={{fontSize:12.5,fontWeight:700,color:C.onSolid,marginBottom:3}}>You've climbed this</div>
          <div style={{fontSize:12,color:C.onSolid,lineHeight:1.5,marginBottom:8}}>{_noBelay.length+(_noBelay.length===1?" pitch has":" pitches have")+" no belay station yet. Say where you belayed, and the next party will find it."}</div>
          <button onClick={function(){onEdit(_noBelay[0]._i);}} style={{...BTN_SM,background:C.blueSolid,color:C.onSolid,border:"none"}}>Add belay stations</button>
        </div>;})()}
      {_anchors?<div data-pitch-anchors="" style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:10,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}><span style={{fontWeight:700,color:C.text}}>{"Anchors change by pitch: "}</span>{_anchors.map(function(x,i){return <span key={x[0]}>{i?" · ":""}<span style={{fontWeight:700,color:x[0]==="Bolted"?C.green:C.blue}}>{x[0]}</span>{" "+x[1]}</span>;})}</div>:null}
      {rows.map(function(r,idx){
        const isOpen=open===r._i;
        const isPitch=r._kind==="pitch";
        const last=idx===rows.length-1;
        /* EVERY BOX OPENS (owner note 2026-10-22, "more information for each box"). A travel leg
           used to open only when it had a terrain, length or anchor, and then showed three tiles
           that were mostly "—". Now it opens like a pitch does: an edit button that lands on THIS
           entry in the editor, the tiles that carry a value, and climbers' comments on the leg —
           Mountain Project ties beta to each pitch the same way. */
        const hasMore=true;
        /* A LONG terrain is a sentence, so it is drawn as one: a small full-width line under the leg's name, not a
           right-aligned chip that wraps beside the label, and not a third-width bold tile when the row opens
           (owner note 2026-10-28, Mount Logan's "Hiking, steep descent through alpine meadows and forest" read
           stacked in both). A short one ("Class 2", "Scree, Class 2") is still a chip. */
        const longTerrain=!isPitch&&!!r.grade&&(String(r.grade).length>18||String(r.grade).trim().split(/\s+/).length>3);
        /* A pitch's tiles drop an empty value the same way a leg's do: a row of "—" told the climber nothing, and PitchConsensus below already asks for what is missing. */
        const stageTiles=(isPitch?[["Length",r.lengthM!=null?uLen(r.lengthM):null,C.blue],["Bolts (this pitch)",r.bolts!=null?String(r.bolts):null,C.amber]]:[["Terrain",longTerrain?null:r.grade,C.amber],["Length",r.lengthM!=null?uLen(r.lengthM):null,C.blue],["Anchor / belay",r.anchor,C.blue]]).filter(t=>t[1]);
        const accent=r.crux?C.amber:(isPitch?C.blue:C.border);
        return <div key={r._i} data-kind={r._kind} data-label={isPitch?("P"+r._badge+(r._title?" "+r._title:"")):r._label} id={isPitch?("pitch-"+r._pIdx):undefined} style={{display:"flex",gap:10,marginBottom:last?0:9,scrollMarginTop:"80px"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
            <div aria-hidden="true" style={{width:26,height:26,borderRadius:isPitch?7:13,background:r.crux?C.amberBg:(isPitch?C.blueBg:C.surface),border:"1px solid "+(r.crux?C.amber:(isPitch?C.blueDim:C.border)),display:"flex",alignItems:"center",justifyContent:"center",fontSize:isPitch?11.5:12,fontWeight:700,color:r.crux?C.amber:(isPitch?"#fff":C.textSub)}}>{isPitch?("P"+r._badge):r._seq}</div>
            {last?null:<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:14}}/>}
          </div>
          <div style={{flex:1,minWidth:0,background:C.surface,border:"1px solid "+C.border,borderLeft:"3px solid "+accent,borderRadius:10}}>
            <div {...(hasMore?clickable(function(){setOpen(isOpen?null:r._i);}):{})} aria-expanded={hasMore?isOpen:undefined} aria-label={hasMore?(isPitch?pitchRowName(r):stageRowName(r)):undefined} style={{padding:"9px 11px",minHeight:44,boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"center",cursor:hasMore?"pointer":"default"}}>
              {(isPitch&&r._title)?<div style={{fontSize:12.5,fontWeight:700,color:C.text,marginBottom:3,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r._title}</div>:null}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap",marginBottom:(r._note&&!longTerrain)?5:0}}>
                <span style={{fontSize:13,fontWeight:700,color:isPitch?C.amber:C.text,minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{isPitch?(r.grade||("Pitch "+r._badge)):r._label}{r.crux?<span style={{...SUB_LABEL,color:C.red,marginLeft:6,whiteSpace:"nowrap"}}>CRUX</span>:null}</span>
                {/* A stage's `grade` is TERRAIN PROSE, not a grade token: measured across the
                    live catalog it runs to 51 characters ("Class 2-3 rock scramble (easy snow
                    ridge in winter)", "Glacier travel to a bergschrund/moat"). Drawn as a
                    nowrap chip in a flexShrink:0 group it measured 315px wide and put its own
                    row's right edge at x=392 on a 390px phone, clipping the ▸ expander off
                    screen. So this group SHRINKS and WRAPS, and only the ▸ is pinned. Do not
                    restore whiteSpace:nowrap here — that is what a pitch grade wants, and a
                    stage is the other half of pitch_detail. */}
                <span style={{display:"flex",alignItems:"center",gap:7,flexShrink:1,minWidth:0,flexWrap:"wrap",justifyContent:"flex-end",marginLeft:"auto"}}>
                  {(!isPitch&&r.grade&&!longTerrain)?<span style={{fontSize:11.5,fontWeight:700,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:6,padding:"2px 7px",minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r.grade}</span>:null}
                  {(isPitch?hasPitchLen:(hasStageLen&&r.lengthM!=null))?<span style={{fontSize:11.5,color:C.textMuted,whiteSpace:"nowrap"}}>{r.lengthM!=null?uLen(r.lengthM):"—"}</span>:null}
                  {(isPitch&&hasPitchLen&&r._cum)?<span style={{fontSize:11.5,color:C.textMuted,opacity:0.6,whiteSpace:"nowrap"}}>{uLen(r._cum)+" up"}</span>:null}
                  {hasMore?<Chevron open={isOpen} size={16} color={C.blue}/>:null}
                </span>
              </div>
              {longTerrain?<div data-terrain="" style={{fontSize:11.5,fontWeight:600,color:C.amber,lineHeight:1.45,margin:"3px 0 "+(r._note?"4px":"0"),wordBreak:"break-word",overflowWrap:"break-word"}}>{r.grade}</div>:null}
              {r._note?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,wordBreak:"break-word",overflowWrap:"break-word"}}>{r._note}</div>:null}
            </div>
            {isOpen?<div style={{padding:"0 11px 11px"}}>{onEdit?<button onClick={function(e){e.stopPropagation();onEdit(r._i);}} style={{...editBtnStyle(C),marginTop:8}}><EditPencil C={C}/>{isPitch?"Edit this pitch":"Edit this section"}</button>:null}
              {stageTiles.length?<div style={{marginTop:2,paddingTop:9,borderTop:"1px solid "+C.borderLight,display:"grid",gridTemplateColumns:isPitch?"repeat(2,1fr)":"repeat(3,1fr)",gap:7,marginBottom:isPitch?9:0}}>
                {stageTiles.map(function(s){return <div key={s[0]} style={{background:C.card,borderRadius:8,padding:"7px 9px",textAlign:"center",minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:s[2],overflowWrap:"anywhere"}}>{s[1]}</div><div style={{fontSize:11,color:C.textMuted,marginTop:2,lineHeight:1.3}}>{s[0]}</div></div>;})}
              </div>:null}
              {isPitch?<><PitchConsensus p={r} onSuggestFix={onEdit?function(){onEdit(r._i);}:null}/><CardHead style={{marginBottom:8}}>Photos</CardHead><PitchPhotos items={photosOf(r)} onAdd={onAddPitchPhoto?function(fs){return onAddPitchPhoto(fs,r._n);}:null}/><PitchComments targetId={route.id+"_pitch_"+r._n} comments={comments} commentsUnavailable={commentsUnavailable} onAdd={onCommentAdd}/></>:<PitchComments title="Comments on this section" targetId={route.id+"_pitch_"+r._n} comments={comments} commentsUnavailable={commentsUnavailable} onAdd={onCommentAdd}/>}
            </div>:null}
          </div>
        </div>;})}
    </div>
  </div>;
}
/* A coordinate you can read out, and one tap to copy it. Shared by both rows of CragLocationCard. */
/* The pin editor's TYPES on a crag route. A crag has no summit or camp; it has a car park, the trail
   junctions to the wall, water and hazards. The stored type stays "Trailhead" -- trailheadPoint()
   reads that first -- and is SHOWN as Parking, which is what it is at a crag. */
const WP_TYPES_CRAG=["Trailhead"];/* A crag climb carries no waypoints: the only pin a crag climber sets is where to PARK (stored Trailhead, shown as Parking). The walk in is the GPX line drawn on the CRAG MAP. A pin already stored with another type keeps its own chip (the concat below). */
function wpTypeLbl(t,disc){return t==="Trailhead"&&CRAG_CATS.includes(disc)?"Parking":t;}



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
export function campingGate(route){
  return ["alpine","mountaineering","scrambling","ice","mixed"].includes(catOf(route))||climbsAPeak(route);
}
/* A COMMENT SOMEONE TYPED AT LENGTH opens at three lines with a Read more (owner's note, 2026-10-25: "if someone types
   too much so it doesn't fill the screen"). Short comments render whole, with no button. */
/* THE PLANNER PRINTED ITS DAY PLAN TWICE, AND THE SECOND COPY WAS THE WORSE ONE.
   `timing.sectionBreakdown[i]` is `{section, fromTo, note, hrs}` and `itinerary.days[i]` is
   `{n, title, note, hours, miles, gainFt, lossFt, packLb, objective, schedule}` — and entry for
   entry, `fromTo` IS `title`, `hrs` IS `hours`, `note` IS `note`. Trip plan renders first, then
   PUBLISHED TIMES repeats it a few hundred pixels down.

   Measured across the catalog (scripts/oneoff/measure-timing-vs-itinerary-shape.mjs): of the 546
   routes carrying a sectionBreakdown, **526 (96.3%) are mirrored entry-for-entry by the days**,
   and on **497** of those the sectionBreakdown `note` is TRUNCATED mid-sentence with an ellipsis
   — so the repeat is not merely redundant, it is a cut-off version of the paragraph already on
   screen above it. The days also carry miles, gain, loss, pack weight and an objective that the
   sections do not.

   So the repair is to stop rendering the duplicate, NOT to merge two panels — which was the first
   plan, and assumed the two carried different content. Nothing is dropped from the panel itself:
   the four hour tiles and `recommendedStart` are its own fields and always render.

   IT IS CONDITIONAL BECAUSE 20 ROUTES STILL NEED IT: 14 whose sectionBreakdown says something the
   days do not, and 6 with no itinerary days at all, where this panel is the only place the
   breakdown reaches a screen. Suppressing unconditionally would delete their only copy — the
   [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] shape. `section`
   ("Approach") is deliberately NOT compared: it is a coarse category rather than content, and
   demanding the day repeat it would keep every duplicate on screen. */
function sectionsCoveredByItinerary(route){
  const sb=(route&&route.timing&&Array.isArray(route.timing.sectionBreakdown))?route.timing.sectionBreakdown:[];
  const days=(route&&route.itinerary&&Array.isArray(route.itinerary.days))?route.itinerary.days:[];
  if(!sb.length||days.length!==sb.length)return false;
  const n=function(x){return String(x==null?"":x).trim();};
  return sb.every(function(sec,i){
    const d=days[i]||{};
    if(n(sec.fromTo)!==n(d.title))return false;
    if(!((sec.hrs==null&&d.hours==null)||Number(sec.hrs)===Number(d.hours)))return false;
    const sn=n(sec.note),dn=n(d.note);
    // An ellipsis-terminated section note is the SHORTER copy; the day holds the full sentence,
    // so a day that merely STARTS with it still covers it.
    return !sn||dn===sn||dn.startsWith(sn.replace(/[\u2026.]+$/,""));
  });
}
/* `activity` is passed in rather than read off `route`: the merged list RouteDetail builds is
   seed reports + the reader's own logs + OTHER CLIMBERS' logs from the DB (#787), and only that
   third source makes "what parties actually took" mean more than "what I took". Defaulted so a
   caller that omits it renders the estimate exactly as before rather than throwing. */
function Calculator({route,activity,fit:fitProp,setFit:setFitProp,calc,onCalc}){
  /* THE PLANNER INPUTS SURVIVE A SUB-TAB SWITCH, which is the same fix #1581 gave FloatPlan one
     sub-tab over. <Calculator/> renders ~17k characters inside the `tab==='planner'` branch, so
     tapping Safety to check the hazards unmounted it and every input reverted: pack 10kg, party 2,
     depart 06:00. The climber came back to a DIFFERENT estimated summit time than the one they had
     just read, with nothing on screen saying it had changed — and a lighter pack reads FASTER, the
     optimistic direction #641 records for the return tile.
     ONE OF THE FOUR WAS ALREADY LIFTABLE AND THE MECHANISM WAS NEVER WIRED: `fit`/`setFit` props
     existed and the single call site passed neither, so `fitProp` was undefined and it fell back to
     local state like the other three. A lift nothing hands state to is not a lift. The props are
     kept so a caller can still drive fitness alone; `calc`/`onCalc` carry all four. */
  const [own,setOwn]=useState({fit:"intermediate",pack:10,party:2,depart:6});
  const st=calc||own,setSt=onCalc||setOwn;
  const setK=k=>v=>setSt(x=>({...x,[k]:v}));
  const fit=fitProp||st.fit,setFit=setFitProp||setK("fit");
  const pack=st.pack,setPack=setK("pack");
  const party=st.party,setParty=setK("party");
  const depart=st.depart,setDepart=setK("depart");
  /* The time maths -- stored legs vs the walk model, the up/down split, the whole-day rows -- live in
     lib/planTimes.js, because the Conditions tab's alpine start counts back from the same estimate. */
  const P=planTimes(route,{fit,pack,party,depart});
  const {hasPublishedSummitH,hasDerivedSummitH,publishedIsWholeDay}=P;
  const hasHikeInputs=(route.distKm!=null&&route.distKm!=="")||(route.gainM!=null&&route.gainM!=="");
  // hasHikeInputs is an OR, so ONE of the three is enough to render a confident total -- while
  // scarfHrs still charges every missing component as 0. Measured on the live catalog: 950
  // routes render a confident estimate and only 625 carry all three, so 325 of them (34%) were
  // quoting a number with a silently free leg. Worst case is dist-only, which drops both the
  // gain and the descent: a route with 1,200 m of climbing rendered a 1.8hr approach as fact,
  // in green, against 5.6hr once the missing pieces are supplied. Name the components rather
  // than saying "no approach data", because here most of it IS present.
  const _missHike=[];
  if(route.distKm==null||route.distKm==="")_missHike.push("approach distance");
  if(route.gainM==null||route.gainM==="")_missHike.push("elevation gain");
  if(route.lossM==null||route.lossM==="")_missHike.push("elevation loss");

  /* There used to be a `hikeCoversWholeDay` flag here (gainCoversWholeOuting: gain and loss within
     3%) that relabelled the Approach tile "On foot" and dropped the walk out from the return,
     because the one walk leg charged gain AND loss and so was already the round trip on those rows.
     The walk is split into its up and down legs now (lib/planTimes.js), so there is no round
     trip to relabel and nothing counted twice: the tile is the walk IN on every row, and every
     return walks out. check:return-leg holds both. */
  /* A gain PRESENT and contradicted, as opposed to absent. _missHike above names what is
     missing; this names what is impossible. Both make the number below a floor, so they are
     worded the same way and sit together. */
  const gainShort=gainBelowOwnPins(route);
  const missHikeLabel=_missHike.length===1?_missHike[0]:_missHike.slice(0,-1).join(", ")+" or "+_missHike[_missHike.length-1];
  const hasAnyEstimate=hasHikeInputs||hasPublishedSummitH||hasDerivedSummitH||realPitches(route)>0||P.loneApproachH!=null||P.loneDescentH!=null;
  const {hikeH,techH,sumH,retH,storedApproachH}=P;
  const dayOf=h=>Math.floor(Math.round(h*60)/1440);const fmt=h=>{let total=Math.round(h*60);const day=dayOf(h);total=total%1440;const hr=Math.floor(total/60),mn=total%60,ap=hr>=12?"PM":"AM",h12=hr%12||12;return `${h12}:${String(mn).padStart(2,"0")} ${ap}${day>0?" (+"+day+"d)":""}`;};
  /* THE TWO RED LABELS BELOW ARE COMPARED AGAINST A CLOCK HOUR, AND sumH/retH ARE UNBOUNDED.
     Both are absolute hours from midnight of the DEPARTURE day, so an estimate that crosses
     midnight passes 18.5 (6:30 PM) and 13 (1:00 PM) permanently -- while `fmt`, declared one line
     up, reduces the same value mod 1440 to render a clock time and appends "(+Nd)". The result was
     a red "After dark" beside "Est. return 12:10 PM (+1d)", and "Leave earlier" beside a 4:28 AM
     summit, where leaving earlier makes it DARKER. Measured across the WA catalog at the
     calculator's default settings: 168 of 495 "After dark" labels annotated a return in broad
     daylight (eight within 15 minutes of NOON, one of them wa_mount_stuart_north_ridge -- the
     route check:ui pins as its sample), and 67 of 556 "Leave earlier" labels sat beside a morning
     summit.

     THE TESTS ARE RIGHT AND THE WORDING WAS WRONG, which is why neither threshold moves. `retH >
     18.5` is exactly "this outing runs past dusk", which is the correct trigger for a warning on
     any outing however long; what it cannot say is WHICH DAY the arrival lands on. So the trigger
     is untouched -- no warning is added and none is suppressed -- and the LABEL gains the day.
     "Overnight" is the stronger claim of the two, not a softer one, so this cannot under-warn in
     the #641 direction: a party out past a second dawn is being told something larger than "after
     dark", not something smaller. The tile stays red either way.

     `dayOf` is the SAME function `fmt` uses for the "(+Nd)" suffix, deliberately: a second
     next-day test written here could disagree with the suffix rendered inches away. */
  /* `multiDay` WAS GATED ON `route.campOptions`, WHICH IS SEED-ONLY, SO THIS DISCLAIMER RENDERED
     FOR NOBODY IN PRODUCTION — on exactly the routes whose single-push estimate is least
     believable. The shared derivation and the measurement behind it are in lib/outing.js; note in
     particular that porting the old gate to `bivy` would have LOOKED like a fix and changed
     nothing, because 0 of the 796 WA routes carrying a bivy entry has a starred camp.
     THE COPY MOVED WITH THE GATE, and it had to: it used to say "use the Plan tab for a realistic
     day-by-day plan" while sitting ON the Plan tab, with <ItineraryView/>'s "Trip plan" rendered
     directly above it — a pointer past the very thing it was pointing at, invisible for as long
     as the box rendered for nobody. Ask what a newly-reachable surface SAYS, not only that it now
     reaches somebody. */
  const late=retH>18.5,sumLate=!publishedIsWholeDay&&sumH>13,multiDay=isMultiDayOuting(route);
  // The N/A on the Approach tile was only half that fix. Total, Est. summit and Est. return
  // all still add hikeH, and hikeH is 0 whenever the approach inputs are missing -- 204,469
  // of the catalog's 205,492 routes. It used to be obvious (0.0hr Total, summit at the
  // departure minute); once a pitch count made techH non-zero it merely looked plausible,
  // so the tell went away and the fault did not. These are lower bounds, not estimates.
  // Never paint one green either: a green "Est. return" asserts you are down before dark,
  // and with the walk in and the walk out both counted as zero we cannot assert that.
  /* A STORED approach or descent is not a hole: lib/planTimes.js uses the route's own leg where it
     has one, so a leg is a floor only when it is neither stored nor fully walkable. */
  const {walkInKnown,walkOutKnown}=P;
  const approachUnknown=hasAnyEstimate&&!(walkInKnown&&walkOutKnown)&&!publishedIsWholeDay;
  /* THE SAME DEFECT ON THE OTHER LEG. `techHrs(0,...)` is 0, so a roped route with no recorded
     pitch count and no published or derived summit time contributes a climbing leg of ZERO to
     Total, Est. summit and Est. return -- "unknown" counted as "none", which is exactly what the
     comment above says about the walk. The catalog makes it look enormous (128,020 roped routes
     store 0 or null pitches) and the SCREEN is what decides: `cragOnly` means trad and sport
     never mount this calculator at all, `hasAnyEstimate` ends in `!!route.pitches` which is FALSY
     at 0, and the Climbing tile already renders N/A. Measured 2026-09-23 by
     scripts/oneoff/measure-zero-pitch-estimate-reach.mjs: SIX routes reach this state, three of
     which `approachUnknown` was already hedging for its own reasons. This is the other three.

     climbKnown IS THE CLIMBING TILE'S OWN TEST, not a second one written beside it. That tile
     renders `techH` when `(hasPublishedSummitH||hasDerivedSummitH||route.pitches)` and N/A
     otherwise, so deriving the marker from the same expression means the "N/A" and the ">=" can
     never disagree -- the rule this file already applies to `_hfr`, `_memN` and `dayOf`.

     NO `!publishedIsWholeDay` CLAUSE, deliberately: `publishedIsWholeDay` requires either
     `summitTimeHrs != null` (`hasPublishedSummitH`) or a positive total with no legs
     (`hasDerivedSummitH`), so it is a SUBSET of climbKnown and the guard could never fire. A redundant condition in a guard reads as
     coverage and is not, so it is asserted in probe-climb-leg-lower-bound.mjs instead of
     written here. */
  const climbKnown=P.climbKnown;
  const climbUnknown=hasAnyEstimate&&!climbKnown;
  /* The AGGREGATES are lower bounds if EITHER leg is missing; the Approach tile keeps its own
     flag, because an unrecorded pitch count says nothing about the walk. */
  const lowerBound=approachUnknown||climbUnknown;
  /* A section of the Plan tab like TRIP PLAN above it, so it takes the same section header (owner's note,
     2026-10-25: "It should look like all the other headers"); it was a 14px blue title inside its own card. */
  return <div><SL>Full trip time</SL><div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
    {/* The heading used to read "PUBLISHED TIMES · CAR-TO-CAR", hardcoded on every route carrying a
        timing object, and it never asked whether the published plan WAS car-to-car. Measured over
        the 1,005 WA routes that have one: 404 contradict it in their own words ("5:30 AM from
        camp", "Approach and climb to a bivy below the Gendarme", and one that says outright
        "Pre-dawn if attempting car-to-car; otherwise plan a two-day overnight itinerary"), only
        217 positively support it, and 384 say nothing either way. Car-to-car means no bivy, and a
        climber reading "car-to-car, 23 hr" plans a single push.
        DERIVING the label was measured and rejected: with 384 rows silent, any needle fails in the
        direction that KEEPS the claim on a route that never earned it. The trip style is already
        in the row's own words directly below — `recommendedStart` says "from camp" or a clock
        time, and the section breakdown names each leg — so dropping the unearned half of the
        heading loses nothing and asserts nothing. */}
    {route.timing?(function(){var tm=route.timing;var sb=Array.isArray(tm.sectionBreakdown)?tm.sectionBreakdown:[];var _sbDup=sectionsCoveredByItinerary(route);var _sbShow=_sbDup?[]:sb;return <div style={{background:C.blueBg,borderRadius:10,padding:"10px 12px",margin:"4px 0 12px",border:`1px solid ${C.blueDim}`}}><div style={{...SUB_LABEL,marginBottom:6}}>PUBLISHED TIMES</div>{tm.recommendedStart?<div style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{"Recommended start: "}<b style={{color:C.text}}>{tm.recommendedStart}</b></div>:null}<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:_sbShow.length?8:0}}>{[["Approach",tm.approachTimeHrs],["Summit",tm.summitTimeHrs],["Descent",tm.descentTimeHrs],["Total",tm.totalHrs]].filter(function(x){return x[1]!=null;}).map(function(x,i){return <div key={i} style={{flex:"1 1 56px",background:C.surface,borderRadius:8,padding:"6px 4px",textAlign:"center"}}><div style={{fontSize:10,color:C.textMuted,fontWeight:700}}>{x[0].toUpperCase()}</div><div style={{fontSize:14,fontWeight:800,color:x[0]==="Total"?C.blue:C.text}}>{x[1]+" hr"}</div></div>;})}</div>{_sbShow.map(function(s,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:`1px solid ${C.borderLight}`}}><div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:600,color:C.text}}>{s.section}{s.fromTo?<span style={{color:C.textMuted,fontWeight:400}}>{" · "+s.fromTo}</span>:null}</div>{s.note?<div style={{fontSize:11,color:C.textMuted,marginTop:1,lineHeight:1.4}}>{s.note}</div>:null}</div><div style={{fontSize:12.5,fontWeight:700,color:C.blue,flexShrink:0,whiteSpace:"nowrap"}}>{typeof s.hrs==="number"?s.hrs+" hr":null}</div></div>;})}</div>;})():null}
    {/* What parties actually took, above the model that predicts it. Ordering is the point:
        the guidebook figure first (route.timing), then measured reality, then the estimate —
        so a formula never sits above evidence. Renders only when somebody has logged a real
        number; there is no empty state, because "0 parties have logged this" is noise on the
        204,000 routes nobody has logged. */}
    {(function(){var _lt=loggedTimeStats(activity);if(!_lt)return null;var _spread=_lt.minMin!==_lt.maxMin?(fmtDurMin(_lt.minMin)+"–"+fmtDurMin(_lt.maxMin)):null;var _legLbl={approachMin:"approach",climbMin:"climb",descentMin:"descent"};var _legs=Object.keys(_lt.legs).map(function(k){return _legLbl[k]+" "+fmtDurMin(_lt.legs[k].medianMin);});
      return <div style={{background:C.greenBg,borderRadius:10,padding:"10px 12px",margin:"4px 0 12px",border:"1px solid "+C.greenDim}}>
        <div style={{...SUB_LABEL,marginBottom:4}}>{"WHAT PARTIES ACTUALLY TOOK"}</div>
        <div style={{fontSize:13,color:C.text,fontWeight:700,marginBottom:2}}>{fmtDurMin(_lt.medianMin)+" car-to-car"+(_spread?" · "+_spread:"")}</div>
        <div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>{"Median of "+_lt.n+" logged trip"+(_lt.n!==1?"s":"")+(_legs.length?" · "+_legs.join(", "):"")}</div>
        <div style={{fontSize:11,color:C.textMuted,lineHeight:1.4,marginTop:4}}>{_lt.n===1?"One party, one day's conditions — treat it as a data point, not a forecast.":"Reported by climbers, not adjusted for your fitness or pack."}</div>
      </div>;})()}
    <div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>{/* Names what this number IS, never how it is computed. The formula was on screen
        ("Scarf's Rule + exponential technical grade penalty") and told a climber nothing
        they could act on — the inputs below already say what it responds to. */}
      {(route.timing?"Or estimate for your party":"Estimate for your party")+" · approach, climb and descent, car to car"}</div>
    {P.legsStored?<div data-fit-party="1" style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:-8,marginBottom:12}}>{(publishedIsWholeDay?"The car-to-car time is this route’s published time":storedApproachH!=null?"The approach and climb are this route’s published times":"The climb is this route’s published time")+" for a fit party, so fitness and pack don’t change "+(publishedIsWholeDay||storedApproachH==null?"it":"them")+". Allow more if your party is slower."}</div>:null}
    {multiDay?<div data-multiday={itinDayCount(route)} style={{background:C.amberBg,borderRadius:9,padding:"9px 11px",marginBottom:12,border:`1px solid ${C.amber}44`,fontSize:12,color:C.textSub,lineHeight:1.5}}>{"This route is typically done over "+itinDayCount(route)+" days. The single-push estimate below is a reference only — the "}<b style={{color:C.amber}}>Trip plan</b>{" above is the realistic one."}</div>:null}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
      <div><div style={{...SUB_LABEL,marginBottom:3}}>FITNESS</div><select aria-label="Your fitness level" value={fit} onChange={e=>setFit(e.target.value)} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13}}>{["beginner","intermediate","advanced","expert"].map(f=><option key={f} value={f}>{f[0].toUpperCase()+f.slice(1)}</option>)}</select></div>
      {/* `pack` is kilograms because scarfHrs' penalty tiers are kg (>8, >15), but this was the one input in the app that ignored the unit setting — hardcoded "PACK (KG)" while UNITS defaults to imperial. A US climber typing 30 for a 30 lb pack had it read as 30 kg and got the heaviest slowdown applied to a planning estimate. Show and accept the reader's unit; keep kg in state. */}
      <div><div style={{fontSize:12,color:C.textMuted,marginBottom:3,fontWeight:700}}>{uImp()?"PACK (LB)":"PACK (KG)"}</div><input aria-label="Pack weight" type="number" value={uImp()?Math.round(pack/0.4536):pack} onChange={e=>{var n=Number(e.target.value);if(isNaN(n))return;setPack(uImp()?n*0.4536:n);}} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
      <div><div style={{...SUB_LABEL,marginBottom:3}}>PARTY SIZE</div><input aria-label="Party size" type="number" value={party} onChange={e=>setParty(Number(e.target.value))} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
      <div><div style={{...SUB_LABEL,marginBottom:3}}>DEPART</div><select aria-label="Departure time" value={depart} onChange={e=>setDepart(Number(e.target.value))} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13}}>{Array.from({length:25},(_,i)=>2+i*0.5).map(h=><option key={h} value={h}>{fmt(h)}</option>)}</select></div>
    </div>
    <div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8,marginBottom:10,textAlign:"center"}}>
        <div><div style={{fontSize:17,fontWeight:700,color:C.green}}>{publishedIsWholeDay?"incl.":(hasHikeInputs||storedApproachH!=null||P.loneApproachH!=null)?(walkInKnown?"":"≥")+hikeH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Approach</div></div>
        <div><div style={{fontSize:17,fontWeight:700,color:C.blue}}>{climbKnown?techH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>{publishedIsWholeDay?"Car-to-car":"Climbing"}</div></div>
        {/* N/A, like the Approach tile beside it, when nothing describes the way down: no stored descent, no walk out (distance or gain) and no rappels (#2336 printed "≥0.0hr"). */}
        <div><div style={{fontSize:17,fontWeight:700,color:C.blue}}>{publishedIsWholeDay?"incl.":hasAnyEstimate&&(P.downH>0||P.storedDescentH!=null)?((walkOutKnown||P.storedDescentH!=null)?"":"≥")+P.downH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Descent</div></div>
        <div><div style={{fontSize:17,fontWeight:700,color:C.amber}}>{hasAnyEstimate?(lowerBound?"≥":"")+P.tripH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Total trip</div></div>
      </div>
      <Hr/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div style={{textAlign:"center",background:sumLate?C.redBg:lowerBound?C.card:C.greenBg,borderRadius:8,padding:8}}><div style={{fontSize:17,fontWeight:700,color:sumLate?C.red:lowerBound?C.text:C.green}}>{publishedIsWholeDay?"N/A":hasAnyEstimate?(lowerBound?"≥":"")+fmt(sumH):"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Est. {route.discipline==="bouldering"?"top-out":["sport","trad","toprope","rock","aid","ice","mixed"].indexOf(route.discipline)>=0?"finish":"summit"}</div>{sumLate?<div style={{fontSize:12,color:C.red,marginTop:1}}>{dayOf(sumH)>0?"Overnight":"Leave earlier"}</div>:null}</div>
        <div style={{textAlign:"center",background:late?C.redBg:lowerBound?C.card:C.greenBg,borderRadius:8,padding:8}}><div style={{fontSize:17,fontWeight:700,color:late?C.red:lowerBound?C.text:C.green}}>{hasAnyEstimate?(lowerBound?"≥":"")+fmt(retH):"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Est. return</div>{late?<div style={{fontSize:12,color:C.red,marginTop:1}}>{dayOf(retH)>0?"Overnight":"After dark"}</div>:null}</div>{approachUnknown?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Lower bounds only — this climb has no recorded "+missHikeLabel+", and anything missing counts as zero. Your real day will be longer."}</div>:null}{climbUnknown?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Lower bounds only — nothing on file says how long the climbing takes on this route: no pitch count, no published summit time. It counts as zero in the figures above, so your real day will be longer."}</div>:null}{gainShort?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Lower bound — the recorded gain of "+uElev(gainShort.gainFt)+" is less than the "+uElev(gainShort.riseFt)+" between this route’s own trailhead and summit pins. The times above are figured on the smaller number, so your real day will be longer."}</div>:null}{(!hasPublishedSummitH&&!hasDerivedSummitH&&route.pitches&&pitchedFraction(gn(route.grade))<1)?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Climbing time assumes a party moving continuously on ground this easy rather than belaying every pitch. That is an assumption inside the estimate, not something this route reports — if you plan to pitch it out, roughly double that figure."}</div>:null}
      </div>
    </div>
    {(route.segments||[]).map((seg,i)=>{
      const sh=scarfHrs(seg.distKm,seg.gainM,seg.lossM,fit,pack)+(seg.type==="technical"?techHrs(2,35,gn(route.grade)):0);
      const cumH=depart+route.segments.slice(0,i+1).reduce((s,sg)=>s+scarfHrs(sg.distKm,sg.gainM,sg.lossM,fit,pack)+(sg.type==="technical"?techHrs(2,35,gn(route.grade)):0),0);
      return <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`}}><div style={{width:24,height:24,borderRadius:"50%",background:C.blueBg,border:`1px solid ${C.blueDim}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:"#fff"}}>{i+1}</div><div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700}}>{seg.name}</div><div style={{fontSize:12,color:C.textMuted}}>{uDist(seg.distKm)} · ↑{uGain(seg.gainM)} · {seg.type}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:C.blue}}>{sh.toFixed(1)}hr</div><div style={{fontSize:12,color:C.textMuted}}>ETA {fmt(cumH)}</div></div></div>;
    })}
  </div></div>;
}
const HAZ_KW={"Rockfall":["rockfall","rock fall","falling rock","bowling alley"],"Loose rock":["loose rock","loose block","choss","crumbly","kitty litter"],"Verglas / thin ice":["verglas","thin ice","black ice"],"Runout / sparse pro":["runout","run-out","run out","sparse pro","sparse protection","poorly protected","scary lead"],"Deep / unstable snow":["posthol","deep snow","wallow","unconsolidated","rotten snow","sugar snow"],"Cornice":["cornice"],"Crevasse":["crevasse","crevass"],"Serac / icefall":["serac","icefall","ice fall","hanging ice"],"Avalanche":["avalanche","wind slab","wind-slab","wind loading"],"Wet / seeping rock":["wet rock","seeping","seepage","damp rock"],"Route-finding":["route-finding","route finding","routefinding","off-route","off route","got lost","hard to follow"],"High exposure":["exposed","exposure","no-fall","airy"],"Lightning / storms":["lightning","thunderstorm","afternoon storm","storm rolled"],"River / creek crossing":["river crossing","creek crossing","high water"],/* the rest are the log form's own hazard chips, which matched no category above and so could never reach KNOWN HAZARDS */"Moat / bergschrund":["moat","bergschrund","schrund"],"Weak snow bridges":["snow bridge"],"Loose scree / talus":["loose scree","loose talus"],"Parties above":["parties above","party above","climbers above"],"Bees / wasps":["wasps","bees","hornet","yellowjacket"],"Raptor closure":["raptor","nesting closure","peregrine"],"Bad landing":["bad landing","landing zone"]};
const COND_KW={"Dry / clean":["dry","bluebird","clean rock"],"Wet / damp":["wet","damp","seeping","greasy"],"Snow on route":["snow","boot-pack","bootpack","boot pack"],"Firm névé / boot-pack":["firm neve","supportable","styrofoam","firm snow","good boot"],"Icy":["icy","verglas","glazed"],"Crowded":["crowd","busy","conga","queue","packed"],"Quiet":["quiet","to ourselves","solitude"],"Windy":["wind","gusts","blustery","gale"],"Hot":["hot","baking","scorching"],"Cold":["cold","frigid","freezing"]};
const NEG_CUES=["no ","not ","n't ","without ","never ","free of ","zero ","none ","no sign of ","didn't see","did not see","didnt see","little to no","absent","wasn't any","were no ","no more "];
function _negAt(hay,idx){const pre=hay.slice(Math.max(0,idx-24),idx);return NEG_CUES.some(ng=>pre.indexOf(ng)>=0);}
function _hits(hay,k){let idx=hay.indexOf(k),pos=0,neg=0;while(idx>=0){if(_negAt(hay,idx))neg++;else pos++;idx=hay.indexOf(k,idx+1);}return {pos,neg};}
const SEASON_OF=m=>(m<=1||m===11)?"winter":m<=4?"spring":m<=7?"summer":"fall";
function seasonSummary(months){if(!months||!months.length)return null;const u=[...new Set(months)].sort((a,b)=>a-b);const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const ss=[...new Set(u.map(SEASON_OF))];if(u.length>=7||ss.length>=3)return "year-round";if(u.length===1)return mn[u[0]];if(u.length<=3)return mn[u[0]]+"–"+mn[u[u.length-1]];return ss.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ");}
function kwScan(reports,vocab){const out={};const nowY=new Date().getFullYear();reports.forEach(r=>{const hay=((r.text||"")+" "+((r.condTags||[]).join(" "))).toLowerCase();const yr=r.date?new Date(r.date+"T12:00:00").getFullYear():null;const mo=r.date?new Date(r.date+"T12:00:00").getMonth():null;const w=r.crewId?1:0.72;Object.keys(vocab).forEach(lab=>{let pos=0,neg=0;vocab[lab].forEach(k=>{const h=_hits(hay,k);pos+=h.pos;neg+=h.neg;});if(!out[lab]&&(pos>0||neg>0))out[lab]={label:lab,count:0,weight:0,year:0,neg:0,months:[],reports:[]};if(pos>0){out[lab].count++;out[lab].weight+=w;if(yr&&yr>out[lab].year)out[lab].year=yr;if(mo!=null)out[lab].months.push(mo);out[lab].reports.push({user:r.user,date:r.date||null,avatar:r.avatar,stars:r.stars});}else if(neg>0){out[lab].neg++;}});});return Object.values(out).filter(o=>o.count>0).map(o=>({label:o.label,count:o.count,weight:o.weight,year:o.year||null,recent:o.year?(nowY-o.year)<=1:false,neg:o.neg,months:o.months,season:seasonSummary(o.months),seasons:[...new Set(o.months.map(SEASON_OF))].length,reports:o.reports})).sort((a,b)=>b.count-a.count||(b.year||0)-(a.year||0));}
function routeKw(route){const reports=route.activity||[];const off=(route.hazards||[]).map(x=>x.toLowerCase());const hazards=kwScan(reports,HAZ_KW).map(h=>{const official=off.some(o=>HAZ_KW[h.label].some(k=>o.indexOf(k)>=0));const promoted=!official&&h.count>=5&&h.seasons>=2;return {...h,official,promoted};});const conditions=kwScan(reports,COND_KW);const byL={};conditions.forEach(c=>{byL[c.label]=c;});const dry=byL["Dry / clean"],wet=byL["Wet / damp"],icy=byL["Icy"];const conflicts=[];if(dry&&dry.count>=2&&((wet&&wet.count>=2)||(icy&&icy.count>=2)))conflicts.push("Some climbers report dry rock, others wet or icy — conditions vary or are changing fast. Check the most recent reports.");const dts=reports.map(r=>r.date).filter(Boolean).sort();const lastY=dts.length?new Date(dts[dts.length-1]+"T12:00:00").getFullYear():null;const nowY=new Date().getFullYear();const recentN=reports.filter(r=>r.date&&(nowY-new Date(r.date+"T12:00:00").getFullYear())<=1).length;let cs=Math.min(4,reports.length)+(recentN>=2?2:recentN===1?1:0)+((lastY&&nowY-lastY>=3)?-2:0);const confidence=cs>=7?"High":cs>=4?"Medium":"Low";return {total:reports.length,hazards,conditions,conflicts,confidence,recentN,lastY,nowY};}
/* Exported for scripts/oneoff/probe-consensus-outage-copy.mjs, which renders it directly: it is
   the one surface here that takes the outage flag as a PROP, so it can be driven without a live
   query. Same reason seasonShort and campingGate are exported. */
export function ConsensusPanel({route,activity,hzVotes,onVote,reportsUnavailable,starSum}){
  /* Road tags are left out of THIS panel's tallies: ROAD CONDITIONS sits on the same tab (at its foot) and
     says the same thing as sentences, so on a route with few reports TOP CONDITIONS REPORTED filled
     up with "Road/trailhead closed · Road: washout" and pushed the route's own conditions off it.
     Overview's one-line summary still counts them — the road has no section of its own there. */
  const activityAll=useMemo(function(){return (activity||route.activity||[]).map(function(a){return (a&&(a.condTags||[]).some(isRoadTag))?Object.assign({},a,{condTags:a.condTags.filter(function(t){return !isRoadTag(t);})}):a;});},[activity,route.activity]);
  const [openK,setOpenK]=useState(null);const voteFor=useCallback(function(label){return hzVotes&&hzVotes[route.id+"|"+label];},[route.id,hzVotes]);/* Real reporters' verified status and level (useRealAuthors): both memos read them, so both re-run when they land. */const authorsV=useRealAuthors(activityAll.map(function(a){return a&&a._authorId;}));const c=useMemo(()=>buildConsensus(activityAll,voteFor),[activityAll,voteFor,authorsV]);const k=useMemo(()=>routeKw(Object.assign({},route,{activity:activityAll})),[route.id,activityAll,route.hazards,authorsV]);const kh=useMemo(()=>k.hazards.filter(x=>x.count>=2),[k.hazards]);const kc=useMemo(()=>k.conditions.filter(x=>x.count>=2),[k.conditions]); // eslint-disable-line react-hooks/exhaustive-deps -- authorsV is deliberate: the author cache (useRealAuthors) fills after render and buildConsensus reads it; route is keyed by route.id/route.hazards
  if(!c)return <div style={{color:C.textMuted,fontSize:13,padding:10,marginBottom:ROUTE_GAP}}>{reportsUnavailable?"Couldn’t load this route's reports — try again in a moment.":"No reports yet — be the first to log this climb."}</div>;const _dates=(activityAll||[]).map(function(a){return a.date;}).filter(Boolean).sort();const _latest=_dates[_dates.length-1];/* ONE age ladder, not two. This was a private reimplementation of core's ago(), and the two
     rendered the SAME DATE about 700px apart on this tab: "Updated 3mo ago" above "Most recent
     report: 2mo ago - 2026-06-20", because this ROUNDED (Math.round(75/30) is 3) where ago()
     FLOORS (2). Measured over every distinct date the seed catalog renders, the two disagreed on
     34 of 35. It also had no year bucket at all, so a 2023 report read "44mo ago". The
     four-grade-parsers shape, on dates. ago() is already imported here and already formats
     c.lastDate below -- the very value _latest duplicates -- so this is a consolidation onto the
     helper that was already right, not a third spelling. */
  const _fresh=_latest?"Updated "+ago(_latest):"";const _rc=(activityAll||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));})[0];const _rtx=_rc?(((_rc.condTags||[]).join(" ")+" "+(_rc.text||"")).toLowerCase()):"";const _good=/(dry|perfect|firm|bluebird|tacky|cool|crisp|prime|stellar)/.test(_rtx);const _bad=/(wet|greasy|humid|snow|ice|verglas|slick|warm|hot|damp|muddy|seep|soaked)/.test(_rtx);const _trend=(_good&&!_bad)?{a:"↗",l:"trending good",c:C.green}:((_bad&&!_good)?{a:"↘",l:"trending poor",c:C.red}:{a:"→",l:"holding steady",c:C.textSub});
  const confCol=c.confidence==="high"?C.green:c.confidence==="medium"?C.amber:C.red;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginBottom:ROUTE_GAP}}>{/* A PARTIAL CONSENSUS IS NOT A CONSENSUS. `activity` is route.activity + myReports + dbReports, so a failed reports read silently drops the DB half and buildConsensus runs on what is left — the panel then presents a DERIVED SAFETY JUDGEMENT as if it had seen everything filed. `reportsUnavailable` was already passed in and was consulted ONLY on the empty branch, so exactly this case said nothing. Found by walking the Conditions sub-tab in check:outage for the first time: under a blanket outage the screen CHANGED (3,388 -> 3,384 chars) and acknowledged nothing, which is rule 1. */}{reportsUnavailable?<div style={{fontSize:11.5,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 9px",marginBottom:10,lineHeight:1.45}}>{"Some reports couldn’t load, so this is based on the ones that did — not on everything filed for this route."}</div>:null}{_fresh?<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:11,fontSize:11.5,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:C.green,flexShrink:0,animation:"cm-pulse 2s infinite"}}/><span style={{color:C.textMuted}}>{_fresh}</span><span style={{color:_trend.c,fontWeight:700}}><span className="cm-pop" style={{display:"inline-block"}}>{_trend.a}</span>{" "+_trend.l}</span></div>:null}
    <div style={SZ3}><CardHead>Community Consensus</CardHead><Pill label={`${c.confidence} confidence · ${c.reportCount} report${c.reportCount===1?"":"s"}`} color={confCol} bg={`${confCol}22`} sm/></div>{c.hazards&&c.hazards.length?<div style={{background:C.redBg,border:`1px solid ${C.red}55`,borderRadius:10,padding:"10px 12px",marginBottom:12}}><div style={{...SUB_LABEL,marginBottom:6,color:C.red}}>Recent hazard reports</div>{c.hazards.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:i<c.hazards.length-1?6:0}}><Av src={h.avatar} size={20}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:C.text,fontWeight:600}}>{h.tags.join(" · ")}</div><div style={{fontSize:12,color:C.textMuted}}>{h.user+" · "+h.date}</div></div></div>)}</div>:null}{c.lastDate?<div style={{fontSize:12,color:C.textMuted,marginBottom:10}}>Most recent report: <span style={{color:C.textMuted}}>{ago(c.lastDate)+" · "+c.lastDate}</span>{c.verifiedCount?" · "+c.verifiedCount+" of "+c.reportCount+(c.reportCount===1?" report":" reports")+" from verified climbers":""}</div>:null}
    {(kh.length||kc.length||k.conflicts.length)?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 12px",marginBottom:13}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9,flexWrap:"wrap"}}><CardHead style={{flex:1}}>What trip reports consistently mention</CardHead><span style={{fontSize:12,fontWeight:700,color:k.confidence==="High"?C.green:k.confidence==="Medium"?C.amber:C.red,background:(k.confidence==="High"?C.green:k.confidence==="Medium"?C.amber:C.redSolid)+"22",borderRadius:6,padding:"2px 7px"}}>{k.confidence+" confidence in these tags"}</span></div>{k.conflicts.length?<div style={{background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11.5,color:C.amber,lineHeight:1.45}}>{k.conflicts[0]}</div>:null}{kh.length?<div style={{marginBottom:kc.length?11:0}}><div style={{...SUB_LABEL,marginBottom:7}}>Hazards climbers report</div>{kh.map(h=><CRow key={h.label} item={h} kind="h" routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>)}</div>:null}{kc.length?<div><div style={{...SUB_LABEL,marginBottom:7}}>Conditions climbers report</div>{kc.slice(0,6).map(co=><CRow key={co.label} item={co} kind="c" routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>)}</div>:null}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:9,paddingTop:9,borderTop:`1px solid ${C.borderLight}`}}>From {k.total} report{k.total!==1?"s":""}; a signal needs 2+ to show. Tap a row to see its reports. <span style={{color:C.green,fontWeight:700}}>✓</span> official · <span style={{color:C.amber,display:"inline-flex",verticalAlign:"-0.15em"}}><ActionIcon name="flag" size={12} color={C.amber}/></span> community-flagged · <span style={{color:C.purple,fontWeight:700}}>✦</span> verified across seasons · ● within last year.</div></div>:null}
    {c.conditions&&Object.keys(c.conditions).length?<div style={{marginBottom:14}}>{(function(){/* The consensus falls back to reports of ANY age when none is recent, which used to sit under "CONDITIONS NOW" looking current. Say which it is. */var ks=Object.keys(c.conditions),allOld=ks.every(function(k){return c.conditions[k].stale;});var newest=ks.map(function(k){return c.conditions[k].mostRecent;}).filter(Boolean).sort().slice(-1)[0];return <><div style={{fontSize:12,color:allOld?C.amber:C.blue,fontWeight:800,letterSpacing:0.4,marginBottom:6}}>{allOld?"LAST REPORTED CONDITIONS":"CONDITIONS NOW"}</div>{allOld?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginBottom:8}}>{"No one has reported conditions in the last "+RECENT_DAYS+" days"+(newest?" — the newest of these is from "+ago(newest):"")+". Treat them as history, not as today."}</div>:null}</>;})()}{VOLATILE_DISC.indexOf(catOf(route))>=0?<div style={{display:"flex",alignItems:"center",gap:6,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:8,padding:"6px 9px",marginBottom:8,fontSize:11.5,color:C.amber,lineHeight:1.4}}><span aria-hidden="true" style={{display:"inline-flex"}}><ActionIcon name="alert" size={13} color={C.amber}/></span><span>This route's conditions can change fast — verify before you go.</span></div>:null}<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["carToCar","Car-to-car"],["tempF","Temp"],["snow","Snow"],["snowDepth","Postholing"],["freezingFt","Freezing lvl"],["freezing","Freezing lvl"],["water","Water"],["bugs","Bugs"],["trail","Trail"],["seepage","Seepage"],["mud","Mud"],["protection","Protection"],["crowds","Crowds"]].map(function(p){var cd=c.conditions[p[0]];/* a legacy prose freezing level only speaks when no NUMBER has been reported */if(p[0]==="freezing"&&c.conditions.freezingFt)cd=null;return cd?<div key={p[0]} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"5px 9px",fontSize:12}}><span style={{color:C.textMuted}}>{p[1]+" "}</span><span style={{color:C.text,fontWeight:700}}>{p[0]==="tempF"?uTempU(cd.value):p[0]==="freezingFt"?uElev(cd.value):cd.value}</span>{cd.n?<span style={{color:cd.stale?C.amber:C.textMuted,fontSize:11}}>{" · "+cd.n+(cd.mostRecent?" · "+ago(cd.mostRecent):"")}</span>:null}</div>:null;})}</div></div>:null}<div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
      <div style={{textAlign:"center"}}>{(function(){/* The SAME star the route header shows: the shared rating (0294, one vote per climber) when anyone has cast one, else the trip-report average. Two different averages on one page read as a contradiction. */var _sh=starSum&&starSum.raters>0&&starSum.stars!=null;var _av=_sh?starSum.stars:c.avgStars;var _n=_sh?starSum.raters:c.ratedCount;return <><div style={{fontSize:29,fontWeight:700,color:_n?C.amber:C.textMuted}}>{_n?_av.toFixed(1):"—"}</div><Stars n={_av}/><div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{!_n?"no star ratings yet":_sh?(_n+" climber"+(_n!==1?"s":"")+" rated"):("avg of "+_n+" rating"+(_n!==1?"s":""))}</div></>;})()}</div>
      <div style={{flex:1}}><div style={{...SUB_LABEL,marginBottom:5}}>{"TOP CONDITIONS REPORTED · "+c.reportCount+" REPORT"+(c.reportCount!==1?"S":"")}</div>{c.topTags.map(t=><div key={t.tag} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:3}}><span style={{fontSize:12,color:C.text}}>{t.tag}</span><span style={{fontSize:12,fontWeight:700,color:C.teal,flexShrink:0}}>{t.pct}%</span></div><Bar val={t.pct} color={C.teal} h={6}/></div>)}</div>
    </div>
    <div style={{...SUB_LABEL,marginBottom:6}}>SEASONAL HEATMAP · REPORTS PER MONTH</div>
    <div style={{display:"flex",gap:3}}>{MONTHS.map((mo,i)=>{const md=c.byMonth[i];const intensity=md&&md.rated?Math.min(1,(md.stars/md.rated)/5):0;const isBest=c.bestMonths.includes(mo);return <div key={mo} style={{flex:1,textAlign:"center"}}><div style={{height:32,borderRadius:4,background:intensity>0?`rgba(63,185,80,${0.15+intensity*0.85})`:`${C.border}44`,border:isBest?`1px solid ${C.green}`:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:intensity>0.5?"white":C.textMuted,fontWeight:600}}>{md?md.count:""}</div><div style={{fontSize:12,color:isBest?C.green:C.textMuted,marginTop:2,fontWeight:600}}>{mo}</div></div>;})}</div>
    {c.bestMonths.length>0?<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,alignItems:"center"}}><span style={{fontSize:12,color:C.textMuted}}>Best months (avg 4★+):</span>{c.bestMonths.map(mo=>{const _bm=c.byMonth[MONTHS.indexOf(mo)]||{};return <span key={mo} style={{background:C.greenBg,color:C.green,padding:"2px 9px",borderRadius:7,fontSize:12,fontWeight:700}}>{mo}<span style={{fontWeight:500,opacity:0.8}}>{" · "+_bm.rated+" rated"}</span></span>;})}</div>:null}
    {c.faCredits&&c.faCredits.length?<div style={{marginTop:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}><CardHead tone={C.amber} style={{marginBottom:6}}>First Ascent Credit</CardHead><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{c.faCredits.map(name=><span key={name} style={{fontSize:12,color:C.amber,background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:6,padding:"4px 9px",fontWeight:600}}>{name}</span>)}</div></div>:null}
    {c.isDeveloped?<div style={{marginTop:12,background:C.greenBg,border:`1px solid ${C.green}55`,borderRadius:10,padding:"10px 12px"}}><div style={{...SUB_LABEL,color:C.green}}>Route Development</div><div style={{fontSize:12.5,color:C.textSub,marginTop:4}}>This route has been bolted or developed by climbers in the community.</div></div>:null}
    {c.photos&&c.photos.length?<div style={{marginTop:14}}><CardHead style={{marginBottom:8}}>Recent Photos</CardHead><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{c.photos.map((p,i)=><div key={i} style={{position:"relative",paddingBottom:"100%",borderRadius:8,overflow:"hidden",background:C.card,cursor:"pointer",border:`1px solid ${C.border}`}}><img loading="lazy" decoding="async" src={photoThumb(p.url,180)} alt={"Recent condition photo"+(p.user?" by "+p.user:"")} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={()=>{}} />{p.user?<div style={{position:"absolute",left:0,right:0,bottom:0,padding:"8px 6px 4px",background:"linear-gradient(transparent,rgba(0,0,0,0.72))",fontSize:11,color:C.onSolid,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.user.split(" ")[0]}</div>:null}</div>)}</div></div>:null}
  </div>;
}
function avyCenterFor(mountain){var st=mountain,g=0;while(st&&st.areaType!=="state"&&st.parentId&&g<8){st=MOUNTAINS.find(function(x){return x.id===st.parentId;});g++;}var stateName=(st&&st.areaType==="state")?st.name:((mountain&&mountain.region)||"");var zone=(mountain&&mountain.avyZone)||"";var host=({Utah:"utahavalanchecenter.org",Washington:"nwac.us",Colorado:"avalanche.state.co.us",California:"sierraavalanchecenter.org"})[stateName]||"avalanche.org";var label=({Utah:"Utah Avalanche Center",Washington:"Northwest Avalanche Center",Colorado:"Colorado Avalanche Information Center",California:"Sierra Avalanche Center"})[stateName]||"avalanche.org";var path=host==="utahavalanchecenter.org"?(zone.indexOf("Uintas")>=0?"/forecast/uintas":zone.indexOf("Salt Lake")>=0?"/forecast/salt-lake":""):"";return [label,host,"https://"+host+path];}
// The per-discipline safety boxes ("Spotting & landing", "Clipping & lowering", "Gear & anchors"…
// and "Watch out for on this type of climb") were REMOVED: canned lines chosen by discipline
// alone, the same four sentences on every route of a kind, which is advice about climbing in
// general rather than about THIS climb. The Safety tab still carries the route's own hazards,
// the forecast links and the nearby-fire panel. What stays here is the one control that acts
// on this route: reporting a bad bolt or anchor on a sport climb.
function SafetyMatrix({route,activity,mountain,hzVotes,onVote,onOpenHazards,onEdit}){
  const [openK,setOpenK]=useState(null);
  const cat=catOf(route);/* The avalanche panel used to appear for every ice/mixed/alpine/mountaineering route with an
   avy zone on its area. A dry summer rock climb sits in a zone too, and printing a forecast
   block for it reads as a hazard the route does not have — SEWS's own row says as much
   ("N/A - non-glaciated summer rock route"). */
const avyRelevant=["ice","mixed","alpine","mountaineering"].includes(cat)&&routeTerrain(route).avalanche!=="no";/* `activity` is the merged list (seed + yours + every climber’s DB report); route.activity alone is only your own logs on a DB route, so no other climber could ever flag a hazard here. */const _acts=activity||route.activity||[];const kcon=routeKw(Object.assign({},route,{activity:_acts}));const flaggedHaz=kcon.hazards.filter(h=>!h.official&&(h.count>=2||(h.reports||[]).some(rp=>isRecent(rp.date))));const confHaz=hstr=>kcon.hazards.find(h=>h.official&&h.count>=2&&HAZ_KW[h.label].some(kk=>hstr.toLowerCase().indexOf(kk)>=0));const envRelevant=["alpine","mountaineering"].includes(cat);const _objHaz=Array.isArray(route.objHaz)?route.objHaz:(route.objHaz?[route.objHaz]:[]);/* The box merges hazards, objHaz and watchOut. It used to de-duplicate the first two by exact
     string equality and compare watchOut against neither, so Southwest Rib on SEWS printed
     "runout slab" twice verbatim and a third time as a full sentence. mergeHazards drops an
     entry only when every significant word in it appears in one that is kept, so the surviving
     line always says at least as much.
     It must be ONE merge over all three. Two — hazards+objHaz for the bullets, then all three for
     the ⚠ lines — printed a hazards line AND the longer watchOut line that restates it, on 250
     routes. knownHazards merges once and splits the survivors by field. */
  const _known=knownHazards(route.hazards,_objHaz,route.watchOut);const _allHaz=_known.hazards;
  const _watchOut=_known.watchOut;const envHaz=envRelevant?_allHaz.filter(h=>ENV_HAZ_RE.test(h)):[];const physHaz=envRelevant?_allHaz.filter(h=>!ENV_HAZ_RE.test(h)):_allHaz;const _rd=_acts.map(a=>a.date).filter(Boolean).sort();const repN=_acts.length;const lastRepY=_rd.length?new Date(_rd[_rd.length-1]).getFullYear():null;const nowY=new Date().getFullYear();const stale=lastRepY&&(nowY-lastRepY)>=2;const avyCenter=avyCenterFor(mountain);
  return <div>
    <CragSafetyNotes route={route} onOpenHazards={onOpenHazards}/>
    {/* watchOut is rendered inside this box but was not part of its condition, so a route
        carrying only watch-outs and no hazards printed none of them. */}
    {(physHaz.length||flaggedHaz.length||_watchOut.length)?<div style={{background:C.redBg,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.red}44`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}><CardHead tone={C.red}>KNOWN HAZARDS</CardHead></div>{/* The card-header edit control every other route-page card uses; a full-size BTN here outweighed the heading it sat beside. Wrapped so the click event never reaches onOpenHazards (#2584). */}{onOpenHazards?<EditIconButton onClick={function(){onOpenHazards();}} title="Suggest a fix to the known hazards"/>:null}</div>{physHaz.map((h,i)=>{const cf=confHaz(h);return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0",flexWrap:"wrap"}}><span style={{fontSize:13,color:C.textSub,flex:1,minWidth:120,lineHeight:1.45}}>• {h}</span>{cf?<span style={{fontSize:12,fontWeight:700,color:C.green,background:C.greenBg,borderRadius:6,padding:"2px 7px",whiteSpace:"nowrap"}}>{"✓ confirmed · "+cf.count+" report"+(cf.count===1?"":"s")+(cf.season?" · "+cf.season:"")+(cf.year?" · "+cf.year:"")}</span>:null}</div>;})}{_watchOut.map((w,i)=><div key={"wo"+i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0"}}><span aria-hidden="true" style={{display:"inline-flex",flexShrink:0,marginTop:2}}><ActionIcon name="alert" size={13} color={C.amber}/></span><span style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{w}</span></div>)}{flaggedHaz.length?<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.red}33`}}><div style={{fontSize:11.5,fontWeight:700,color:C.amber,marginBottom:7}}>Reported by climbers — not yet in official info</div>{flaggedHaz.map(h=><CRow key={h.label} item={h} kind="h" routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>)}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:7}}>Pulled from recent trip reports and not in the official list yet. Treat them seriously and verify before you commit.</div></div>:null}</div>:<GapNote what="No route-specific hazards recorded" why="The advice above is general to this discipline, not to this line. Nobody has recorded rockfall, cornices, moats or anything else particular to this route — that is missing information, not a clean bill of health." cta="Add what you know" onFix={onOpenHazards?function(){onOpenHazards();}:undefined}/>}{envHaz.length?<div style={{background:C.greenBg,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.green}44`}}><CardHead tone={C.green} style={{marginBottom:8}}>WILDLIFE & SEASONAL NOTICES</CardHead>{envHaz.map((h,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0"}}><span style={{fontSize:13,color:C.textSub,flex:1,lineHeight:1.45}}>• {h}</span></div>)}</div>:null}{kcon.conflicts.length?<div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name="alert" size={14} color={C.amber}/></span><div style={{fontSize:11.5,color:C.amber,lineHeight:1.45}}>{kcon.conflicts[0]}</div></div>:null}{repN?<div style={{display:"flex",alignItems:"flex-start",gap:8,background:stale?C.amberBg:C.surface,border:`1px solid ${stale?C.amber:C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name={stale?"alert":"check"} size={14} color={stale?C.amber:C.textSub}/></span><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>{repN<2?("Only "+repN+" trip report so far — low confidence. Verify conditions yourself, and consider logging one for the climbers after you."):(stale?("Most recent trip report is from "+lastRepY+" — conditions and hazards can change year to year. Verify current conditions before you go."):("Based on "+repN+" trip reports"+(lastRepY?", most recent "+lastRepY:"")+" · "+kcon.confidence+" data confidence. Hazards and conditions update automatically as climbers log new reports."))}</div></div>:<div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name="doc" size={14} color={C.textMuted}/></span><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>Add a trip report from your logbook — be the first to log conditions and hazards for the climbers after you.</div></div>}
    {/* The rest of seasonal_hazards. The avalanche block below has been the column's only
        reader, so `exposure` (504 WA routes), `weather.typical` (499) and `weather.probability`
        (456) were researched, stored, and shown to nobody — the descent_text shape. `crevasses`
        is read by lib/terrain.js as a glacier SIGNAL, which is use without display.
        Not gated on avyZone: exposure and afternoon-storm risk apply to rock routes that have
        no avalanche zone at all, and gating them the same way is what kept them invisible. */}
    {(()=>{const sh=enrichRoute(route).seasonalHazards||{};const wx=sh.weather||{};
      // crevasses holds TWO shapes — a string on most rows, {timing,location} on 34 of them.
      const cv=sh.crevasses;const cvText=typeof cv==="string"?cv:(cv&&typeof cv==="object"?[cv.timing,cv.location].filter(Boolean).join(" "):"");
      // "N/A - no glacier travel" is a positive statement of absence, and it is what most of
      // these rows say. Valuable to terrain.js as evidence; noise as a bullet on hundreds of
      // rock scrambles, so it is suppressed here rather than printed.
      const rows=[["Exposure",sh.exposure],["Crevasses",saysNotApplicable(cvText)?"":cvText],["Typical weather",wx.typical],["Storm timing",wx.probability]]
        .filter(r=>r[1]&&String(r[1]).trim());
      /* EDITABLE (owner note, 2026-10-24: "seasonal hazards isn't editable"). The contribute form has
         carried a Seasonal hazards field (SEASHAZ_KEYS) since it was built, but this card had no pencil,
         and an empty one rendered nothing, so the only way in was hunting through Suggest a fix. Empty,
         it stays a placeholder on the disciplines where exposure, storms and crevasses are the hazard;
         a crag gets nothing rather than a prompt on every sport line. */
      if(!rows.length)return onEdit&&!CRAG_CATS.includes(cat)?<div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:8}}>SEASONAL HAZARDS</CardHead><div style={{paddingLeft:9,borderLeft:"2px solid "+C.borderLight}}><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.55}}>No exposure, weather or crevasse notes for this climb yet</span><button onClick={()=>onEdit("seasonalHazards")} style={{display:"block",marginTop:1,padding:"5px 0",border:"none",background:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Add seasonal hazards</button></div></div>:null;
      return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}><CardHead>SEASONAL HAZARDS</CardHead>{onEdit?<AreaEditIconButton onClick={()=>onEdit("seasonalHazards")} title="Edit seasonal hazards" C={C}/>:null}</div>
        {rows.map(([label,text],i)=><div key={label} style={{marginTop:i?9:0}}>
          <div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:2}}>{label}</div>
          <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{String(text)}</div>
        </div>)}
      </div>;})()}
    {avyRelevant?(()=>{const avy=(enrichRoute(route).seasonalHazards||{}).avalanche;const months=avy&&avy.byMonth?Object.entries(avy.byMonth).sort((a,b)=>monthRank(a[0])-monthRank(b[0])):[];
  /* THE GATE READ THE AREA AND THE CONTENT LIVES ON THE ROUTE. It was
     `mountain && mountain.avyZone && avyRelevant`, so a route carrying its own month-by-month
     avalanche ratings showed NOTHING whenever the area it hangs under had no `avy_zone` string.
     Measured: 146 of 184 avy-relevant routes with real ratings were hidden that way — Chair Peak's
     north face has twelve months of them. Same shape as the fire map gated on the seed-only
     selArea, fixed by reading `dbAreaCtx || selArea`.

     The obvious repair — fall back to the ROUTE's own `avalanche.zone` in the label — is wrong,
     and the data says so: that field is prose, not a zone name. 196 real values, p50 128
     characters, 154 over 60, max 327 ("NWAC's daily avalanche forecast does not run during this
     route's July-September climbing season..."). Putting it where `mountain.avyZone` goes is the
     season/grade/bivy defect again: a display slot taking a paragraph.

     So the LABEL keeps taking only the short area zone, the ratings gate on themselves, and the
     route's prose renders as prose beneath the grid where it reads properly. */
  const _realAvyMonths=months.filter(function(m){return !/^n\/?a$/i.test(String(m[1]||"").trim());});
  /* Deliberately NOT an IIFE, for the reason the `_peakGeoPm` comment above records: check:fire
     finds the fire panel's element by looking backwards from `<FireNearRoute` for a
     `const <name>=(function(){`, so an IIFE-assigned const above `fireEl` makes the guard hunt
     for the wrong symbol and report the panel missing. */
  const _avyZoneRaw=avy&&avy.zone?String(avy.zone).trim():"",_avyNote=_avyZoneRaw&&!/^n\/?a\b/i.test(_avyZoneRaw)?_avyZoneRaw:"";
  if(!(mountain&&mountain.avyZone)&&!_realAvyMonths.length)return null;const AVY_COL={Extreme:[C.red,C.redBg],High:[C.red,C.redBg],Considerable:[C.red,C.redBg],Moderate:[C.amber,C.amberBg],Low:[C.green,C.greenBg]};return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,flex:1,minWidth:0}}><CardHead>AVALANCHE FORECAST</CardHead>{mountain&&mountain.avyZone?<span style={{fontSize:12,color:C.textMuted}}>{mountain.avyZone}</span>:null}</div>{/* Its zone line and its month ratings are the Avalanche forecast zone and Avalanche danger by month rows of the Seasonal hazards field, so the pencil opens that. */onEdit?<AreaEditIconButton onClick={()=>onEdit("seasonalHazards")} title="Edit the avalanche forecast" C={C}/>:null}</div>{months.length?<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:9}}>{months.map(([month,level])=>{const [col,bg]=AVY_COL[level]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:11.5,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:10.5,color:C.textSub}}>{level}</div></div>;})}</div>:null}{_avyNote?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:7}}><span style={{fontWeight:700}}>{"Forecast coverage: "}</span>{_avyNote}</div>:null}<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>This app doesn't pull a live danger rating — check the forecast below before you go.</div><a href={avyCenter[2]} target="_blank" rel="noreferrer" style={{display:"block",marginTop:8,fontSize:12,color:C.blue,textDecoration:"none"}}>{"→ Full forecast at "+avyCenter[1]}</a></div>;})():null}
    {/* The BAILOUT & TURNAROUND card was removed app-wide (owner, 2026-10-07), and the lone
        "+ Add start location" button it left behind went too (owner, 2026-10-15): the start of a
        climb is where to find it, not a hazard, and it is already filed from the Start of climb
        section of Add or fix info and from the log form, and shown as START OF CLIMB on Overview. */}
  </div>;
}
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
/* What each variation IS, beside the tag it wears on the photo. A yellow line with no words left a
   climber guessing whether it was a direct start, an escape or a mistake (owner, 2026-10-23). The
   labels are topo_lines.variant_labels (0362), aligned with variants by index. */
/* The topo editor. What it could not do, each of them the difference between a line a climber
   trusts and one they redraw:

     · A mis-placed point could not be fixed. The only tools were "undo last" and "clear all",
       so one bad point four points back cost you the four after it. Every point and pin is a
       draggable handle now, and the selected one can be deleted on its own.
     · No zoom, on a phone-sized image. A belay pin has to land on a specific ledge; at 390px
       wide, 1% of the frame is under 4px. The photo zooms (pinch, the wheel, or − / +) and a
       loupe follows a dragged handle at 3x.
     · A finger moving across the photo DREW. The editor sampled a point every 1.5% of a drag,
       so a climber pushing the photo around to see another part of the wall laid a line across
       it (owner, 2026-10-21). Now only a TAP marks: a press that wanders more than TAP_SLOP
       pixels pans the photo instead, and two fingers pinch-zoom — how every map app separates
       "move the view" from "drop a pin", and how photo viewers zoom.
     · Upload/save errors used alert() — a blocking dialog, in an app that has toasts and
       inline notices everywhere else. Now an inline error inside the section.

   The route line is red and its variations yellow, both drawn on the Draw line tab (a variation
   is a line, not a pin); a pitch's grade is a Grade marker on the Add pins tab, printed beside
   the pitch as on Steph Abegg's overlays. Coordinates stay percentages of the photo: `at` reads
   the ZOOMED layer's on-screen box, so a tap at 3x stores the same 0..100 point it would at 1x,
   and a handle pulled off the edge is clamped onto the rock. */
/* Exported for lib/LogAscent.jsx, which lets a climber draw a topo while logging the climb (lazy import, so the
   log form does not pull this file into its chunk until the control is tapped). */
export function TopoDrawer({initial,onCancel,onSubmit,dirtyRef}){
  // lines[0] is the route line; lines[1..] are its variations.
  const [lines,setLines]=useState(function(){return [((initial&&initial.points)||[]).slice()].concat(((initial&&initial.variants)||[]).map(function(v){return v.slice();}));});
  const [act,setAct]=useState(0);         // which line a tap extends
  // varLabels[l-1] is what variation l is ("5.10a direct start"); saved as topo_lines.variant_labels (0362).
  const [varLabels,setVarLabels]=useState(function(){return ((initial&&initial.variants)||[]).map(function(_v,i){return String(((initial&&initial.variantLabels)||[])[i]||"");});});
  const [pins,setPins]=useState((initial&&initial.pins)||[]);const [ar,arOnLoad]=useImgAspect();
  const [mode,setMode]=useState("line");const [pinCat,setPinCat]=useState(PIN_CATEGORIES[0][0]);
  const [label,setLabel]=useState((initial&&initial.label)||"");  // optional: which line this is, when a wall holds several
  const [sel,setSel]=useState(null);      // {kind:"point", l, i} | {kind:"pin", i} — the handle under edit
  const [loupe,setLoupe]=useState(null);  // {x,y} while a handle is being dragged
  const [kb,setKb]=useState(null);        // the keyboard cross {x,y}, shown while the photo has keyboard focus
  const [kbMsg,setKbMsg]=useState("");    // what the last key did, read out (aria-live) and shown
  const [view,setViewState]=useState({z:1,tx:0,ty:0});
  const viewRef=useRef(view);
  const setView=function(v){viewRef.current=v;setViewState(v);};
  const vpRef=useRef(null);               // the fixed frame on screen
  const frameRef=useRef(null);            // the zoomed layer: the photo and everything on it
  const ptrs=useRef(new Map());           // pointerId -> {x,y}, for pinch
  const gest=useRef(null);                // {kind:"tap"|"pinch"|"point"|"pin", …}
  const focusPin=useRef(null);            // a new Grade marker's input takes focus, to type the grade
  const photo=initial&&initial.photoUrl;
  const points=lines[0];
  /* UNSAVED WORK IS ASKED ABOUT, NOT DROPPED (topo audit, 2026-10-24). Cancel, the sheet's ✕ and a
     stray tap on the dark backdrop all threw away every point and marker without a word — minutes of
     zoomed-in placing gone to one mis-tap. The drawing as it first opened is the baseline; anything
     different is unsaved, and dirtyRef lets the sheet around the editor ask before closing too. */
  const snapNow=JSON.stringify([lines,varLabels,pins,label]);const [snap0]=useState(snapNow);const dirty=snapNow!==snap0;
  useEffect(function(){if(dirtyRef)dirtyRef.current=dirty;},[dirty,dirtyRef]);
  const cancel=function(){if(!dirty)return onCancel();askConfirm({title:"Discard this drawing?",body:"The points and markers you placed are not saved.",confirmLabel:"Discard"}).then(function(ok){if(ok)onCancel();});};

  // A wheel zooms about the cursor on a desktop. Registered by hand: React's onWheel is passive,
  // and without preventDefault the sheet behind scrolls as well.
  useEffect(function(){
    const el=vpRef.current;if(!el)return undefined;
    const onWheel=function(e){
      e.preventDefault();
      const r=el.getBoundingClientRect();const b=viewRef.current;
      const v=zoomTopoView(b,b.z*Math.exp(-e.deltaY*0.0015),e.clientX-r.left-el.clientLeft,e.clientY-r.top-el.clientTop,el.clientWidth,el.clientHeight);
      viewRef.current=v;setViewState(v);
    };
    el.addEventListener("wheel",onWheel,{passive:false});
    return function(){el.removeEventListener("wheel",onWheel);};
  },[]);

  // Clamped so a drag that leaves the frame parks the handle on the edge rather than storing
  // a coordinate that is not on the photo.
  const at=function(cx,cy){
    const r=frameRef.current.getBoundingClientRect();
    const c=(v,size)=>Math.min(100,Math.max(0,Math.round((v/size)*1000)/10));
    return {x:c(cx-r.left,r.width),y:c(cy-r.top,r.height)};
  };
  const local=function(cx,cy){const el=vpRef.current;const r=el.getBoundingClientRect();return {x:cx-r.left-el.clientLeft,y:cy-r.top-el.clientTop};};
  const zoomBy=function(f){const el=vpRef.current;if(!el)return;const b=viewRef.current;setView(zoomTopoView(b,b.z*f,el.clientWidth/2,el.clientHeight/2,el.clientWidth,el.clientHeight));};
  const two=function(){const a=Array.from(ptrs.current.values());return {d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,m:local((a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2)};};
  const setLine=function(l,fn){setLines(function(ls){return ls.map(function(q,qi){return qi===l?fn(q):q;});});};
  const moveTo=function(g,p){
    if(g.kind==="point")setLine(g.l,function(a){return a.map(function(q,qi){return qi===g.i?{x:p.x,y:p.y}:q;});});
    else setPins(function(a){return a.map(function(q,qi){return qi===g.i?Object.assign({},q,{x:p.x,y:p.y}):q;});});
  };
  const place=function(p){
    if(mode==="line"){
      const l=act<lines.length?act:0;
      setSel({kind:"point",l:l,i:lines[l].length});
      setLine(l,function(a){return a.concat([p]);});
    }else{
      if(pinCat==="grade")focusPin.current=pins.length;
      setSel({kind:"pin",i:pins.length});
      setPins(function(a){return a.concat([{x:p.x,y:p.y,category:pinCat,note:""}]);});
    }
  };
  const onDown=function(e){
    if(!frameRef.current||!vpRef.current)return;
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_e){}
    if(ptrs.current.size>=2){                // a second finger: pinch, and nothing gets marked
      const t=two();gest.current={kind:"pinch",d0:t.d,m0:t.m,base:viewRef.current};setLoupe(null);
      return;
    }
    const h=e.target&&e.target.dataset&&e.target.dataset.h;   // "point:0:3" / "pin:1"
    if(h){
      const parts=h.split(":");
      if(parts[0]==="point"){gest.current={kind:"point",l:+parts[1],i:+parts[2]};setSel({kind:"point",l:+parts[1],i:+parts[2]});setAct(+parts[1]);}
      else{gest.current={kind:"pin",i:+parts[1]};setSel({kind:"pin",i:+parts[1]});}
      setLoupe(at(e.clientX,e.clientY));
      return;
    }
    gest.current={kind:"tap",sx:e.clientX,sy:e.clientY,base:viewRef.current,moved:false};
  };
  const onMove=function(e){
    if(!ptrs.current.has(e.pointerId))return;
    ptrs.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const g=gest.current;const el=vpRef.current;if(!g||!el||!frameRef.current)return;
    if(g.kind==="pinch"){
      if(ptrs.current.size<2)return;
      const t=two();const b=g.base;const nz=Math.min(ZOOM_MAX,Math.max(1,b.z*t.d/g.d0));
      setView(clampTopoView({z:nz,tx:t.m.x-(g.m0.x-b.tx)*nz/b.z,ty:t.m.y-(g.m0.y-b.ty)*nz/b.z},el.clientWidth,el.clientHeight));
      return;
    }
    if(g.kind==="tap"){
      const dx=e.clientX-g.sx,dy=e.clientY-g.sy;
      if(!g.moved&&Math.hypot(dx,dy)<TAP_SLOP)return;
      g.moved=true;
      setView(clampTopoView({z:g.base.z,tx:g.base.tx+dx,ty:g.base.ty+dy},el.clientWidth,el.clientHeight));
      return;
    }
    const p=at(e.clientX,e.clientY);setLoupe(p);moveTo(g,p);
  };
  const onUp=function(e){
    if(!ptrs.current.has(e.pointerId))return;
    ptrs.current.delete(e.pointerId);
    const g=gest.current;
    if(g&&g.kind==="pinch"){
      // Lifting one finger of a pinch leaves a pan, never a tap: that finger never "tapped".
      if(ptrs.current.size===1){const r=Array.from(ptrs.current.values())[0];gest.current={kind:"tap",sx:r.x,sy:r.y,base:viewRef.current,moved:true};}
      else if(!ptrs.current.size)gest.current=null;
      return;
    }
    if(ptrs.current.size)return;
    gest.current=null;setLoupe(null);
    if(e.type==="pointerup"&&g&&g.kind==="tap"&&!g.moved&&frameRef.current)place(at(e.clientX,e.clientY));
  };

  const delSel=function(){
    if(!sel)return;
    if(sel.kind==="point")setLine(sel.l,function(a){return a.filter(function(_q,i){return i!==sel.i;});});
    else setPins(function(a){return a.filter(function(_q,i){return i!==sel.i;});});
    setSel(null);
  };
  const lineName=function(l){return l===0?"Route line":(lines.length>2?"Variation "+l:"Variation");};
  /* KEYBOARD DRAWING (WCAG 2.1.1). The photo used to take pointer input only, so a climber who cannot
     use a pointer could correct a line (Undo, Delete) but never draw one. The photo frame now takes
     focus: the arrow keys move a cross over the photo (Shift for bigger steps) and Enter or Space
     places a point or marker there; [ and ] select the previous or next point, the arrow keys then
     move it, Delete removes it and Escape lets it go. Each key says what it did in the line under
     the photo, which is a live region, so a screen reader hears it too. */
  const kbPos=function(){
    if(sel&&sel.kind==="point")return lines[sel.l]&&lines[sel.l][sel.i];
    if(sel&&sel.kind==="pin")return pins[sel.i];
    return kb||{x:50,y:50};
  };
  const pct=function(v){return Math.round(v)+"%";};
  const onKey=function(e){
    const k=e.key;const step=e.shiftKey?5:1;
    const d={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[k];
    if(d){
      e.preventDefault();
      const q=kbPos();if(!q)return;
      const n={x:Math.min(100,Math.max(0,Math.round((q.x+d[0])*10)/10)),y:Math.min(100,Math.max(0,Math.round((q.y+d[1])*10)/10))};
      if(sel){moveTo(sel,n);setKbMsg((sel.kind==="point"?lineName(sel.l)+", point "+(sel.i+1):"Marker "+(sel.i+1))+" moved to "+pct(n.x)+" across, "+pct(n.y)+" down.");}
      else{setKb(n);setKbMsg("Cross at "+pct(n.x)+" across, "+pct(n.y)+" down.");}
      return;
    }
    if(k==="Enter"||k===" "){
      e.preventDefault();
      if(sel){setSel(null);setKbMsg("Done moving. Arrow keys move the cross again.");return;}
      const q=kb||{x:50,y:50};place(q);
      setKbMsg(mode==="line"?("Point "+((lines[act<lines.length?act:0]||[]).length+1)+" added to the "+lineName(act<lines.length?act:0).toLowerCase()+"."):((pinText(pinCat)||"Marker")+" placed."));
      return;
    }
    if(k==="["||k==="]"){
      e.preventDefault();
      const list=mode==="line"?(lines[act]||[]):pins;if(!list.length){setKbMsg("Nothing to select yet.");return;}
      const cur=sel&&(mode==="line"?(sel.kind==="point"&&sel.l===act):sel.kind==="pin")?sel.i:(k==="]"?-1:list.length);
      const i=(cur+(k==="]"?1:-1)+list.length)%list.length;
      setSel(mode==="line"?{kind:"point",l:act,i:i}:{kind:"pin",i:i});
      setKbMsg((mode==="line"?lineName(act)+", point "+(i+1):"Marker "+(i+1))+" of "+list.length+" selected. Arrow keys move it.");
      return;
    }
    if((k==="Delete"||k==="Backspace")&&sel){e.preventDefault();delSel();setKbMsg("Deleted.");return;}
    // Escape lets go of a selection (data-keeps-escape holds the dialog's own Escape back while one is
    // held); with nothing selected it reaches the dialog, which closes as usual.
    if(k==="Escape"&&sel){e.preventDefault();setSel(null);setKbMsg("Selection cleared.");}
  };
  const sm=on=>({...CHIP,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub});
  const btn={flex:1,padding:8,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,cursor:"pointer"};
  const nums=pinNums(pins);
  const inv="translate(-50%,-50%) scale("+(1/view.z)+")";   // handles keep their size while the photo zooms
  const handle=function(kind,l,i,x,y,col,cat){
    const on=!!sel&&sel.kind===kind&&sel.i===i&&(kind!=="point"||sel.l===l);
    if(kind==="pin"){
      if(cat==="grade")return <span key={"pin"+i} data-h={"pin:"+i} title="Grade — drag to move"
        style={{position:"absolute",left:x+"%",top:y+"%",transform:inv,lineHeight:0,cursor:"grab",touchAction:"none",padding:4}}><GradeTag text={pins[i].note||"Grade?"} size={13} on={on}/></span>;
      const sz=on?26:20;return <span key={"pin"+i} data-h={"pin:"+i} title={pinLabel(cat)+" — drag to move"}
      style={{position:"absolute",left:x+"%",top:y+"%",width:sz,height:sz,transform:inv,lineHeight:0,cursor:"grab",touchAction:"none"}}><PinIcon cat={cat} size={sz} on={on}/><PinNum n={nums[i]} style={{position:"absolute",right:-8,bottom:-6}}/></span>;}
    /* SMALL DOT, BIG TARGET (owner, 2026-10-23: "make the dots smaller and more precise"). The dot a
       climber sees is 7px (11 when selected, with a white ring) so it covers the hold it marks rather
       than the ledge around it; the 28px transparent box around it is what a finger grabs, so it is
       no harder to pick up. Its centre is the stored point. The inner dot ignores the pointer, so the
       handle's data-h is what onDown reads. */
    const dim=l!==act;const dd=on?11:7;
    return <span key={"pt"+l+":"+i} data-h={"point:"+l+":"+i} title={lineName(l)+", point "+(i+1)+" — drag to move"}
      style={{position:"absolute",left:x+"%",top:y+"%",width:28,height:28,marginLeft:-14,marginTop:-14,transform:"scale("+(1/view.z)+")",transformOrigin:"50% 50%",cursor:"grab",touchAction:"none"}}>
      <span style={{position:"absolute",left:"50%",top:"50%",width:dd,height:dd,marginLeft:-dd/2,marginTop:-dd/2,boxSizing:"border-box",pointerEvents:"none",
        borderRadius:"50%",background:col,opacity:dim&&!on?0.6:1,border:(on?2:1)+"px solid "+(on?C.onSolid:"rgba(0,0,0,0.85)"),
        boxShadow:on?"0 0 0 2px "+C.blue+"99":"0 0 0 1px rgba(255,255,255,0.35)"}}/>
    </span>;
  };
  const pinText=function(cat){return (PIN_CATEGORIES.find(function(c){return c[0]===cat;})||[])[1];};
  // A Grade marker nobody typed a grade into is dropped on save rather than stored as "?".
  const cleanPins=function(){return pins.filter(function(p){return p.category!=="grade"||(p.note||"").trim();}).map(function(p){return p.category==="grade"?Object.assign({},p,{note:p.note.trim()}):p;});};
  // A variation with fewer than two points is not a line and is dropped; its label goes with it, so the two arrays stay aligned.
  const keptVar=lines.slice(1).map(function(v,i){return {v:v,t:String(varLabels[i]||"").trim()};}).filter(function(o){return o.v.length>=2;});
  const variants=keptVar.map(function(o){return o.v;});
  const canSave=points.length>=2||variants.length>0||cleanPins().length>0;
  const lastEmpty=lines.length>1&&!lines[lines.length-1].length;
  const swatch=function(col,dashed){return <TopoSwatch color={col} dashed={dashed}/>;};
  return <div>
    <div style={{display:"flex",gap:6,marginBottom:8}}>{[["line","Draw line"],["pin","Add pins"]].map(function(m){return <button key={m[0]} onClick={function(){setMode(m[0]);setSel(null);}} style={sm(mode===m[0])}>{m[1]}</button>;})}</div>
    {mode==="line"?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
      {lines.map(function(_l,l){var on=act===l;var col=l===0?TOPO_RED:TOPO_VAR;var vl=l>0?String(varLabels[l-1]||"").trim():"";return <button key={l} onClick={function(){setAct(l);setSel(null);}} aria-current={on?"true":undefined} style={{...CHIP,border:"1px solid "+(on?col:C.border),background:on?col+"22":C.surface,color:on?C.text:C.textSub,display:"inline-flex",alignItems:"center",gap:6,maxWidth:"100%"}}>{swatch(col,l>0)}<span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{lineName(l)+(vl?" · "+vl:"")}</span></button>;})}
      {lines.length<6?<button onClick={function(){if(lastEmpty){setAct(lines.length-1);}else{setLines(function(ls){return ls.concat([[]]);});setVarLabels(function(a){var n=a.slice();while(n.length<lines.length)n.push("");return n;});setAct(lines.length);}setSel(null);}} style={{...CHIP,border:"1px dashed "+C.border,background:C.surface,color:C.textSub}}>+ Variation</button>:null}
    </div>:null}
    {/* The caption that tells a reader what this yellow line IS. No cap: a variation's reason can take a sentence ("goes left at the roof to avoid the wet chimney — 5.10a, runout"). */}
    {(mode==="line"&&act>0)?<input aria-label={"What is "+lineName(act).toLowerCase()+"? (optional)"} value={varLabels[act-1]||""} onChange={function(e){var v=e.target.value;setVarLabels(function(a){var n=a.slice();while(n.length<act)n.push("");n[act-1]=v;return n;});}} placeholder="What is this variation? e.g. 5.10a direct start (optional)" style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid "+TOPO_VAR+"88",background:C.card,color:C.text,fontSize:13,outline:"none",marginBottom:8}}/>:null}
    {mode==="pin"?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{PIN_CATEGORIES.map(function(c){return <button key={c[0]} onClick={function(){setPinCat(c[0]);}} aria-current={pinCat===c[0]?"true":undefined} style={{...CHIP,border:"1px solid "+(pinCat===c[0]?c[2]:C.border),background:pinCat===c[0]?c[2]+"22":C.surface,color:pinCat===c[0]?(c[0]==="grade"?C.text:c[2]):C.textSub,display:"inline-flex",alignItems:"center",gap:6}}><PinIcon cat={c[0]} size={16}/>{c[1]}</button>;})}</div>:null}
    <div style={{fontSize:11.5,color:C.textMuted,marginBottom:6,lineHeight:1.45}}>{mode==="line"?("Tap the photo to add a point to the "+(act===0?"route line (red)":"variation (yellow, dashed)")+". Drag to move around the photo; pinch or use + to zoom in for a precise point. Drag a dot to move it."):(pinCat==="grade"?"Tap beside a pitch, then type its grade — e.g. 5.10-. Drag to move around the photo; pinch or use + to zoom.":"Pick a marker — belay station, rappel station… — then tap where it is on the rock. Drag to move around the photo; drag a marker to move it.")}</div>
    <div style={{display:"flex",gap:6,justifyContent:"flex-end",alignItems:"center",marginBottom:6}}>
      {view.z>1?<span style={{fontSize:11.5,color:C.textMuted,marginRight:"auto"}}>{(Math.round(view.z*10)/10)+"×"}</span>:null}
      <button onClick={function(){zoomBy(1/1.6);}} disabled={view.z<=1} aria-label="Zoom out" style={Object.assign(sm(false),{minWidth:34,opacity:view.z<=1?0.45:1})}>−</button>
      <button onClick={function(){zoomBy(1.6);}} disabled={view.z>=ZOOM_MAX} aria-label="Zoom in" style={Object.assign(sm(false),{minWidth:34,opacity:view.z>=ZOOM_MAX?0.45:1})}>+</button>
      <button onClick={function(){setView({z:1,tx:0,ty:0});}} disabled={view.z<=1} aria-label="Fit the whole photo" style={Object.assign(sm(false),{opacity:view.z<=1?0.45:1})}>Fit</button>
    </div>
    {/* touchAction:"none" is load-bearing: without it the browser claims the gesture for
        scrolling and pinching, and neither ever reaches these handlers on a touch screen.

        HONEST NOTE ON check:clickable: this surface used to be a <div onClick> and was counted
        in that guard's mouse-only baseline. Pointer handlers are not onClick, so the scanner no
        longer sees it and the baseline drops by one — that is the guard losing sight of a
        control, NOT the control becoming keyboard-operable. Placing points on a photo has no
        sensible key-by-key equivalent, so it stayed pointer-driven -- until 2026-10-23, when the
        accessibility audit counted it as the one thing in the app a keyboard user could not do.
        The frame now takes focus and its own keys (onKey above): a cross to place points, [ and ]
        to select one, arrows to move it. Undo last point, Delete selected, Clear all and the zoom
        buttons are real <button>s, as are the mode, line and category chips. */}
    <div ref={vpRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      tabIndex={0} role="application" aria-label={"Topo photo. "+(mode==="line"?"Drawing the "+lineName(act).toLowerCase():"Placing "+((pinText(pinCat)||"markers").toLowerCase()))} aria-describedby="topo-kb-help"
      onKeyDown={onKey} data-keeps-escape={sel?"true":undefined} onFocus={function(){if(!kb&&!sel)setKb({x:50,y:50});}} onBlur={function(){setKb(null);}}
      style={{position:"relative",width:"100%",aspectRatio:ar||"4 / 3",background:C.card,borderRadius:9,overflow:"hidden",cursor:view.z>1?"grab":"crosshair",marginBottom:9,border:"1px solid "+C.border,touchAction:"none",userSelect:"none"}}>
      <div ref={frameRef} style={{position:"absolute",inset:0,transformOrigin:"0 0",transform:"translate("+view.tx+"px,"+view.ty+"px) scale("+view.z+")"}}>
        {photo?<img loading="lazy" decoding="async" src={photo} alt="Photo to draw the topo line on" onLoad={arOnLoad} draggable={false} style={TOPO_IMG}/>:<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.textMuted}}>Tap to place points</div>}
        {/* The zoom is a CSS scale on this layer, which non-scaling-stroke does not undo: divide it out so the line stays a thin line at 6x. */}<TopoLineOverlay points={points} variants={lines.slice(1)} lineW={2/view.z}/>
        {lines.map(function(ln,l){return ln.map(function(p,i){return handle("point",l,i,p.x,p.y,l===0?TOPO_RED:TOPO_VAR);});})}
        {kb&&!sel?<span aria-hidden="true" style={{position:"absolute",left:kb.x+"%",top:kb.y+"%",width:26,height:26,transform:inv,pointerEvents:"none",boxSizing:"border-box",border:"2px solid #fff",borderRadius:"50%",boxShadow:"0 0 0 2px rgba(0,0,0,0.75)"}}><span style={{position:"absolute",left:"50%",top:-6,bottom:-6,width:2,marginLeft:-1,background:C.onSolid}}/><span style={{position:"absolute",top:"50%",left:-6,right:-6,height:2,marginTop:-1,background:C.onSolid}}/></span>:null}
        {pins.map(function(p,i){return handle("pin",0,i,p.x,p.y,pinColor(p.category),p.category);})}
      </div>
      {(loupe&&photo)?<div style={{position:"absolute",top:8,right:8,width:104,height:104,borderRadius:"50%",overflow:"hidden",border:"2px solid "+C.blue,boxShadow:"0 6px 18px rgba(0,0,0,0.55)",pointerEvents:"none",
        backgroundImage:"url("+photo+")",backgroundRepeat:"no-repeat",backgroundSize:(LOUPE_Z*view.z*100)+"% "+(LOUPE_Z*view.z*100)+"%",backgroundPosition:loupe.x+"% "+loupe.y+"%"}}>
        <span style={{position:"absolute",left:"50%",top:"50%",width:11,height:11,marginLeft:-5.5,marginTop:-5.5,borderRadius:"50%",border:"1.5px solid "+C.blue,background:"rgba(255,255,255,0.25)"}}/>
      </div>:null}
    </div>
    <div id="topo-kb-help" style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:4}}>Keyboard: Tab to the photo, then arrow keys move the cross (Shift for bigger steps) and Enter places a point. [ and ] select a point, the arrow keys move it, Delete removes it, Esc lets go.</div>
    <div role="status" aria-live="polite" style={{fontSize:12,color:C.textSub,minHeight:kbMsg?17:0,marginBottom:kbMsg?6:0}}>{kbMsg}</div>
    <div style={{display:"flex",gap:12,marginBottom:9}}>
      <button onClick={function(){if(mode==="line")setLine(act,function(p){return p.slice(0,-1);});else setPins(function(p){return p.slice(0,-1);});setSel(null);}} style={btn}>{mode==="line"?"Undo last point":"Undo last marker"}</button>
      <button onClick={delSel} disabled={!sel} style={Object.assign({},btn,{opacity:sel?1:0.45,cursor:sel?"pointer":"default"})}>{sel?("Delete "+(sel.kind==="point"?"point "+(sel.i+1):"marker")):"Delete selected"}</button>
      <button onClick={function(){var _clr=function(){setLines([[]]);setVarLabels([]);setAct(0);setPins([]);setSel(null);};if(!lines.some(function(l){return l.length;})&&!pins.length)return _clr();askConfirm({title:"Clear the whole topo?",body:"Every line, point and marker you have drawn is removed.",confirmLabel:"Clear all"}).then(function(ok){if(ok)_clr();});}} style={btn}>Clear all</button>
    </div>
    {pins.length?<div style={{marginBottom:9}}>{pins.map(function(pn,i){var g=pn.category==="grade";var ph=g?"Grade — e.g. 5.10-":pinText(pn.category)+" — note (optional)";return <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>{nums[i]!=null?<PinNum n={nums[i]}/>:null}<PinIcon cat={pn.category} size={18}/><input ref={function(el){if(el&&focusPin.current===i){focusPin.current=null;el.focus({preventScroll:true});}}} aria-label={ph} value={pn.note} maxLength={g?14:undefined} onChange={function(e){var v=e.target.value;setPins(function(p){return p.map(function(x,xi){return xi===i?Object.assign({},x,{note:v}):x;});});}} onFocus={function(){setSel({kind:"pin",i:i});}} placeholder={ph} style={{flex:1,padding:"6px 9px",borderRadius:8,border:"1px solid "+((sel&&sel.kind==="pin"&&sel.i===i)?C.blue:C.border),background:C.surface,color:C.text,fontSize:12,boxSizing:"border-box",outline:"none"}}/></div>;})}</div>:null}
    {/* Two topos of one wall used to be "Latest" and "Alt 1": nothing said which drew the direct start and which the ramp. Optional, 60 characters, stored in topo_lines.label, shown on the thumbnail and as the line's chip in the viewer. */}
    <input aria-label="Name this line (optional)" value={label} maxLength={60} onChange={function(e){setLabel(e.target.value);}} placeholder="Name this line (optional) — e.g. direct start, left-hand variation" style={{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:13,outline:"none",marginBottom:10}}/>
    <div style={{display:"flex",gap:12}}>
      <button onClick={cancel} style={{flex:1,padding:9,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button>
      <button disabled={!canSave} onClick={function(){onSubmit({points:points,variants:variants,variantLabels:keptVar.map(function(o){return o.t;}),pins:cleanPins(),label:label.trim()||null});}} style={{flex:2,padding:9,background:canSave?C.blueSolid:C.border,color:C.onSolid,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save topo</button>
    </div>
  </div>;
}
function splitItineraryDays(text){
  if(!text)return {days:[],multi:false};
  const re=/\bDay\s+(\d+)\s*(?:of\s*\d+)?\s*[:—\-)]\s*/gi;
  const marks=[];let m;
  while((m=re.exec(text))){marks.push({idx:m.index,end:re.lastIndex,n:parseInt(m[1],10)});}
  if(!marks.length)return {days:[{n:1,text:text.trim()}],multi:false};
  const out=[];
  for(let i=0;i<marks.length;i++){
    const start=marks[i].end;const end=(i+1<marks.length)?marks[i+1].idx:text.length;
    const seg=text.slice(start,end).trim().replace(/^[;,.\s]+/,"").replace(/[;,.\s]+$/,"");
    if(seg)out.push({n:marks[i].n,text:seg});
  }
  return {days:out.length?out:[{n:1,text:text.trim()}],multi:out.length>1};
}
function splitItinerarySteps(text){return text.split(/;\s+/).map(s=>s.trim()).filter(Boolean);}
function ItineraryView({route,activity,onSeeReports,onSeeSeason,seasonOnConditions,onContribute,myItin,onSaveMyItin,crewsForRoute,onShareItinToCrew,notify}){
  const it=route.itinerary;const _acts=activity||route.activity||[];const k=routeKw(Object.assign({},route,{activity:_acts}));const repN=_acts.length;
  const [showBuilder,setShowBuilder]=useState(false);const [draft,setDraft]=useState(null);const [pickCrew,setPickCrew]=useState(false);const [pickedKey,setPickedKey]=useState(null);
  const avail=getAvailableItineraries(route);
  const startBuilder=function(seedItin){setDraft(seedItin?{days:itinDaysToDraft(seedItin.days)}:{days:[blankItinDay()]});setPickedKey(null);setShowBuilder(true);};
  const draftContentDays=function(){return (itinDraftToStructured(draft).days||[]).length;};
  // itinDraftToStructured drops contentless days, so an untouched builder yields zero
  // days. Saving that used to toast "Saved your plan — added to My Objectives", bump
  // the objectives count and store nothing. Refuse instead of reporting success.
  const saveDraft=function(){if(!draftContentDays())return;onSaveMyItin&&onSaveMyItin(itinDraftToStructured(draft));setShowBuilder(false);setDraft(null);setPickedKey(null);};
  const days=(it&&it.days&&it.days.length)?it.days:[];const proseIt=(typeof it==="string"&&it.trim())?it.trim():null;
  const parsed=(!days.length&&proseIt)?splitItineraryDays(proseIt):{days:[],multi:false};
  const totG=days.reduce((a,d)=>a+(d.gainFt||0),0),totL=days.reduce((a,d)=>a+(d.lossFt||0),0),totMi=days.reduce((a,d)=>a+(d.miles||0),0);
  const conf=k.confidence;const confC=conf==="High"?C.green:conf==="Medium"?C.amber:C.red;
  const flagged=k.hazards.filter(h=>!h.official&&h.count>=2).length;
  const chip=(t,col)=><span style={{fontSize:12,fontWeight:700,color:col,background:col+"22",borderRadius:7,padding:"3px 8px"}}>{t}</span>;
  // `fill`: a day card's row. Five pills at the TOTAL row's padding need ~320px and a day card on a 390px phone has ~294, so the
  // fifth (pack weight) wrapped onto a row of its own; tighter pills that share the row's width keep all five on one line down to
  // a 360px phone (measured on Goode NE Buttress), and below that a wrapped pill stretches to fill its row rather than sit alone.
  const stat=(k,ic,val,col,fill)=>val==null||val===""?null:<div key={k} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:C.surface,borderRadius:8,padding:fill?"5px 5px":"5px 9px",...(fill?{flex:"1 1 auto",whiteSpace:"nowrap"}:null)}}>{ic?<span style={{fontSize:12}}>{ic}</span>:null}<span style={{fontSize:12,fontWeight:700,color:col||C.text}}>{val}</span></div>;
  return <div>
    <SL>Trip plan</SL>
    {(days.length||parsed.multi||proseIt)?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:9}}>A <b style={{color:C.textSub}}>recommended</b> itinerary based on how parties commonly climb this route — not the only way to do it. Faster/slower parties, different camps, or a different order are all normal.</div>:null}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{chip(conf+" confidence",confC)}{repN?<span {...clickable(()=>onSeeReports&&onSeeReports())} style={{cursor:"pointer"}} title="Jump to trip reports">{chip(repN+(repN===1?" trip report":" trip reports")+" →",C.blue)}</span>:chip("0 trip reports",C.textMuted)}{(route.season&&!["trad","sport"].includes(catOf(route)))?chip("Typical season: "+seasonShort(route.season),C.teal):null}{/* The month-by-month guide, as a chip that GOES there (owner note 2026-10-28). It was an italic
      "Full month-by-month seasonal guidance is further down this tab." under the chips, which was false on every route with a
      Conditions tab: SEASONAL GUIDANCE moved there (#2701) and the sentence stayed. */(route.seasonalGuidance&&onSeeSeason&&!["trad","sport"].includes(catOf(route)))?<span {...clickable(onSeeSeason)} style={{cursor:"pointer"}} title="Open the month-by-month season guide">{chip(seasonOnConditions?"Month by month · Conditions tab →":"Month by month →",C.blue)}</span>:null}</div>{(route.season&&!["trad","sport"].includes(catOf(route))&&seasonShort(route.season)!==seasonTidy(route.season))?<div style={{fontSize:12,color:C.textSub,margin:"6px 0 0",lineHeight:1.5}}>{route.season}</div>:null}{(route.bestSeason&&!route.seasonalGuidance&&!["trad","sport"].includes(catOf(route)))?<div style={{fontSize:12,color:C.textSub,margin:"6px 0 0",lineHeight:1.5}}><b style={{color:C.teal}}>When to go: </b>{route.bestSeason}</div>:null}
    {/* `cal` holds what is left of the plan's note once its road and closure sentences moved to the road block GETTING THERE reads (owner note 2026-10-28, scripts/oneoff/move-cal-road-notes.mjs). */}{it&&it.cal?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,marginBottom:4}}>{it.cal}</div>:null}
    {it&&it.totalNote?<div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>{it.totalNote}</div>:<div style={{marginBottom:12}}/>}
    {/* Where the hours actually came from. Populated on 544 routes and read by nothing until
        now, which mattered more than most unread fields: the day-by-day times above look
        equally authoritative whether they came from a trip report, from Beckey, or from
        "no route-specific trip report was found ... timing estimated from its relationship to
        Let it Burn/West Face". Sits beside the confidence chip because it is the sentence that
        chip is summarising. */}
    
    {days.map((d,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:ROUTE_GAP}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}><div style={{width:30,height:30,borderRadius:15,background:C.blueBg,color:C.onSolid,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{d.n||i+1}</div>{i<days.length-1?<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:18}}/>:null}</div>
      <div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}>
        <div style={{fontSize:13.5,fontWeight:700,marginBottom:d.objective?5:8,lineHeight:1.35}}>{d.title}</div>{d.objective?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginBottom:9}}><span style={{color:C.blue,fontWeight:700}}>Objective · </span>{d.objective}</div>:null}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",marginBottom:d.note?8:0}}>{[stat("gain","↑",d.gainFt!=null?uElev(d.gainFt):null,C.green,1),stat("loss","↓",d.lossFt!=null?uElev(d.lossFt):null,C.amber,1),stat("hours","",d.hours?d.hours+" hr":null,C.text,1),stat("miles","",d.miles?uDistMi(d.miles):null,C.text,1),stat("pack","",d.packLb?uMass(d.packLb):null,C.purple,1)]}</div>
        {d.note?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{d.note}</div>:null}{d.schedule&&d.schedule.length?<div style={{marginTop:d.note?10:9,borderTop:"1px solid "+C.borderLight,paddingTop:10,display:"flex",flexDirection:"column",gap:9}}>{d.schedule.map((st,si)=><div key={si} style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{flexShrink:0,width:68,fontSize:12,fontWeight:700,color:st.time?C.blue:C.textMuted,lineHeight:1.35,paddingTop:1,textAlign:"right",wordBreak:"break-word"}}>{st.time||""}</span><div style={{flex:1,minWidth:0,borderLeft:"2px solid "+C.borderLight,paddingLeft:11}}><div style={{fontSize:12.5,color:C.text,lineHeight:1.4,fontWeight:600}}>{st.label}</div>{st.detail?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:2}}>{st.detail}</div>:null}</div></div>)}</div>:null}
      </div></div>)}
    {(!days.length&&!parsed.multi)?<div style={{fontSize:12.5,color:C.textSub,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px",marginBottom:ROUTE_GAP}}>No day-by-day plan on file yet for this route.</div>:null}
    {days.length?<div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",background:C.surface,borderRadius:10,padding:"9px 11px",marginBottom:ROUTE_GAP}}><span style={{...SUB_LABEL,alignSelf:"center",marginRight:2}}>TOTAL</span>{stat("days","",days.length+(days.length===1?" day":" days"),C.text)}{stat("gain","↑",uElev(totG),C.green)}{totL?stat("loss","↓",uElev(totL),C.amber):null}{totMi?stat("miles","",uDistMi(Math.round(totMi*10)/10),C.text):null}</div>:null}
    {days.length?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>Times and pack weights are estimates for an average party — adjust for your fitness, conditions, and the latest <b style={{color:C.textSub}}>Reports</b> and <b style={{color:C.textSub}}>Safety</b> tabs.{flagged?" Climbers have flagged "+flagged+" hazard"+(flagged!==1?"s":"")+" not in the official info — check Safety before you commit.":""}</div>:null}{(!days.length&&parsed.multi)?<div>{parsed.days.map((d,i)=>{const steps=splitItinerarySteps(d.text);return <div key={i} style={{display:"flex",gap:10,marginBottom:ROUTE_GAP}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}><div style={{width:30,height:30,borderRadius:15,background:C.blueBg,color:C.onSolid,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{d.n}</div>{i<parsed.days.length-1?<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:18}}/>:null}</div><div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}><div style={{fontSize:13.5,fontWeight:700,marginBottom:8}}>{"Day "+d.n}</div>{steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{steps.map((s,si)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{s}</li>)}</ul>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{d.text}</div>}</div></div>;})}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>Day-by-day timing is a general guide — adjust for your fitness, conditions, and the latest <b style={{color:C.textSub}}>Reports</b> and <b style={{color:C.textSub}}>Safety</b> tabs.{flagged?" Climbers have flagged "+flagged+" hazard"+(flagged!==1?"s":"")+" not in the official info — check Safety before you commit.":""}</div></div>:null}
    {(!days.length&&!parsed.multi&&proseIt)?(()=>{const steps=splitItinerarySteps(parsed.days[0].text);return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px"}}>{steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:7}}>{steps.map((s,si)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{s}</li>)}</ul>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6}}>{parsed.days[0].text}</div>}</div>;})():null}
    {(!days.length&&!proseIt)?<div style={{background:C.card,border:"1px dashed "+C.border,borderRadius:12,padding:"18px 14px",textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>No trip plan yet</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:11}}>Climbed this? Add the day-by-day timing — approach, camps, car-to-car — to help the next party.</div><button onClick={()=>onContribute&&onContribute()} style={{...BTN,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid}}>Add a trip plan</button></div>:null}
    {onSaveMyItin?<div>
      <SL>My itinerary</SL>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4,marginBottom:9}}>Build your own plan for this route — start from a suggested one or from scratch.</div>
      {!showBuilder?<div>
        {(myItin&&myItin.days&&myItin.days.length)?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px",marginBottom:ROUTE_GAP}}>
          {myItin.days.map(function(d,i){return <div key={i} style={{marginBottom:i<myItin.days.length-1?7:0,paddingBottom:i<myItin.days.length-1?7:0,borderBottom:i<myItin.days.length-1?"1px solid "+C.border:"none"}}><span style={{fontSize:13,fontWeight:700}}>{"Day "+(d.n||i+1)+(d.title?": "+d.title:"")}</span></div>;})}
        </div>:null}
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={function(){startBuilder(myItin&&myItin.days&&myItin.days.length?myItin:null);}} style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{(myItin&&myItin.days&&myItin.days.length)?"Edit my plan":"+ Plan your own itinerary"}</button>
          {(myItin&&myItin.days&&myItin.days.length)?<button onClick={function(){shareOrCopy(route.name+" — plan",itinShareText(myItin,route),notify);}} aria-label="Share my plan" style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{"Share…"}</button>:null}
          {(myItin&&myItin.days&&myItin.days.length)?<button onClick={function(){printSheet(route.name+" — plan",itinSheetHtml(myItin,route),notify);}} aria-label="Save my plan as a PDF" style={{...BTN,background:C.card,color:C.blue,border:"1px solid "+C.border}}>{"Save as PDF"}</button>:null}
          {(myItin&&myItin.days&&myItin.days.length&&crewsForRoute&&crewsForRoute.length)?(pickCrew?<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>{crewsForRoute.map(function(c,ci){return <button key={c.id} onClick={function(){onShareItinToCrew(c.id,myItin);setPickCrew(false);}} style={{...BTN,background:C.blueBg,color:C.onSolid,border:"1px solid "+C.blueDim}}>{/* Crews have no name column, so every button used to read "→ Crew". The agreed day tells two crews on one route apart. */"→ "+(c.date?"Crew · "+shortDate(c.date):crewsForRoute.length>1?"Crew "+(ci+1):"Your crew")}</button>;})}</div>:<button onClick={function(){setPickCrew(true);}} style={{...BTN,background:C.card,color:C.green,border:"1px solid "+C.green+"55"}}>Share with crew</button>):null}
        </div>
      </div>:<div>
        {avail.length?<div style={{marginBottom:11}}>
          <div style={{...SUB_LABEL,marginBottom:6}}>START FROM A SUGGESTED PLAN</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>{avail.map(function(a){var on=pickedKey===a.key;return <button key={a.key} onClick={function(){setDraft({days:itinDaysToDraft(a.itin.days)});setPickedKey(a.key);}} aria-current={on?"true":undefined} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:9,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,cursor:"pointer",textAlign:"left",width:"100%",boxSizing:"border-box"}}><div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:on?C.blue:C.text}}>{a.label}</div>{a.sub?<div style={{fontSize:11.5,color:C.textMuted,marginTop:2}}>{a.sub}</div>:null}</div>{on?<span style={{color:C.blue,fontSize:15,fontWeight:700,flexShrink:0}}>{"✓"}</span>:null}</button>;})}</div>
        </div>:null}
        <ItineraryEditor itin={draft||{days:[blankItinDay()]}} onChange={setDraft}/>
        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button onClick={function(){setShowBuilder(false);setDraft(null);setPickedKey(null);}} style={{flex:1,padding:9,background:C.card,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={saveDraft} disabled={!draftContentDays()} title={draftContentDays()?"":"Add a day title, a note or some numbers first"} style={{flex:2,padding:9,background:draftContentDays()?C.blueSolid:C.surface,color:draftContentDays()?C.onSolid:C.textMuted,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:draftContentDays()?"pointer":"default"}}>Save my plan</button>
        </div>
      </div>}
    </div>:null}
  </div>;
}
function popInterest(r){return CLIMBERS.filter(c=>c.objectiveIds&&c.objectiveIds.indexOf(r.id)>=0).length;}
/* The topo box's two states, as a function rather than two ternaries in the JSX, for the reason
   seasonShort() and campDetail() are functions: it can be RUN. react-query does not surface a
   cached error under renderToStaticMarkup -- it reports `pending` and masks it -- so a flag read
   off a hook inside this component is unreachable to an SSR probe, which is exactly why every
   sibling (ConsensusPanel, CatchLedger, FriendsList, Inbox) takes its flag as a PROP and is
   provable. TopoSection owns its own query, so the decision comes out instead of the query going
   up. check:topo-outage-copy executes both branches and renders the healthy one end to end.

   The failing branch must not invite the first topo. The headline already flipped; the
   explanation under it did not, so an outage read "Couldn't load the topos" and then "Got a clear
   shot? Add it..." -- honest headline, and a body still presuming there is nothing there. */
export function topoEmptyCopy(unavailable){
  return unavailable
    ?{head:"Couldn’t load the topos",
      body:"A topo may already be on file for this route — this one list just didn’t load, so this is not a claim that there is none. Check your connection and try again."}
    :{head:"No topo yet",
      body:"A topo overlays the route line and markers on a photo of the wall, face, or line. Got a clear shot? Add it and draw the line so the next party can follow it."};
}

export function TopoSection({route}){
  const areaId=route.mountainId;const _topoSess=useSession();const _topoUid=_topoSess&&_topoSess.user&&_topoSess.user.id;
  const [localPhotos,setLocalPhotos]=useState([]);
  const [localLines,setLocalLines]=useState({});
  const [busy,setBusy]=useState(false);
  /* alert() blocked the whole page for a failed upload, in an app that reports every other
     write inline. It also hid WHICH photo failed, since the dialog outlives the row. This
     renders in the section, next to the thing that failed, and clears on the next attempt.
     Not swallowed either way — check:write-feedback exists because a silent failure behind
     a success message is the worse bug. */
  const [err,setErr]=useState(null);
  const [viewerIdx,setViewerIdx]=useState(null);
  const [drawFor,setDrawFor]=useState(null);
  /* A topo belongs to the route page it was posted from (0364): areaId is the whole PEAK on an alpine route, so reading by it put a north-face photo on every south-side route. */const dbTopos=useRouteTopos(USE_DB?route.id:null,areaId);const toposUnavailable=!!(USE_DB&&dbTopos&&dbTopos.isError);const topoCopy=topoEmptyCopy(toposUnavailable);/* No signal: useRouteTopos answered with the topos SAVED on this device, which may be fewer than the crag has. */const toposSavedOnly=!!(dbTopos&&dbTopos.data&&dbTopos.data._savedFrom==="media");

  const photos=USE_DB
    ?(dbTopos.data||[]).map(function(t){var _u=topoPhotoUrl(t.storage_path);return {id:t.id,url:_u,db:true,storagePath:t.storage_path,alt:t.alt||null,caption:t.caption||null,mine:!!(_topoUid&&t.created_by===_topoUid),saveEntry:{url:_u,kind:"topo",areaId:areaId,routeId:route.id,row:t},
        lines:(t.topo_lines||[]).filter(function(l){return l.route_id===route.id;}).slice().sort(function(a,b){return (b.created_at||"").localeCompare(a.created_at||"");}).map(function(l){return Object.assign({},l,{mine:!!(_topoUid&&l.created_by===_topoUid)});}),
        /* Lines on this photo by anyone else, for ANY route: deleting the photo would take theirs with it (cascade). */
        othersDrew:(t.topo_lines||[]).some(function(l){return l.created_by!==_topoUid;})};})
    :localPhotos.map(function(p){return {id:p.id,url:p.url,db:false,
        lines:(localLines[p.id]||[]).slice().sort(function(a,b){return b.ts-a.ts;})};});

  const pickFile=function(){
    const inp=document.createElement("input");inp.type="file";inp.accept="image/*";
    inp.onchange=function(e){const f=e.target.files&&e.target.files[0];if(f)addPhoto(f);};
    inp.click();
  };
  const addPhoto=function(file){
    setErr(null);
    if(USE_DB){
      setBusy(true);
      uploadTopoPhoto(areaId,route.id,file).then(function(t){
        setBusy(false);dbTopos.refetch();
        setDrawFor({id:t.id,url:topoPhotoUrl(t.storage_path),db:true,lines:[],fresh:true});
      }).catch(function(e){setBusy(false);setErr((e&&e.message)||"Couldn't upload that photo.");});
    } else {
      const rd=new FileReader();
      rd.onload=function(){
        const id="local_"+Date.now()+"_"+Math.round(Math.random()*1e6);
        setLocalPhotos(function(p){return p.concat([{id:id,url:rd.result}]);});
        setDrawFor({id:id,url:rd.result,db:false,lines:[]});
      };
      rd.readAsDataURL(file);
    }
  };
  const submitLine=function(photo,data){
    setErr(null);
    if(photo.db&&photo.editLine){
      updateTopoLine(photo.editLine.id,{points:data.points,pins:data.pins,label:data.label||null,variants:data.variants||[],variant_labels:data.variantLabels||[]}).then(function(){
        dbTopos.refetch();setDrawFor(null);
      }).catch(function(e){setErr((e&&e.message)||"Couldn't save your changes.");});
    } else if(photo.db){
      submitTopoLine(photo.id,route.id,data.points,data.pins,data.label||null,data.variants,data.variantLabels).then(function(){
        dbTopos.refetch();setDrawFor(null);
      }).catch(function(e){setErr((e&&e.message)||"Couldn't save that line.");});
    } else {
      setLocalLines(function(m){
        const o=Object.assign({},m);
        o[photo.id]=(o[photo.id]||[]).concat([{id:"line_"+Date.now(),points:data.points,variants:data.variants||[],variant_labels:data.variantLabels||[],pins:data.pins,label:data.label||null,ts:Date.now()}]);
        return o;
      });
      setDrawFor(null);
    }
  };

  const saveCaption=function(p,t){return updateTopoCaption(p.id,t).then(function(){return dbTopos.refetch();});};
  /* YOUR OWN TOPO CAN BE FIXED OR TAKEN DOWN (topo audit, 2026-10-24). updateTopoLine, deleteTopoLine
     and deleteTopoPhoto were written with their RLS (0026: own update / own delete) and never called, so
     a misplaced dot meant drawing a second line beside the first forever, and a photo posted on the
     wrong route could not come down. Mountain Project and 27 Crags both let the uploader edit and
     delete their own; like theirs, a photo other climbers have drawn on stays (it is theirs too) —
     so its uploader cannot take it down. */
  const drawDirty=useRef(false);
  const closeDraw=function(){if(!drawDirty.current)return setDrawFor(null);askConfirm({title:"Discard this drawing?",body:"The points and markers you placed are not saved.",confirmLabel:"Discard"}).then(function(ok){if(ok){drawDirty.current=false;setDrawFor(null);}});};
  const editLine=function(p,l){setViewerIdx(null);setDrawFor(Object.assign({},p,{editLine:l}));};
  const removeLine=function(p,l){
    return askConfirm({title:"Delete your line?",body:"Your line and its markers come off this photo for everyone. The photo stays.",confirmLabel:"Delete line"}).then(function(ok){
      if(!ok)return false;setErr(null);
      return deleteTopoLine(l.id).then(function(){return dbTopos.refetch();}).then(function(){return true;}).catch(function(e){setErr((e&&e.message)||"Couldn't delete that line.");return false;});
    });
  };
  const removePhoto=function(p){
    return askConfirm({title:"Delete this topo photo?",body:"The photo, and any line you drew on it, come down for everyone.",confirmLabel:"Delete photo"}).then(function(ok){
      if(!ok)return false;setErr(null);
      return deleteTopoPhoto(p.id,p.storagePath).then(function(){setViewerIdx(null);return dbTopos.refetch();}).then(function(){return true;}).catch(function(e){setErr((e&&e.message)||"Couldn't delete that photo.");return false;});
    });
  };

  if(USE_DB&&dbTopos.isLoading)return <div style={{marginBottom:ROUTE_GAP}}><SL>TOPO</SL><LoadingRows C={C} label="Loading topo photos…" style={{padding:20}}/></div>;

  return <div style={{marginBottom:ROUTE_GAP}}>
    <SL action={<button onClick={pickFile} disabled={busy} style={{padding:"8px 12px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:11.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?"Uploading…":"+ Add photo"}</button>}>TOPO</SL>
    {err?<div role="alert" style={{background:C.redBg,border:"1px solid "+C.red+"66",borderRadius:10,padding:"9px 12px",marginBottom:9,display:"flex",alignItems:"center",gap:9}}><span style={{flex:1,fontSize:12.5,color:C.red,lineHeight:1.45}}>{err}</span><button onClick={function(){setErr(null);}} aria-label="Dismiss error" style={POP_CLOSE}>✕</button></div>:null}
    {!photos.length?
      <div style={{background:C.card,border:"1px dashed "+C.border,borderRadius:12,padding:"22px 16px",textAlign:"center"}}>
        <div style={{marginBottom:6,opacity:0.75,display:"flex",justifyContent:"center"}}><ActionIcon name="camera" size={24} color={C.textMuted}/></div>
        <div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:4}}>{topoCopy.head}</div>
        <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:11}}>{topoCopy.body}</div>
        <button onClick={pickFile} disabled={busy} style={{padding:"8px 16px",borderRadius:9,border:"1px solid "+C.blueDim,background:busy?C.card:C.blueBg,color:busy?C.textMuted:"#fff",fontSize:12.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?"Uploading…":"Add a topo photo"}</button>
      </div>
    :<div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:2}}>
      {photos.map(function(p,i){
        /* The caption's opening lines sit under the thumbnail, so a reader sees there IS context before opening it. */
        return <div key={p.id} style={{flexShrink:0,width:132}}><TopoThumb p={p} onOpen={function(){setViewerIdx(i);}}/>{p.caption?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",overflowWrap:"anywhere"}}>{p.caption}</div>:null}</div>;
      })}
      <div {...clickable(pickFile)} style={{flexShrink:0,width:132,height:132,borderRadius:11,border:"1px dashed "+C.border,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.blue,fontSize:12,fontWeight:700,gap:6}}>
        <span style={{fontSize:22}}>+</span>Add photo
      </div>
    </div>}
    {toposSavedOnly?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginTop:8}}>{"No signal — showing the "+photos.length+" topo"+(photos.length!==1?"s":"")+" you saved on this device. Any others need a connection."}</div>:null}
    {photos.some(function(p){return p.lines[0]&&((p.lines[0].pins&&p.lines[0].pins.length)||(p.lines[0].variants&&p.lines[0].variants.length));})?<TopoPinLegend style={{marginTop:8}}/>:null}
    {(viewerIdx!=null&&photos[viewerIdx])?<TopoPhotoModal key={photos[viewerIdx].id} photo={photos[viewerIdx]} pos={{i:viewerIdx,n:photos.length,onPrev:function(){setViewerIdx((viewerIdx+photos.length-1)%photos.length);},onNext:function(){setViewerIdx((viewerIdx+1)%photos.length);}}} onClose={function(){setViewerIdx(null);}} onDraw={function(p){setDrawFor(p);}} onDescribe={(USE_DB&&photos[viewerIdx].db&&photos[viewerIdx].mine)?function(p,d){return updateTopoAlt(p.id,d).then(function(){return dbTopos.refetch();});}:undefined} onCaption={(USE_DB&&photos[viewerIdx].db&&photos[viewerIdx].mine)?saveCaption:undefined} onEditLine={USE_DB?editLine:undefined} onDeleteLine={USE_DB?removeLine:undefined} onDeletePhoto={(USE_DB&&photos[viewerIdx].db&&photos[viewerIdx].mine)?removePhoto:undefined}/>:null}
    {drawFor?createPortal(<div onClick={closeDraw} role="dialog" aria-modal="true" aria-label={drawFor.editLine?"Edit your line":"Draw this route's line"} style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:9500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,borderTopLeftRadius:18,borderTopRightRadius:18,width:"100%",maxWidth:520,padding:"16px 16px 22px",border:"1px solid "+C.border,maxHeight:"92vh",overflowY:"auto",overscrollBehavior:"contain",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:800}}>{drawFor.editLine?"Edit your line":"Draw this route's line"}</div>
          <button onClick={closeDraw} style={POP_CLOSE} aria-label="Close">✕</button>
        </div>
        {/* The photo was just posted: ask for its caption here, while the climber still remembers why they took it. Saved on its own, so cancelling the drawing keeps it. */}
        {(drawFor.fresh&&drawFor.db)?<TopoCaptionBox key={drawFor.id} initial={null} onSave={function(t){return saveCaption(drawFor,t);}} style={{marginBottom:12}}/>:null}
        <TopoDrawer key={drawFor.id+":"+(drawFor.editLine?drawFor.editLine.id:"new")} dirtyRef={drawDirty} initial={drawFor.editLine?{photoUrl:drawFor.url,points:drawFor.editLine.points,variants:drawFor.editLine.variants||[],variantLabels:drawFor.editLine.variant_labels||[],pins:drawFor.editLine.pins||[],label:drawFor.editLine.label||""}:{photoUrl:drawFor.url}} onCancel={function(){drawDirty.current=false;setDrawFor(null);}} onSubmit={function(data){drawDirty.current=false;submitLine(drawFor,data);}}/>
      </div>
    </div>,document.body):null}
  </div>;
}
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
/* The uploader's caption box. Saves on an explicit tap and says what happened, like PhotoDescribeBox:
   "Caption saved" only once the write resolved. A plain text area (useRichTextareas grows it) with no
   maxLength, and the database column has no cap either. */
function seasonName(d){var m=parseInt((d||"").slice(5,7),10)||0;return (m>=12||m<=2)?"Winter":m<=5?"Spring":m<=8?"Summer":"Fall";}
/* shortDate now lives in ClimbMatchCore beside DLOCALE: three more surfaces needed it, and two
   copies of a date formatter is how this codebase ended up with four grade parsers. Its catch was
   also DEAD -- toLocaleDateString on an Invalid Date returns "Invalid Date" rather than throwing --
   so the core copy is hardened rather than moved verbatim. */
const ADDR_GEAR=["Quickdraws","Alpine draws","Single rack","Double rack","Micro/offset cams","Cams to #2","Cams to #3","Cams to #4","Cams to #5","Big cams (#5+)","Nuts / stoppers","Offset nuts","Tricams","Hexes","Ball nuts","Nut tool","Long slings","Cordelette","60m rope","70m rope","80m rope","Half / twin ropes","Tag line","Aiders / etriers","Pitons / beaks","Hooks","Ascenders","Ice screws","V-thread tool","Ice tools","Crampons","Pickets","Whippet","Mountaineering boots","Beacon · probe · shovel","Approach shoes","Helmet","Stick clip","Belay gloves","Headlamp","Crash pad(s)"];
/* HINTS moved to lib/fieldHints.js, so Add a climb can say the same thing about each field. */
function itinSummaryStr(it){return (it&&it.days&&it.days.length)?it.days.map(function(d,i){return "Day "+(i+1)+": "+(d.title||"");}).join(" · "):"";}
/* Drawn from what the catalog's own 845 anchor strings say, not invented: "gear" is far and
   away the most common (352), then bolted stations (48 + 32), walk-offs (36), ice screws,
   trees, slung horns and pickets. */
const PITCH_ANCHORS=["Bolted","Gear","Tree","Slung horn / block","Fixed pin","Picket","Ice screws","Walk-off (no belay)"];
/* A REMOVAL IS NOT AN EDIT LIKE THE OTHERS (0351, owner 2026-10-22: "people shouldn't be able to delete waypoints when editing"). The same test the database runs at insert (_edit_removes): the page holds rows and the edit has fewer, or fewer that carry a map pin. The database is the gate — it holds such an edit for the owner however many climbers send it; this copy only lets the sheet say so BEFORE the climber sends, and ask why. The list fields are the ones whose editor has a remove ✕. */
const REMOVABLE_LISTS={waypoints:function(r){return r.waypoints;},pitchDetail:function(r){return r.pitchDetail;},rappelDetail:function(r){return r.rappelDetail;},bivy:function(r){return r.bivy;},approachVariants:function(r){return r.approachVariants;},climbingRoute:function(r){return r.climbingRoute;},haz:function(r){return r.hazards;}};
function listPins(a){return a.filter(function(w){return w&&typeof w==="object"&&w.lat!=null&&w.lat!==""&&w.lng!=null&&w.lng!=="";}).length;}
function editRemoves(cur,nxt){if(!Array.isArray(cur)||!cur.length)return false;if(!Array.isArray(nxt)||nxt.length<cur.length)return true;return listPins(nxt)<listPins(cur);}
/* The edit sheet's rack steppers, and how they map onto rack_items rows (lib/rack.js). A row the steppers
   cannot state (quickdraws, a rope, pitons, "#0.5-#3", "one set") is KEPT as it is, shown under the
   steppers with a ✕, and submitted untouched, so correcting one cam never deletes the route's quickdraws. */
const SF_RACK_CATS=[["Cams",["#0.3","#0.4","#0.5","#0.75","#1","#2","#3","#4","#5"],"cam"],["Nuts / stoppers",["#1","#2","#3","#4","#5","#6","#7","#8","#9","#10","#11","#12","#13"],"nut"],["Slings",["60cm","120cm","180cm","240cm"],"sling"],["Alpine draws",["Qty"],"adraw"]];
const SF_RACK_ITEM={cam:"cams",nut:"nuts",sling:"slings",adraw:"alpine draws"};
const SF_KIND_CAT={cams:"cam",nuts:"nut",stoppers:"nut",slings:"sling","alpine draws":"adraw"};
function sfRackSize(cat,sizes){var s=String(sizes==null?"":sizes).trim().toLowerCase();if(cat==="adraw")return s?null:"Qty";if(cat==="sling"){var m=s.match(/^(\d+)\s*cm$/);return m?m[1]+"cm":null;}s=s.replace(/^#/,"");return /^\d*\.?\d+$/.test(s)?"#"+String(parseFloat(s)):null;}
/* The stepper state a route's stored rack starts the editor in: {"cam:#1":2, …, keep:[rows]}. */
function rackSeedOf(route){var rk={},keep=[];((route&&route.rackItems)||[]).filter(isRackItem).forEach(function(x){var cat=SF_KIND_CAT[rackItemKind(x)];var c=cat?SF_RACK_CATS.find(function(y){return y[2]===cat;}):null;var sz=c?sfRackSize(cat,x.sizes):null;var q=Math.round(+x.qty);if(c&&sz&&c[1].indexOf(sz)>=0&&q>0){var k=cat+":"+sz;rk[k]=(rk[k]||0)+q;}else keep.push({item:x.item,sizes:x.sizes,qty:x.qty});});if(keep.length)rk.keep=keep;return rk;}
/* ...and the rows it submits, in the shape rack_items stores. */
function rackItemsOf(rk){var out=[];SF_RACK_CATS.forEach(function(c){c[1].forEach(function(s){var q=rk[c[2]+":"+s];if(q>0)out.push(c[2]==="adraw"?{item:"alpine draws",qty:q}:{item:SF_RACK_ITEM[c[2]],sizes:s,qty:q});});});return out.concat((rk.keep||[]).filter(isRackItem));}
export function SuggestFix({route,onClose,onSubmit,onLog,scrollTo,pending,peakCoord,prefill,approachSibs,focusPitch}){
  const scrollRef=useRef(null);
  const [groupOpen,setGroupOpen]=useState({});
  const jumpTo=function(k){setOpen(function(o){return Object.assign({},o,{[k]:true});});setTimeout(function(){if(scrollRef.current){var el=scrollRef.current.querySelector("#sf-section-"+k);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});}},60);};
  useEffect(function(){if(!scrollTo||!scrollRef.current)return;var t=setTimeout(function(){var el=focusPitch!=null?scrollRef.current.querySelector("[data-src=\""+focusPitch+"\"]"):null;if(!el)el=scrollRef.current.querySelector("#sf-section-"+scrollTo);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});},80);return function(){clearTimeout(t);};},[scrollTo,focusPitch]);
  // discipline chips → app convention. catTo = filtering category; disc = {discipline, style}
  const DISCS=[[DL.trad,"trad",{discipline:"rock",style:"Trad"}],[DL.sport,"sport",{discipline:"rock",style:"Sport"}],[DL.toprope,"toprope",{discipline:"toprope"}],[DL.bouldering,"bouldering",{discipline:"bouldering"}],[DL.alpine,"alpine",{discipline:"alpine"}],[DL.ice,"ice",{discipline:"ice"}],[DL.mixed,"mixed",{discipline:"mixed"}],[DL.aid,"aid",{discipline:"aid"}],[DL.mountaineering,"mountaineering",{discipline:"mountaineering"}],[DL.scrambling,"scrambling",{discipline:"scrambling"}]];
  const catToChip=function(c){if(c==="hiking")return "scrambling";return DISCS.some(function(d){return d[1]===c;})?c:"trad";};
  const [disc,setDisc]=useState(catToChip(catOf(route)));
  const [vals,setVals]=useState(function(){var p=prefill||{};/* A rack prefill (the RACK card's pencil) is the rack TEXT; the counts start from what is stored. */return p.rack?Object.assign({},p,{rack:Object.assign(rackSeedOf(route),p.rack)}):p;});const [note,setNote]=useState("");const [sent,setSent]=useState(false);const [sentN,setSentN]=useState(0);const [open,setOpen]=useState({});/* There is no "I see this too" any more: every edit is held for the owner (0307–0309), so a second climber's agreement is information for the review queue, not a vote that can push a value live. */const _sfSess=useSession();const _sfUid=(USE_DB&&_sfSess&&_sfSess.user)?_sfSess.user.id:null;const _standQ=useMyContributionStanding(_sfUid);const _standing=(_standQ&&_standQ.data)||null;const _sfCx=useContext(ConfidenceCtx);const _lvOf=function(k){return _sfCx&&_sfCx.levels?_sfCx.levels[k]:null;};
  // rack builder (keyed per use; shared across the single rack field)
  /* The rack starts from the route's stored counts (rackSeedOf) and becomes an edit only when touched. The Alpine draws stepper shows only where # Alpine draws has no box of its own: two places to type one count wrote it twice, once as a number and once as "Alpine draws: Qty ×8". okField is read at render, after it is defined. */
  const rackCats=function(){return SF_RACK_CATS.filter(function(c){return c[2]!=="adraw"||!okField("alpineDraws");});};
  const rack=vals.rack||rackSeedOf(route);const setRack=function(fn){setVals(function(v){return Object.assign({},v,{rack:fn(v.rack||rackSeedOf(route))});});};
  const itin=vals.itinerary||{days:[blankItinDay()]};
  const setItin=function(next){setVals(function(v){return Object.assign({},v,{itinerary:next});});};
  /* `note` is a reserved key alongside the size counters. A researched rack is prose —
     "Typically climbed with no protection on the standard class 3-4 ramp; a rope and light
     rack are only useful if you take the direct summit-block finish" — and the size steppers
     cannot state that, let alone correct it. Without a free-text path the rack was the one
     field on the route that no contributor could fix. */
  const rackLinesOf=function(rk){var gi=(rk.items||[]).map(function(it){var ms=(rk.itemMonths||{})[it];return (ms&&ms.length&&ms.length<12)?it+" ("+monthSpan(ms)+")":it;});var note=(rk.note||"").trim();return note?gi.concat([note]):gi;};
  const rackStr=function(rk){var out=[];SF_RACK_CATS.forEach(function(c){var items=c[1].filter(function(s){return rk[c[2]+":"+s];}).map(function(s){return (s==="Qty"?"":s+" ")+"×"+rk[c[2]+":"+s];});if(items.length)out.push(c[0]+": "+items.join(", "));});(rk.keep||[]).forEach(function(x){out.push(rackItemLine(x));});var gi=(rk.items||[]).map(function(it){var ms=(rk.itemMonths||{})[it];return (ms&&ms.length&&ms.length<12)?it+" ("+monthSpan(ms)+")":it;});if(gi.length)out.push(gi.join(", "));var note=(rk.note||"").trim();if(note)out.push(note);return out.join("; ");};
  // Absorbed from the deleted `gear` field — the hardware the size steppers cannot express.
  const togRackItem=function(v){setRack(function(r){var arr=r.items||[];var had=arr.indexOf(v)>=0;var im=Object.assign({},r.itemMonths||{});if(had)delete im[v];return Object.assign({},r,{items:had?arr.filter(function(x){return x!==v;}):arr.concat([v]),itemMonths:im});});};
  /* Some gear is only needed part of the year — crampons and an axe for the early-season snow,
     not in August. A picked item can name the months it is needed in; none means all year. */
  const togItemMonth=function(it,m){setRack(function(r){var im=Object.assign({},r.itemMonths||{});var cur=im[it]||[];im[it]=cur.indexOf(m)>=0?cur.filter(function(x){return x!==m;}):cur.concat([m]).sort(function(a,b){return a-b;});if(!im[it].length)delete im[it];return Object.assign({},r,{itemMonths:im});});};
  /* Tap adds one, − takes one away. It used to cycle 1→5→0, so a route needing a sixth
     alpine draw or a triple set of cams could not be described. 60 is a sanity ceiling only. */
  const bumpRack=function(key,d){setRack(function(r){var n=Object.assign({},r);var q=Math.max(0,Math.min(60,(n[key]||0)+(d||1)));if(q===0)delete n[key];else n[key]=q;return n;});};
  /* The pitch editor opened on ONE BLANK ROW even when the route already had a full
     pitch-by-pitch breakdown on the screen behind it — 919 catalog routes carry 3,569 pitch
     rows. So correcting pitch 7 meant retyping pitches 1-6 from memory, or submitting a
     one-pitch array that replaces all of them. Start from what is on file and edit that.

     Rows are held in the app's OWN pitch shape rather than a private {grade,len,notes} one.
     That private shape is why lengths vanished from both summary strings: pitchStr read
     pp.len while every stored row uses lengthM, and pendStr's mapper read pp.lengthM off rows
     the editor had just written as pp.len. One shape means what gets submitted is what
     PitchTable already renders. Prefill is no longer strictly IDENTITY: it converts the stored
     metres into the CLIMBER'S OWN UNITS, because the box asks in those units while the column
     stays canonical. The row SHAPE is still one shape -- only the length's unit differs between
     draft and column, exactly as itinDaysToDraft puts metres under the key `gainFt` for a
     metric climber. Reverting any one of those edges is silent; see the injection suite. */
  /* Editor rows are keyed by IDENTITY, not index. With index keys, removing a middle pitch or waypoint handed every later row's DOM state (focus, IME composition, scroll) to the wrong row. A WeakMap gives each row object a number the first time it renders; an edit or a renumber copies it onto the replacement object (keep), so a row keeps its key while its text changes. The derived row lists are memoised so an untouched row is the same object from render to render. */
  const rowKeys=useRef(new WeakMap());const rowSeq=useRef(0);const keyFor=function(row){var k=rowKeys.current.get(row);if(k==null){k=++rowSeq.current;rowKeys.current.set(row,k);}return k;};const keep=function(from,to){var k=rowKeys.current.get(from);if(k!=null)rowKeys.current.set(to,k);return to;};
  const blankPitch=function(n){return {pitch:n,grade:"",lengthM:"",gear:"",belay:"",notes:"",anchor:"",bolts:"",crux:false};};const blankRap=function(n){return {n:n,lengthM:"",anchor:"",station:"",hazards:"",notes:""};};
  /* EVERY PITCH THE PAGE SHOWS (owner's note, 2026-10-24: "the pitch by pitch submission doesn't show all
     the current pitches"). Three ways it fell short of ROUTE BREAKDOWN: (1) a route claiming more pitches
     than it describes ("The route lists 8 pitches, so 5 are not described here") opened on the 3 described,
     with nowhere to put the other 5 — they are rows now, marked not described, and an untouched one submits
     nothing; (2) it always sorted by number, so a route with named legs ("Approach gully") came out in a
     different order from the page, which sorts only when every label is a number; (3) a named leg was
     headed "Pitch Approach gully". */
  const routePitches=useMemo(function(){return padPitchRows((route.pitchDetail&&route.pitchDetail.length)
    ?route.pitchDetail.map(function(p,i){return {_src:i,pitch:p.pitch!=null?p.pitch:(p.n!=null?p.n:i+1),grade:p.grade||"",lengthM:p.lengthM!=null?uLenN(p.lengthM):"",gear:p.gear||"",belay:p.belay||"",notes:p.note!=null?p.note:(p.notes||""),anchor:p.anchor||"",bolts:p.bolts!=null?p.bolts:"",crux:!!p.crux};})
    :[blankPitch(1)],{pitchDetail:route.pitchDetail,pitches:route.pitches},blankPitch);},[route.pitchDetail,route.pitches]);
  const pitches=vals.pitchDetail||routePitches;const setPitches=function(fn){setVals(function(v){return Object.assign({},v,{pitchDetail:fn(v.pitchDetail||routePitches)});});};
  const pitchStr=function(ps,sep){return ps.map(function(pp,i){var bits=[pp.grade,pp.lengthM?pp.lengthM+uLenUnit():"",pp.anchor?("anchor: "+pp.anchor):"",(pp.bolts!==""&&pp.bolts!=null)?(pp.bolts+" bolts"):"",pp.crux?"crux":"",pp.gear,pp.notes].filter(Boolean);return bits.length?("P"+(pp.pitch!=null?pp.pitch:i+1)+": "+bits.join(", ")):"";}).filter(Boolean).join(sep||"; ");};
  const setPitch=function(i,k,v){setPitches(function(p){return p.map(function(x,j){return j===i?keep(x,Object.assign({},x,{[k]:v})):x;});});};/* Renumber after a move or a removal: the numbered pitches count 1, 2, 3 in their new order; a named leg keeps its name. */const relabel=function(list){var c=0;return list.map(function(x){if(!isNumLbl(x.pitch))return x;c++;return keep(x,Object.assign({},x,{pitch:c}));});};const addPitch=function(){setPitches(function(p){return p.concat([blankPitch(p.filter(function(x){return isNumLbl(x.pitch);}).length+1)]);});};const rmPitch=function(i){setPitches(function(p){return relabel(p.filter(function(_,j){return j!==i;}));});};/* Move a pitch one place; the renumber follows the new order, as remove does. */const mvPitch=function(i,d){setPitches(function(p){var j=i+d;if(j<0||j>=p.length)return p;var q=p.slice();var t=q[i];q[i]=q[j];q[j]=t;return relabel(q);});};
  /* RAPPELS, STATION BY STATION — the editor the rappel table never had (0307–0309). Same identity-keyed rows and the same units-at-the-edges rule as pitches: lengths are typed in the climber's units and stored in metres; hazards are one per line. Rows are prefilled from rappel_detail so a climber corrects the table rather than retyping it. */
  /* Honours _rapEdited like every reader of the station table (check:correction-readers): once climbers' corrected count is on the route, the editor starts from a blank row rather than re-offering the table they overrode. */const routeRaps=useMemo(function(){return (route.rappelDetail&&route.rappelDetail.length&&!_rapEdited(route))?route.rappelDetail.map(function(r,i){return {n:r.n!=null?r.n:i+1,lengthM:r.lengthM!=null?uLenN(r.lengthM):"",anchor:r.anchor||"",station:r.station||"",hazards:Array.isArray(r.hazards)?r.hazards.join("\n"):(r.hazards||""),notes:r.notes||r.note||""};}).sort(function(a,b){return a.n-b.n;}):[blankRap(1)];},[route.rappelDetail]); // eslint-disable-line react-hooks/exhaustive-deps -- draft seeded from the stored rappel list only; the rest of route must not reset a form in progress
  const raps=vals.rappelDetail||routeRaps;const setRaps=function(fn){setVals(function(v){return Object.assign({},v,{rappelDetail:fn(v.rappelDetail||routeRaps)});});};
  const rapStr=function(rs,sep){return (rs||[]).map(function(r,i){var bits=[r.lengthM?r.lengthM+uLenUnit():"",r.anchor,r.station?("station: "+r.station):"",r.hazards?String(r.hazards).split("\n").filter(Boolean).join("/"):"",r.notes].filter(Boolean);return bits.length?("R"+(r.n!=null?r.n:i+1)+": "+bits.join(", ")):"";}).filter(Boolean).join(sep||"; ");};
  const setRap=function(i,k,v){setRaps(function(p){return p.map(function(x,j){return j===i?keep(x,Object.assign({},x,{[k]:v})):x;});});};const addRap=function(){setRaps(function(p){return p.concat([blankRap(p.length+1)]);});};const rmRap=function(i){setRaps(function(p){return p.filter(function(_,j){return j!==i;}).map(function(x,j){return keep(x,Object.assign({},x,{n:j+1}));});});};const mvRap=function(i,d){setRaps(function(p){var j=i+d;if(j<0||j>=p.length)return p;var q=p.slice();var t=q[i];q[i]=q[j];q[j]=t;return q.map(function(x,k){return keep(x,Object.assign({},x,{n:k+1}));});});};
  /* road / access builders. Both columns are jsonb OBJECTS, not scalars, which is why they had
     no contribute path for so long — every other field here is a value, a list or a purpose-built
     builder. They are the two blocks on the route page that go stale independently of the rock:
     a washout, a gate that opens late, a permit system that changed this season. The catalog
     cannot know any of that; the last party does.

     THE SUB-KEY NAMES ARE NOT A GUESS. Each one is the key the panel's own reader looks at, and
     where a reader accepts more than one spelling the form writes the CANONICAL one:

       * `access` carries TWO land-manager keys — `land_manager` on 399 of 400 sampled rows and
         `landManager` on 8. Display reads `ac.land_manager||ac.landManager`, so writing the
         canonical one shows immediately AND leaves a legacy value in place as the fallback it
         already is. Same story for the pass: `parking_pass` (397) is the rendered row, while
         `passRequired` (7) feeds a different row and is offered separately.
       * Seasonal closures render as `ac.closures||ac.closure||ac.seasonal`; the form writes
         `closures`, first in that chain.
       * `road` is single-convention camelCase across the board — name / driveNote / status /
         seasonalGate — and all four render in GETTING THERE.

     Anything the form does NOT offer (`_raw`, `permitZone`, a legacy `landManager`) survives,
     because the merge in ClimbMatch.jsx assigns over a copy of the existing object rather than
     replacing it. Replacing would silently delete enrichment nobody asked to remove. */
  
  
  /* The PUBLISHED times — the guidebook figure the planner shows beside Scarf's Rule and, since
     #819, beside what parties actually logged. A fourth element marks a key numeric: these are
     hours and must merge back as NUMBERS, because every reader does arithmetic on them
     (`totalHrs - approachTimeHrs - descentTimeHrs` derives the summit time) and a string would
     make that concatenate rather than subtract. `recommendedStart` is deliberately free prose —
     the live column holds 401 distinct values like "5:00 AM from camp" and "Alpine start from
     high camp", which no picker can express.
     `sectionBreakdown` is NOT offered, and that is the whole reason the merge below copies
     rather than assigns: it is a nested array of {hrs,note,fromTo,section} on 546 routes, and a
     form that cannot author it must not be able to delete it. */
  
  /* Keyed by input type, and the type is deliberately the same string as the route property, so
     one lookup serves the key list, the current value and the draft state. It replaces a
     `f.type==="road"?ROAD_KEYS:ACCESS_KEYS` ternary that appeared in four places — a third
     object field would have had to be added to all four, and missing one reads as a field that
     renders but never submits. */
/* A sub-key may be DOTTED (`fitnessSpec.hiking`). partner_requirements.fitnessSpec is an
     OBJECT on 473 of 504 populated routes — 460 carry `hiking` and 455 `packWeight` — so a single
     text row there would offer to replace a structured fact with a sentence. The panel renders
     both shapes, so nothing would break; it would just be a quiet downgrade, and one that could
     never be agreed anyway because free prose cannot cluster. */
  const _dget=function(o,p){var q=String(p).split("."),v=o;for(var i=0;i<q.length;i++){if(v==null||typeof v!=="object")return undefined;v=v[q[i]];}return v;};
  const _dset=function(o,p,val){var q=String(p).split("."),r=Object.assign({},o||{}),t=r;for(var i=0;i<q.length-1;i++){t[q[i]]=Object.assign({},t[q[i]]||{});t=t[q[i]];}t[q[q.length-1]]=val;return r;};
  const OBJ_KEYS={road:ROAD_KEYS,access:ACCESS_KEYS,timing:TIMING_KEYS,crowds:CROWDS_KEYS,partnerRequirements:PARTNER_KEYS,seasonalGuidance:SEASONAL_KEYS,emergency:EMERGENCY_KEYS,approachLogistics:LOGISTICS_KEYS,climate:CLIMATE_KEYS,seasonalHazards:SEASHAZ_KEYS};
/* An enum row stores the CODE the column already holds (solitudeRating is a number 1-5 on
     499 routes, not a phrase), and shows the label. Printing the raw code in the summary line
     would make the collapsed field read "solitude: 4". */
  const objLabel=function(k,v){if(k[3]!=="enum"||!k[4])return v;var hit=k[4].filter(function(o){return String(o[0])===String(v);})[0];return hit?hit[1]:v;};
  const objStr=function(keys,o){if(!o)return "";return keys.map(function(k){var v=_dget(o,k[0]);/* a months map reads "Jan Low, Feb Moderate", its blanks dropped, so a picker set back to "—" is no change */if(k[3]==="months"){var _cm=cleanMonths(v);return _cm?k[1]+": "+Object.keys(_cm).map(function(m){return m.slice(0,3)+" "+_cm[m];}).join(", "):null;}/* `String(v)` HERE PUT "[object Object]" ON EVERY ROUTE CARRYING seasonal_hazards. The dotted key specs are the real fix (see the note on SEASHAZ_KEYS), and this is the fail-safe: `crevasses` is a string on 453 rows and an OBJECT on 34, so no single key spec is right for it, and the next column to drift shape would reintroduce the defect. fmtSlingVal is the app's own leaf flattener — despite the name it is generic (string, number, array, keyed object) — so there is one flattener rather than two that drift. */var s=(v!=null&&typeof v==="object")?fmtSlingVal(v):v;return (s==null||String(s).trim()==="")?null:k[1]+": "+s;}).filter(Boolean).join(" · ");};
  const _clip=function(s){return s.length>44?s.slice(0,44)+"…":s;};
  /* `cur` drives three things, and "—" is load-bearing in all of them: the collapsed summary
     line, `wasEmpty` (which decides whether one climber can fill a blank or three must agree),
     and the reference string. An access block that exists but holds only keys this form does not
     offer reads as "—", which is correct — there is nothing here for a climber to confirm. */
  const roadCur=function(r){var s=objStr(ROAD_KEYS,r&&r.road);return s?_clip(s):"—";};
  const accessCur=function(r){var s=objStr(ACCESS_KEYS,r&&r.access);return s?_clip(s):"—";};
  const road=vals.road||{};const setRoad=function(k,v){setVals(function(p){var o=Object.assign({},p.road||{});o[k]=v;return Object.assign({},p,{road:o});});};
  const access=vals.access||{};const setAccess=function(k,v){setVals(function(p){var o=Object.assign({},p.access||{});o[k]=v;return Object.assign({},p,{access:o});});};
  /* `cur` drives the collapsed summary AND wasEmpty, which decides whether one climber can
     fill a blank or three must agree. */
  const varCur=function(r){var a=(r&&r.approachVariants)||[];if(!a.length)return "—";return _clip(a.map(function(x){return x.name||"unnamed way in";}).join(" · "));};
  const secCur=function(r){var a=(r&&r.climbingRoute)||[];if(!a.length)return "—";return _clip(a.slice().sort(function(x,y){return (x.n||0)-(y.n||0);}).map(function(x){return x.label||("Section "+(x.n||"?"));}).join(" · "));};
  const timingCur=function(r){var s=objStr(TIMING_KEYS,r&&r.timing);return s?_clip(s):"—";};
  const objSet=function(field){return function(k,v){setVals(function(p){var o=_dset(p[field]||{},k,v);var n={};n[field]=o;return Object.assign({},p,n);});};};
  const timing=vals.timing||{};const setTiming=objSet("timing");
  const objCur=function(keys){return function(r,f){var s=objStr(keys,r&&r[f]);return s?_clip(s):"—";};};
  const climateCur=objCur(CLIMATE_KEYS);const seasHazCur=objCur(SEASHAZ_KEYS);const crowdsCur=objCur(CROWDS_KEYS),partnerCur=objCur(PARTNER_KEYS),seasonalCur=objCur(SEASONAL_KEYS),emergencyCur=objCur(EMERGENCY_KEYS),logisticsCur=objCur(LOGISTICS_KEYS);
  const crowdsV=vals.crowds||{},setCrowdsV=objSet("crowds");
  const partnerV=vals.partnerRequirements||{},setPartnerV=objSet("partnerRequirements");
  const seasonalV=vals.seasonalGuidance||{},setSeasonalV=objSet("seasonalGuidance");
  const emergencyV=vals.emergency||{},setEmergencyV=objSet("emergency");
  const logisticsV=vals.approachLogistics||{},setLogisticsV=objSet("approachLogistics");
  
  const climateV=vals.climate||{},setClimateV=objSet("climate");
  const seasHazV=vals.seasonalHazards||{},setSeasHazV=objSet("seasonalHazards");
  const OBJ_STATE={road:[road,setRoad],access:[access,setAccess],timing:[timing,setTiming],crowds:[crowdsV,setCrowdsV],partnerRequirements:[partnerV,setPartnerV],seasonalGuidance:[seasonalV,setSeasonalV],emergency:[emergencyV,setEmergencyV],approachLogistics:[logisticsV,setLogisticsV],climate:[climateV,setClimateV],seasonalHazards:[seasHazV,setSeasHazV]};
  // waypoints builder — structured rows so a confirmed edit writes a real array, not text (a text override used to crash the waypoints list/map, see WP_TYPES-driven renderInput below)
  const blankWp=function(){return {type:"Junction",name:"",lat:"",lng:"",elev:"",distMi:"",note:"",directions:""};};
  const [activeWpIdx,setActiveWpIdx]=useState(0);
  /* Same defect the pitch editor had, and the same fix: this opened on one blank Junction
     row while the route's real waypoints sat listed on the screen behind it, so "edit
     waypoints" could only ever ADD one — correcting the trailhead coordinate meant retyping
     every other waypoint or wiping them. The row shape here is the editor's (lat/lng as
     strings for the text inputs), so stringify on the way in and let the existing submit path
     parse on the way out. */
  const routeWps=useMemo(function(){return (route.waypoints&&route.waypoints.length)
    ?route.waypoints.map(function(w){return {type:w.type||"Junction",name:w.name||"",lat:w.lat!=null?String(w.lat):"",lng:w.lng!=null?String(w.lng):"",elev:w.elev!=null?String(w.elev):"",distMi:w.distMi!=null?String(w.distMi):"",note:w.note||""};})
    :[CRAG_CATS.includes(catOf(route))?Object.assign(blankWp(),{type:"Trailhead"}):blankWp()];},[route.waypoints]); // eslint-disable-line react-hooks/exhaustive-deps -- draft seeded from the stored waypoint list only; the rest of route must not reset a form in progress
  /* CAMPING & BIVY is contributable from here. It was the one section a climber could look at,
     disagree with, and have no way to correct: `bivy` was in neither FIELDS nor SS, and the
     panel's edit pencil opened the WAYPOINTS editor, which edits a different store. Every one of
     the ~380 routes carrying camping got it from an enrichment pass, so the person who actually
     slept there could not fix a word of it.
     Modelled on the waypoints editor directly below, including its unit handling: `elev` is
     stored in FEET, so what the climber types is converted through uImp() on submit exactly as
     a waypoint elevation is. See campElevFt() for the read side, which also accepts the legacy
     metres spelling. */
  /* The option list is the catalog's own vocabulary rather than an invented one. 290 stored
     `class` values canonicalise to these for 89% of sections (3 x63, 2-3 x53, 2 x27, 4 x24,
     3-4 x24), with 11% low-5th technical steps on otherwise unroped ground. A 16-option picker
     reproduces ~74% of stored values EXACTLY; the rest are compound ("2-3 with occasional class
     3-4 moves") and belong in the section's own notes, because this renders as a CHIP. */
  const SEC_CLASSES=["Class 1","Class 1-2","Class 2","Class 2-3","Class 3","Class 3-4","Class 4","Class 4-5","Glacier travel","5.0-5.4","5.5","5.6","5.7","5.8","5.9","5.10"];
  const MAX_SEC=24;
  const blankSec=function(){return {label:"",cls:"",notes:""};};
  const MAX_VAR=8;
  const blankVar=function(){return Object.assign({name:"",season:"",distMi:"",gainFt:"",hours:"",notes:"",whyThisWay:"",hazards:""},tripDraft({}));};
  /* WHERE A WAY IN STARTS, AND WHAT THE WHOLE TRIP IS VIA IT (lib/approaches.js). Without this a
     climber could add a way in only as a prose card: the page could not switch to it, so its
     trailhead, track and numbers never reached the map, the planner or the trip plan. A way in is
     either ANOTHER ROUTE on this peak (`viaRouteId` — the Southeast Ridge reached by the Fisher
     Chimneys) or its OWN TRAILHEAD with whole-trip numbers and an optional GPX track (`trip`).
     Numbers are typed in the climber's units and seeded from the stored ones; `_tSeed` keeps the
     seeded strings so an untouched box writes back the exact stored value, not a unit round-trip. */
  const tripDraft=function(v){var t=v&&v.trip&&typeof v.trip==="object"?v.trip:{};var imp=uImp();
    var dS=t.distKm!=null?String(+(imp?t.distKm/1.609344:t.distKm).toFixed(1)):"";
    var gS=t.gainFt!=null?String(imp?t.gainFt:Math.round(t.gainFt/3.28084)):"";
    var lS=t.lossFt!=null?String(imp?t.lossFt:Math.round(t.lossFt/3.28084)):"";
    return {mode:v&&v.viaRouteId?"via":(v&&v.trip?"own":""),...tripTrailheadDraft(t),
      tDist:dS,tGain:gS,tLoss:lS,tHrs:t.timing&&t.timing.approachTimeHrs!=null?String(t.timing.approachTimeHrs):"",
      tGpx:Array.isArray(t.gpxPts)&&t.gpxPts.length?{pts:t.gpxPts,elev:Array.isArray(t.elevPts)?t.elevPts:null}:null,
      _tSeed:{dist:dS,gain:gS,loss:lS,t:t}};};
  const loadVarGpx=function(idx,file){if(!file)return;var rd=new FileReader();rd.onload=function(){var g=parseGpxText(String(rd.result||""));var trk=g&&Array.isArray(g.track)?g.track:[];
    if(trk.length<2){setAvar(idx,"_gpxErr","That file has no track in it — export the recorded track, not just waypoints.");return;}
    /* Thinned to 2,000 points: a phone records one a second, and the route's own tracks are a few hundred. */
    var step=Math.max(1,Math.ceil(trk.length/2000));var keep=trk.filter(function(_,i){return i%step===0||i===trk.length-1;});
    var elev=keep.every(function(p){return p[2]!=null;})?keep.map(function(p){return p[2];}):null;
    setAvars(function(p){return p.map(function(x,j){if(j!==idx)return x;var o=Object.assign({},x,{tGpx:{pts:keep.map(function(q){return [q[0],q[1]];}),elev:elev},_gpxErr:""});
      /* The track's first point IS where it starts: fill the trailhead pin from it only when the climber left it blank. */
      if(!o.thLat&&!o.thLng){o.thLat=String(+keep[0][0].toFixed(5));o.thLng=String(+keep[0][1].toFixed(5));}return o;});});};
    rd.readAsText(file);};
  const blankBivy=function(){return {name:"",type:"camp",role:"",elev:"",capacity:"",water:"",permit:"",notes:""};};
  /* The box is typed in the READER's units (its caption says ft or m) and structuredVal converts it back to feet, so a stored height is shown in those units too. It was prefilled in FEET for everyone: a metric climber who touched any camp saved every site's height 3.28x too high. */
  const _bivyElevBox=function(b){var ft=b.elev!=null&&b.elev!==""?parseFloat(b.elev):(b.elevM!=null?b.elevM*3.28084:NaN);return isNaN(ft)?"":String(Math.round(uImp()?ft:ft/3.28084));};
  const _bivyShown=(Array.isArray(route.bivy)?route.bivy:[]).filter(function(b){return !(b&&b.role==="hidden");});
  const routeBivy=_bivyShown.length
    ? _bivyShown.map(function(b){return {name:b.name||"",type:b.type||"camp",role:b.role||"",elev:_bivyElevBox(b),capacity:b.capacity||"",water:b.water||"",permit:b.permit||"",notes:b.notes||""};})
    :[blankBivy()];
  const bivies=vals.bivy||routeBivy;
  const setBivies=function(fn){setVals(function(v){return Object.assign({},v,{bivy:fn(v.bivy||routeBivy)});});};
  const setBivy=function(i,k,v){setBivies(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};
  const addBivy=function(){if(bivies.length>=MAX_BIVY)return;setBivies(function(p){return p.concat([blankBivy()]);});};
  const delBivy=function(i){setBivies(function(p){return p.length<=1?[blankBivy()]:p.filter(function(_,j){return j!==i;});});};
/* CLIMBING ROUTE sections. Prefilled from what is on file, like the bivy and pitch editors
     and for the reason both record: opening on one blank row while the route's real sections sit
     on the screen behind it means "edit" can only ever ADD. */
  const routeSecs=(Array.isArray(route.climbingRoute)&&route.climbingRoute.length)
    ? route.climbingRoute.slice().sort(function(a,b){return (a.n||0)-(b.n||0);}).map(function(x){return {label:x.label||"",cls:x.class||"",notes:x.notes||""};})
    :[blankSec()];
  const secs=vals.climbingRoute||routeSecs;
  const setSecs=function(fn){setVals(function(v){return Object.assign({},v,{climbingRoute:fn(v.climbingRoute||routeSecs)});});};
  const setSec=function(i,k,v){setSecs(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};
  const addSec=function(){if(secs.length>=MAX_SEC)return;setSecs(function(p){return p.concat([blankSec()]);});};
  const delSec=function(i){setSecs(function(p){return p.length<=1?[blankSec()]:p.filter(function(_,j){return j!==i;});});};
/* APPROACH variants. Prefilled from what is on file for the reason the bivy and pitch editors
     record: opening on a blank row while the route's real variants sit on screen behind it means
     "edit the approaches" can only ever ADD one. hazards is an ARRAY in the column and a textarea
     here, one per line, because 4,644 stored hazards are 96% unique prose. */
  const routeVars=(Array.isArray(route.approachVariants)&&route.approachVariants.length)
    ? route.approachVariants.map(function(v){return {name:v.name||"",season:v.season||"",
        /* SEEDED IN THE CLIMBER'S OWN UNITS, and _orig carries the numbers the boxes were
           seeded FROM: converting on both edges makes an UNTOUCHED field lossy (4.8 km back
           to 2.98 mi), so editing one variant's notes would move every distance on the
           route. The APPROACHES panel already renders these through uDistMi/uElev, so before
           this the card said 4.8 km and the box under it said 3. */
        distMi:itinDraftVal(v,"distMi"),gainFt:itinDraftVal(v,"gainFt"),
        _orig:{distMi:v.distMi,gainFt:v.gainFt},
        hours:v.hours!=null?String(v.hours):"",notes:v.notes||"",whyThisWay:v.whyThisWay||"",
        /* Not edited here, but CARRIED: the form has no box for them, and dropping them on submit
           meant any edit to a way in silently deleted its base-finding note, its MOST USED mark and
           the mark saying which way in the route's paragraph describes. */
        baseFinding:v.baseFinding||"",primary:v.primary===true,longForm:v.longForm===true,storedRow:v.storedRow===true,
        /* ...and the WAY-IN LINK (lib/approaches.js) the same way: dropping `viaRouteId` would turn the
           Southeast Ridge's "via Fisher Chimneys" back into a prose card on the next accepted edit. */
        viaRouteId:v.viaRouteId||"",viaPitches:v.viaPitches&&typeof v.viaPitches==="object"?v.viaPitches:null,_origVia:v.viaRouteId||"",trip:v.trip&&typeof v.trip==="object"?v.trip:null,
        /* WHICH CAMPS this way in uses: its own trip's camps, or for the way in the row itself describes, the names it keeps. null = never chosen, so nothing is rewritten. */
        campSel:v.trip&&Array.isArray(v.trip.bivy)?v.trip.bivy.map(function(c){return c&&c.name;}).filter(Boolean):Array.isArray(v.camps)?v.camps.slice():null,
        ...tripDraft(v),
        hazards:(Array.isArray(v.hazards)?v.hazards.filter(Boolean):(v.hazards?[v.hazards]:[])).join("\n")};})
    :[blankVar()];
  const avars=vals.approachVariants||routeVars;
  const setAvars=function(fn){setVals(function(v){return Object.assign({},v,{approachVariants:fn(v.approachVariants||routeVars)});});};
  const setAvar=function(i,k,v){setAvars(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};
  const addAvar=function(){if(avars.length>=MAX_VAR)return;setAvars(function(p){return p.concat([blankVar()]);});};
  const delAvar=function(i){setAvars(function(p){return p.length<=1?[blankVar()]:p.filter(function(_,j){return j!==i;});});};
  const wps=vals.waypoints||routeWps;const setWps=function(fn){setVals(function(v){return Object.assign({},v,{waypoints:fn(v.waypoints||routeWps)});});};
  const setWp=function(i,k,v){setWps(function(p){return p.map(function(x,j){return j===i?keep(x,Object.assign({},x,{[k]:v})):x;});});};const addWp=function(){if(wps.length>=MAX_WAYPOINTS)return;setWps(function(p){return p.concat([blankWp()]);});setActiveWpIdx(wps.length);};const rmWp=function(i){setWps(function(p){return p.filter(function(_,j){return j!==i;});});setActiveWpIdx(function(a){return a>=i?Math.max(0,a-1):a;});};
  const gs=ADDR_GRADES[disc]||ADDR_GRADES[route.discipline]||[];var tr=function(x){return x?(String(x).length>44?String(x).slice(0,44)+"…":String(x)):"—";};var onf=function(x){return (x&&x.length)?"✓ on file":"—";};var campNames=function(x){var ns=(Array.isArray(x)?x:[]).map(function(b){return b&&b.name?String(b.name).trim():"";}).filter(Boolean);return ns.length?ns.join(" · "):onf(x);};
  /* `anchorType` and `gear` both used to sit here and both were dead ends.
  
     `anchorType` was a route-level single-select ("Bolted / Gear anchor / Tree") whose answer
     NOTHING rendered — there is no anchor_type column, dbRouteToCamel never maps one, and no
     read site exists in the app — so a climber could answer it and see nothing change. It also
     asked the wrong question: anchors vary BY PITCH (101 routes already use more than one kind
     across their own pitches), which is a fact the per-pitch editor can state and a single
     select cannot. Replaced by the anchor row in the pitch editor, which feeds the Anchor tile
     PitchTable already renders.
  
     `gear` was a multi-select labelled "Gear / rack" showing `route.rack` as its current value
     — the same value, under a near-identical label, sitting directly above the `rack` builder,
     on exactly the five disciplines where both appeared. Both also wrote to the same place:
     ClimbMatch's merge maps gear→rack AND rack→rack, then concatenates the two into
     gearTiers.required. The item checklist it offered is now a row inside the rack builder, so
     there is one control for "what does this route take" instead of two that disagree. */
  const FIELDS=[{k:"grade",label:"Grade",type:"grade",cur:route.grade||"—"},{k:"fa",label:"First ascent",type:"text",cur:route.fa||"—"},{k:"ffa",label:"First free ascent",type:"text",cur:route.ffa||"—"},{k:"fwa",label:"First winter ascent",type:"text",cur:route.fwa||"—"},{k:"altNames",label:"Also known as (comma-separated)",type:"text",cur:(Array.isArray(route.altNames)&&route.altNames.length)?route.altNames.join(", "):"—"},{k:"variations",label:"Variations (comma-separated)",type:"text",cur:(Array.isArray(route.variations)&&route.variations.length)?route.variations.map(function(v){return v&&typeof v==="object"?(v.name||""):String(v||"");}).filter(Boolean).join(", "):"—"},{k:"highPointFt",label:"High point",type:"num",unit:uImp()?"ft":"m",cur:route.highPointFt!=null?(uImp()?Math.round(route.highPointFt)+" ft":Math.round(route.highPointFt/3.28084)+" m"):"—"},{k:"rock",label:"Rock type",type:"single",opts:ROCK_OPTIONS.map(function(x){return [x,x];}),cur:(function(){var rr=routeRock(route);return rr?rr.label:"—";})()},{k:"aspect",label:"Aspect (sun exposure)",type:"single",opts:["N","NE","E","SE","S","SW","W","NW"].map(function(x){return [x,x];}),cur:route.aspect||"—"},{k:"season",label:"Best season",type:"single",opts:["Spring","Summer","Fall","Winter","Year-round"].map(function(x){return [x,x];}),cur:route.season||"—"},/* NOT a second copy of `season` above. That one is the WINDOW rendered in the header strap and is deliberately a short enum; this is the prose "When to go:" line on Conditions, and the two are separate columns precisely so a paragraph never lands in the strap — see the season note in CLAUDE.md. Labelled for where it appears rather than by column name, since "Best season" is already taken by the enum. */{k:"bestSeason",label:"When to go (detail)",type:"long",cur:tr(route.bestSeason)},{k:"protRating",label:"Protection rating",type:"single",opts:["G","PG-13","R","X"].map(function(x){return [x,x];}),cur:route.protRating||"—"},{k:"draws",label:"# Quickdraws",type:"num",unit:"draws",cur:(rackQty(route,"quickdraws")!=null?String(rackQty(route,"quickdraws")):"—")},{k:"screws",label:"# Ice screws",type:"num",unit:"screws",cur:(rackQty(route,"ice screws")!=null?String(rackQty(route,"ice screws")):"—")},{k:"aidGrade",label:"Aid grade",type:"single",opts:ADDR_AIDS.map(function(x){return [x,x];}),cur:route.aidGrade||"—"},{k:"ropeLen",label:"Rope length",type:"pickTwo",opts:[["50 m","50 m"],["60 m","60 m"],["70 m","70 m"],["80 m","80 m"]],cur:route.ropeLen?fmtRopeLen(route.ropeLen):"—"},{k:"ropeType",label:"Rope type",type:"single",opts:[["Single","Single"],["Half / twin (2 ropes)","Half / twin (2 ropes)"],["Static (fixed line)","Static (fixed line)"]],cur:route.ropeType||"—"},{k:"ropeNote",label:"Ropework note",type:"text",cur:route.ropeNote||"—"},{k:"alpineDraws",label:"# Alpine draws",type:"num",unit:"draws",cur:(rackQty(route,"alpine draws")!=null?String(rackQty(route,"alpine draws")):"—")},{k:"pitchCount",label:"How many pitches?",type:"num",unit:"pitches",cur:(route.pitches>1?String(route.pitches):"—")},{k:"rack",label:"Rack & gear",type:"rack",cur:([rackRows(route).filter(function(x){var _k=rackItemKind(x);return _k!=="quickdraws"&&_k!=="ice screws"&&_k!=="alpine draws"&&_k!=="crash pads";}).map(rackItemLine).join(", "),((contribRack(route)||[]).join(", ")||(route._rackCounted?"":(route.detailedRack||((route.rack&&route.rack.length)?route.rack.join(", "):""))))].filter(Boolean).join("; ")||"—")},{k:"whatToBring",label:"Route-specific essentials",type:"long",cur:((route.whatToBring&&route.whatToBring.length)?route.whatToBring.join("\n"):"—")},{k:"haz",label:"Hazards",type:"multi",/* A hazard seeded from the page ("Fixed gear: Spinning hanger") is not a stock option; keep it as a chip so it shows as picked and can be un-picked. */opts:(DISC_HAZ[disc]||ADDR_HAZ).concat((Array.isArray(vals.haz)?vals.haz:[]).filter(function(h){return (DISC_HAZ[disc]||ADDR_HAZ).indexOf(h)<0;})),cur:(route.hazards&&route.hazards.length?route.hazards.join(", "):"—")},{k:"objHaz",label:"Objective hazards",type:"multi",opts:["Rockfall","Avalanche","Crevasse","Serac","Cornice"],cur:(route.objHaz?(Array.isArray(route.objHaz)?(route.objHaz.length?route.objHaz.join(", "):"—"):route.objHaz):"—")},{k:"watchOut",label:"Watch out for",type:"long",cur:((route.watchOut&&route.watchOut.length)?route.watchOut.join("\n"):"—")},{k:"style",label:"Style / character",type:"multi",opts:ADDR_STYLE,cur:(route.features&&route.features.length?route.features.join(", "):"—")},{k:"landing",label:"Landing",type:"single",opts:["Flat","Sloped","Bad/dangerous"].map(function(x){return [x,x];}),cur:route.landing||"—"},{k:"pads",label:"Crash pads",type:"num",unit:"pads",cur:(route.pads!=null?String(route.pads):"—")},{k:"startType",label:"Start",type:"single",opts:["Stand","Sit"].map(function(x){return [x,x];}),cur:route.startType||"—"},{k:"location",label:"Location on the wall",type:"text",cur:route.location||"—"},{k:"bolts",label:"# Bolts",type:"num",unit:"bolts",cur:(+route.bolts>0?String(Math.round(+route.bolts)):"—")},{k:"anchor",label:"Top anchor",type:"text",cur:route.anchor||"—"},{k:"fixedGear",label:"Fixed gear",type:"text",cur:route.fixedGear||"—"},{k:"rockQuality",label:"Rock quality",type:"text",cur:route.rockQuality||"—"},{k:"wet",label:"Wet / seepage",type:"text",cur:route.wet||"—"},{k:"length",label:"Height / length",type:"num",unit:uImp()?"ft":"m",cur:(route.routeFt?uElev(route.routeFt):"—")},{k:"crux",label:"Crux grade",type:"grade",cur:route.cruxGrade||"—"},{k:"rockGrade",label:"Rock grade",type:"grade",cur:route.rockGrade||"—"},{k:"iceGrade",label:"Ice grade",type:"single",opts:["WI2","WI2+","WI3","WI3+","WI4","WI4+","WI5","WI5+","WI6","AI2","AI3","AI3+","AI4","M4","M4+","M5","M5+","M6","M6+"].map(function(x){return [x,x];}),cur:route.iceGrade||"—"},{k:"face",label:"Face / route-group",type:"text",cur:route.face||"—"},{k:"alpineGrade",label:"Alpine grade",type:"single",opts:["F","F+","PD-","PD","PD+","AD-","AD","AD+","D-","D","D+","TD-","TD","TD+","ED1","ED2","ED3","I","II","III","IV","V","VI"].map(function(x){return [x,x];}),cur:route.alpineGrade||"—"},{k:"commit",label:"Commitment grade (I–VI)",type:"single",opts:["I","II","III","IV","V","VI"].map(function(x){return [x,x];}),cur:route.commitment||"—"},{k:"condWindow",label:"Conditions window",type:"multi",opts:["Year-round","Best in spring","Best in summer","Best in fall","Best in winter","After freeze-thaw stabilizes","Before spring melt/runoff","Dry rock only","Avoid monsoon/rain season","Check current beta before going"],cur:(route.condWindow?(Array.isArray(route.condWindow)?(route.condWindow.length?route.condWindow.join(", "):"—"):route.condWindow):"—")},/* WHICH distance, in the label: `dist_km` is the walk in, ONE WAY, which the page doubles into its Round trip tile — except on a recorded loop or point-to-point, where it is the whole outing. A bare "Distance" beside a header reading twice the number invited a climber to "correct" it to the round trip. */{k:"dist",label:effDistIsWholeTrip(route)?"Total distance":"Approach, one way",type:"num",unit:uImp()?"mi":"km",cur:route.distKm?uDist(route.distKm):"—"},{k:"gain",label:"Elev. gain",type:"num",unit:uImp()?"ft":"m",cur:(route.gainFt||route.gainM)?uElev(route.gainFt||route.gainM*3.28084):"—"},{k:"loss",label:"Elev. loss",type:"num",unit:uImp()?"ft":"m",cur:(route.lossFt||route.lossM)?uElev(route.lossFt||route.lossM*3.28084):"—"},{k:"angle",label:"Max angle (°)",type:"num",unit:"°",cur:route.maxAngle?route.maxAngle+"°":"—"},{k:"rap",label:"Rappels",type:"text",cur:(fmtRappels(route.rappels)||"—")},{k:"rappelDetail",label:"Rappels, station by station",type:"rappels",cur:((route.rappelDetail&&route.rappelDetail.length&&!_rapEdited(route))?(route.rappelDetail.length+" station"+(route.rappelDetail.length!==1?"s":"")):"—")},/* The note that sits ABOVE the rappel table and says how the count was arrived at ("depending on rope length / number of ropes carried"). It rendered with no way to correct it, which matters more here than elsewhere: check:rappel-lengths exists because a table can be repaired while this note still states the method that produced the wrong numbers, and the next enrichment pass then re-derives them. */{k:"rappelCountNote",label:"Rappel count note",type:"long",cur:tr(route.rappelCountNote)},{k:"outingShape",label:"Trip shape",type:"single",opts:[["outback","Out and back"],["loop","Loop"],["point","Point to point"]],cur:(SHAPE_LABEL[recShapeOf(route)]||"—")},{k:"permit",label:"Permits",type:"text",cur:route.permits||(route.access&&route.access.permit)||"—"},{k:"permitUrl",label:"Permit link",type:"text",cur:route.permitUrl||"—"},{k:"road",label:"Road & driving",type:"road",cur:roadCur(route)},{k:"access",label:"Access & permits",type:"access",cur:accessCur(route)},{k:"timing",label:"Published times",type:"timing",cur:timingCur(route)},{k:"approachLogistics",label:"Trailhead & directions",type:"approachLogistics",cur:logisticsCur(route,"approachLogistics")},{k:"climate",label:"Climate & forecast zone",type:"climate",cur:climateCur(route,"climate")},{k:"seasonalHazards",label:"Seasonal hazards",type:"seasonalHazards",cur:seasHazCur(route,"seasonalHazards")},{k:"crowds",label:"Crowds & solitude",type:"crowds",cur:crowdsCur(route,"crowds")},{k:"partnerRequirements",label:"What a partner needs",type:"partnerRequirements",cur:partnerCur(route,"partnerRequirements")},{k:"seasonalGuidance",label:"Best window",type:"seasonalGuidance",cur:seasonalCur(route,"seasonalGuidance")},{k:"emergency",label:"Emergency contacts",type:"emergency",cur:emergencyCur(route,"emergency")},{k:"approach",label:"Approach",type:"long",cur:tr(route.approach)},{k:"descentText",label:"Descent detail",type:"long",cur:tr(route.descentText||route.descent)},{k:"overview",label:"Route description",type:"long",cur:tr(route.overview||route.desc)},{k:"beta",label:"Beta & pro tips",type:"long",cur:tr(Array.isArray(route.beta)?route.beta.join(" "):(route.beta||route.desc))},{k:"proTips",label:"Pro tips (one per line)",type:"long",cur:(Array.isArray(route.proTips)&&route.proTips.length)?route.proTips.join("\n"):"—"},{k:"sun",label:"Sun — when the wall gets it",type:"text",cur:tr(route.sun)},{k:"comms",label:"Cell / sat coverage",type:"single",opts:["Full cell coverage","Spotty cell coverage","No cell coverage","Satellite (inReach/SPOT) recommended","Emergency call box nearby"].map(function(x){return [x,x];}),cur:route.comms||"—"},{k:"approachVariants",label:"Ways in (approach variants)",type:"variants",cur:varCur(route)},{k:"climbingRoute",label:"Climbing route sections",type:"sections",cur:secCur(route)},{k:"pitchDetail",label:"Pitch-by-pitch",type:"pitches",cur:onf(route.pitchDetail)},{k:"waypoints",label:CRAG_CATS.includes(disc)?"Parking spot":"Key waypoints",type:"waypoints",cur:onf(route.waypoints)},{k:"bivy",label:"Camping & bivy",type:"bivy",cur:/* the camps by NAME, so the row and ON THE APP NOW say which sites are on file, not just "✓ on file" */campNames(route.bivy)},{k:"itinerary",label:"Day-by-day plan",type:"itinerary",cur:(route.itinerary&&route.itinerary.days&&route.itinerary.days.length)?(route.itinerary.days.length+" day"+(route.itinerary.days.length!==1?"s":"")+" on file"):"—"},{k:"name",label:"Route name",type:"text",cur:route.name||"—"}];
  const cat=disc;const roped=["trad","sport","alpine","ice","mixed","aid","mountaineering"].indexOf(cat)>=0;const alpiney=["alpine","mountaineering","ice","mixed","scrambling"].indexOf(cat)>=0;const boulder=cat==="bouldering";
  // single-pitch detection (drives the crux-grade hint) — selected discipline + route's real pitch count
  const singlePitch=boulder||(vals.pitchCount?parseInt(vals.pitchCount)<=1:(route.pitches!=null&&route.pitches<=1));
  // discipline rules: which fields make sense for the SELECTED discipline (live-driven by the chips above)
  const DROP={/* Route-specific essentials (whatToBring) have no reader on a crag page: GEAR & ESSENTIALS is mounted off CRAG_CATS only, and the RACK card is the crag's gear (owner note 2026-10-21: "remove gear and essentials from sport, trad and bouldering routes"). Offering the field there collected text that reached no screen. */whatToBring:CRAG_CATS.includes(cat),commit:!alpiney,rockGrade:!alpiney,iceGrade:!alpiney,face:!alpiney,dist:!alpiney,gain:!alpiney,loss:!alpiney,/* `waypoints` is offered on crags too: it is the only editor that takes a PIN, and the crag card's "Add parking" opens it. Dropped there, a crag route's parking could be read but never added or moved (owner, 2026-10-15: "I'm not seeing parking location for sport, trad or bouldering"). */waypoints:!(alpiney||CRAG_CATS.includes(cat)),itinerary:!alpiney,/* A RACK card renders for every discipline: RouteRackBox off CRAG_CATS, CragRack on them. Bouldering
   and sport are dropped here because CragRack's pencil opens their own count instead (`pads`,
   `draws`); every other discipline, ice, mountaineering and scrambling included, edits the rack
   itself. Offering it only to trad/aid/alpine/mixed once left those three showing a rack with no
   way to correct it. Match the cards. */
rack:(boulder||cat==="sport"),protRating:!(cat==="trad"||cat==="sport"),/* `draws:true` made this the one field in the form unreachable for EVERY discipline — it sat in
   the Protection & gear group, in SS, and in the help text, and could never be filled in. Its
   stated reason does not hold: nothing derives a draw count from a bolt count (there is no
   route-level bolt column). `gearReadout` only parses a number back out of the free-text gear
   prose, so a bolted route with no prose says nothing and had no way to be corrected. Offer it
   where a draw count is the standard beta. */draws:!(cat==="sport"||cat==="trad"||cat==="mixed"||cat==="aid"),screws:!(cat==="ice"||cat==="mixed"),aidGrade:cat!=="aid",ropeLen:!roped||cat==="mountaineering",ropeType:!roped||cat==="mountaineering"||cat==="sport",alpineDraws:!(cat==="trad"||cat==="aid"||cat==="alpine"||cat==="mixed"),pitchCount:!roped,angle:!(cat==="mountaineering"||cat==="scrambling"),landing:!boulder,pads:!boulder,startType:!boulder,alpineGrade:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"||cat==="mixed"),condWindow:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"||cat==="mixed"),objHaz:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"),/* approach is offered for boulders: the walk to the boulder is real beta, and the APPROACH placeholder on a boulder opens it. */pitchDetail:boulder,rap:boulder,descentText:boulder,crux:singlePitch,/* The crag ROUTE FACTS rows (owner, 2026-10-07: every fact a discipline has is shown, and an empty one can be filled). Offered exactly where that card lists them. */location:!CRAG_CATS.includes(cat),rockQuality:!CRAG_CATS.includes(cat),wet:!CRAG_CATS.includes(cat),bolts:cat!=="sport",anchor:!(CRAG_CATS.includes(cat)&&!boulder),fixedGear:!(cat==="trad"||cat==="aid")};
  /* A camp is edited only where CAMPING & BIVY can render it: the Planner section is gated on campingGate(), so on a crag line that climbs no peak the field collected camps that reached no screen (the same reason whatToBring is dropped on a crag). */
  if(!campingGate(route))DROP.bivy=true;
  const okField=function(k){return !DROP[k];};
  /* The group names camping when it holds the camp editor, so a climber scanning the headings for camp or bivy finds it. */
  const APPR=DROP.bivy?"Approach & descent":"Approach, descent & camping";
  const GROUPS=[["Basics",["name","grade","alpineGrade","rockGrade","iceGrade","crux","face","aidGrade","pitchCount","fa","ffa","fwa","altNames","variations","highPointFt","style","rock","length","location"]],["Protection & gear",["protRating","bolts","anchor","fixedGear","ropeLen","ropeType","ropeNote","draws","alpineDraws","screws","rack","whatToBring","climbingRoute","pitchDetail"]],["Bouldering",["landing","pads","startType"]],[APPR,["road","approachLogistics","approach","approachVariants","descentText","rap","rappelDetail","rappelCountNote","dist","gain","loss","angle","waypoints","bivy"]],["Conditions & character",["aspect","season","rockQuality","wet","bestSeason","condWindow","haz","objHaz","watchOut","overview","beta","comms","climate","seasonalHazards","seasonalGuidance","crowds","proTips","sun"]],["Logistics",["access","permit","permitUrl","commit","outingShape","timing","itinerary","partnerRequirements","emergency"]]];
  // per-group accent color
  const ACCENT={"Basics":[C.blue,C.blueBg],"Protection & gear":[C.amber,C.amberBg],"Bouldering":[C.teal,C.tealDim],[APPR]:[C.green,C.greenBg],"Conditions & character":[C.blue,C.blueBg],"Logistics":[C.textMuted,C.borderLight]};
  const GROUPED=GROUPS.map(function(g){return [g[0],g[1].map(function(k){return FIELDS.find(function(f){return f.k===k;});}).filter(function(f){return f&&okField(f.k);})];}).filter(function(g){return g[1].length;});
  // value helpers per field
  const valOf=function(f){return vals[f.k];};
  // unit-ambiguous numerics: the inputs are labelled in the SUBMITTER's units, so canonicalize here (routeFt/distKm/gainM/lossM) instead of at merge time — the merge runs in the READER's session and would otherwise convert with the wrong setting (3.28x error) and stop two agreeing climbers from ever converging in sameEditValue
  const CANON={length:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n:n*3.28084);},/* high_point_ft is FEET, like length_m is metres: typed in the climber's units, stored canonical. */highPointFt:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n:n*3.28084);},dist:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round((uImp()?n*1.60934:n)*100)/100;},gain:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n/3.28084:n);},loss:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n/3.28084:n);}};
  const UNCANON={length:function(n){return uImp()?Math.round(n)+" ft":Math.round(n/3.28084)+" m";},highPointFt:function(n){return uImp()?Math.round(n)+" ft":Math.round(n/3.28084)+" m";},dist:function(n){return uImp()?(Math.round(n/1.60934*100)/100)+" mi":(Math.round(n*100)/100)+" km";},gain:function(n){return uImp()?Math.round(n*3.28084)+" ft":Math.round(n)+" m";},loss:function(n){return uImp()?Math.round(n*3.28084)+" ft":Math.round(n)+" m";}};
  const wpStr=function(ws,sep){return (ws||[]).filter(function(w){return w.name||w.lat||w.note;}).map(function(w){return w.type+(w.name?" — "+w.name:"");}).join(sep||"; ");};
  const pendStr=function(f,v){if(v==null)return "";if(UNCANON[f.k]&&v!==""&&!isNaN(parseFloat(v)))return UNCANON[f.k](parseFloat(v));if(f.type==="waypoints")return wpStr(v);if(f.type==="pitches")return pitchStr(v||[]);if(f.type==="rappels")return rapStr(v||[]);if(f.type==="itinerary")return itinSummaryStr(v);if(OBJ_KEYS[f.type])return objStr(OBJ_KEYS[f.type],v);if(Array.isArray(v))return v.join(", ");return String(v);};
  /* WHAT IS ON THE APP NOW, IN FULL. `cur` is clipped to 44 characters because it is a one-line
     row summary and the "from → to" line a contribution records; opening a field to edit it showed
     that same clip, so a climber correcting an approach saw its first seven words and had to guess
     at the rest. FULL holds the untruncated text for every field whose `cur` is clipped, and the
     list-shaped fields (pitches, rappels, pins, ways in, sections) put one item per line. */
  const FULL={bestSeason:route.bestSeason,rappelCountNote:route.rappelCountNote,approach:route.approach,descentText:route.descentText||route.descent,overview:route.overview||route.desc,beta:Array.isArray(route.beta)?route.beta.join(" "):(route.beta||route.desc),sun:route.sun,
    approachVariants:((route.approachVariants)||[]).map(function(x){return x.name||"unnamed way in";}).join("\n"),
    climbingRoute:((route.climbingRoute)||[]).slice().sort(function(x,y){return (x.n||0)-(y.n||0);}).map(function(x){return x.label||("Section "+(x.n||"?"));}).join("\n")};
  Object.keys(OBJ_KEYS).forEach(function(k){FULL[k]=objStr(OBJ_KEYS[k],route[k]);});
  const curRefStr=function(f){if(f.type==="pitches")return (route.pitchDetail&&route.pitchDetail.length)?pitchStr(routePitches,"\n"):"";if(f.type==="rappels")return (route.rappelDetail&&route.rappelDetail.length&&!_rapEdited(route))?rapStr(routeRaps,"\n"):"";if(f.type==="waypoints")return (route.waypoints&&route.waypoints.length)?wpStr(route.waypoints,"\n"):"";if(f.type==="itinerary")return itinSummaryStr(route.itinerary);if(f.cur==null||f.cur==="—")return "";if(FULL[f.k]!=null&&String(FULL[f.k]).trim())return String(FULL[f.k]).trim();return Array.isArray(f.cur)?f.cur.join(", "):String(f.cur);};
  const filledStr=function(f){var v=vals[f.k];if(f.type==="multi")return (v&&v.length)?v.join(", "):"";if(f.type==="rack")return v?rackStr(v):"";if(f.type==="pitches")return v?pitchStr(v):"";if(f.type==="rappels")return v?rapStr(v):"";if(f.type==="waypoints")return v?wpStr(v):"";if(f.type==="itinerary")return v?itinSummaryStr(v):"";if(OBJ_KEYS[f.type])return v?objStr(OBJ_KEYS[f.type],v):"";return v!=null?String(v).trim():"";};
  /* "Start from this text" copies what is on the app into a text box, so a climber can fix one
     word of a long approach instead of retyping it. A copy left as it is changes nothing, so it
     must not count as a suggestion: an empty box already means "no change", and a box that still
     reads exactly what is on the app means the same. Whitespace alone is not an edit either. */
  const _txtField=function(f){return f.type==="text"||f.type==="long";};const _wsNorm=function(x){return String(x==null?"":x).replace(/\s+/g," ").trim();};
  const sameAsApp=function(f){return _txtField(f)&&_wsNorm(vals[f.k])!==""&&_wsNorm(vals[f.k])===_wsNorm(curRefStr(f));};
  const isFilled=function(f){return filledStr(f)!==""&&!sameAsApp(f);};
  const changedFields=FIELDS.filter(function(f){return isFilled(f);});
  const allEmpty=changedFields.every(function(f){return !f.cur||f.cur==="—";});
  const fld={width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",outline:"none"};
  const bivyCap=function(t){return <span style={{display:"block",fontSize:11,fontWeight:700,color:C.textMuted,margin:"0 0 3px 2px"}}>{t}</span>;};
  const sm=function(on){return {...CHIP,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub};};
  const setV=function(k,v){setVals(function(p){return Object.assign({},p,{[k]:v});});};
  const togMulti=function(k,o){setVals(function(p){var arr=p[k]||[];return Object.assign({},p,{[k]:arr.indexOf(o)>=0?arr.filter(function(x){return x!==o;}):arr.concat([o])});});};
  // render a single field's input by type
  const renderInput=function(f){var v=valOf(f);
    if(f.type==="grade"){var fgs=f.k==="rockGrade"?ADDR_YDS:gs;return fgs.length?<GradePicker scale={fgs} value={v} label={f.label} onChange={function(g){setV(f.k,g);}}/>:<input aria-label={f.label} value={v||""} onChange={function(e){setV(f.k,e.target.value);}} placeholder="e.g. 5.10a" style={fld}/>;}
    /* A long list (every rock type is ~50) is a dropdown: fifty chips would bury the rest of the form. */
    if(f.type==="single"&&f.opts.length>12)return <select value={v||""} onChange={function(e){setV(f.k,e.target.value);}} aria-label={f.label} style={{width:"100%",background:C.surface,color:C.text,border:"1px solid "+C.border,borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"inherit"}}><option value="">Choose…</option>{f.opts.map(function(o){return <option key={o[0]} value={o[0]}>{o[1]}</option>;})}</select>;
    if(f.type==="single")return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{f.opts.map(function(o){var on=v===o[0];return <button key={o[0]} onClick={function(){setV(f.k,on?"":o[0]);}} style={sm(on)}>{o[1]}</button>;})}</div>;
    /* Up to TWO choices, kept in option order and written "60 m / 70 m". A route that a 60 m rope
       gets down is also fine on a 70 m, and one length could not say so. A third tap is refused
       rather than silently dropping one of the first two. */
    if(f.type==="pickTwo"){var _pk=String(v||"").split(/\s*\/\s*/).filter(Boolean);return <div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{f.opts.map(function(o){var on=_pk.indexOf(o[0])>=0;var full=!on&&_pk.length>=2;return <button key={o[0]} aria-pressed={on} disabled={full} onClick={function(){var nx=on?_pk.filter(function(x){return x!==o[0];}):_pk.concat([o[0]]);setV(f.k,f.opts.map(function(p){return p[0];}).filter(function(p){return nx.indexOf(p)>=0;}).join(" / "));}} style={Object.assign({},sm(on),full?{opacity:0.45,cursor:"default"}:null)}>{o[1]}</button>;})}</div><div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"Pick up to two — e.g. 60 m and 70 m when either works."}</div></div>;}
    if(f.type==="multi")return <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{f.opts.map(function(o){var on=(v||[]).indexOf(o)>=0;return <button key={o} onClick={function(){togMulti(f.k,o);}} style={sm(on)}>{o}</button>;})}</div>;
    if(f.type==="num")return <div style={{display:"flex",alignItems:"center",gap:8}}><input aria-label={f.label} value={v||""} onChange={function(e){setV(f.k,e.target.value.replace(/[^0-9.]/g,""));}} inputMode="numeric" placeholder="0" style={Object.assign({},fld,{flex:1})}/>{f.unit?<span style={{fontSize:13,color:C.textMuted,fontWeight:600}}>{f.unit}</span>:null}</div>;
    if(f.type==="text")return <input aria-label="Add a value" value={v||""} onChange={function(e){setV(f.k,e.target.value);}} placeholder="Add a value" style={fld}/>;
    if(f.type==="long")return <textarea aria-label="Add the full text here" value={v||""} onChange={function(e){setV(f.k,e.target.value);}} rows={String(v||"").length>160?8:3} placeholder="Add the full text here" style={Object.assign({},fld,{resize:"vertical",lineHeight:1.5,minHeight:78})}/>;
    if(f.type==="rack"){return <div>{rackCats().map(function(c){return <div key={c[0]} style={{marginBottom:9}}><div style={{...SUB_LABEL,marginBottom:6}}>{c[0]}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{c[1].map(function(s){var key=c[2]+":"+s;var qty=rack[key]||0;var nm=c[0]+" "+(s==="Qty"?"":s);return <span key={key} style={{display:"inline-flex",alignItems:"stretch"}}><button aria-label={"Add one: "+nm+(qty?", "+qty+" so far":"")} onClick={function(){bumpRack(key,1);}} style={{padding:"7px 10px",borderRadius:qty?"10px 0 0 10px":10,border:"1px solid "+(qty?C.blue:C.border),background:qty?C.blueBg:C.surface,color:qty?C.onSolid:C.textSub,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{s==="Qty"?"Draws":s}{qty?" ×"+qty:""}</button>{qty?<button aria-label={"Remove one: "+nm} onClick={function(){bumpRack(key,-1);}} style={{padding:"7px 9px",borderRadius:"0 10px 10px 0",border:"1px solid "+C.blue,borderLeft:"none",background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:800,cursor:"pointer"}}>{"−"}</button>:null}</span>;})}</div></div>;})}<div style={{fontSize:11,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{"Tap a size to add one — tap again for more. Tap − to take one away."}</div>{(function(){/* Stored rows the steppers cannot state. A quickdraw, screw or pad row whose own box this sheet offers is edited there, so it is carried, not listed twice. */var OWN={"quickdraws":"draws","ice screws":"screws","crash pads":"pads"};var keep=(rack.keep||[]).map(function(x,i){return {x:x,i:i};}).filter(function(o){var own=OWN[rackItemKind(o.x)];return !(own&&okField(own));});if(!keep.length)return null;return <div style={{marginTop:9}}><div style={{...SUB_LABEL,marginBottom:6}}>{"Also on this rack"}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{keep.map(function(o){var t=rackItemLine(o.x);return <span key={o.i} style={{display:"inline-flex",alignItems:"center",gap:2,padding:"2px 2px 2px 10px",borderRadius:10,border:"1px solid "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:12.5,fontWeight:700}}>{t}<button aria-label={"Remove from the rack: "+t} onClick={function(){setRack(function(r){return Object.assign({},r,{keep:(r.keep||[]).filter(function(_y,j){return j!==o.i;})});});}} style={POP_REMOVE}>{"✕"}</button></span>;})}</div></div>;})()}{(function(){/* No chip for something this section already asks for in its own box: a "Rope" chip beside Rope length, or "Quickdraws" beside # Quickdraws, wrote the same fact twice in two spellings. The size steppers above ARE the trad rack. */var OWN_BOX={"Rope":"ropeLen","60m rope":"ropeLen","70m rope":"ropeLen","80m rope":"ropeLen","Half / twin ropes":"ropeType","Quickdraws":"draws","Alpine draws":"alpineDraws","Ice screws":"screws","Trad rack / protection":"rack","Single rack":"rack","Double rack":"rack"};var opts=(DISC_GEAR[disc]||ADDR_GEAR).filter(function(o){return !(OWN_BOX[o]&&okField(OWN_BOX[o]));});if(!opts||!opts.length)return null;return <div style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.borderLight}}><div style={{...SUB_LABEL,marginBottom:6}}>{"Other gear"}</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{opts.map(function(o){var on=(rack.items||[]).indexOf(o)>=0;return <button key={o} onClick={function(){togRackItem(o);}} aria-pressed={on} style={{padding:"7px 10px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub,fontSize:12,fontWeight:600,cursor:"pointer"}}>{o}</button>;})}</div><div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"Tools and hardware a rack size cannot describe."+(CRAG_CATS.includes(disc)?"":" An axe, crampons or glacier kit is listed under GEAR & ESSENTIALS, not RACK.")}</div>{(rack.items||[]).length?<div style={{marginTop:10}}><div style={{...SUB_LABEL,marginBottom:4}}>{"Only needed some months?"}</div><div style={{fontSize:11,color:C.textMuted,marginBottom:7,lineHeight:1.4}}>{"Tap the months an item is needed in — e.g. crampons early season. Leave blank for all year."}</div>{(rack.items||[]).map(function(it){var ms=(rack.itemMonths||{})[it]||[];return <div key={it} style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.textSub,marginBottom:4}}>{it+(ms.length&&ms.length<12?" — "+monthSpan(ms):" — all year")}</div><div role="group" aria-label={"Months "+it+" is needed"} style={{display:"flex",flexWrap:"wrap",gap:4}}>{MONTHS.map(function(mo,mi){var on=ms.indexOf(mi)>=0;return <button key={mo} onClick={function(){togItemMonth(it,mi);}} aria-pressed={on} aria-label={it+": "+mo} style={{padding:"5px 8px",borderRadius:10,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{mo}</button>;})}</div></div>;})}</div>:null}</div>;})()}<div style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.borderLight}}><div style={{...SUB_LABEL,marginBottom:6}}>{"In your own words"}</div><textarea aria-label="Rack description" value={rack.note||""} onChange={function(e){var v=e.target.value;setRack(function(r){return Object.assign({},r,{note:v});});}} rows={4} placeholder={"e.g. no gear needed on the standard line — a rope and a couple of slings only if you take the direct finish"} style={{width:"100%",boxSizing:"border-box",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13,lineHeight:1.5,outline:"none",resize:"vertical",fontFamily:"inherit"}}/><div style={{fontSize:11,color:C.textMuted,marginTop:5,lineHeight:1.4}}>{"Use this to correct a rack that is written as a sentence, or to say what the sizes above cannot — what you actually placed, and what you carried and never used."}</div></div></div>;}
    if(f.type==="rappels"){const _rpre=!vals.rappelDetail&&route.rappelDetail&&route.rappelDetail.length;return <div>{_rpre?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"Loaded the "+route.rappelDetail.length+" station"+(route.rappelDetail.length!==1?"s":"")+" already on file, top to bottom. Edit what is wrong and leave the rest."}</div>:null}{raps.map(function(rr,idx){return <div key={keyFor(rr)} id={"sf-rap-"+idx} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}><span style={{fontSize:12.5,fontWeight:700,color:C.red}}>{"Rappel "+(rr.n!=null?rr.n:idx+1)}</span><div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>{idx>0?<button onClick={function(){mvRap(idx,-1);}} aria-label={"Move rappel "+(idx+1)+" up"} style={POP_REMOVE}>{"↑"}</button>:null}{idx<raps.length-1?<button onClick={function(){mvRap(idx,1);}} aria-label={"Move rappel "+(idx+1)+" down"} style={POP_REMOVE}>{"↓"}</button>:null}{raps.length>1?<button onClick={function(){rmRap(idx);}} aria-label={"Remove rappel "+(idx+1)} style={POP_REMOVE}>{"✕"}</button>:null}</div></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Rappel "+(idx+1)+" length in "+(uImp()?"feet":"metres")} value={rr.lengthM} onChange={function(e){setRap(idx,"lengthM",intOnly(e.target.value));}} inputMode="numeric" placeholder={"Length ("+uLenUnit()+")"} style={Object.assign({},fld,{width:110,flex:"none"})}/><input aria-label={"Rappel "+(idx+1)+" anchor"} value={rr.anchor} onChange={function(e){setRap(idx,"anchor",e.target.value);}} placeholder="Anchor — e.g. 2 bolts with chains, slung tree" style={Object.assign({},fld,{flex:1})}/></div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{PITCH_ANCHORS.map(function(a){const on=(rr.anchor||"").toLowerCase()===a.toLowerCase();return <button key={a} onClick={function(){setRap(idx,"anchor",on?"":a);}} aria-pressed={on} style={{padding:"5px 9px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,color:on?C.onSolid:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{a}</button>;})}</div><input aria-label={"Rappel "+(idx+1)+" station — how to find it"} value={rr.station} onChange={function(e){setRap(idx,"station",e.target.value);}} placeholder="Finding the station — e.g. 10 m climber’s left of the notch" style={Object.assign({},fld,{marginBottom:6})}/><textarea aria-label={"Rappel "+(idx+1)+" hazards, one per line"} value={rr.hazards} onChange={function(e){setRap(idx,"hazards",e.target.value);}} rows={2} placeholder="Hazards, one per line — e.g. rope snags on the flake; pendulum left" style={Object.assign({},fld,{marginBottom:6,resize:"vertical",lineHeight:1.4})}/><input aria-label={"Rappel "+(idx+1)+" notes"} value={rr.notes} onChange={function(e){setRap(idx,"notes",e.target.value);}} placeholder="Notes — e.g. lands on a ledge; walk 20 m right to the next station" style={fld}/></div>;})}<button onClick={addRap} style={{...BTN,width:"100%",border:"1px dashed "+C.border,background:C.surface,color:C.textSub}}>{"+ Add a rappel"}</button></div>;}
    if(f.type==="pitches"){const _prefilled=!vals.pitchDetail&&route.pitchDetail&&route.pitchDetail.length;const _padN=routePitches.filter(function(x){return x._pad;}).length;
      /* A VARIATION climbs another route's pitches too (viaPitches, #2744), and the page lays them out as
         "The whole climb". Those rows belong to the other route, so they are named here, not offered for
         editing on this one — a correction typed here would land on the wrong route. */
      const _vv=(Array.isArray(route.approachVariants)?route.approachVariants:EMPTY_ARR).find(function(v){return v&&v.viaRouteId&&viaPitchSpans(v);});const _vsp=_vv?viaPitchSpans(_vv):null;const _vsib=_vv?(approachSibs||EMPTY_ARR).find(function(s){return s.id===_vv.viaRouteId;}):null;const _vname=_vsib?_vsib.name:"the route it is a variation of";
      return <div>{_prefilled?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"Loaded the "+route.pitchDetail.length+" pitch"+(route.pitchDetail.length!==1?"es":"")+" already on file"+(_padN?", and "+_padN+" more the route lists but nobody has described yet":"")+". Edit what is wrong and leave the rest — you are correcting the breakdown, not replacing it."}</div>:(_padN>1&&!vals.pitchDetail?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"This route lists "+_padN+" pitches and none is described yet. Fill in the ones you know; a pitch left empty is not sent."}</div>:null)}{_vsp?<div data-via-pitches="" style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"This route is a variation of "+_vname+": the whole climb also takes its "+[_vsp.before,_vsp.after].filter(Boolean).map(spanLabel).join(" and ")+". Those pitches are "+_vname+"’s, so they are corrected on its page; below are this route’s own."}</div>:null}{pitches.map(function(pp,idx){return <div key={keyFor(pp)} id={"sf-pitch-"+idx} data-src={pp._src!=null?pp._src:undefined} style={{background:C.surface,border:"1px solid "+(pp.crux?C.amber:C.border),borderStyle:pp._pad&&!pp.grade&&!pp.lengthM&&!pp.notes&&!pp.anchor&&!pp.gear?"dashed":"solid",borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{isNumLbl(pp.pitch)||pp.pitch==null||pp.pitch===""?"Pitch "+(pp.pitch!=null&&pp.pitch!==""?pp.pitch:idx+1):String(pp.pitch)}{pp._pad?<span style={{fontSize:11,fontWeight:600,color:C.textMuted}}>{" · not described yet"}</span>:null}</span><div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}><button onClick={function(){setPitch(idx,"crux",!pp.crux);}} aria-pressed={!!pp.crux} style={{padding:"5px 10px",borderRadius:13,border:"1px solid "+(pp.crux?C.amber:C.border),background:pp.crux?C.amberBg:C.card,color:pp.crux?C.amber:C.textMuted,fontSize:11,fontWeight:700,cursor:"pointer"}}>{"Crux pitch"}</button>{idx>0?<button onClick={function(){mvPitch(idx,-1);}} aria-label={"Move pitch "+(idx+1)+" up"} style={POP_REMOVE}>{"↑"}</button>:null}{idx<pitches.length-1?<button onClick={function(){mvPitch(idx,1);}} aria-label={"Move pitch "+(idx+1)+" down"} style={POP_REMOVE}>{"↓"}</button>:null}{pitches.length>1?<button onClick={function(){rmPitch(idx);}} aria-label={"Remove pitch "+(pp.pitch!=null?pp.pitch:idx+1)} style={POP_REMOVE}>{"✕"}</button>:null}</div></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Pitch "+(idx+1)+" grade"} value={pp.grade} onChange={function(e){setPitch(idx,"grade",e.target.value);}} placeholder="Grade (5.10a)" style={Object.assign({},fld,{flex:1})}/><input aria-label={"Pitch "+(idx+1)+" length in "+(uImp()?"feet":"metres")} value={pp.lengthM} onChange={function(e){setPitch(idx,"lengthM",intOnly(e.target.value));}} inputMode="numeric" placeholder={"Length ("+uLenUnit()+")"} style={Object.assign({},fld,{width:88,flex:"none"})}/><input aria-label={"Pitch "+(idx+1)+" bolt count"} value={pp.bolts} onChange={function(e){setPitch(idx,"bolts",intOnly(e.target.value));}} inputMode="numeric" placeholder="Bolts" style={Object.assign({},fld,{width:72,flex:"none"})}/></div>
      {/* Per-pitch, because that is how anchors actually vary: 845 stored pitch rows carry
          one, and 101 routes use MORE THAN ONE kind across their own pitches (a tree at P1,
          gear at P2, bolts at the top). The route-level "Anchor type" select this replaces
          could not say that, and nothing rendered its answer anyway. Chips write the
          vocabulary the catalog already uses; the text box keeps the qualifier that makes a
          station findable ("2-bolt anchor (alcove)", "gear (large ledge)"). */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{PITCH_ANCHORS.map(function(a){/* Lit by KIND, so a stored "2-bolt anchor (alcove)" shows as Bolted rather than as no chip at all. */const on=(pp.anchor||"").toLowerCase()===a.toLowerCase()||anchorKind(pp.anchor)===a;return <button key={a} onClick={function(){setPitch(idx,"anchor",on?"":a);}} aria-pressed={on} style={{padding:"5px 9px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,color:on?C.onSolid:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{a}</button>;})}</div>
      <input aria-label={"Pitch "+(idx+1)+" anchor"} value={pp.anchor} onChange={function(e){setPitch(idx,"anchor",e.target.value);}} placeholder="Anchor — e.g. 2-bolt anchor (alcove), tree (sling)" style={Object.assign({},fld,{marginBottom:6})}/>
      <input aria-label={"Pitch "+(idx+1)+" belay station"} value={pp.belay||""} onChange={function(e){setPitch(idx,"belay",e.target.value);}} placeholder="Belay station: where the belayer stands and how to find it" style={Object.assign({},fld,{marginBottom:6})}/><input aria-label={"Pitch "+(idx+1)+" gear"} value={pp.gear} onChange={function(e){setPitch(idx,"gear",e.target.value);}} placeholder="Gear (e.g. #0.3–#2, nuts)" style={Object.assign({},fld,{marginBottom:6})}/><input aria-label={"Pitch "+(idx+1)+" notes"} value={pp.notes} onChange={function(e){setPitch(idx,"notes",e.target.value);}} placeholder="Notes (belay stance, runout, route-finding…)" style={fld}/></div>;})}<button onClick={addPitch} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Add pitch"}</button></div>;}
    if(OBJ_KEYS[f.type]){var _ks=OBJ_KEYS[f.type],_cur=(route[f.type]||{}),_val=OBJ_STATE[f.type][0],_set=OBJ_STATE[f.type][1];
      /* One labelled input per sub-key, each showing what is on file beneath it. Showing the
         current value matters more here than elsewhere: these blocks are usually PARTLY filled,
         so a climber is correcting one line of nine and needs to see which. Leaving a box empty
         leaves that key untouched — structuredVal drops blanks, and the merge assigns over the
         existing object — so nobody has to retype eight correct facts to fix the ninth. */
      return <div>{_ks.map(function(k){if(k[3]==="months"){/* Twelve pickers, three to a row, one per month. A month's rating on file shows in its blank
           choice, so a climber sees what they would be changing. The stored key may be "Jan" or
           "January"; monthIdx finds either, and the edit is written under the full name. */var _onM=cleanMonths(_dget(_cur,k[0]))||{},_vM=_dget(_val,k[0])||{};return <div key={k[0]} style={{marginBottom:9}}>
        <div style={{...SUB_LABEL,marginBottom:4}}>{k[1]}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6}}>{MONTH_NAMES.map(function(m){var _was=_onM[m];var _now=_vM[m];return <label key={m} style={{display:"block",minWidth:0}}>
          <span style={{display:"block",fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:2}}>{m.slice(0,3)}</span>
          <select aria-label={k[1]+", "+m} value={_now==null?"":String(_now)} onChange={function(e){_set(k[0]+"."+m,e.target.value);}} style={{...fld,padding:"8px 6px",fontSize:12.5}}><option value="">{_was?("— ("+_was+")"):"—"}</option>{k[4].map(function(o){return <option key={String(o[0])} value={String(o[0])}>{o[1]}</option>;})}</select>
        </label>;})}</div>
        <div style={{fontSize:11,color:C.textMuted,marginTop:4,lineHeight:1.4}}>{"The usual danger that month, on the scale avalanche centers publish. A month left on — keeps what is on file, shown in brackets."}</div>
      </div>;}var on=_dget(_cur,k[0]);if(on!=null&&typeof on==="object")on=objLabel(k,on);else if(on!=null&&k[3]==="enum")on=objLabel(k,on);return <div key={k[0]} style={{marginBottom:9}}>
        <div style={{...SUB_LABEL,marginBottom:4}}>{k[1]}</div>
        {k[3]==="enum"?<select aria-label={k[1]} value={_dget(_val,k[0])==null?"":String(_dget(_val,k[0]))} onChange={function(e){_set(k[0],e.target.value);}} style={fld}><option value="">Not sure</option>{k[4].map(function(o){return <option key={String(o[0])} value={String(o[0])}>{o[1]}</option>;})}</select>:<input aria-label={k[1]} value={_dget(_val,k[0])==null?"":_dget(_val,k[0])} onChange={function(e){_set(k[0],e.target.value);}} placeholder={k[2]} inputMode={k[3]==="num"?"numeric":undefined} style={fld}/>}
        {on?<div style={{fontSize:11,color:C.textMuted,marginTop:3,lineHeight:1.4}}>{"On file: "+on}</div>:null}
      </div>;})}<div style={{fontSize:11,color:C.textMuted,lineHeight:1.45,marginTop:2}}>{"Leave anything you don't know blank — blank means unchanged, not cleared."}</div></div>;}
    if(f.type==="variants"){return <div>{avars.map(function(av,idx){return <div key={idx} style={{border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:9,background:C.surface}}>
      <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
        <input aria-label={"Approach "+(idx+1)+" name"} value={av.name} onChange={function(e){setAvar(idx,"name",e.target.value);}} placeholder="e.g. Snow Creek trail, log crossing" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        {avars.length>1?<button onClick={function(){delAvar(idx);}} aria-label={"Remove approach "+(idx+1)} style={{flexShrink:0,padding:"7px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Remove"}</button>:null}
      </div>
      {/* NUMBERS AS NUMBERS. distMi and gainFt are stored as real numbers on the rows that carry
          them, and a number is the one thing that already clusters loosely — sameEditValue
          compares these with a tolerance, so two climbers who measure 4.8 and 4.9 miles agree.
          A text box here would make the same fact unagreeable. `hours` stays text: 27% of its
          values are ranges ("3-4", "1-1.5"), which a single number cannot express. */}
      <div style={{fontSize:11,color:C.textMuted,marginBottom:4}}>{"Trailhead to the base, one way — to two decimals if you know them"}</div>
      <div style={{display:"flex",gap:7,marginBottom:7}}>
        <input aria-label={"Approach "+(idx+1)+" distance in "+(uImp()?"miles":"kilometres")+", one way to the base"} inputMode="decimal" value={av.distMi} onChange={function(e){setAvar(idx,"distMi",e.target.value.replace(/[^0-9.]/g,""));}} placeholder={"one way "+uDistMiUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        <input aria-label={"Approach "+(idx+1)+" gain in "+(uImp()?"feet":"metres")+", trailhead to the base"} inputMode="numeric" value={av.gainFt} onChange={function(e){setAvar(idx,"gainFt",e.target.value.replace(/[^0-9]/g,""));}} placeholder={"gain "+uElevUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        <input aria-label={"Approach "+(idx+1)+" hours, trailhead to the base"} value={av.hours} onChange={function(e){setAvar(idx,"hours",e.target.value);}} placeholder="hrs, e.g. 3-4" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
      </div>
      <input aria-label={"Approach "+(idx+1)+" season"} value={av.season} onChange={function(e){setAvar(idx,"season",e.target.value);}} placeholder="Window, e.g. Jul-Sep" style={Object.assign({},fld,{marginBottom:7})}/>
      <textarea aria-label={"Approach "+(idx+1)+" hazards, one per line"} value={av.hazards} onChange={function(e){setAvar(idx,"hazards",e.target.value);}} rows={2} placeholder="Hazards, one per line" style={Object.assign({},fld,{marginBottom:7,resize:"vertical"})}/>
      <textarea aria-label={"Approach "+(idx+1)+" notes"} value={av.notes} onChange={function(e){setAvar(idx,"notes",e.target.value);}} rows={3} placeholder="What the walk in is actually like" style={Object.assign({},fld,{marginBottom:0,resize:"vertical"})}/>
      {avars.length>1&&!av.primary?<textarea aria-label={"Approach "+(idx+1)+": why a party would go this way"} value={av.whyThisWay||""} onChange={function(e){setAvar(idx,"whyThisWay",e.target.value);}} rows={2} placeholder="Why go this way instead of the most used one, e.g. early season while the gully holds snow" style={Object.assign({},fld,{marginTop:7,marginBottom:0,resize:"vertical"})}/>:null}
      <div style={{marginTop:9,paddingTop:9,borderTop:"1px solid "+C.border}}>
        <div style={{fontSize:11,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:6}}>Where this way in starts</div>
        <select aria-label={"Approach "+(idx+1)+": where it starts"} value={av.mode==="via"&&av.viaRouteId?"via:"+av.viaRouteId:av.mode==="own"?"own":""} onChange={function(e){var x=e.target.value;if(x.indexOf("via:")===0){setAvar(idx,"mode","via");setAvar(idx,"viaRouteId",x.slice(4));}else{setAvar(idx,"mode",x);}}} style={Object.assign({},fld,{marginBottom:7})}>
          <option value="">Not set — show it as a description only</option>
          <option value="own">From its own trailhead</option>
          {(approachSibs||EMPTY_ARR).map(function(sr){return <option key={sr.id} value={"via:"+sr.id}>{"By climbing "+sr.name+" first"}</option>;})}
        </select>
        {av.mode==="own"?<>
          <input aria-label={"Approach "+(idx+1)+" trailhead name"} value={av.thName} onChange={function(e){setAvar(idx,"thName",e.target.value);}} placeholder="Trailhead name" style={Object.assign({},fld,{marginBottom:7})}/>
          <div style={{display:"flex",gap:7,marginBottom:7}}>
            <input aria-label={"Approach "+(idx+1)+" trailhead latitude"} inputMode="decimal" value={av.thLat} onChange={function(e){setAvar(idx,"thLat",e.target.value.replace(/[^0-9.\-]/g,""));}} placeholder="Trailhead latitude" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
            <input aria-label={"Approach "+(idx+1)+" trailhead longitude"} inputMode="decimal" value={av.thLng} onChange={function(e){setAvar(idx,"thLng",e.target.value.replace(/[^0-9.\-]/g,""));}} placeholder="Trailhead longitude" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
          </div>
          <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:6}}>The whole trip by this way in — trailhead to summit and back:</div>
          <div style={{display:"flex",gap:7,marginBottom:7}}>
            <input aria-label={"Approach "+(idx+1)+" one-way distance to the climb in "+(uImp()?"miles":"kilometres")} inputMode="decimal" value={av.tDist} onChange={function(e){setAvar(idx,"tDist",e.target.value.replace(/[^0-9.]/g,""));}} placeholder={"one way "+(uImp()?"mi":"km")} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
            <input aria-label={"Approach "+(idx+1)+" total gain in "+(uImp()?"feet":"metres")} inputMode="numeric" value={av.tGain} onChange={function(e){setAvar(idx,"tGain",e.target.value.replace(/[^0-9]/g,""));}} placeholder={"gain "+uElevUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
            <input aria-label={"Approach "+(idx+1)+" total loss in "+(uImp()?"feet":"metres")} inputMode="numeric" value={av.tLoss} onChange={function(e){setAvar(idx,"tLoss",e.target.value.replace(/[^0-9]/g,""));}} placeholder={"loss "+uElevUnit()} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
          </div>
          <input aria-label={"Approach "+(idx+1)+" hours from the trailhead to the start of the climbing"} inputMode="decimal" value={av.tHrs} onChange={function(e){setAvar(idx,"tHrs",e.target.value.replace(/[^0-9.]/g,""));}} placeholder="Hours from trailhead to the start of the climbing" style={Object.assign({},fld,{marginBottom:7})}/>
          <label style={{display:"block",fontSize:12,color:C.blue,fontWeight:700,cursor:"pointer",marginBottom:4}}>
            {av.tGpx&&av.tGpx.pts?("GPX track: "+av.tGpx.pts.length+" points — replace"):"Add a GPX track of this way in"}
            <input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" aria-label={"Approach "+(idx+1)+" GPX track"} onChange={function(e){loadVarGpx(idx,e.target.files&&e.target.files[0]);e.target.value="";}} style={{display:"block",marginTop:4,fontSize:12,color:C.textSub}}/>
          </label>
          {av._gpxErr?<div style={{fontSize:11.5,color:C.amber,marginTop:2}}>{av._gpxErr}</div>:null}
        </>:null}
        {av.mode==="via"?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5}}>That route's trailhead, track, camps and numbers are used for this way in; this route keeps its own climbing.</div>:null}
        {av.mode!=="via"&&varCampPool(av).length?<div style={{marginTop:8}}>
          <div style={{fontSize:11,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:4}}>Camps on this way in</div>
          <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginBottom:6}}>Tick the camps a party uses on this way in. A camp both ways share can be ticked on both.</div>
          {varCampPool(av).map(function(c){var on=Array.isArray(av.campSel)?av.campSel.some(function(n){return String(n).toLowerCase()===String(c.name).toLowerCase();}):av.mode!=="own";return <label key={c.name} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",fontSize:12.5,color:C.text,cursor:"pointer"}}><input type="checkbox" checked={on} onChange={function(){var cur=Array.isArray(av.campSel)?av.campSel.slice():(av.mode!=="own"?varCampPool(av).map(function(p){return p.name;}):[]);var i=cur.findIndex(function(n){return String(n).toLowerCase()===String(c.name).toLowerCase();});if(i>=0)cur.splice(i,1);else cur.push(c.name);setAvar(idx,"campSel",cur);}} aria-label={"Approach "+(idx+1)+" uses camp "+c.name}/>{c.name}{c.elev!=null?<span style={{color:C.textMuted}}>{" · "+uElev(c.elev)}</span>:null}</label>;})}
        </div>:null}
      </div>
    </div>;})}
      {avars.length<MAX_VAR?<button onClick={addAvar} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px dashed "+C.border,background:C.card,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add another way in"}</button>:null}
    </div>;}
    if(f.type==="sections"){return <div>{secs.map(function(sc,idx){return <div key={idx} style={{border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:9,background:C.surface}}>
      <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
        <input aria-label={"Section "+(idx+1)+" name"} value={sc.label} onChange={function(e){setSec(idx,"label",e.target.value);}} placeholder="e.g. Summit block" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        {secs.length>1?<button onClick={function(){delSec(idx);}} aria-label={"Remove section "+(idx+1)} style={{flexShrink:0,padding:"7px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Remove"}</button>:null}
      </div>
      {/* A PICKER, not a text box, and the option list is the catalog's own vocabulary rather
          than an invented one: 290 stored values canonicalise to class 2/2-3/3/3-4/4 for 89% of
          sections, with a low-5th tail. It renders as a CHIP, so it takes a value and anything
          qualifying it belongs in the notes below — the rule this repo already states for season
          and grade. A picker is also the only way three climbers can agree: the merge needs three
          in one cluster, and prose never clusters. */}
      <select aria-label={"Section "+(idx+1)+" class"} value={sc.cls} onChange={function(e){setSec(idx,"cls",e.target.value);}} style={Object.assign({},fld,{marginBottom:7})}>
        <option value="">{"Class / grade — not sure"}</option>
        {SEC_CLASSES.map(function(c){return <option key={c} value={c}>{c}</option>;})}
      </select>
      <textarea aria-label={"Section "+(idx+1)+" notes"} value={sc.notes} onChange={function(e){setSec(idx,"notes",e.target.value);}} rows={3} placeholder="What a party actually does here" style={Object.assign({},fld,{marginBottom:0,resize:"vertical"})}/>
    </div>;})}
      {secs.length<MAX_SEC?<button onClick={addSec} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px dashed "+C.border,background:C.card,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add a section"}</button>:null}
    </div>;}
    if(f.type==="itinerary"){return <ItineraryEditor itin={itin} onChange={setItin}/>;}
    /* One card per site. Every field except the name is optional on purpose: a climber who only
       knows that the water at a camp has dried up should be able to say that without inventing a
       capacity or a permit. Blank means unchanged rather than cleared, the same contract the
       object-key editor above states. */
    if(f.type==="bivy"){return <div>{bivies.map(function(b,idx){return <div key={idx} style={{border:"1px solid "+C.border,borderRadius:10,padding:"10px 11px",marginBottom:9,background:C.surface}}>
      {/* Every box carries a visible caption: a filled box loses its placeholder, and a site already on file showed six unlabelled values (owner, 2026-10-23). */}
      <div style={{display:"flex",gap:7,alignItems:"flex-end",marginBottom:7}}>
        <label style={{flex:1,minWidth:0}}>{bivyCap("Site "+(idx+1)+" name")}<input aria-label={"Site "+(idx+1)+" name"} value={b.name} onChange={function(e){setBivy(idx,"name",e.target.value);}} placeholder="e.g. Boston Basin" style={Object.assign({},fld,{width:"100%",marginBottom:0})}/></label>
        {bivies.length>1?<button onClick={function(){delBivy(idx);}} aria-label={"Remove site "+(idx+1)} style={{flexShrink:0,padding:"7px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Remove"}</button>:null}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:7}}>
        <label style={{flex:1,minWidth:0}}>{bivyCap("Kind")}<select aria-label={"Site "+(idx+1)+" type"} value={b.type} onChange={function(e){setBivy(idx,"type",e.target.value);}} style={Object.assign({},fld,{width:"100%",marginBottom:0})}>
          <option value="camp">{"Camp"}</option><option value="bivy">{"Bivy"}</option><option value="hut">{"Hut"}</option>
        </select></label>
        <label style={{flex:1,minWidth:0}}>{bivyCap(uImp()?"Elevation (ft)":"Elevation (m)")}<input aria-label={"Site "+(idx+1)+" elevation"} inputMode="numeric" value={b.elev} onChange={function(e){setBivy(idx,"elev",e.target.value);}} placeholder={uImp()?"e.g. 6200":"e.g. 1890"} style={Object.assign({},fld,{width:"100%",marginBottom:0})}/></label>
      </div>
      <label style={{display:"block",marginBottom:7}}>{bivyCap("Used for")}<select aria-label={"Site "+(idx+1)+" role"} value={b.role||""} onChange={function(e){setBivy(idx,"role",e.target.value);}} style={Object.assign({},fld,{width:"100%",marginBottom:0})}>
          <option value="">{"Not sure"}</option><option value="main">{"Where most parties sleep"}</option><option value="route">{"Other option (slow day, weather, emergency)"}</option>
        </select></label>
      <label style={{display:"block"}}>{bivyCap("Water")}<input aria-label={"Site "+(idx+1)+" water"} value={b.water} onChange={function(e){setBivy(idx,"water",e.target.value);}} placeholder="Is there any, and is it reliable?" style={fld}/></label>
      <label style={{display:"block"}}>{bivyCap("Capacity")}<input aria-label={"Site "+(idx+1)+" capacity"} value={b.capacity} onChange={function(e){setBivy(idx,"capacity",e.target.value);}} placeholder="e.g. 3 tents on gravel" style={fld}/></label>
      <label style={{display:"block"}}>{bivyCap("Permit")}<input aria-label={"Site "+(idx+1)+" permit"} value={b.permit} onChange={function(e){setBivy(idx,"permit",e.target.value);}} placeholder="Which agency, and is it a quota?" style={fld}/></label>
      <label style={{display:"block"}}>{bivyCap("Notes")}<textarea aria-label={"Site "+(idx+1)+" notes"} value={b.notes} onChange={function(e){setBivy(idx,"notes",e.target.value);}} placeholder="Anything a party arriving at dusk would want to know" rows={2} style={Object.assign({},fld,{marginBottom:0,resize:"vertical",fontFamily:"inherit"})}/></label>
    </div>;})}
      {bivies.length<MAX_BIVY?<button onClick={addBivy} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px dashed "+C.border,background:C.card,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add another site"}</button>:<div style={{fontSize:11.5,color:C.textMuted}}>{"That is the most sites this form takes."}</div>}
      <div style={{fontSize:11,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{"Leave anything you don't know blank — blank means unchanged, not cleared. A site needs a name to be submitted."}</div>
    </div>;}
    if(f.type==="waypoints"){const wpsWithNum=wps.map(function(w){return Object.assign({},w,{lat:w.lat?parseFloat(w.lat):null,lng:w.lng?parseFloat(w.lng):null});});return <div><WaypointMapPicker waypoints={wpsWithNum} activeIdx={activeWpIdx} peakCoord={peakCoord} onPick={function(lat,lng){setWp(activeWpIdx,"lat",lat.toFixed(5));setWp(activeWpIdx,"lng",lng.toFixed(5));}}/>{wps.map(function(wp,idx){var _types=CRAG_CATS.includes(cat)?WP_TYPES_CRAG.concat(WP_TYPES_CRAG.indexOf(wp.type)<0&&WP_TYPES.indexOf(wp.type)>=0?[wp.type]:[]):WP_TYPES;var dupType=WP_SINGLE_TYPES.indexOf(wp.type)>=0&&wps.some(function(w,wi){return wi!==idx&&w.type===wp.type;});return <div key={keyFor(wp)} {...clickable(function(){setActiveWpIdx(idx);})} style={{background:C.surface,border:"1px solid "+(idx===activeWpIdx?C.blue:C.border),borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{"Waypoint "+(idx+1)+(wp.lat&&wp.lng?" · pin set":"")}</span>{wps.length>1?<button onClick={function(e){e.stopPropagation();rmWp(idx);}} aria-label="Remove waypoint" style={POP_REMOVE}>{"✕"}</button>:null}</div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>{_types.map(function(t){var on=wp.type===t;var blocked=WP_SINGLE_TYPES.indexOf(t)>=0&&wps.some(function(w,wi){return wi!==idx&&w.type===t;});return <button key={t} disabled={blocked} onClick={function(e){e.stopPropagation();setWp(idx,"type",t);}} title={blocked?"Only one "+wpTypeLbl(t,cat)+" per route":undefined} style={Object.assign({},sm(on),blocked?{opacity:0.35,cursor:"not-allowed"}:null)}>{wpTypeLbl(t,cat)}</button>;})}</div>{dupType?<div style={{fontSize:11,color:C.amber,marginBottom:6}}>{"Only one "+wpTypeLbl(wp.type,cat)+" per route — pick a different type or edit the other one."}</div>:null}<input aria-label="Name" value={wp.name} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"name",e.target.value);}} placeholder="Name (e.g. Pandora Mill Gate)" style={Object.assign({},fld,{marginBottom:6})}/><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label="Latitude (or tap the map above)" value={wp.lat} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"lat",e.target.value.replace(/[^0-9.\-]/g,""));}} inputMode="decimal" placeholder="Lat (or tap map above)" style={Object.assign({},fld,{flex:1})}/><input aria-label="Longitude" value={wp.lng} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"lng",e.target.value.replace(/[^0-9.\-]/g,""));}} inputMode="decimal" placeholder="Lng" style={Object.assign({},fld,{flex:1})}/></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Elevation ("+(uImp()?"ft":"m")+")"} value={wp.elev} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"elev",intOnly(e.target.value));}} inputMode="numeric" placeholder={"Elev ("+(uImp()?"ft":"m")+")"} style={Object.assign({},fld,{flex:1})}/><input aria-label={"Distance ("+(uImp()?"mi":"km")+")"} value={wp.distMi} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"distMi",e.target.value.replace(/[^0-9.]/g,""));}} inputMode="decimal" placeholder={"Dist ("+(uImp()?"mi":"km")+")"} style={Object.assign({},fld,{flex:1})}/></div><input aria-label="Note (optional)" value={wp.note} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"note",e.target.value);}} placeholder="Note (optional)" style={fld}/><input aria-label="How to get here from the last waypoint (optional)" value={wp.directions||""} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"directions",e.target.value);}} placeholder="Getting here — which way to go from the last point" style={Object.assign({},fld,{marginTop:6})}/></div>;})}{wps.length<MAX_WAYPOINTS?<button onClick={addWp} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.blue,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Add waypoint"}</button>:<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",padding:"6px 0"}}>{"Maximum "+MAX_WAYPOINTS+" waypoints per route — keep it to the essentials."}</div>}</div>;}
    return null;};
  const discChanged=disc!==catToChip(catOf(route));
  const discContribs=function(){if(!discChanged)return [];var cfg=(DISCS.find(function(d){return d[1]===disc;})||[])[2]||{discipline:disc};var lbl=(DISCS.find(function(d){return d[1]===disc;})||["",""])[0];var out=[{field:"discipline",label:"Discipline",value:cfg.discipline,cur:route.discipline||"—"}];if(cfg.style)out.push({field:"rockStyle",label:"Style",value:cfg.style,cur:route.style||"—"});return out.map(function(x){return {type:"edit",field:x.field,label:x.label,value:x.value,wasEmpty:(!x.cur||x.cur==="—"),routeId:route.id,note:note,title:route.name,area:mtnOf(route),meta:x.label+": "+(x.cur||"—")+" → "+x.value+" ("+lbl+")",status:"review",when:"just now"};});};
  /* Every camp a way in could use: its own recorded camps first, then the route's. */
  const varCampPool=function(x){var seen={},pool=[];((x&&x.trip&&Array.isArray(x.trip.bivy))?x.trip.bivy:[]).concat(Array.isArray(route.bivy)?route.bivy:[]).forEach(function(c){var k=c&&c.name?String(c.name).toLowerCase():"";if(k&&!seen[k]){seen[k]=1;pool.push(c);}});return pool;};
  /* A rack edit submits its COUNTED rows, then its text lines (rackEditValue, lib/rack.js), never one flattened string. */
  const structuredVal=function(f){if(f.type==="rack"){var _rk=vals.rack||{};return rackItemsOf(_rk).concat(rackLinesOf(_rk));}if(f.type==="variants")return (vals.approachVariants||[]).map(function(x){
    var o={name:String(x.name||"").trim(),season:String(x.season||"").trim(),notes:String(x.notes||"").trim()};
    var hz=String(x.hazards||"").split("\n").map(function(h){return h.trim();}).filter(Boolean);
    if(hz.length)o.hazards=hz;
    /* Numbers go in as NUMBERS, matching the 123 gainFt and 120 distMi rows already stored that
       way. A numeric string here would break the tolerant comparison and read as a different
       value from the identical measurement. */
    /* WHAT WAS TYPED IS READ IN THE CLIMBER'S OWN UNITS. The columns stay canonical (miles,
       feet) -- sameEditValue compares these numerically with a tolerance, so a stored
       kilometre would not merely display wrong, it would fail to cluster with the identical
       measurement taken by somebody on the other setting, and the 3-agree gate could never
       be reached. Same conversion-at-the-edges shape as the itinerary builder, and the same
       one this very function already applies to a contributed waypoint's elev and distMi. */
    var d=itinStoreVal(x,"distMi");if(d!=null&&isFinite(d))o.distMi=d;
    var g=itinStoreVal(x,"gainFt");if(g!=null&&isFinite(g))o.gainFt=g;
    var h=String(x.hours||"").trim();if(h)o.hours=h;
    var bf=String(x.baseFinding||"").trim();if(bf)o.baseFinding=bf;
    var wy=String(x.whyThisWay||"").trim();if(wy)o.whyThisWay=wy;
    if(x.primary===true)o.primary=true;
    if(x.longForm===true)o.longForm=true;
    if(x.storedRow===true)o.storedRow=true;
    if(x.mode!=="via"&&x.mode!=="own"&&Array.isArray(x.campSel))o.camps=x.campSel.slice();
    /* WHERE IT STARTS (see tripDraft). The mode decides, so switching a way in from "own trailhead"
       to "by another route" really drops the typed trailhead rather than storing both. */
    if(x.mode==="via"){var vr=String(x.viaRouteId||"").trim();if(vr)o.viaRouteId=vr;/* ...and the pitches of it a VARIATION climbs, kept only while the link points at the same route. */if(vr&&vr===x._origVia&&x.viaPitches)o.viaPitches=x.viaPitches;}
    else if(x.mode==="own"){/* START FROM THE STORED RECORD: a way in also carries camps, a road, pins and an itinerary this form has no box for, and rebuilding it from the boxes alone deleted them on the next accepted edit. Only what the form controls is replaced. */var tr=Object.assign({},x.trip&&typeof x.trip==="object"?x.trip:{});["distKm","outingShape","gainFt","gainM","lossFt","lossM"].forEach(function(k){delete tr[k];});var _oal=tr.approachLogistics;delete tr.approachLogistics;var _ot=tr.timing&&typeof tr.timing==="object"?Object.assign({},tr.timing):{};delete _ot.approachTimeHrs;delete tr.timing;var sd=x._tSeed||{dist:"",gain:"",loss:"",t:{}},imp=uImp();
      var al=tripTrailheadMerge(_oal,x.thName,x.thLat,x.thLng);if(Object.keys(al).length)tr.approachLogistics=al;
      var dv=parseFloat(x.tDist);if(isFinite(dv)&&dv>0)tr.distKm=x.tDist===sd.dist&&sd.t.distKm!=null?sd.t.distKm:+(imp?dv*1.609344:dv).toFixed(2);
      // The box is the walk TO the climb, so the page doubles it into a round trip — unless this way in was stored as a loop or a point-to-point.
      if(tr.distKm!=null)tr.outingShape=(sd.t.distKm!=null&&sd.t.outingShape)||"outback";
      var gv=parseFloat(x.tGain);if(isFinite(gv)&&gv>0){tr.gainFt=x.tGain===sd.gain&&sd.t.gainFt!=null?sd.t.gainFt:Math.round(imp?gv:gv*3.28084);tr.gainM=Math.round(tr.gainFt/3.28084);}
      var lv=parseFloat(x.tLoss);if(isFinite(lv)&&lv>0){tr.lossFt=x.tLoss===sd.loss&&sd.t.lossFt!=null?sd.t.lossFt:Math.round(imp?lv:lv*3.28084);tr.lossM=Math.round(tr.lossFt/3.28084);}
      var hv=parseFloat(x.tHrs);if(isFinite(hv)&&hv>0)_ot.approachTimeHrs=hv;if(Object.keys(_ot).length)tr.timing=_ot;
      if(x.tGpx&&Array.isArray(x.tGpx.pts)&&x.tGpx.pts.length>1){tr.gpxPts=x.tGpx.pts;if(Array.isArray(x.tGpx.elev))tr.elevPts=x.tGpx.elev;}
      if(Array.isArray(x.campSel)){var _cb=varCampPool(x).filter(function(c){return x.campSel.some(function(n){return String(n).toLowerCase()===String(c.name).toLowerCase();});});if(_cb.length)tr.bivy=_cb;else delete tr.bivy;}
      if(Object.keys(tr).length)o.trip=tr;}
    return o;}).filter(function(x){return x.name||x.notes;});
  if(f.type==="sections")return (vals.climbingRoute||[]).map(function(x,i){return {n:i+1,label:String(x.label||"").trim(),class:String(x.cls||"").trim(),notes:String(x.notes||"").trim()};}).filter(function(x){return x.label||x.notes;});
  if(f.type==="rappels")return (vals.rappelDetail||[]).map(function(r,i){var _l=uLenIn(r.lengthM);var hz=String(r.hazards||"").split("\n").map(function(h){return h.trim();}).filter(Boolean);var o={n:i+1,lengthM:(_l!=null&&isFinite(_l))?_l:null,anchor:String(r.anchor||"").trim(),notes:String(r.notes||"").trim()};var st=String(r.station||"").trim();if(st)o.station=st;if(hz.length)o.hazards=hz;return o;}).filter(function(r){return r.lengthM!=null||r.anchor||r.notes||r.station||r.hazards;});if(f.type==="pitches")return (vals.pitchDetail||[]).map(function(p,i){
    /* IT READ `p.len`, A KEY NO EDITOR ROW HAS EVER CARRIED. Every row is
       {pitch,grade,lengthM,gear,notes,anchor,bolts,crux}, so parseInt(undefined)||null
       dropped every length a climber typed — and because the filter below tests the
       OUTPUT lengthM, a pitch carrying only a length vanished ENTIRELY, under a success
       toast. The comment above the editor records this private {grade,len,notes} shape
       being removed from the SUMMARY strings; the submit path kept it.
       bolts/anchor/crux were hardcoded empty over whatever was entered. Numbers go in as
       NUMBERS, matching the stored rows and the variants branch above. */
    /* What was typed is read in the climber's OWN units and stored CANONICAL (metres) —
       the same conversion-at-the-edges the variants and waypoint branches apply. */
    var _len=uLenIn(p.lengthM),_bolts=parseInt(p.bolts,10);
    /* `n` is the row's OWN label: the not-described rows the editor adds are dropped below when left
       empty, so numbering by position would hand a filled-in P5 behind an empty P4 the number 4; and a
       named leg ("Approach gully") keeps its name rather than becoming a number. */
    var _lbl=isNumLbl(p.pitch)?+p.pitch:String(p.pitch==null?"":p.pitch).trim();
    return {n:(_lbl===""||_lbl===0)?i+1:_lbl,grade:p.grade||"",lengthM:(_len!=null&&isFinite(_len))?_len:null,gear:p.gear||"",belay:String(p.belay||"").trim(),note:p.notes||"",bolts:isFinite(_bolts)?_bolts:0,anchor:String(p.anchor||"").trim(),crux:!!p.crux,photos:[],comments:[]};
  }).filter(function(p){return p.grade||p.gear||p.note||p.lengthM||p.anchor||p.bolts||p.crux;});if(f.type==="waypoints")return (vals.waypoints||[]).filter(function(w){return w.name||w.lat||w.note||w.directions;}).map(function(w){return {type:w.type,name:w.name||w.type,lat:w.lat?parseFloat(w.lat):null,lng:w.lng?parseFloat(w.lng):null,elev:w.elev?(uImp()?parseInt(w.elev):Math.round(parseInt(w.elev)*3.28084)):null,distMi:w.distMi?(uImp()?parseFloat(w.distMi):Math.round(parseFloat(w.distMi)/1.60934*100)/100):null,note:w.note||"",directions:w.directions||""};});if(f.type==="itinerary")return itinDraftToStructured(vals.itinerary);if(f.type==="bivy")return (vals.bivy||[]).filter(function(b){return b.name&&String(b.name).trim();}).map(function(b){
  /* elev goes to the DB in FEET, converted from whatever the reader's units are — the same
     handling as a waypoint elevation two branches up. This matters more than it looks: the
     column already holds two conventions (`elev` feet, legacy `elevM` metres) and writing a
     metric number into `elev` would put a third reading into a field uElev() treats as feet.
     Only `elevM` is never written here — the read side converts the legacy spelling, and the
     write side should not add to it. */
  var _e=String(b.elev||"").trim();var _n=_e?parseInt(_e,10):null;
  return {name:String(b.name).trim(),type:b.type||"camp",role:(b.role==="main"||b.role==="route")?b.role:"",elev:(_n!=null&&!isNaN(_n))?(uImp()?_n:Math.round(_n*3.28084)):null,capacity:(b.capacity||"").trim(),water:(b.water||"").trim(),permit:(b.permit||"").trim(),notes:(b.notes||"").trim()};
/* The form never shows the role:"hidden" stubs (they name Campsite PINS the camping list skips), so
   they are carried through untouched — otherwise one climber's edit would bring every hidden pin back. */
}).concat((Array.isArray(route.bivy)?route.bivy:[]).filter(function(b){return b&&b.role==="hidden"&&b.name;}).map(function(b){return {name:b.name,role:"hidden"};}));if(OBJ_KEYS[f.type]){var _ks=OBJ_KEYS[f.type],_src=vals[f.k]||{},_o={};_ks.forEach(function(k){var v=_dget(_src,k[0]);if(v==null)return;if(k[3]==="months"){var _cm=cleanMonths(v);if(_cm)_o=_dset(_o,k[0],_cm);return;}v=String(v).trim();if(!v)return;
/* A key marked numeric merges back as a NUMBER. The hour fields are arithmetic — the planner
   derives the summit time as totalHrs-approachTimeHrs-descentTimeHrs — so a string would
   concatenate instead of subtract, silently. Non-numeric input is dropped rather than stored
   as text, because a bad number is worse here than a missing one: the tile still renders.
   group_limit keeps its integer parse, now declared on the key rather than hardcoded here. */
var _pv=(k[3]==="num")?(isFinite(parseFloat(v))?parseFloat(v):undefined):(k[3]==="enum")?((k[4]||[]).some(function(o){return typeof o[0]==="number";})?(isFinite(parseFloat(v))?parseFloat(v):undefined):v):((k[0]==="group_limit"&&/^[0-9]+$/.test(v))?parseInt(v,10):v);if(_pv===undefined)return;/* dotted keys write nested, so `fitnessSpec.hiking` lands inside the object the panel reads */if(String(k[0]).indexOf(".")>=0){_o=_dset(_o,k[0],_pv);}else{_o[k[0]]=_pv;}});return _o;}if(CANON[f.k])return CANON[f.k](filledStr(f));return filledStr(f);};
  const submit=function(){var dc=discContribs();if(!changedFields.length&&!dc.length)return;changedFields.forEach(function(f){var c={type:"edit",field:f.k,label:f.label,value:structuredVal(f),wasEmpty:(!f.cur||f.cur==="—"),routeId:route.id,note:note,title:route.name,area:mtnOf(route),meta:f.label+": "+(f.cur||"—")+" → "+filledStr(f),status:"review",when:"just now"};if(onSubmit)onSubmit(c);});dc.forEach(function(c){if(onSubmit)onSubmit(c);});setSentN(changedFields.length+dc.length);setSent(true);};
  const _removals=changedFields.filter(function(f){var pg=REMOVABLE_LISTS[f.k];return !!pg&&editRemoves(pg(route),structuredVal(f));});const _needWhy=_removals.length>0&&note.trim().length<10;const totalUpdates=changedFields.length+(discChanged?(disc==="trad"||disc==="sport"?2:1):0);const canSubmit=totalUpdates>0&&!_needWhy;
  const submitLbl=_needWhy?"Say why you’re removing it":!canSubmit?"Fill in any one field to submit":totalUpdates>1?("Submit "+totalUpdates+" updates"):(allEmpty&&!discChanged?"Add to route":"Submit update");
  /* A STRAY TAP OUTSIDE THE PANEL MUST NOT DESTROY TYPED BETA. This backdrop closed the form
     unconditionally, and the form holds up to 35 inputs — so one tap beside the panel discarded
     everything a climber had written, with no warning and nothing to undo it. The inner panel
     already shields the click, so only a genuine outside tap gets here.
     Gated on the form's OWN emptiness signal rather than a new one: `canSubmit` is
     `totalUpdates > 0`, which the submit button already computes. An untouched form still
     dismisses on a backdrop tap, which is what makes an accidental open cheap to leave; once
     there is work to lose, leaving is a deliberate act via the ✕ or Cancel, both of which are
     right there. The two mistakes do not cost the same. */
  return createPortal(<div onClick={canSubmit?undefined:onClose} role="dialog" aria-modal="true" aria-label="Contribute info" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:100000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"72px 12px 32px",overflowY:"auto",overscrollBehavior:"contain"}}>
    <div onClick={function(e){e.stopPropagation();}} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:460,border:"1px solid "+C.border,overflowY:"auto",overscrollBehavior:"contain",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid "+C.border,flexShrink:0}}><div style={{fontSize:16,fontWeight:700,color:C.text}}>{sent?"Thanks for contributing":"Add or fix info"}</div><button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button></div>
      <ContributionStandingNotice standing={_standing} onAppeal={function(){openAppeal({kind:"contributing",label:"your route-editing standing"});}}/>
      {sent?<div style={{padding:16}}><div style={{fontSize:40,textAlign:"center",marginBottom:8}}>{"✓"}</div><div style={{textAlign:"center",fontWeight:700,fontSize:15,color:C.text,marginBottom:12}}>{"Thanks — "+sentN+" sent for review"}</div><div style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:11,padding:"11px 13px",fontSize:12.5,color:C.text,lineHeight:1.55,marginBottom:12}}>{"ClimbMatch checks every edit before it goes on the page, so the next party can trust what they read. You’ll be told when it’s checked, and credited as the contributor."}</div><button onClick={onClose} style={{...BTN,width:"100%",background:C.blueSolid,color:C.onSolid,border:"none"}}>Done</button></div>:<div>
      <div ref={scrollRef} style={{minHeight:0,padding:16,overflowY:"auto",overscrollBehavior:"contain",flex:1}}>
        <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px",marginBottom:10}}>{"Spotted something wrong or missing on "}<b>{route.name}</b>{"? Fill in any fields below — leave the rest blank. Every edit is checked by ClimbMatch before it goes on the page, and you’ll be told when it is."}</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>{GROUPED.map(function(g){return <button key={g[0]} onClick={function(){jumpTo(g[1][0].k);}} style={{...CHIP,border:"1px solid "+C.border,background:C.card,color:C.textSub}}>{g[0]}</button>;})}</div>
        <div style={{background:"linear-gradient(180deg,"+C.blueBg+","+C.card+")",border:"1px solid "+C.blue+"55",borderRadius:14,padding:"13px 14px 14px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:10}}><CardHead>{"Discipline"}</CardHead>{discChanged?<span style={{fontSize:11,fontWeight:700,color:C.amber}}>{"Will update the route"}</span>:null}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{DISCS.map(function(d){var on=disc===d[1];return <button key={d[1]} onClick={function(){setDisc(d[1]);}} aria-current={on?"true":undefined} style={{...CHIP,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueSolid:C.surface,color:on?C.onSolid:C.textSub,boxShadow:on?"0 1px 6px "+C.blue+"66":"none",display:"inline-flex",alignItems:"center",gap:6}}><DiscIcon d={d[1]} size={14} color={on?C.onSolid:undefined}/>{d[0]}</button>;})}</div>
        </div>
        {/* Group headers carry their own missing-count and an explicit opener. Every EMPTY field
            used to auto-expand, and the shape almost every route in the catalog actually has is
            name + grade + pitches and nothing else — so on the routes that most need contributing
            to, the form opened with essentially all of them expanded at once: 35 of 39 on a bare
            alpine route, and among them the waypoint MAP PICKER, the itinerary editor and the
            pitch builder, all mounted unasked before the climber had picked anything to fix.
            Collapsing loses nothing, because the collapsed row already says "Not set yet" in
            italic muted text — the gap was never communicated by the expansion, only by the row.
            Same shape as the Bailout and Start-of-climb blocks below, which have always been a
            button that opens a form rather than a form. `scrollTo` and pending suggestions still
            force their own field open, so every deep link into the form still lands expanded. */}
        {GROUPED.map(function(g){var acc=ACCENT[g[0]]||[C.blue,C.blueBg];var _missing=g[1].filter(function(f){return !f.cur||f.cur==="—";});var _gOpen=!!groupOpen[g[0]];return <div key={g[0]} style={{background:C.card,border:"1px solid "+acc[0]+"40",borderLeft:"4px solid "+acc[0],borderRadius:12,padding:"5px 14px 14px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,margin:"11px 0 2px"}}><CardHead tone={acc[0]}>{g[0]}</CardHead>{_missing.length?<button aria-label={(_gOpen?"Hide the ":"Fill in the ")+_missing.length+" missing "+g[0]+" field"+(_missing.length===1?"":"s")} onClick={function(){setGroupOpen(function(p){var o=Object.assign({},p);o[g[0]]=!p[g[0]];return o;});}} style={{flexShrink:0,padding:"5px 10px",borderRadius:9,border:"1px solid "+acc[0]+"55",background:_gOpen?acc[1]:"transparent",color:_gOpen&&acc[1]===C.blueBg?"#fff":acc[0],fontSize:11,fontWeight:700,cursor:"pointer"}}>{_gOpen?"Hide":("Fill in "+_missing.length+" missing")}</button>:null}</div>
          {g[1].map(function(f,fi){var filled=isFilled(f);var pend=(pending&&pending[f.k]&&!pending[f.k].live)?pending[f.k]:null;var isOpen=_lvOf(f.k)!=="high"&&(!!open[f.k]||(_gOpen&&(!f.cur||f.cur==="—"))||scrollTo===f.k||!!pend);var shown=filled?filledStr(f):(pend?("Awaiting review: "+pendStr(f,pend.value)):((!f.cur||f.cur==="—")?"Not set yet":f.cur));var dim=!filled&&!pend&&(!f.cur||f.cur==="—");var help=HINTS[f.k]||"";return <div key={f.k} id={"sf-section-"+f.k} style={{marginTop:fi?9:0,paddingTop:fi?9:0,borderTop:fi?"1px solid "+C.borderLight:"none"}}>
            <div {...clickable(function(){setOpen(function(o){return Object.assign({},o,{[f.k]:!o[f.k]});});})} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",padding:"8px 0"}}>
              <span style={{fontSize:12.5,fontWeight:700,color:C.text,flexShrink:0}}>{f.label}</span>{(function(){var _lv=_lvOf(f.k);return _lv?<ConfChip level={_lv} label={f.label} compact/>:null;})()}{(function(){var _ag=(route._contribAgreed||{})[f.k];return _ag&&!pend?<span style={{flexShrink:0,fontSize:11,fontWeight:700,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:6,padding:"1px 6px"}}>{_ag>1?"✓ "+_ag+" climbers, checked":"✓ climber edit, checked"}</span>:null;})()}
              <span style={{flex:1,minWidth:0,textAlign:"right",fontSize:11.5,color:filled?acc[0]:(pend?C.amber:(dim?C.textMuted:C.textSub)),fontWeight:(filled||pend)?700:400,fontStyle:dim?"italic":"normal",overflowWrap:"anywhere"}}>{shown}</span>
              <span style={{flexShrink:0,width:24,height:24,borderRadius:"50%",background:isOpen?C.blueSolid:C.blueBg,border:"1px solid "+C.blueDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:isOpen?C.onSolid:"#fff",transform:isOpen?"rotate(180deg)":"none",transition:"transform .15s, background .15s"}}><Chevron open size={13} color="currentColor"/></span>
            </div>
            {isOpen?<div style={{marginTop:8}}>{pend&&pend.mine?<div style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:9,padding:"7px 9px",marginBottom:8,display:"flex",alignItems:"center",gap:7}}><span style={{flex:1,fontSize:11,color:C.text,lineHeight:1.4}}>{"You suggested: "}<b>{pendStr(f,pend.value)}</b>{pend.removes?" — it removes something, so ClimbMatch checks it before it changes the page. Sending another value replaces it.":" — awaiting review by ClimbMatch. Sending another value replaces it."}</span></div>:null}{help?<div style={{fontSize:11,color:C.textMuted,lineHeight:1.4,marginBottom:7}}>{help}</div>:null}{(function(){var cr=curRefStr(f);return cr?<div style={{marginBottom:9,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"9px 11px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5}}><div style={SUB_LABEL}>{"On the app now"}</div>{_txtField(f)&&!_wsNorm(vals[f.k])?<button onClick={function(){setV(f.k,cr);}} aria-label={"Start from this text: copy what is on the app into the "+f.label+" box to edit it"} style={{flexShrink:0,padding:"4px 9px",borderRadius:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>{"Start from this text"}</button>:null}</div><div style={{fontSize:13,color:C.text,lineHeight:1.55,whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:260,overflowY:"auto",overscrollBehavior:"contain"}}>{cr}</div></div>:null;})()}{renderInput(f)}{sameAsApp(f)?<div role="status" style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{"Same as what’s on the app — change it to send a fix."}</div>:null}</div>:null}
          </div>;})}
        </div>;})}
        {_removals.length?<div role="note" style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:11,padding:"10px 12px",marginBottom:10,fontSize:12.5,color:C.text,lineHeight:1.55}}>{"You’re removing something from "}<b>{_removals.map(function(f){return f.label;}).join(", ")}</b>{". Like every edit, ClimbMatch checks it before it changes the page — other parties rely on what’s here. Say why below (at least 10 characters): it’s gone, it’s a duplicate, it’s in the wrong place…"}</div>:null}
        <div style={{marginBottom:4}}><div style={{...SUB_LABEL,margin:"2px 0 6px"}}>{_removals.length?"Why (required)":"Why (optional)"}</div><input aria-label={_removals.length?"Why (required)":"Why (optional)"} value={note} onChange={function(e){setNote(e.target.value);}} placeholder={_removals.length?"e.g. the old bivy at the col is gone, washed out in 2025":"e.g. climbed it last week and it is WI4 now"} style={fld}/></div>
      </div>
      <div style={{padding:"9px 16px 12px",borderTop:"1px solid "+C.border,flexShrink:0}}>{onLog?<div {...clickable(onLog)} style={{fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",textAlign:"center",marginBottom:9}}>Climbed it? Log a trip report instead →</div>:null}<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",marginBottom:8,lineHeight:1.4}}>No need to fill everything — add or fix only what you know.</div><div style={{display:"flex",gap:12}}><button onClick={onClose} style={{flex:1,padding:11,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:"pointer",fontWeight:600}}>Cancel</button><button onClick={submit} disabled={!canSubmit} style={{flex:2,padding:11,background:canSubmit?C.blueSolid:C.surface,color:canSubmit?C.onSolid:C.textMuted,border:canSubmit?"none":"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:canSubmit?"pointer":"default",fontWeight:700}}>{submitLbl}</button></div></div>
    </div>}
    </div>
  </div>,document.body);
}
/* Per-section gap flags. These used to feed one "This route's info has gaps" banner pinned to the
   top of every route page, which ate the first screenful and told you nothing about where to look.
   Each flag is now read by the section that owns the missing field, so the notice sits next to the
   empty space it describes. Only the flags a section cannot already express live here — description
   and approach are the plain else-branch of the ternary that renders them, so they need no helper.
   gapTrack keys on gpxPts, not gpx: dbRouteToCamel maps the `gpx` column onto `gpxPts`, so the old
   `!route.gpx` test was true for every DB-backed route, whether or not it had a track. */
/* gapGear asks the RACK box's own question -- routeRackFor, the chain the box renders (an agreed
   correction, detailedRack, proNeeds, rack) -- so "No gear or rack listed" can never sit under a
   rack the box is showing. It used to read `rack` and `gearTiers.required` instead. It missed
   detailedRack: measured 2026-10-14, 2,610 routes hold their rack ONLY there (no rack, no gear), and
   1,174 of them are stored alpine/ice/mixed, where this note renders -- each told "Nothing says what to
   bring" above its own rack. And it counted gearTiers.required, which nothing renders since GearTiers
   went (#2375): an agreed rack correction is written to `rack` as well, while a legacy `gear`
   contribution lands in gearTiers.required ONLY, so counting it hid the gap on a route showing
   nothing. The seed routes that carry gearTiers all carry `rack` too, so none of them changes. */
function gapGear(r){if(!r)return false;const roped=["trad","sport","alpine","ice","mixed","aid"].indexOf(catOf(r))>=0;return roped&&!((r.cams&&r.cams.length)||routeRackFor(r)||rackRows(r).length||(r.gearBeta&&r.gearBeta.length));}
function gapSeason(r){return !!r&&!r.season&&!r.climate&&!["trad","sport"].includes(catOf(r));}
function gapPitches(r){return !!r&&r.discipline!=="bouldering"&&(r.pitches>1)&&!(r.pitchDetail&&r.pitchDetail.length);}
function gapTrack(r){return !!r&&!(r.gpxPts&&r.gpxPts.length>=3);}
/* `descent` is frequently a one-line stub ("Reverse with a short rappel") while `descent_text`
   holds the researched paragraph that actually gets you down. In a 200-row sample of routes
   carrying both, 178 had a materially longer descent_text — and
   scripts/oneoff/measure-which-tab-renders-each-field.mjs scored descentText as rendering on
   NO tab, so the text a contributor typed into the fix form is write-only. Prefer whichever
   says more; they describe the same descent, so showing both would just duplicate it. */
/* `descentText` is the CONTRIBUTE-FORM key for this section — it is in SS and the DESCENT
   pencil opens it — while `descent` is the enrichment column. Picking the longer of the two
   let the enrichment out-vote an agreed correction whenever the correction was SHORTER, which
   is exactly what a useful one often is: "South gully is closed by rockfall — walk off east"
   replacing three paragraphs of stale prose. Same rule as _rapEdited below, and the same
   failure #787 found for rappels: a reader must not overrule what climbers agreed. Length is
   only a tie-breaker for two ENRICHED strings; once a field is in `_contribFields` the
   climbers' text wins outright. */
function _descEdited(r){return !!(r&&(r._contribFields||[]).indexOf("descentText")>=0);}
/* THERE IS NO RIVALRY HERE, and this comment previously asserted one. Two things happen in
   ClimbMatch's merge and you have to read both:

     1. every contribution is written through the rename map `M`, which has
        {descentText:"descent"} -- so the form key `descentText` lands in route.descent;
     2. AFTER both merge paths, `if(o.descent!=null)o.descentText=o.descent;` MIRRORS it back
        (#787), and its own comment says "Write both spellings; equal strings make the
        comparison moot."

   So a real contribution leaves route.descent === route.descentText, and this function returns
   the correction whichever side it reads -- including under the bare length comparison that
   predates every change to it. #897 made it prefer `b` and called that a fix; #915 made it
   prefer `a` and called #897 a regression that had "discarded the correction". Measured by
   rendering both variants against a fixture that sets BOTH properties: behaviourally identical.
   Neither was a live fix, and #915's accusation was false.

   Keep the branch -- it costs nothing and it is what keeps this correct IF the mirror is ever
   removed. Do not describe it as fixing a live defect, and do not "restore" the other ordering
   on the strength of the M rename alone. See #932, which had to un-assert the same claim inside
   check:correction-readers, where it had hardened into a rule.

   The real instance of this class is `rack` -- see _rackEdited. */
function descentBeta(r){if(!r)return "";const a=String(r.descent||"").trim(),b=String(r.descentText||"").trim();if(a&&_descEdited(r))return a;return b.length>a.length?b:a;}
/* `routes.season` is not a month range. Enrichment writes prose into it — up to 232 characters on
   wa_hourglass_gully_winter — and the hero header rendered it raw, so a paragraph about snow bridges
   wrapped over the cover photo and pushed the box open. The full text still shows in the season chip
   and CLIMATE & SEASON on the Conditions tab; the header only needs the window. */
const _MON="Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
/* A window can end on a SEASON as well as a month. "August to autumn", "Spring to autumn",
   "Late summer into early September" are all real windows a climber can act on, and the
   month-only pattern saw none of them — 50 of the 132 approach seasons that fell through to
   the blunt truncation had a perfectly good window sitting in the text. Kept separate from
   _MON so the two can be reasoned about apart. */
const _SEAS="spring|summer|autumn|fall|winter";
const _WHEN="(?:"+_MON+"|"+_SEAS+")";
const _QUAL="(?:mid\\/late|early\\/mid|early|mid|late)[- ]?";
const _SEP="\\s*(?:[-\u2013\u2014]|to|through|thru|into)\\s*";
const SEASON_WINDOW_RE=new RegExp("(?:"+_QUAL+")?(?:"+_MON+")"+_SEP+"(?:"+_QUAL+")?(?:"+_MON+")","i");
/* The same shape, but allowing a SEASON at either end. It is deliberately a SECOND pattern
   tried AFTER the clause cut, not a widening of the first, and that ordering is the whole
   point: widening the primary pattern regressed the header strap, because it started firing
   on values whose first clause was already the better answer.
   "Summer (rock) or late winter-spring (ice/mixed)" showed "Summer" and became
   "late winter-spring" — the strap telling a climber a summer rock route is a winter route.
   Measured, not spotted by eye; 13 header values moved and that one was plainly wrong. */
const SEASON_WINDOW_WIDE_RE=new RegExp("(?:"+_QUAL+")?"+_WHEN+_SEP+"(?:"+_QUAL+")?"+_WHEN,"i");
/* `max` is per CALL, because the two places this renders have different room. The HEADER STRAP
   sits beside elevation and pitch count and wants 30; the APPROACHES pill owns its own row and
   can hold more, and 33 of the 132 approach seasons that were being truncated already fitted 48
   characters — chopped for no reason but a budget borrowed from the other surface. 48 is also
   what check:token-boxes still counts as a token rather than a paragraph, so a value shown in
   full here can never trip that guard.
   The last resort now breaks on a WORD boundary: "Roughly January through the…" reads as a
   sentence that stops, where "Roughly January through the e…" reads as a bug. */
/* ONE spelling of a window. The header strap printed the same thing six ways ("Jul-Sep", "Jul–Sep",
   "July-September", "Late June - September", "July through October", "Mid-July to September"), so
   two routes side by side read as if they disagreed. Months are cut to three letters, the joint
   between two months is a plain hyphen, a qualifier is its own word ("Mid Jul-Sep"). Only the
   SPELLING changes: no window is widened, narrowed or invented. Only a month PAIR is respelled, so a
   month in running prose ("Best in June while…") stays a word, and months are matched
   case-sensitively so the verb "may" is never read as one. */
const _MON_ABBR={january:"Jan",february:"Feb",march:"Mar",april:"Apr",june:"Jun",july:"Jul",august:"Aug",sept:"Sep",september:"Sep",october:"Oct",november:"Nov",december:"Dec"};
const _MONF="Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
const _QUALF="(?:[Ee]arly|[Mm]id|[Ll]ate)[- ]?";
const SEASON_PAIR_RE=new RegExp("\\b("+_QUALF+")?("+_MONF+")\\b\\s*(?:[-\u2013\u2014]|to|through|thru)\\s*("+_QUALF+")?("+_MONF+")\\b","g");
function _monAbbr(m){const k=m.toLowerCase();return _MON_ABBR[k]||m;}
function _qualTidy(q){return q?q.replace(/[- ]$/,"")+" ":"";}
function _cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s;}
export function seasonTidy(s){s=String(s||"").trim().replace(/\s+/g," ");if(!s)return "";s=s.replace(SEASON_PAIR_RE,function(_,q1,m1,q2,m2){return _qualTidy(q1)+_monAbbr(m1)+"-"+_qualTidy(q2)+_monAbbr(m2);});return _cap(s.replace(/\.$/,""));}
/* A window the sentence tells you to AVOID is not the season. "good in cold weather; avoid May-Sep"
   showed "May-Sep" in the header: the strap saying the opposite of the row (va_strawberry_fields,
   2026-10-24). A window whose own clause negates it is skipped, and the next rung decides. */
function seasonWin(s,re){const m=s.match(re);if(!m)return null;const pre=s.slice(0,m.index).split(/[;.]/).pop();return /\b(avoid|not|except|outside)\b/i.test(pre)?null:m[0];}
export function seasonShort(s,max){const lim=typeof max==="number"?max:30;if(!s)return "";s=seasonTidy(s);if(s.length<=lim)return s;const m=seasonWin(s,SEASON_WINDOW_RE);if(m)return _cap(m);const cut=s.split(/[;.(]/)[0].trim();if(cut.length<=lim)return cut;const w2=seasonWin(s,SEASON_WINDOW_WIDE_RE);if(w2)return _cap(w2);const w=cut.lastIndexOf(" ",lim-1);const keep=w>Math.floor(lim/2)?cut.slice(0,w):cut.slice(0,lim-1);return keep.replace(/[\s,;-]+$/,"")+"…";}
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
  /* withRecordedTrackOnly: the route line is a recorded track or nothing (owner, 2026-10-25), so a stored line that is only the pins joined up leaves here, AFTER the approach overlay, which can swap in another row's line. */const route=useMemo(function(){return withRecordedTrackOnly(applyApproach(routeRow,approachOpt,approachVia));},[routeRow,approachOpt,approachVia]);
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
  const planBody=(atTabTop)=><div>{(route.road||route.driveMinSLC)?(function(){var road=route.road||{};var _rowN=0;function row(label,val){if(!val)return null;var first=_rowN++===0;return <div style={{padding:first?"0 0 9px":"9px 0",borderTop:first?"none":"1px solid "+C.borderLight}}><div style={{...SUB_LABEL,marginBottom:3}}>{label}</div><div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{val}</div></div>;}var driveTxt=route.driveMinSLC?(route.driveMinSLC>=60?(Math.floor(route.driveMinSLC/60)+"h "+(route.driveMinSLC%60?route.driveMinSLC%60+"m ":"")+"from Salt Lake City"):(route.driveMinSLC+" min from Salt Lake City")):null;return <>{/* Points at `road`, not `approach`: every row in THIS panel comes from the road block (name / driveNote / status / seasonalGate), so the edit button used to open a form section that could not change a single line of what it sits beside. The overview panel above still opens `approach`, because that one mixes road and approach content. */}<SL first={atTabTop} action={<EditIconButton onClick={()=>{openFix("road");}} title="Edit road and driving information"/>} wp="Trailhead">GETTING THERE</SL><Capped><div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:"1px solid "+C.border,marginBottom:ROUTE_GAP}}>{row("Drive time",driveTxt)}{row("Road / access point",road.name)}{row("Drive notes",road.driveNote)}{road.status?row("Road status",road.status+(road.seasonalGate?" — "+road.seasonalGate:"")):row("Seasonal gate",road.seasonalGate)}{accessCheckedLine(route)?<div style={{marginTop:2,fontSize:11.5,color:C.textMuted,lineHeight:1.5}}>{accessCheckedLine(route)}</div>:null}{/* The rows above are the catalog's, researched once. The line below is what the last climber who drove in reported — the full list is ROAD CONDITIONS on the Conditions tab. */(function(){var ls=roadReportsOf(activity).find(function(r){return r.status;});if(!ls)return null;var tc=ROAD_TONE(ls.tone);return <div style={{marginTop:8,fontSize:12,color:C.textSub,lineHeight:1.5}}>{"Climbers reported: "}<b style={{color:tc[0]}}>{ls.status}</b>{" · "+ago(ls.date)}</div>;})()}</div></Capped></>;})():<><SL first={atTabTop} action={<EditIconButton onClick={()=>{openFix("road");}} title="Edit road and driving information"/>} wp="Trailhead">GETTING THERE</SL><GapNote what="No driving directions yet" why="Nothing says which road gets you here, how long the drive is, or whether a gate or rough road stands in the way." cta="Add the drive" onFix={()=>{openFix("road");}}/></>}{/* THE TRAILHEAD BELONGS BESIDE THE DRIVE, NOT ON TOP OF THE APPROACH PROSE. This card used
           to open the APPROACH section further down the tab, which put the place you are driving to
           several screens below the road that gets you there — and left APPROACH answering two
           questions at once (where does the walk start, and how does the walk go). GETTING THERE is
           the drive; this is the point it ends at; APPROACH is what you do on foot afterwards.
           IT REPLACES a standalone "Directions to trailhead" button that stood here, not merely
           joins it: that button resolved its destination through trailheadPoint() and so does this
           card's "Drive here", so the two were the same link. trailheadPoint never returns a point
           with a null lat (every branch goes through wpPlaced), so wherever the button rendered the
           card renders too and nothing is lost. */}{cragOnly?null:<Capped><TrailheadCard route={route} onEdit={()=>{openFix("approach");}}/><SummitLegsCard route={route} calc={calcInputs}/></Capped>}{(()=>{const rx=rxOf(route.id);const dbA=route.access||{};const ac={...dbA,...rx.access};const passVal=ac.passRequired===true?"Yes":(typeof ac.passRequired==="string"?ac.passRequired:null);const feesVal=typeof ac.fees==="number"?("$"+ac.fees):ac.fees;/* DISPLAY prefers land_manager: it is the canonical field — 2,103 routes across just 80
   distinct values, "Agency (Ranger District) — Wilderness". landManager is legacy free prose:
   984 routes across 474 distinct values, a quarter of them over 110 chars, sometimes a whole
   sentence ("Most of the route ... lie within the ..."). 604 routes carry BOTH with different
   text, and the || order meant the prose always won and the canonical value was never seen. */
const landMgrVal=ac.land_manager||ac.landManager;const closuresVal=ac.closures||ac.closure||ac.seasonal;/* `permits`/`permitUrl` are TOP-LEVEL columns, not part of the `access` jsonb every other row here comes from — which is why they used to render on a different tab entirely. Kept as their own row rather than folded into ["Permit",ac.permit]: the two say different things and 67% of alpine routes carry both. `ac.permit` is the permit's NAME ("Mount Baker Climbing"); `route.permits` is how it actually works ("Free self-issue Mount Baker Wilderness permit or trailhead registration; no quota or fee"). Collapsing them with a `||` would drop one, which is the exact defect #741 fixed on the Trailhead row. When there IS a link the text renders inside it below, so it is not listed twice. */const _ownPermit=route.permits||null;const _ownPermitUrl=route.permitUrl||null;const rows=[["Permit",ac.permit],["Permit details",_ownPermitUrl?null:_ownPermit],["Fees",feesVal],["Seasonal closures",closuresVal],["Rules & limits",ac.rules],["Group size limit",ac.group_limit!=null?ac.group_limit+(ac.group_limit===1?" climber":" climbers"):null],["Land manager",landMgrVal],["Pass required",passVal],["Parking / entrance",ac.parking_pass],["How to apply",ac.notes]].filter(r=>r[1]);/* An empty access block used to render NOTHING — no panel, no heading, and therefore no edit button, so the routes with no access information were exactly the routes on which nobody could add any. That is the shape [[per-section-gap-notices-replaced-page-banner]] exists for: say what is missing where it would have been, and offer the way to fix it. */if(!rows.length&&!_ownPermitUrl)return <GapNote what="No access or permit information" why="Nothing on file says who manages this land, what pass the trailhead needs, or whether a permit is required — and that is the part that turns people around at the gate." cta="Add what you know" onFix={function(){openFix("access");}}/>;/* Deliberately NOT landMgrVal — matching reads BOTH land-manager strings, display reads one.
   Neither key alone is a good haystack. Preferring the canonical land_manager loses links the
   legacy prose earned (13 lost, 5 moved: "Mount Rainier National Park" collapses to "National
   Park Service", the Enchantments permit area vanishes from Alpine Lakes routes). Preferring
   the legacy prose loses what only the canonical field says — Mount Torment, Challenger and
   Olympus are Park Service land and linked to NOTHING. The union loses neither, and on its own
   it would let 15 Mt. Baker boilerplate routes through to the wrong agency; PERMIT_PERIPHERAL
   above is what makes it safe. Measured together: 107 wrong links removed, 7 genuine park
   links gained, 1 moved. Do not "tidy" display and matching back into one expression. */
const _pmLm=((ac.land_manager||"")+" "+(ac.landManager||"")+" "+(ac.permit||"")+" "+(feesVal||"")).toLowerCase();/* Match the agency name only where it is ASSERTED, never where it is disclaimed. This haystack is land manager + permit + fees, and 1,282 WA routes carry the fees line "None - no climbing fee (National Forest, not Mount Rainier NP)". A bare /rainier/ test reads that as Rainier and sends a climber on a Snoqualmie or Index route to Mount Rainier's climbing-permit page - contradicting the very sentence it matched. 1,308 of the 1,941 routes showing a permit link were pointed at the wrong agency this way. Same defect the rack summary already guards with RACK_NEG ("ice screws are not worth carrying" must not advertise screws). */const _pmUrl=_pmSays(_pmLm,/enchantment/g)?["Enchantment Permit Area lottery — Recreation.gov","https://www.recreation.gov/permits/233273"]:_pmSays(_pmLm,/north cascades/g)?["North Cascades NP backcountry permits — nps.gov","https://www.nps.gov/noca/planyourvisit/permits.htm"]:_pmSays(_pmLm,/rainier/g)?["Mount Rainier climbing permits — nps.gov","https://www.nps.gov/mora/planyourvisit/climbing.htm"]:_pmSays(_pmLm,/olympic national park/g)?["Olympic NP wilderness permits — nps.gov","https://www.nps.gov/olym/planyourvisit/wilderness-reservations.htm"]:_pmSays(_pmLm,/recreation\.gov/g)?["Reserve on Recreation.gov","https://www.recreation.gov"]:null;const _accSummary=rows.map(function(r){return r[0];}).concat(_ownPermitUrl?["Permit link"]:[]).join(" · ");return <AccessFold summary={_accSummary} onEdit={function(){openFix("access");}}>{/* The pencil points at `access`, not `permit`. Every row here comes from the `access` block; `permit` is the separate top-level column, so this button opened a form section that could not change one line of what it labels. */}{rows.map(r=><div key={r[0]} style={{marginBottom:7}}><CardHead style={{marginBottom:8}}>{r[0]}</CardHead><div style={{fontSize:13,color:C.textSub,lineHeight:1.55}}>{r[1]}</div></div>)}{/* The route's OWN permit link, rehomed here from Overview. It comes first because it is specific to this climb, where `_pmUrl` below is inferred from the land-manager string and only ever points at an agency's general permit page. `rel` gains `noopener` — the Overview copy had `noreferrer` alone, and while every current browser implies the one from the other, stating it is what the two other external links in this panel already do. */}{_ownPermitUrl?<a href={_ownPermitUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:9,padding:"9px 12px",background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:9,fontSize:12.5,fontWeight:700,textAlign:"center",textDecoration:"none"}}>{(_ownPermit||"Get the permit")+" →"}</a>:null}{_pmUrl?<a href={_pmUrl[1]} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:9,padding:"9px 12px",background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:9,color:C.onSolid,fontSize:12.5,fontWeight:700,textDecoration:"none",textAlign:"center"}}>{_pmUrl[0]+" →"}</a>:null}<div style={{fontSize:12,color:C.textMuted,marginTop:8,fontStyle:"italic"}}>Confirm current permits and closures with the land manager before you go.</div></AccessFold>;})()}{/* The structured approaches come FIRST, then the long-form prose below. A climber
    choosing a way in wants the comparison (which one, what season, how long) before the
    narrative; the narrative is what you read once you have chosen. */}{(cragOnly&&route._dbArea&&String(route._dbArea.approach||"").trim())?<div style={{marginBottom:12}}><Capped><CragWalkIn route={route}/></Capped></div>:null}{/* A crag's WALK-IN (areas.approach) used to sit lower on Overview under its own "GETTING THERE"
     title — a second heading of that name once the Plan body moved to Overview, and beside a GapNote
     saying the walk was not written down when the crag's walk-in was right there. It renders here,
     in the approach slot, and the GapNote yields to it. */}{(route.approach||(Array.isArray(route.approachVariants)&&route.approachVariants.some(Boolean)))?<Capped><ApproachVariants route={route} onEdit={()=>{openFix("approachVariants");}} onEditProse={()=>{openFix("approach");}}/></Capped>:(cragOnly&&route._dbArea&&String(route._dbArea.approach||"").trim())?null:<EmptySection title="APPROACH" what="No approach description" why="Getting from the trailhead to the start of the climbing is not written down yet." cta="Describe the approach" onFix={()=>{openFix("approach");}}/>}{/* GATED ON THE WALK ITSELF — the prose or a way in — never on the trailhead alone. The old gate
           also admitted a route that merely had a trailhead, because a card underneath was the thing
           being shown; with that card at the top of the tab such a route would render the APPROACH
           heading over an empty box. It takes the GapNote above instead, which is true — the trailhead
           is on screen and the walk from it genuinely is not written down. */}{/* TURNAROUND and BAILOUT were removed from the app entirely (owner, 2026-10-07). The `turnaround` and
    `bail` columns stay in the database, unread. */}{/* Up, then down. PITCH-BY-PITCH sits after the approach and before the descent; the rappels
    follow the descent prose immediately below. There is no PROTECTION section here any more
    (owner note, 2026-10-23: "remove protection and just move that info to the rack section"):
    its one line — a cam range, a rack summary, or "N bolts · N+ quickdraws" — repeated the RACK
    card further down this tab, which lists the same cams and rack in full. The bolt count was the
    one fact only it carried, and it is a line in RACK now. Mountain Project prints one protection
    box per route, not two. */}
{/* OVERVIEW, THEN DETAIL. CLIMBING ROUTE (the climb at a glance, section by section) comes
    BEFORE ROUTE BREAKDOWN (every pitch and leg), the order a climber reads a route in and the
    order guidebooks print it: the line as a whole, then pitch by pitch (owner, 2026-10-22). It
    used to sit AFTER the breakdown, and on a pitched route it was not drawn at all: 121
    scramble/mountaineering routes showed the detail before the overview, and 46 alpine routes
    held a written CLIMBING ROUTE nobody saw. It now renders wherever it is written; only its
    EMPTY state stays unpitched-only, so a rock route is not asked for a second description of
    pitches it already lists. When both are on the page they are drawn as one piece: the
    overview ends in a connector that hands off to the breakdown directly under it. No section
    is matched to a pitch — nothing in the record says which pitches a section spans, and
    guessing from words would be a claim the record never made. */}
{route.discipline!=="bouldering"&&(route.climbingRoute||[]).length?<div id="climbing-route" style={{marginBottom:14,scrollMarginTop:"80px"}}><Capped><ClimbingRouteTable route={route} onEdit={()=>{openFix("climbingRoute");}}/></Capped>{route.pitchDetail&&route.pitchDetail.length?<BreakdownHandoff route={route}/>:null}</div>:(!isPitched(route)&&route.discipline!=="bouldering"?<EmptySection title="CLIMBING ROUTE" what="No climbing route breakdown" why="Nothing describes the climbing section by section — where it steepens, where it gets exposed, where the crux is." cta="Describe the climbing" onFix={()=>{openFix("climbingRoute");}}/>:null)}
{route.discipline!=="bouldering"&&route.pitchDetail&&route.pitchDetail.length?<Capped><RouteBreakdown route={route} logged={logged} comments={comments} commentsUnavailable={commentsUnavailable} onCommentAdd={commentApi.canPost===false?null:commentApi.onAdd}dbPhotos={dbPhotos} onAddPitchPhoto={onAddPhotos?function(files,n){return onAddPhotos(files,files.map(function(){return "";}),n);}:null} onEdit={(pIdx)=>{setFixFocusPitch(typeof pIdx==="number"?pIdx:null);openFix("pitchDetail");}}/></Capped>:(gapPitches(route)?<EmptySection title="ROUTE BREAKDOWN" what="No pitch-by-pitch breakdown" why={route.pitches+" pitches are listed, but none of them are described — no per-pitch grades, belays or crux."} cta="Add the pitches" onFix={()=>{openFix("pitchDetail");}}/>:(isPitched(route)&&!cragOnly&&!(route.pitches>0)?<EmptySection title="ROUTE BREAKDOWN" what="No pitch-by-pitch breakdown" why="Nothing records how many pitches this climbs or what each one asks of you." cta="Add the pitches" onFix={()=>{openFix("pitchDetail");}}/>:null))}
{(route.descent||route.descentText)?<div style={{marginBottom:ROUTE_GAP}}><SL action={<EditIconButton onClick={()=>{openFix("descentText");}} title="Edit descent information"/>}>DESCENT</SL><Capped><DescentLegStrip route={route} calc={calcInputs}/></Capped><Capped>{[["Descent",descentBeta(route)]].filter(x=>x[1]).map(x=><div key={x[0]} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:5}}>{x[0]}</div>{splitParagraphs(x[1]).map((p,i)=><p key={i} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:i===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}</div>)}</Capped></div>:(route.discipline==="bouldering"?null:<><DescentLegStrip route={route} calc={calcInputs}/><EmptySection title="DESCENT" what="No descent recorded" why="Nothing says how you get off this route — and on many climbs the way down is the committing part." cta="Describe the descent" onFix={()=>{openFix("descentText");}}/></>)}{/* The rappel table and its prose/count summary, immediately after the descent they belong
    to. Both were on Overview; keeping them adjacent is what matters — see the note where
    they used to sit. */}
{(function(){
  /* What climbers who logged it said about the rappels. Shown UNDER the catalog's own
     account and never in place of its headline count. Shown even where the catalog says
     there are no rappels: a party that rapped is evidence the catalog should hear. */
  const crep=rappelReportsOf(activity);
  const crepCard=crep?<div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`,marginTop:8}}><div style={{...SUB_LABEL,marginBottom:4}}>{"CLIMBERS REPORTED · "+crep.n+(crep.n===1?" report":" reports")}</div><div style={{fontSize:12.5,color:C.text,lineHeight:1.6}}>{[(crep.min===crep.max?crep.min:(crep.count.value+" most often ("+crep.min+"–"+crep.max+")"))+" rappel"+(crep.min===crep.max&&crep.min===1?"":"s"),crep.longestM?"longest "+uLenN(crep.longestM)+" "+uLenUnit():null,crep.rope?crep.rope.value+(crep.rope.n>1?" ("+crep.rope.n+")":""):null].filter(Boolean).join(" · ")}</div>{crep.latest?<div style={{fontSize:11.5,color:isRecent(crep.latest)?C.textMuted:C.amber,marginTop:3}}>{"latest "+ago(crep.latest)}</div>:null}</div>:null;
  if(rappelsAreNone(route))return crepCard?<div style={{marginBottom:ROUTE_GAP}}><SL>RAPPELS</SL>{crepCard}</div>:null;
  const hasTable=!!(route.rappelDetail&&route.rappelDetail.length);
  const note=rappelNoteText(route);
  const heading=rappelHeadingCount(route);
  /* 245 routes store the summary as a bare digit and have no table. Printing that digit as
     the body under a heading that already says "3 rappels" gives a box whose whole content is
     "3" — the same emptiness the walk-offs had, one step along. Say what is missing instead. */
  const noteIsJustCount=!!note&&/^~?\s*\d+(?:\s*[-–]\s*\d+)?\s*x?$/.test(String(note).trim());
  const prose=(note&&!noteIsJustCount)?note:null;
  const openEdit=function(){openFix("rap");};
  /* EMPTY IS A PLACEHOLDER, NOT AN ABSENCE — but only where rappelling is a question the route can
     have: not a boulder problem, not a walk-up, and not a single-pitch crag line (it lowers off). */
  if(!hasTable&&!heading&&!prose&&!crepCard)return (route.discipline!=="bouldering"&&!["scrambling","hiking","scramble","hike"].includes(route.discipline)&&(!cragOnly||pitchCountOf(route)>1))?<EmptySection title="RAPPELS" what="No rappel information" why="Nothing says whether you rappel off this, how many raps, or how long a rope they need." cta="Add the rappels" onFix={openEdit}/>:null;
  return <div style={{marginBottom:12}}>
    {hasTable?<Capped><RappelTable route={route} onEdit={openEdit}/></Capped>:<>
      <SL action={<EditIconButton onClick={openEdit} title="Edit rappel information"/>}>{"RAPPELS"+(heading?" · "+heading:"")}</SL>
      <div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.7}}>{prose||"No per-rappel breakdown on file yet — the anchors, individual lengths and rope requirement are unrecorded."}</div></div>
    </>}
    {(hasTable&&note)?<div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`,marginTop:ROUTE_GAP}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.7}}>{note}</div></div>:null}
    {crepCard}
  </div>;
})()}{!cragOnly?<div style={{marginBottom:ROUTE_GAP}}><Capped><ItineraryView route={route} activity={activity} seasonOnConditions={!!(condTab&&condPanels)} onSeeSeason={()=>{if(condTab&&condPanels)setTab("forecast");setTimeout(()=>{if(typeof document!=="undefined"){var el=document.getElementById("seasonal-guidance");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}} onContribute={()=>{openFix("itinerary");}} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){var el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}} myItin={myItin} onSaveMyItin={onSaveMyItin} crewsForRoute={crewsForRoute} onShareItinToCrew={onShareItinToCrew} notify={notify}/></Capped></div>:null}{/* CLIMATE & SEASON lives on the Conditions (`forecast`) tab (owner note 2026-10-24), after the
    forecast: it is the weather a climber should EXPECT, read beside the weather coming. It sat here
    on Plan (and on a crag's Overview) since #2049; it renders here now only for a discipline with
    no Conditions tab, so no route loses it. */}{condTab?null:climateEl}{!cragOnly?<Capped><TripProfileCard route={route} calc={calcInputs}/></Capped>:null}{!cragOnly?<Calculator route={route} activity={activity} calc={calcInputs} onCalc={setCalcInputs}/>:null}{/* CAMPING & BIVY, moved off the Safety tab (see the note on the safety line). It sits directly
    after the time estimate because the two answer one question together — how long this takes,
    and where you stop if it takes longer. SCRAMBLING is in the gate: it was the one discipline
    excluded before, and a scramble that overruns benights a party exactly like an alpine route.
    Gated on campingGate(), which is catOf() PLUS "trad is alpine when it climbs a peak" — catOf()
    folds `rock` into trad/sport first, and a big alpine rock route carries `trad` by convention here. */}{campingGate(route)?<CampingPanel route={route} calc={calcInputs} activity={activity} onEdit={()=>{openFix("bivy");}}/>:null}{<><SL action={<EditIconButton onClick={()=>{openFix("waypoints");}} title={cragOnly?"Edit the parking pin":"Edit waypoints and route information"}/>}>{cragOnly?"CRAG MAP":"ROUTE TRACK"}</SL><div style={{marginBottom:12}}>{/* A crag climb summits nothing, so its map is not a route track: it shows WHERE the crag is and where to park, plus the walk in from parking to the base (on to this climb's start when it sits apart from the main wall) once someone shares one. The climb itself is never drawn. The parking pin lives in CragLocationCard below. */}{cragOnly?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{(route.gpxPts&&route.gpxPts.length)?"Where the crag is and where to park. The line is the walk in from parking to the base of the crag, on to this climb's start if it sits away from the main wall — not the climb itself.":"Where the crag is and where to park. This is a location map, not a track of the climb."}</div>:null}{(function(){var _cov=trackCoverage(route.gpxPts,route.waypoints);return _cov?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:8}}>{trackCoverageCaveat(_cov,_gapDist)}</div>:null;})()}{(function(){var _stub=trackStubCaveat(route.gpxPts,route.waypoints,_shortDist);return _stub?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:8}}>{_stub}</div>:null;})()}{railEl?null:<div ref={mapWrapRef}>{_routeMap}{_mapOffline}{_tracksPanel}</div>}{cragOnly?<Capped><CragLocationCard route={route} mtn={mtn} onEditParking={()=>{openFix("waypoints");}}/></Capped>:null}{/* BASE OF THE CLIMB sits directly under the map that draws its spots: it used to be far down Overview, away from the one picture that shows where the start is. */}{cragOnly?<div style={{marginTop:ROUTE_GAP}}>{cragFactsEl("location")}</div>:null}<BaseCheckinPanel route={route} who={who} spots={baseSpots} q={baseQ}/>{cragOnly&&USE_DB&&catOf(route)!=="bouldering"?<div style={{marginTop:ROUTE_GAP}}><WallNeighbours rows={cragSibs} routeId={route.id} onOpen={onOpenRoute}/></div>:null}{cragOnly&&USE_DB&&catOf(route)==="bouldering"?<div style={{marginTop:ROUTE_GAP}}><BoulderNeighbours rows={cragSibs} routeId={route.id} areaName={mtn.name==="this area"?null:mtn.name} onOpen={onOpenRoute}/></div>:null}{((route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced))?<div style={{marginTop:ROUTE_GAP}}><button onClick={()=>gpxDownload(route)} style={{...BTN,width:"100%",background:C.blueBg,color:"#fff",border:`1px solid ${C.blueDim}`}}>{(route.gpxPts&&route.gpxPts.length)?"Download GPX":(cragOnly?"Download GPX (pins only)":"Download GPX (waypoints only)")}</button></div>:null}{gapTrack(route)?(cragOnly?<GapNote mt={10} what="No trail to the crag yet" why="Nobody has shared the walk in from parking. Know the way? Trace it on the map from the parking to the crag, or add a recording from your phone or watch, and the next party finds the crag first time." cta="Add the trail" onFix={()=>setShowGpsModal(true)}/>:<GapNote mt={10} what="No recorded GPS track" why="There is no line on this map to follow — just the waypoints, if any were added. Recorded a GPX up here?" cta="Submit a track" onFix={()=>setShowGpsModal(true)}/>):null}<div style={{marginTop:14}}><SL>Recent tracks & trip reports</SL><div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 9px",lineHeight:1.5}}>{cragOnly?"Walk-ins other parties recorded, plus recent trip reports — trails get rerouted and closed, so check a recent one.":"Recorded lines other parties walked, plus recent trip reports — conditions and detours shift with the season, so check a recent one."}</div>{(function(){var ctSeed=(route.communityTracks||[]);var actTracks=(activity||[]).filter(function(a){return a&&a.date;}).map(function(a){return {who:a.user,avatar:a.avatar,date:a.date,note:"Trip report — no recorded track.",report:a.text};});var seenT={},ct=[];ctSeed.concat(actTracks).forEach(function(t){var kk=(t.who||"")+"|"+(t.date||"");if(!seenT[kk]){seenT[kk]=1;ct.push(t);}});ct.sort(function(a,b){return (b.date||"").localeCompare(a.date||"");});if(!ct.length)return <div style={{fontSize:12.5,color:C.textSub,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}>No recent tracks or trip reports yet — share one after you climb it.</div>;var shown=trackHistOpen?ct:ct.slice(0,2);var older=ct.length-2;return <div>{shown.map(function(t,i){var op=trackOpen===i;var season=t.season||seasonName(t.date);var sc=({Winter:C.blue,Spring:C.green,Summer:C.amber,Fall:C.orange})[season]||C.textSub;return <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:ROUTE_GAP,overflow:"hidden"}}><div {...clickable(function(){setTrackOpen(op?null:i);})} aria-expanded={op} style={{minHeight:44,boxSizing:"border-box",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}}><Av src={t.avatar} size={30}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.who||"A climber"}</div>{/* The date lives on the second line. Sharing the name's one-line ellipsis, it was the part cut first: at 360px "Nathan Barber · Jun 20, 2026" needed 186px of 169, so what tells two recordings apart went missing. */}<div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{[t.date?shortDate(t.date):"",t.note].filter(Boolean).join(" · ")}</div></div><span style={{flexShrink:0,fontSize:11,fontWeight:700,color:sc,background:sc+"22",border:`1px solid ${sc}55`,borderRadius:20,padding:"2px 8px"}}>{season}</span><span style={{marginLeft:6,display:"flex"}}><Chevron open={op} size={15} color={C.textMuted}/></span></div>{op?<div style={{borderTop:`1px solid ${C.borderLight}`,padding:"9px 12px"}}>{t.report?<div style={{fontSize:12.5,color:C.text,lineHeight:1.55,fontStyle:"italic",marginBottom:9}}>{"“"+t.report+"”"}</div>:null}{((t.gpxPts&&t.gpxPts.length)||(route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced))?<button onClick={function(){var hasOwn=t.gpxPts&&t.gpxPts.length;gpxDownload(route,hasOwn?t.gpxPts:null,route.name+(t.who?" — "+t.who:"")+(t.date?" "+t.date:""));}} style={{...BTN,width:"100%",border:`1px solid ${C.blueDim}`,background:C.blueBg,color:"#fff"}}>{(t.gpxPts&&t.gpxPts.length)?"Download this track (GPX)":"Download standard route line (GPX)"}</button>:null}{!(t.gpxPts&&t.gpxPts.length)?<div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"No recorded path from "+(t.who||"this climber")+(((route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced))?" — this downloads the route’s standard line, not their exact track.":".")}</div>:null}</div>:null}</div>;})}{older>0?<button onClick={function(){setTrackHistOpen(function(v){return !v;});}} style={{...BTN,width:"100%",border:"1px solid "+C.border,background:C.surface,color:C.blue}}>{trackHistOpen?"Show fewer":"See "+older+" older track"+(older!==1?"s":"")+" from past trips"}</button>:null}</div>;})()}</div>{(function(){var _nav=navTarget(route,mtn);if(!_nav)return null;var _row={display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`};var _go={fontSize:12,color:C.blue,fontWeight:600,textDecoration:"none"};return <div style={{marginTop:12,background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:6}}>OPEN IN NAVIGATION APP</CardHead>{navLinks(_nav,(mtn&&mtn.name)||route.name).map(function(a){return a.app?<div key={a.n} style={_row}><span style={{fontSize:13,color:C.textSub}}>{a.n}</span><span style={{display:"flex",alignItems:"center",gap:12}}><a href={a.href} target="_blank" rel="noreferrer" aria-label={a.n+" web map, at this climb"} style={{..._go,color:C.textMuted,fontWeight:500}}>Web map</a><a href={a.app} aria-label={"Open this climb in the "+a.n+" app"} style={_go}>Open app →</a></span></div>:<a key={a.n} href={a.href} target="_blank" rel="noreferrer" aria-label={"Open this climb in "+a.n} style={{..._row,textDecoration:"none"}}><span style={{fontSize:13,color:C.textSub}}>{a.n}</span><span style={_go}>Open →</span></a>;})}</div>;})()}</div></>}{noWaypoints?null:<div style={{marginTop:12}}><SL action={<EditIconButton onClick={()=>{openFix("waypoints");}} title="Edit waypoints"/>}>WAYPOINTS</SL>{(function(){var _wpCav=waypointCaveat(route.id,route.waypoints);return _wpCav?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{_wpCav}</div>:null;})()}{<Capped><WaypointList waypoints={route.waypoints} onFocus={focusWaypoint} emptyCopy={cragOnly?"No named waypoints yet — add the parking/approach point (and anchor, if useful) to help other climbers find this crag.":"No named waypoints yet — the track above is a raw GPS line with no key points marked. Add the trailhead, camps, junctions and summit to unlock a turn-by-turn list here and per-point weather forecasts on the Safety tab."} onAdd={function(){openFix("waypoints");}}/></Capped>}</div>}{!CRAG_CATS.includes(catOf(route))?<RouteGearCheck route={route} activity={activity} afterRack={gearUpdateBox} rack={routeRackFor(route)||(rackRows(route).length?[]:(DISC_RACK[catOf(route)]||[]))} rackGeneric={!routeRackFor(route)&&!rackRows(route).length} essentials={route.whatToBring} onEditEssentials={function(){openFix("whatToBring");}} onEditRopeNote={function(){openFix("ropeNote");}} onEditRack={cur=>{setFixPrefill(cur?{rack:{note:cur}}:null);openFix("rack");}} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){var el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}}/>:null}</div>;
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
      <div style={{position:"relative",zIndex:2,marginTop:14,padding:"0 3px",...(deskWide?{gridColumn:1,gridRow:2}:null)}}><div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>{route.classic?<Pill label="★ Classic" color={C.amber} bg={C.amberBg} sm/>:null}<Pill icon={<DiscIcon d={catOf(route)} size={12} color={dc.color}/>} label={dc.label} color={dc.color} bg={dc.bg} sm/>{gradeLabel(route)?<Pill label={gradeLabel(route)} color={C.amber} bg={C.amberBg} sm/>:null}</div><div style={{color:"rgba(255,255,255,0.9)",fontSize:13,fontWeight:700,textShadow:"0 1px 4px rgba(0,0,0,0.8)",overflowWrap:"anywhere"}}>{<Lbl s={"📍 "+mtn.name}/>}</div><h1 title={route.name} style={{color:"white",fontSize:(route.name||"").length>52?17.5:(route.name||"").length>34?20.5:25,fontWeight:800,letterSpacing:-0.4,lineHeight:1.14,margin:"3px 0 0",textShadow:"0 2px 9px rgba(0,0,0,0.68)",overflowWrap:"anywhere"}}>{route.name}</h1><div style={{color:"rgba(255,255,255,0.8)",fontSize:12.5,fontWeight:600,marginTop:5,paddingRight:deskWide?0:215,minHeight:30,textShadow:"0 1px 4px rgba(0,0,0,0.7)",lineHeight:1.35,display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:2,overflow:"hidden"}}>{strapTrim(route.discipline==="bouldering"?((route.rockType?route.rockType+" · ":"")+seasonShort(route.season)):((mtn.elevation!=null?uElev(mtn.elevation)+" · ":"")+(route.pitches>0?(route.pitches+"p · "):"")+(cragOnly?seasonShort(route.season):(seasonShort(route.season)||"Season TBD"))))}</div></div>
      {deskWide?<div style={{gridColumn:2,gridRow:"2 / span 2",minHeight:200,borderRadius:14,overflow:"hidden",position:"relative",border:"1px "+(_hero?"solid ":"dashed ")+C.border,background:C.surface}}>{_hero?<button onClick={function(){setTab("photos");}} aria-label={"See all "+_photoN+" photo"+(_photoN===1?"":"s")} style={{position:"absolute",inset:0,width:"100%",height:"100%",padding:0,border:"none",background:"none",cursor:"pointer"}}><img src={_hero.url} alt={_hero.alt||route.name} onError={onImgErr(FALLBACK_COVER)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/><span style={{position:"absolute",right:10,bottom:10,background:"rgba(13,17,23,0.8)",color:C.text,fontSize:12,fontWeight:700,borderRadius:9,padding:"5px 9px",border:"1px solid "+C.border}}>{_photoN>1?"See all "+_photoN+" photos":"See photo"}</span></button>:photosUnavailable?<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:18,textAlign:"center"}}><div style={{fontSize:13.5,fontWeight:700,color:C.amber}}>Photos aren’t reachable right now</div><div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45}}>Check your connection — this climb may already have some.</div></div>:<div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,padding:18,textAlign:"center"}}><div aria-hidden="true" style={{display:"flex"}}><ActionIcon name="camera" size={28} color={C.blue}/></div><div style={{fontSize:14.5,fontWeight:800,color:C.text}}>Add the first photo</div><div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.45,maxWidth:230}}>Show other climbers what this climb looks like.</div><button onClick={function(){setQuickPhotoOpen(true);}} style={{marginTop:4,padding:"9px 14px",borderRadius:10,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Add photo</button></div>}</div>:null}
    </div>
    {(()=>{const _hd=headlineDist(route);const cells=(route.discipline==="bouldering"?[["Grade",gradeLabel(route),"amber",C.amber],["Approach",effDistKm(route),"textSub",C.textSub,_hd?_hd[0]:"Approach"],["Height",route.routeFt,"green",C.green],ratedN?["★",avgS,"amber",C.amber,"★ "+ratedN+" vote"+(ratedN===1?"":"s")]:null,["Reports",activity.length,"blue",C.blue]]:[["Grade",gradeLabel(route),"amber",C.amber],cragOnly?null:["Dist",effDistKm(route),"textSub",C.textSub,_hd?_hd[0]:"Distance"],protOf(route)?null:["Gain",routeAscentFt(route),"green",C.green],ratedN?["★",avgS,"amber",C.amber,"★ "+ratedN+" vote"+(ratedN===1?"":"s")]:null,["Reports",activity.length,"blue",C.blue]]).filter(Boolean);return <div style={{display:"grid",gridTemplateColumns:"repeat("+cells.length+",1fr)",background:C.surface,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>{cells.map((x,xi)=>{const hasValue=(x[0]==="Grade"?!!gradeLabel(route):x[0]==="Approach"?!!_hd:x[0]==="Height"?route.routeFt!=null:x[0]==="★"?avgS!=null:x[0]==="Dist"?!!_hd:x[0]==="Gain"?routeAscentFt(route)!=null:x[0]==="Reports"?true:true);const val=(x[0]==="Grade"?gradeLabel(route):x[0]==="Approach"?_hd?uDist(_hd[1]):null:x[0]==="Height"?route.routeFt!=null?uElev(route.routeFt):null:x[0]==="★"?avgS?avgS.toFixed(1):null:x[0]==="Dist"?_hd?uDist(_hd[1]):null:x[0]==="Gain"?routeAscentFt(route)!=null?"↑"+uElev(routeAscentFt(route)):null:x[0]==="Reports"?activity.length:null);return <div key={x[0]} style={{padding:"7px 3px",textAlign:"center",borderRight:xi===cells.length-1?"none":`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:hasValue?x[3]:C.amber}}>{val==null||val===""?"—":val}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{x[4]||x[0]}</div></div>;})}</div>;})()}
    {/* The ‹ prev · Routes next door · next › strip under the header went (owner, 2026-10-21): NEXT DOOR (WallNeighbours, below BASE OF THE CLIMB) is the one place for the climbs either side on the wall. */}<div style={{position:"relative"}}><div ref={tabBarRef} style={{display:"flex",gap:5,background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 8px",overflowX:"auto",scrollPaddingInline:8,WebkitOverflowScrolling:"touch"}}>{[["overview","Overview"],["planner","Plan"],["forecast","Conditions"],["conditions",cragOnly?"Send Reports":"Reports"],["safety","Safety"],["partners","Partners"],["photos","Photos"]].filter(x=>x[0]==="planner"?showPlan:x[0]==="forecast"?(showScore||showAlpineCond):true).map(x=><button key={x[0]} onClick={e=>{setTab(x[0]);/* The six tabs are 399px of a bar that scrolls: 390px on a phone, 360 on a small one. Tapping Photos selected it and left its last 30px under the edge, so the tab you had just picked read "Pho". "nearest" moves the bar only as far as it must, and not at all when the tab is already in view; the page does not scroll. The bar's scrollPaddingInline keeps its 8px inset at whichever end the tab lands. */e.currentTarget.scrollIntoView({block:"nearest",inline:"nearest"});}} aria-current={tab===x[0]?"true":undefined} style={{flex:"1 0 auto",padding:"10px 8px",textAlign:"center",borderRadius:9,border:"1px solid "+(tab===x[0]?C.blue:C.border),background:tab===x[0]?C.blueBg:C.surface,color:tab===x[0]?"#fff":C.textSub,fontSize:11.5,fontWeight:tab===x[0]?"800":"600",cursor:"pointer",whiteSpace:"nowrap"}}>{x[1]}</button>)}</div>{[["l",-1,"‹","Scroll to earlier tabs"],["r",1,"›","Scroll to more tabs"]].filter(s=>tabEdge[s[0]]).map(s=><div key={s[0]} style={{position:"absolute",top:0,bottom:1,[s[0]==="l"?"left":"right"]:0,width:48,display:"flex",alignItems:"center",justifyContent:s[0]==="l"?"flex-start":"flex-end",padding:"0 4px",boxSizing:"border-box",background:"linear-gradient(to "+(s[0]==="l"?"left":"right")+",transparent,"+C.surface+" 58%)",pointerEvents:"none"}}><button onClick={()=>nudgeTabs(s[1])} aria-label={s[3]} title={s[3]} style={{pointerEvents:"auto",width:34,height:34,borderRadius:17,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:19,fontWeight:700,lineHeight:1,padding:0,paddingBottom:2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.35)"}}>{s[2]}</button></div>)}</div>
    <div ref={jumpsRef} style={{padding:"20px 14px 13px"}}><ApproachPicker route={route} opts={approachOpts} sel={approachKey} onSel={setApproachKey} sibs={_apSibs} sibsErr={approachSibsUnavailable} finishes={approachFinishes} showFinishes={tab==="overview"} onOpenRoute={onOpenRoute}/><SectionJumps rootRef={jumpsRef} tabKey={tab}/>
      {shareOpen?createPortal(<div onClick={()=>setShareOpen(false)} role="dialog" aria-modal="true" aria-label="Share this route" style={{position:"fixed",inset:0,background:C.scrim,zIndex:230,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",padding:"10px 18px 18px",maxHeight:"86vh",overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderBottom:"none",boxShadow:"0 -10px 44px rgba(0,0,0,0.55)"}}><div {...clickable(()=>setShareOpen(false))} title="Collapse" style={{width:42,height:5,borderRadius:3,background:C.border,margin:"0 auto 12px",cursor:"pointer"}}></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Share this route</div><button aria-label="Close share" onClick={()=>setShareOpen(false)} style={POP_CLOSE}>✕</button></div><div style={{fontSize:13,color:C.textSub,marginBottom:15}}>{route.name+" · "+route.grade+" · "+mtnOf(route)}</div><CardHead style={{marginBottom:8}}>Send to a friend in ClimbMatch</CardHead><div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 8px",lineHeight:1.45}}>It arrives in their Messages as a chat from you, with a link that opens this climb.</div>{(function(){var q=shareSearch.trim().toLowerCase();var conn=(connections||[]);var others=USE_DB?[]:CLIMBERS.filter(function(c){return c.id!==0&&!conn.some(function(f){return f.id===c.id;});});/* A live account is offered its real climbers only: seed climbers are not people it can share a climb with. */var pool=conn.concat(others);var matches=q?pool.filter(function(c){return ((realProfileId(c.id)?pubName(c):c.name)||"").toLowerCase().indexOf(q)>=0;}):pool;var real=((shareRes&&shareRes.data)||[]).filter(function(p){return p&&p.id&&String(p.id)!==String(who)&&!(blocked||[]).some(function(b){return String(b&&b.id)===String(p.id);})&&!matches.some(function(c){return String(c.id)===String(p.id);});}).map(function(p){return {id:p.id,name:p.name||"",username:p.username||"",showName:!!(p.show_name||p.showName),avatar:p.avatar||FALLBACK_AV,_profile:true};});matches=matches.concat(real);return <div style={{marginBottom:16}}><input aria-label="Search climbers by name" value={shareSearch} onChange={function(e){setShareSearch(e.target.value);}} placeholder="Search climbers by name" style={{width:"100%",padding:"9px 11px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13.5,boxSizing:"border-box",outline:"none"}}/>{matches.length?<div style={{maxHeight:236,overflowY:"auto",overscrollBehavior:"contain",marginTop:8}}>{matches.slice(0,40).map(function(c){var fr=conn.some(function(f){return f.id===c.id;});return <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0"}}><Av src={c.avatar} size={34}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(c._profile||realProfileId(c.id))?pubName(c):c.name}</div><div style={{fontSize:11.5,color:C.textMuted}}>{c._profile?"Climber on ClimbMatch":realProfileId(c.id)?(fr?"Partner":"Climber on ClimbMatch"):(fr?"Partner":"Climber")}</div></div><button onClick={function(){if(onShareRoute)onShareRoute(route,c);setShareOpen(false);setShareSearch("");}} style={{flexShrink:0,padding:"9px 15px",borderRadius:9,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Send</button></div>;})}</div>:<div style={{fontSize:12.5,color:C.textSub,marginTop:10,lineHeight:1.5}}>{q?(shareRes&&shareRes.isLoading&&_shareQ.length>=2?"Searching…":shareRes&&shareRes.error?"Couldn’t search climbers right now — check your connection and try again.":("No climbers match “"+shareSearch+"”.")):"Add friends to send climbs straight into their Messages — or send it another way below."}</div>}</div>;})()}<CardHead style={{marginBottom:6}}>Send another way</CardHead><div style={{fontSize:12,color:C.textMuted,marginBottom:8,lineHeight:1.45}}>The link opens this climb for anyone, with or without an account.</div><ShareVia title={route.name} text={route.name+" ("+gradeLabel(route)+") · "+mtnOf(route)+"\n"+shareLink} link={shareLink} onToast={notify}/><button onClick={function(){printSheet(route.name,routeSheetHtml(route,mtn.name,_crumbs.map(function(c){return c.name;})),notify);}} aria-label="Save this route as a PDF" style={{width:"100%",marginTop:12,minHeight:44,padding:"9px 12px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Save as PDF</button><div style={{fontSize:12,color:C.textMuted,marginTop:5,lineHeight:1.4}}>Opens in a new tab — close it, or tap ← Back to ClimbMatch on it, and you are back here.</div></div></div>,document.body):null}{drawOpen&&route?<DrawRouteView route={route} mtn={mtn} onClose={function(){setDrawOpen(false);}} onSuggest={function(p){setDrawOpen(false);setGpsInitPts(p);setShowGpsModal(true);}}/>:null}{showGpsModal&&route&&createPortal(<Suspense fallback={null}><GpsSubmissionModal initialPts={gpsInitPts} routeId={route.id} routeName={route.name} crag={cragOnly} parkAt={cragOnly?(()=>{const _t=trailheadPoint(route);return _t?{lat:Number(_t.lat),lng:Number(_t.lng)}:null;})():null} cragAt={cragOnly&&mtn&&mtn.lat!=null&&mtn.lng!=null&&mtn.lat!==""&&isFinite(Number(mtn.lat))&&isFinite(Number(mtn.lng))?{lat:Number(mtn.lat),lng:Number(mtn.lng)}:null} onClose={()=>{setShowGpsModal(false);setGpsInitPts(null);}} onSuccess={()=>{/* Deliberately does NOT close the modal. The modal sets showSuccess and calls onSuccess in the same tick, so unmounting here meant its success screen — quality score, review window, emailed-receipt line — could never paint. The user closes it with its own Done button, which calls onClose. */}} /></Suspense>,document.body)}{tab==="overview"?<div>{/* No fire panel here: its home is the Safety tab (see fireEl above), which
    every route now has. It did start on `conditions`, and that is worth not repeating — that tab is
    LABELLED "Reports" / "Send Reports", so a climber looking for hazards never opens it. Same trap
    as #655. */}
      {saved?<div style={{marginBottom:ROUTE_GAP}}><div className="cm-pop" style={{display:"flex",alignItems:"center",gap:9,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:11,padding:"7px 13px"}}><span style={{fontSize:13.5,fontWeight:700,color:C.green,flex:1}}>On your objectives</span><button onClick={()=>setTab("partners")} style={{...BTN,background:C.blueChip,color:C.onSolid,border:"none"}}>Find partners →</button></div></div>:null}<div style={{marginBottom:ROUTE_GAP}}>{logged?<div style={{fontSize:12.5,color:C.green,fontWeight:700,marginBottom:6}}>✓ In your logbook</div>:null}{logRow()}</div>{route.condWindow?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 14px",marginBottom:12}}><div style={{...SUB_LABEL,marginBottom:3}}>Conditions window</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{Array.isArray(route.condWindow)?route.condWindow.join(", "):route.condWindow}</div></div>:null}{(()=>{var vw=(presence&&presence.others)||0;var viewers=(presence&&presence.viewers)||[];var ey=[...OPEN_CREWS,...(dbCrews||[])].filter(function(oc){return oc.routeId===route.id&&oc.spots>0;}).length;var lists=popInterest(route)+(((savedCountQ.data||{})[route.id])||0);var asc=activity.length;var chips=[];if(ey)chips.push({n:ey,label:" crew"+(ey!==1?"s":"")+" eyeing"});if(asc)chips.push({n:climberN,label:" climber"+(climberN!==1?"s":"")+" logged it",reports:true});if(recentN)chips.push({n:recentN,label:" in the last "+RECENT_DAYS+" days",reports:true});if(lists>0)chips.push({n:lists,label:" list"+(lists!==1?"s":"")+" saved"});var _social=vw||viewers.length||chips.length;return <div style={{marginBottom:ROUTE_GAP}}>{/* Each pill is its own control. The strip itself used to be the button (to Partners), with the viewer avatars and the ascents chip as buttons INSIDE it -- controls nested in a control, which a screen reader cannot operate reliably (axe nested-interactive). */_social?<div className="cm-stagger" style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:7}}>{vw?<span {...clickable(()=>setTab("partners"))} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:20,padding:"4px 11px"}}><span style={{width:7,height:7,borderRadius:"50%",background:C.green,flexShrink:0,animation:"cm-pulse 2s infinite"}}/><span style={{fontSize:12,fontWeight:700,color:C.green}}><CountUp value={vw}/> viewing now</span></span>:null}{viewers.slice(0,4).map(function(vwr,i){/* A signed-in viewer opens THEIR OWN profile, by uid. It used to open a copy of the first example climber with the viewer's name pasted on -- their location, grades and disciplines -- under an id nothing could message. A signed-out viewer has no profile to open. */var _vid=realProfileId(vwr.id);return <span key={"v"+i} {...clickable(_vid?function(e){e.stopPropagation();onViewProfile&&onViewProfile({id:_vid,name:vwr.name||"Climber",avatar:vwr.avatar||FALLBACK_AV,_real:true});}:undefined)} title={(vwr.name||"A climber")+" is viewing this route now"+(_vid?" — tap to view their profile":"")} style={{cursor:_vid?"pointer":"default",display:"inline-flex"}}><Av src={vwr.avatar} size={22}/></span>;})}{chips.map(function(c,i){/* "N ascents logged" is about the trip reports, not partners — it opens them; the rest of the strip still goes to Partners. */return <span key={i} {...(c.reports?clickable(function(){setTab("conditions");setTimeout(function(){var el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});},60);}):clickable(()=>setTab("partners")))} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,color:C.textSub}}><b style={{color:C.text,fontWeight:800}}><CountUp value={c.n}/></b>{c.label}</span>;})}</div>:null}<RouteTagRow route={route}/></div>;})()}{cragOnly?techStatsEl:null}{/* MERGE NOTE: the card renders when there is a description OR "About this peak", because
    geology has no other home — PeakMetadataPanel stopped rendering it, so gating this card on
    the description alone would leave routes.peak_metadata.geology populated and displayed
    nowhere. The GapNote still fires on a missing DESCRIPTION specifically, which is a
    different claim from a missing peak blurb. */}
{(route.overview||route.desc||_peakGeo)?<SL>{(route.overview||route.desc)?"Route description":"About the peak"}</SL>:null}{(route.overview||route.desc||_peakGeo)?<Capped><div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:12}}>{(route.overview||route.desc)?splitParagraphs(route.overview||route.desc).map((p,i)=><p key={i} style={{fontSize:14,color:C.textSub,lineHeight:1.75,margin:i===0?"0 0 10px":"10px 0 0"}}>{p}</p>):null}{_peakGeo?<div style={{marginTop:(route.overview||route.desc)?12:0,paddingTop:(route.overview||route.desc)?12:0,borderTop:(route.overview||route.desc)?"1px solid "+C.borderLight:"none"}}><div style={{...SUB_LABEL,marginBottom:5}}>About this peak</div>{splitParagraphs(_peakGeo).map((p,i)=><p key={i} style={{fontSize:13.5,color:C.textSub,lineHeight:1.7,margin:i===0?"0":"9px 0 0"}}>{p}</p>)}</div>:null}</div></Capped>:null}
{/* This CTA sent the climber to `beta`, and the gap it reports is on `overview||desc` — so
    writing the description could never clear the note, however many people answered it. The
    card above reads overview||desc and BETA is a separate section further down the page, so
    the two are different claims; the fix is to open the field the card actually reads. */}
      {(route.overview||route.desc)?null:<GapNote what="No route description yet" why="Nobody has written up what this line actually climbs or how it goes." cta="Write the description" onFix={()=>{openFix("overview");}}/>}{route.face?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 14px",marginBottom:12}}><div style={{...SUB_LABEL,marginBottom:3}}>FACE / WHERE ON THE PEAK</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{route.face}</div></div>:null}{cragOnly?planBody():null}{/* The Protection/Anchor card lived here. It moved to Plan without the Anchor half (no
        `routes.anchor` column existed then), and was removed there on 2026-10-23: the RACK card says it all. */}{rkFlagged.length?<div {...clickable(()=>setTab("safety"))} style={{display:"flex",alignItems:"center",gap:9,background:C.amberBg,border:`1px solid ${C.amber}`,borderRadius:11,padding:"10px 13px",marginBottom:13,cursor:"pointer"}}><span style={{flexShrink:0}}><ActionIcon name="alert" size={17} color={C.amber}/></span><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:700,color:C.amber}}>Climbers are flagging hazards not in the official info</div><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:2}}>{rkFlagged.slice(0,3).map(h=>h.label+" ("+h.count+(h.count===1?" report)":" reports)")).join(", ")+" — tap to open Safety."}</div></div><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.amber}/></span></div>:null}
        {!cragOnly?techStatsEl:null}<VerifNote route={route}/>{_rdCx&&_rdCx.levels?<ConfidenceLegend/>:null}{route._dbAreaReadFailed&&!route._dbArea?<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.6,marginBottom:8}}>Couldn’t load this climb’s area — the peak, range and walk-in are missing until the connection returns.</div>:null}<Capped><PeakMetadataPanel route={enrichRoute(route)} C={C} ActionIcon={ActionIcon}/></Capped>{/* DATA CONFIDENCE (ProvenancePanel) and DATA QUALITY (DataQualityPanel, mounted from
        ClimbMatch.jsx) both sat on Overview and both answered "how complete/trusted is this
        route's data" — two boxes for one question, ahead of the route itself. Gaps are now
        reported only by the section that owns the missing field (GapNote), so the reader is
        told where to look instead of being told, twice, that there is somewhere to look. The "I'm at the base" check-in moved under the route map (BaseCheckinPanel). */}{cragOnly?<div style={{margin:ROUTE_GAP+"px 0"}}><CragRack route={route} activity={activity} facts={cragFactsEl("rack")} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){var el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}} onEditRack={function(cur,sec){setFixOpenSection(sec||"rack");setFixPrefill(cur&&(!sec||sec==="rack")?{rack:{note:cur}}:null);setFixOpen(true);}}/>{gearUpdateBox}</div>:null}{cragOnly?cragFactsEl("gear"):null}{cragOnly?cragFactsEl("cond"):null}
        {/* The per-discipline safety advice boxes were removed as too generic; nothing to render inline here. */}
        {(()=>{const tp=noWaypoints?null:typicalFor(route);if(!tp)return null;const rtags=new Set(activity.filter(a=>isRecent(a.date)).flatMap(a=>a.condTags||[]));const conf=(tp.patterns||[]).filter(pat=>{const st=patternStatus(pat.label,rtags);return st&&st.status==="confirmed";}).length;const diff=(tp.patterns||[]).filter(pat=>{const st=patternStatus(pat.label,rtags);return st&&st.status!=="confirmed";}).length;return <><SL>What to expect</SL><Capped><div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"13px 15px",marginBottom:ROUTE_GAP}}><CardHead style={{marginBottom:8}}>Typical conditions · the general picture</CardHead>{(conf||diff)?<div style={{display:"flex",alignItems:"center",gap:7,background:diff?C.amberBg:C.greenBg,border:`1px solid ${(diff?C.amber:C.green)}44`,borderRadius:9,padding:"7px 10px",marginBottom:10}}><span style={{fontSize:12,fontWeight:600,color:diff?C.amber:C.green}}>{((conf&&diff)?("Recent reports: "+conf+" confirmed · "+diff+" differ"):diff?("Recent reports differ from typical on "+diff+" point"+(diff!==1?"s":"")):("Recent reports back up the typical picture · "+conf+" confirmed"))+" ("+recentN+" report"+(recentN!==1?"s":"")+", last "+RECENT_DAYS+" days)"}</span></div>:null}{tp.summary?<div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:(tp.patterns&&tp.patterns.length)?9:0}}>{tp.summary}</div>:null}{(tp.patterns||[]).map((pat,i)=><div key={i} style={{display:"flex",gap:9,padding:"8px 0",borderTop:`1px solid ${C.borderLight}`}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{pat.label}{" "}{pat.when?<span style={{marginLeft:7,fontSize:12,fontWeight:700,color:C.onSolid,background:C.blueBg,padding:"1px 7px",borderRadius:6,whiteSpace:"nowrap"}}>{pat.when}</span>:null}</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.55}}>{pat.detail}</div>{(()=>{const st=patternStatus(pat.label,rtags);if(!st)return null;const good=st.status==="confirmed";const col=good?C.green:C.amber;const tg=(good?st.matched:(st.countered.length?st.countered:st.matched))||[];return <div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:5,padding:"2px 8px",borderRadius:8,background:good?C.greenBg:C.amberBg,border:`1px solid ${col}44`}}><span style={{fontSize:12,fontWeight:700,color:col}}>{good?"✓ Confirmed by recent reports":st.status==="mixed"?"± Mixed recent reports":"↔ Recent reports differ"}</span>{tg.length?<span style={{fontSize:12,color:C.textMuted}}>{"· "+tg.slice(0,2).join(", ")}</span>:null}</div>;})()}</div></div>)}<div {...clickable(()=>setTab("conditions"))} style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.border,fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>{/* `rtags` is the tag set from RECENT trip reports, and patternStatus returns null without it --
    so with no reports every pattern above is the generic discipline picture, and calling that
    "a consensus from recent trip reports" claimed a consensus that does not exist. On the route
    this was found on the page header read "0 Reports" a few hundred pixels above this line. */}
<Lbl s={reportsUnavailable?"Couldn’t load this route's trip reports, so what follows is the general picture for the discipline rather than this route's own conditions — try again in a moment":reportsPackedAt?("No signal — this reads the trip reports "+reportsSavedWith+" "+savedAgo(reportsPackedAt)+". Newer ones need a connection"):rtags.size?"This is a consensus from recent trip reports, not one person's edit — climbed it recently? Log a report to help keep it accurate":(activity.length?("No trip reports in the last "+RECENT_DAYS+" days, so this is the general picture for the discipline rather than current conditions — climbed it recently? Log a report to help keep it accurate"):"Nobody has logged a trip report here yet, so this is the general picture for the discipline rather than this route's own conditions — climb it and log one to start a real consensus")}/></div></div></Capped></>;})()}{cragOnly?null:(()=>{const cc=ovCC;const recent=[...(activity||[])].sort((x,y)=>(y.date||"").localeCompare(x.date||"")).slice(0,3);const confCol=cc?(cc.confidence==="high"?C.green:cc.confidence==="medium"?C.amber:C.red):C.textMuted;const mtn=MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{};const hz=cc&&cc.hazards&&cc.hazards.length?[...new Set(cc.hazards.flatMap(h=>h.tags))]:[];return <div style={{background:C.card,borderRadius:12,border:`1px solid ${hz.length?C.red+"55":C.border}`,padding:"13px 15px",marginBottom:ROUTE_GAP}}>{cc&&cc.clearedTags&&cc.clearedTags.length?<div style={{fontSize:11.5,color:C.green,fontWeight:700,marginBottom:10,lineHeight:1.4,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"7px 10px"}}>{"✓ Reported cleared: "+cc.clearedTags.map(function(t){var v=hzVoteFor(t);return v&&v.gone?t+" ("+v.gone+(v.gone===1?" climber said gone)":" climbers said gone)"):t;}).join(", ")}</div>:null}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><CardHead>Conditions & recent activity</CardHead><div style={{display:"flex",gap:5,alignItems:"center"}}>{cc&&cc.lastDate?(()=>{const dd=Math.floor((Date.now()-new Date(cc.lastDate).getTime())/86400000);const fr=dd<=14?["• Fresh",C.green]:dd<=60?["• Recent",C.amber]:["Stale",C.red];return <Pill label={fr[0]} color={fr[1]} bg={fr[1]+"22"} sm/>;})():null}{cc?<Pill label={`${cc.confidence} · ${cc.reportCount} report${cc.reportCount!==1?"s":""}`} color={confCol} bg={`${confCol}22`} sm/>:null}</div></div>{hz.length?<div style={{background:C.redBg,border:`1px solid ${C.red}55`,borderRadius:9,padding:"8px 11px",marginBottom:10}}><div style={{...SUB_LABEL,marginBottom:2,color:C.red}}>{"Hazards reported in the last "+RECENT_DAYS+" days"}</div><div style={{fontSize:12,color:C.textSub}}>{hz.slice(0,4).join(" · ")}</div></div>:null}{cc?<div style={{fontSize:12,color:C.textSub,marginBottom:recent.length?12:0}}><span style={{color:C.textMuted}}>{cc.recentCount?("In the last "+RECENT_DAYS+" days ("+cc.recentCount+" report"+(cc.recentCount!==1?"s":"")+"): "):"Latest reported: "}</span>{((cc.recentCount?cc.recentTags:cc.topTags)||[]).slice(0,3).map(t=>t.tag).join(" · ")||"—"}{cc.lastDate?<span style={{color:C.textMuted}}>{" · last report "+ago(cc.lastDate)}</span>:null}</div>:<div style={{fontSize:12,color:C.textMuted}}>{reportsUnavailable?"Couldn’t load this route's reports — try again in a moment.":"No reports yet — be the first to log this climb and tell others if it's in."}</div>}{recent.length?<div><CardHead style={{marginBottom:8}}>Recently climbed</CardHead>{recent.map((aa,i)=>{const summ=/summit/i.test(aa.tickType||"");const att=/attempt|bail|retreat|turn/i.test(aa.tickType||"");const _out=summ?"✓ Summited":att?"Attempt":aa.tickType;return <div key={i} aria-label={aa.user+", "+String(_out||"report").replace("✓ ","")+", "+ago(aa.date)} {...clickable(()=>onOpenReport&&onOpenReport(Object.assign({},aa,{route:route,mtn:mtn}))/* the WHOLE row, like the Reports tab below: this used to copy 11 named fields, so a report opened from here had no beta, no outcome, no itinerary, no sun or road note, no partner accounts and no _dbId -- no comments, no Report link, and no way to read the reporter's own track -- while the same report opened from Reports had all of it. */)} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderTop:i?`1px solid ${C.borderLight}`:"none",cursor:"pointer"}}><Av src={aa.avatar} size={28}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{aa.user}<span style={{marginLeft:7,fontSize:12,fontWeight:700,color:summ?C.green:att?C.amber:C.blue}}>{_out}</span></div><div style={{fontSize:12,color:C.textMuted}}>{ago(aa.date)+" · "+aa.date}</div></div><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></div>;})}</div>:null}<div {...clickable(()=>setTab("conditions"))} style={{marginTop:12,textAlign:"center",fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}>View all reports & conditions →</div></div>;})()}{(()=>{const ph=activity.flatMap(a=>(a.photos||[]).map(u=>({u,a})));if(!ph.length)return null;const nC=new Set(ph.map(x=>x.a.user)).size;return <div style={{marginBottom:ROUTE_GAP}}><SL action={<span style={{fontSize:12,color:C.textMuted}}>{ph.length} photo{ph.length!==1?"s":""} · {nC} climber{nC!==1?"s":""}</span>}>Photos from climbers</SL><PhotoRow items={ph.slice(0,12)}/></div>;})()}<div style={{marginTop:12}}/>
        <div style={{marginBottom:12}}><DiffRadar disc={catOf(route)} ratings={(diffRatings||{})[route.id]} onRate={onRateDifficulty?(axis,val)=>onRateDifficulty(route.id,axis,val):undefined} meta={diffMeta}/></div>
        
        <Capped><TopoSection route={route}/></Capped>{/* PITCH-BY-PITCH and all of the rappel information moved to the Plan tab, which is where
    the approach, the descent and the rack already live. They were kept together on Overview
    because splitting a route's descent across two tabs is worse than either placement
    (151 routes split it, and 585 with a summary and no table showed nothing here at all —
    scripts/oneoff/count-rappel-shapes.mjs). That constraint is unchanged; both halves simply
    moved to the same tab as the rest of the plan rather than away from it. */}
        {(gapGear(route)&&!cragOnly&&catOf(route)!=="bouldering"?<GapNote what="No gear or rack listed" why="Nothing says what to bring — rack sizes, draws, screws or anchor material are all unrecorded." cta="Add the rack" onFix={()=>{openFix("rack");}}/>:null)}
        {(()=>{const _allBeta=(Array.isArray(route.beta)?route.beta:[]).filter(b=>typeof b==="string"&&b.trim());/* A crag line's beta (how the moves go, where it rests) is its own BETA section however short each entry is; the 220-character split only sorts a long route's write-up from its one-line tips. */const _cragBeta=CRAG_CATS.includes(catOf(route));const longBeta=_allBeta.filter(b=>_cragBeta||b.length>=220);/* An empty crag BETA keeps its heading (owner note 2026-10-21: "add back the beta section"): with no beta on file the section vanished, which reads as the app having no place for it. Same rule as the other EmptySections (#2431). */if(!longBeta.length)return _cragBeta?<EmptySection title="BETA" what="No beta yet" why="Nothing says how the moves go, where the crux is or where to rest." cta="Add beta" editTitle="Add beta for this climb" onFix={function(){openFix("beta");}}/>:null;return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:ROUTE_GAP}}><div style={{marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><CardHead>BETA</CardHead></span>{/* The section-header ✎ Edit, as on KNOWN HAZARDS (#2592): a full-size Suggest a fix button outweighed the heading. */}<EditIconButton onClick={function(e){e.stopPropagation();openFix("beta");}} title="Suggest a fix to the beta"/></div>{longBeta.map(function(b,i){return <div key={"lb"+i}>{splitParagraphs(b).map(function(p,k){return <p key={k} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:k===0?"0":"8px 0 0"}}>{p}</p>;})}</div>;})}{(function(){/* BETA → THE CLIMB ITSELF (owner note 2026-10-22: "make the flow easier from that section to the climbing route"). BETA is prose on Overview; the same climb section by section — ROUTE BREAKDOWN, or CLIMBING ROUTE on an unpitched route — is on Plan (or further down Overview on a crag route, which has no Plan tab), with nothing between them. This opens it and scrolls to it, the way Mountain Project's topo ties its description to each pitch. It lands on CLIMBING ROUTE when one is written (since #2648 it comes first and hands off to the breakdown), else on ROUTE BREAKDOWN. Shown only when that section has rows: it never leads to an empty one. */var _bd=route.discipline==="bouldering"?null:((route.climbingRoute||[]).length?{id:"climbing-route",n:route.climbingRoute.length,name:"Climbing route"}:((route.pitchDetail&&route.pitchDetail.length)?{id:"route-breakdown",n:route.pitchDetail.length,name:"Route breakdown"}:null));if(!_bd)return null;return <button onClick={function(e){e.stopPropagation();if(showPlan)setTab("planner");setTimeout(function(){var el=document.getElementById(_bd.id);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start",behavior:"smooth"});},120);}} style={{...BTN,width:"100%",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,textAlign:"left"}}><span>{"Follow the climb section by section"}<span style={{display:"block",fontSize:11.5,fontWeight:500,color:C.textMuted,marginTop:2}}>{_bd.name+" · "+_bd.n+" section"+(_bd.n!==1?"s":"")+(showPlan?" · on the Plan tab":" · further down")}</span></span><span aria-hidden="true">→</span></button>;})()}</div>;})()}{(()=>{const shortBeta=CRAG_CATS.includes(catOf(route))?[]:(Array.isArray(route.beta)?route.beta:[]).filter(b=>typeof b==="string"&&b.length<220);const tips=shortBeta.concat(route.proTips||[]);if(!tips.length)return null;return <div style={{background:C.blueBg,borderRadius:10,padding:"10px 12px",marginBottom:ROUTE_GAP,border:`1px solid ${C.blueDim}`}}><div style={{marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><CardHead>PRO TIPS</CardHead><EditIconButton onClick={function(e){e.stopPropagation();openFix("beta");}} title="Suggest a fix to the pro tips"/></div>{tips.map((b,i)=><div key={"pt"+i} style={{fontSize:13,color:C.textSub,padding:"3px 0",lineHeight:1.5}}>• {b}</div>)}</div>;})()}{(()=>{/* What a climber BROUGHT (gearBeta) lives with the rack: RackBetaList, at the foot of RouteRackBox (alpine) and of CragRack (trad, sport, toprope, aid; not bouldering). Printing it here too made it two boxes for one fact. */const cb=activity.filter(a=>a.beta);if(!cb.length)return null;return <div style={{background:C.surface,borderRadius:10,padding:"11px 12px",marginBottom:8,border:"1px solid "+C.border}}><CardHead tone={C.green} style={{marginBottom:8}}>CLIMBER BETA <span style={{color:C.textMuted,fontWeight:500,textTransform:"none",letterSpacing:0}}>· from logged ascents</span></CardHead>{cb.map((a,i)=><div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderTop:i?"1px solid "+C.borderLight:"none"}}><Av src={a.avatar} size={26}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:11.5,color:C.textSub,marginBottom:2}}><b style={{color:C.text}}>{a.user}</b>{a.date?" · "+a.date:""}</div>{a.beta?<div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{a.beta}</div>:null}</div></div>)}</div>;})()}
{/* The `permits` / `permitUrl` pair used to render HERE, loose on Overview between the beta
    blocks and PAIRS WELL WITH, under no heading of any kind — a green banner with no label
    saying what it was, and on a route with permit text but no link, a bare 12px grey line
    with nothing to say it was about a permit at all. Meanwhile everything else about getting
    in past the gate — the permit name, the land manager, the pass, the closures, how to
    apply — sat in ACCESS & REGULATIONS on the PLAN tab, a tab away. Two permit surfaces on
    two different screens, one of them anonymous. It now renders inside that panel, beside
    the rest of what it is about. Do not put it back on Overview. */}
      {/* PAIRS WELL WITH links objectives into one trip — a second peak off the same camp. At a crag the climbs beside this one ARE the trip, and "More on" below already lists them, so crag routes (sport, trad, top-rope, aid, bouldering) do not get it (owner, 2026-10-14). */}{/* Crowds for a crag route (and sun and season when it has no Conditions tab), mounted by ClimbMatch.jsx; they come BEFORE "More on" so that list closes the page, right above Top contributors and the Discussion (owner, 2026-10-15). */}{cragOnly&&!condTab?condPanels:null}{cragPanels||null}{cragOnly?null:<Capped><PairsWellWith route={route} onOpenRoute={onOpenRoute} notify={notify}/></Capped>}{/* ROUTE STATS: page views, sends, logged climbs, objectives, the star breakdown and sends by month (0353, lib/RouteStats.jsx). Above the log buttons, so "More on" still closes the page. */}{USE_DB?<RouteStats routeId={route.id} cragOnly={cragOnly} onOpenPartners={function(){setTab("partners");}}/>:null}{/* 30px above, the section gap the "More on" rule keeps below: at 12px the buttons sat under ROUTE STATS' footnote and read as part of that box (owner note, 2026-10-29). */}<div style={{margin:"30px 0 "+ROUTE_GAP+"px"}}>{logRow()}</div>{(()=>{const sibs=cragSibs.filter(x=>x.id!==route.id);/* A crag is not a peak, and bouldering calls its lines PROBLEMS (owner, 2026-10-21). */const sibNoun=catOf(route)==="bouldering"?"problems":"routes";const sibWhere=!cragOnly?"on this peak":catOf(route)==="bouldering"?"in this area":"at this crag";return <div id={"sibs-"+route.id} style={{marginTop:30,paddingTop:16,borderTop:"2px solid "+C.borderHi}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}><div style={{fontSize:15,fontWeight:700}}>{(cragOnly?"More at ":"More on ")+mtn.name}</div>{sibs.length?<span style={{fontSize:11.5,color:C.textMuted}}>{(sibs.length+1)+" "+sibNoun}</span>:null}</div><div style={{fontSize:12,color:C.textSub,marginBottom:11,lineHeight:1.5}}>{sibs.length?(cragOnly?"Other "+sibNoun+" "+sibWhere+" — tap any to compare conditions and beta.":"Other established lines on this peak — tap any to compare conditions and beta."):sibsUnavailable?"Couldn’t load the other "+sibNoun+" "+sibWhere+" — this is not a claim that there are none. Check your connection and try again.":sibsPending?"Checking for other "+sibNoun+" "+sibWhere+"…":cragOnly?("The only "+sibNoun.replace(/s$/,"")+" catalogued at "+mtn.name+" so far. Add the others as climbers find them, and they will collect here."):("The only route catalogued on "+mtn.name+" so far. As climbers log ascents, every line on the peak — other routes, ridges and variations — will collect here under the mountain.")}</div>{(sibsExpand?sibs:sibs.slice(0,5)).map(sr=><div key={sr.id} {...clickable(()=>onOpenRoute&&onOpenRoute(sr))} style={{display:"flex",alignItems:"center",gap:11,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"9px 11px",marginBottom:ROUTE_GAP,cursor:"pointer"}}><div style={{width:40,height:40,borderRadius:8,overflow:"hidden",flexShrink:0}}><img loading="lazy" decoding="async" src={sr.cover} className="cover-x" alt="" onError={onImgErr(FALLBACK_COVER)} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700}}>{sr.name}</div><div style={{fontSize:11.5,color:C.textSub,display:"flex",alignItems:"center",gap:4}}><DiscIcon d={catOf(sr)} size={11}/>{((CAT[catOf(sr)]||{}).label||catOf(sr))+(gradeLabel(sr)?" · "+gradeLabel(sr):"")}</div>{condRep(sr)?<div style={{fontSize:11,color:C.green,fontWeight:700,marginTop:1}}>{"✓ "+condRep(sr)+" report"+(condRep(sr)!==1?"s":"")}</div>:null}</div><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></div>)}{sibs.length>5?<button onClick={()=>setSibsExpand(x=>!x)} style={{...BTN,width:"100%",border:"1px solid "+C.border,background:C.surface,color:C.blue}}>{sibsExpand?"Show fewer":"Show all "+(sibs.length+1)+" routes"}</button>:null}</div>;})()}</div>:null}
      {tab==="forecast"&&showAlpineCond?<div><AlpineConditionsCard route={route} mtn={mtn} calc={calcInputs} activity={condActivity} reportsUnavailable={reportsUnavailable}/>{condPanels?<div style={{marginTop:ROUTE_GAP}}>{condPanels}</div>:null}<div style={{marginTop:ROUTE_GAP}}>{wxEl()}</div><div style={{marginTop:(route.climate||gapSeason(route))?ROUTE_GAP:0}}>{climateEl}</div></div>:null}{tab==="forecast"&&showScore?<div><ConditionsScoreCard route={route} mtn={mtn} onAddAspect={()=>{openFix("aspect");}}/>{condPanels?<div style={{marginTop:ROUTE_GAP}}>{condPanels}</div>:null}<div style={{marginTop:ROUTE_GAP}}>{wxEl()}</div><div style={{marginTop:(route.climate||gapSeason(route))?ROUTE_GAP:0}}>{climateEl}</div>{/* ROAD CONDITIONS closes the Conditions tab (owner, 2026-10-07): the rock, then the weather, then the drive in. */}<div style={{marginTop:ROUTE_GAP}}>{roadEl()}</div></div>:null}
      {tab==="conditions"?<div>{!logged?<div style={{marginBottom:ROUTE_GAP}}><button onClick={()=>onLog(route)} style={{...BTN,width:"100%",background:C.greenBg,color:C.green,border:"1px solid "+C.greenDim}}>✓ Log your ascent</button></div>:null}
        <Capped><BetaDiff route={route}/></Capped><Capped><ConsensusPanel route={route} activity={condActivity} hzVotes={hzVotes} onVote={onVoteHazard} reportsUnavailable={reportsUnavailable} starSum={starSum}/></Capped>{showScore?null:roadEl()}
        <div id="trip-reports-section"><SL action={<button onClick={()=>onLog&&onLog(route)} style={{...BTN_SM,flexShrink:0,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim}}>{cragOnly?"Log / send":<Lbl s={"Log / report"}/>}</button>}>{cragOnly?"Send Reports":"Trip Reports"}</SL></div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:11,lineHeight:1.5}}>{(activity.length?activity.length+" report"+(activity.length!==1?"s":"")+" from "+climberN+" climber"+(climberN!==1?"s":"")+(recentN?" · "+recentN+" in the last "+RECENT_DAYS+" days":"")+". ":"")+"These come straight from climbers logging their ascents — log yours and your conditions, beta & rating appear here automatically."}</div>{reportsPackedAt?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:10}}>{"No signal — these are the "+(tripQ.data.length)+" trip report"+(tripQ.data.length!==1?"s":"")+" "+reportsSavedWith+" "+savedAgo(reportsPackedAt)+". Newer ones need a connection."}</div>:null}
        {(activity&&activity.length)||reportsUnavailable||reportsPackedAt?null:<div style={{textAlign:"center",padding:"24px 16px",color:C.textMuted,fontSize:13}}>Add a trip report from your logbook — be the first to log this climb.</div>}
        {(activity||[]).map((a,i)=><div key={i} /* Hand TripReport the WHOLE row. This used to copy thirteen keys by hand, and TripReport
   renders nine more that were not on the list — beta, gearBeta, sunVote, sunNote, fa,
   developed, itinerary, outcomeReasons, outcomeNote. So the send beta and the rack beta a
   climber wrote were shown on the card's parent object, the modal was built to display them,
   and "View full trip report →" opened a report with all of it missing. A hand-copied
   allowlist between two components silently loses every field added to either side after it
   was written; spreading cannot. `route`/`mtn` come last so they cannot be shadowed by a
   same-named key on an activity row. */
{...clickable(()=>onOpenReport&&onOpenReport(Object.assign({},a,{route:route,mtn:MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{}})))} style={{background:C.card,borderRadius:10,padding:"11px 13px",marginBottom:ROUTE_GAP,border:`1px solid ${C.border}`,cursor:"pointer"}}><div style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:7}}><Av src={a.avatar} size={32}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:13,fontWeight:700}}>{a.user}</div><div style={{fontSize:11.5,color:C.textMuted}}>{(function(){/* A real reporter's level comes from their profile (realAuthor); an example one from the seed record. */var ra=realAuthor(a._authorId);if(ra)return [ra.level,ra.years!=null?ra.years+"y exp":null].filter(Boolean).join(" · ")||null;if(a._authorId)return null;var cl=seedAuthor(a.user);return cl&&cl.level?cl.level+(cl.years?" · "+cl.years+"y exp":""):null;})()}</div><div style={{fontSize:12,color:C.textMuted}}>{shortDate(a.date)}</div></div><div style={{textAlign:"right"}}><Stars n={a.stars}/><br/><Pill label={a.tickType} color={C.blue} bg={C.blueBg} sm/></div></div></div>{(a.outcomeReasons&&a.outcomeReasons.length)?<div style={{fontSize:11.5,color:C.amber,marginTop:2}}>{"Turned back: "+a.outcomeReasons.join(", ")+(a.outcomeNote?" — "+a.outcomeNote:"")}</div>:null}</div><ReportStats cond={a.cond}/><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{(a.condTags||[]).filter(t=>!isRoadTag(t)).map(t=><span key={t} style={{fontSize:12,color:C.teal,background:C.tealDim,padding:"2px 6px",borderRadius:5}}>{t}</span>)}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{renderMD(a.text)}</div><div style={{fontSize:12,color:C.blue,fontWeight:600,marginTop:8}}>View full trip report →</div></div>)}
      </div>:null}
      {tab==="photos"?(function(){/* Three sources, and the order is oldest-provenance first: photos carried by a trip report, then photos contributed to the route on their own (kind:'photo' rows, which arrive already saved), then anything added locally this session when signed out. */var shown=routePhotos.concat(dbPhotos||[]).concat(quickPhotos);return <div style={{padding:"0 0 4px"}}><SL first>{"Photos"+(shown.length?" · "+shown.length:"")}</SL><div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"8px 11px",marginBottom:ROUTE_GAP}}>{"Add photos of the route. Tap any photo to see it full size, like it, and talk about it — photos from climbers’ trip reports show up here too, and tapping one opens the report behind it. To draw a topo line or drop pitch and hazard markers, use the topo section on the Overview tab."}</div><button onClick={function(){setQuickPhotoOpen(true);}} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",marginBottom:9}}>{"+ Add photo"}</button>{photosUnavailable&&(dbPhotos||[]).some(function(p){return p._saved;})?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginBottom:8}}>{"No signal — showing the photos you saved on this device. Any others need a connection."}</div>:null}{shown.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{shown.map(function(ph,pi){var pKey=route.id+"__photo__"+(ph.url||pi);var pTc=(onAddTopo&&topoConsensus)?topoConsensus(pKey):null;return <div key={pi} {...clickable(function(){setPhotoLightbox({ph:ph,key:pKey});})} style={{position:"relative",paddingBottom:"100%",borderRadius:9,overflow:"hidden",background:C.card,cursor:"pointer"}}><MediaImg loading="lazy" decoding="async" thumb={180} src={ph.url} alt={photoAlt(ph&&ph.alt,(ph&&ph.caption)||("Photo "+(pi+1)+" of "+route.name))} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/>{pTc?<span title={pTc.canonical?"Has a topo line — draw and edit lines in the Overview tab's topo section":"No topo line yet — lines are drawn in the Overview tab's topo section"} style={{position:"absolute",right:4,top:4,width:22,height:22,borderRadius:"50%",background:pTc.canonical?C.blueSolid:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="target" size={13} color="#fff"/></span>:null}{ph.by?<div style={{position:"absolute",left:0,right:0,bottom:0,padding:"12px 6px 4px",background:"linear-gradient(transparent,rgba(0,0,0,0.72))",fontSize:12,color:C.onSolid,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ph.by.split(" ")[0]}</div>:null}</div>;})}</div>:<div style={{textAlign:"center",padding:"24px 16px",color:C.textMuted,fontSize:13}}>{/* TWO queries feed `shown` and either failing makes it incomplete, so both gate this one sentence -- `routePhotos` comes from the merged `activity`, whose DB half is useRouteTripReports, and `dbPhotos` from the contributions read. Combining them is right HERE for that reason and nowhere else; every other flag in this app keys on ONE query. Found by the guard rather than by reading: check:outage measured this screen as CHANGED / says-empty=YES / says-broken=no on the first run that walked it. */}{(photosUnavailable||reportsUnavailable)?"Couldn’t load this route’s photos — try again in a moment.":"No photos yet — be the first to add one."}</div>}</div>;})():null}
      {tab==="partners"?<div>
        {(()=>{/* Real crews too: this read the demo OPEN_CREWS only, so a crew a real climber opened on this route never appeared on the route's own page -- only in Partners -> Crews. */const rc=[...OPEN_CREWS,...(dbCrews||[])].filter(oc=>oc.routeId===route.id&&oc.spots>0);return rc.length?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 13px",marginBottom:12}}><CardHead style={{marginBottom:5}}>Crews on this climb</CardHead><div style={{fontSize:11.5,color:C.textMuted,marginBottom:10,lineHeight:1.5}}>Open crews forming for this route — request to join one.</div>{(crewsExpand?rc:rc.slice(0,3)).map(oc=>{const org=oc._org||CLIMBERS.find(c=>c.id===oc.organizer)||{name:"Climber",avatar:FALLBACK_AV};const req=(requested||[]).includes(oc.id);const sp=oc.spots;return <div key={oc.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:"1px solid "+C.borderHi,borderRadius:10,padding:"9px 11px",marginBottom:11}}><Av src={org.avatar||FALLBACK_AV} size={32}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{(oc._org?pubName(org):org.name.split(" ")[0])+"’s crew"}</div><div style={{fontSize:12,color:C.textMuted}}>{sp+" spot"+(sp!==1?"s":"")+" open"+(oc.date?" · "+new Date(oc.date+"T12:00").toLocaleDateString(DLOCALE,{month:"short",day:"numeric"}):"")}</div></div><button aria-pressed={req} title={req?"Tap to withdraw your request":undefined} onClick={()=>onRequestJoin&&onRequestJoin(oc.id,route.name)} style={{flexShrink:0,padding:"7px 12px",borderRadius:9,border:"1px solid "+(req?C.border:C.blueDim),background:req?C.surface:C.blueBg,color:req?C.textMuted:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{req?"✓ Requested · undo":"Request join"}</button></div>;})}{rc.length>3?<button onClick={()=>setCrewsExpand(v=>!v)} style={{width:"100%",padding:"8px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>{crewsExpand?"Show fewer":"Show all "+rc.length+" crews"}</button>:null}</div>:null;})()}{cragOnly?(function(){/* A CRAG route (0300): partners are the climbers listed at this crag, inside it, or across a wider area that contains it — found by AREA, never by this one route. The seed example cards are off here too. */var _an=mtn.name||"this crag";/* SESSIONS AT THIS CRAG (0302): open area crews bound to this route's crag, joinable from the route page like a route crew. */var _sess=[...OPEN_CREWS,...(dbCrews||[])].filter(function(oc){return !!oc.areaId&&oc.areaId===route.mountainId&&oc.spots>0;});return <div>{_sess.length?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 13px",marginBottom:12}}><CardHead style={{marginBottom:5}}>{"Sessions at "+_an}</CardHead><div style={{fontSize:11.5,color:C.textMuted,marginBottom:10,lineHeight:1.5}}>Open crews meeting at this crag — request to join one.</div>{_sess.slice(0,3).map(function(oc){var org=oc._org||CLIMBERS.find(function(c){return c.id===oc.organizer;})||{name:"Climber",avatar:FALLBACK_AV};var req=(requested||[]).includes(oc.id);var sp=oc.spots;return <div key={oc.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:"1px solid "+C.borderHi,borderRadius:10,padding:"9px 11px",marginBottom:11}}><Av src={org.avatar||FALLBACK_AV} size={32}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{(oc._org?pubName(org):String(org.name||"Climber").split(" ")[0])+"’s "+((CAT[oc.discipline]||{}).label||oc.discipline||"crag")+" session"}</div><div style={{fontSize:12,color:C.textMuted}}>{sp+" spot"+(sp!==1?"s":"")+" open"+(oc.date?" · "+new Date(oc.date+"T12:00").toLocaleDateString(DLOCALE,{month:"short",day:"numeric"}):"")}</div></div><button aria-pressed={req} title={req?"Tap to withdraw your request":undefined} onClick={()=>onRequestJoin&&onRequestJoin(oc.id,_an)} style={{flexShrink:0,padding:"7px 12px",borderRadius:9,border:"1px solid "+(req?C.border:C.blueDim),background:req?C.surface:C.blueBg,color:req?C.textMuted:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>{req?"✓ Requested · undo":"Request join"}</button></div>;})}</div>:null}<SL first={!_sess.length&&![...OPEN_CREWS,...(dbCrews||[])].some(oc=>oc.routeId===route.id&&oc.spots>0)}>{"Climbers at "+_an}</SL><div style={{background:C.blueBg,borderRadius:11,padding:"11px 13px",marginBottom:12,border:`1px solid ${C.blueDim}`}}><div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>Sport, trad, top-rope and bouldering partners list themselves at the crag, canyon or range — not one route. List yourself here and climbers searching the area can find you.</div></div>{(USE_DB&&who)?<div style={{marginBottom:12}}><div style={{display:"flex",gap:8,marginBottom:10}}><button onClick={()=>onListMe&&onListMe({areaId:route.mountainId,name:mtn.name||"",areaType:(route._dbArea||{}).areaType,disciplines:[catOf(route)]})} aria-pressed={_listedHere} style={{...BTN,flex:1,background:_listedHere?C.greenBg:C.blueBg,color:_listedHere?C.green:"#fff",border:"1px solid "+(_listedHere?C.green:C.blueDim)}}>{_listedHere?"Listed at "+_an+" ✓ · edit":"List me at "+_an}</button><button onClick={()=>onFindPartnersInArea&&onFindPartnersInArea({id:route.mountainId,name:mtn.name||"",areaType:(route._dbArea||{}).areaType})} style={{...BTN,flex:1,background:C.surface,color:C.textSub,border:"1px solid "+C.border}}>{"See all at "+_an}</button></div>{_raRes.isLoading?<div style={{fontSize:12,color:C.textMuted,padding:"6px 2px"}}>{"Finding climbers at "+_an+"…"}</div>:_raRes.error?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,padding:"6px 2px"}}>Couldn’t load the climbers listed here — check your connection and try again.</div>:areaPartners.length?<div>{areaPartners.map(function(p){var c={id:p.id,name:p.name||"Climber",avatar:p.avatar||"",username:p.username||"",showName:!!p.show_name,_real:true,objectiveIds:(_rpObj.data&&_rpObj.data[p.id])||[]};var fs=friendState(p.id);return <div key={p.id}><RealClimberRow p={p} objIds={_rpObj.data?_rpObj.data[p.id]:undefined} objErr={_rpObj.isError} onOpen={onViewProfile}/><div style={{display:"flex",gap:7,margin:"-2px 0 10px"}}><button onClick={()=>onConnect(c)} style={{...BTN,flex:1,background:(fs==="friends"||fs==="in")?C.greenChip:fs==="out"?C.surface:C.blueChip,color:(fs==="friends"||fs==="in")?C.green:fs==="out"?C.textMuted:"#fff",border:`1px solid ${fs==="out"?C.border:"transparent"}`}}>{fs==="friends"?"✓ Friends":fs==="out"?"Requested · undo":fs==="in"?"Accept":"+ Add friend"}</button></div></div>;})}<div style={{fontSize:11.5,color:C.textMuted,marginTop:2,lineHeight:1.5}}>{"Climbers listed at "+_an+", inside it, or across a wider area that contains it. Climbers appear here if they are listed — everyone is unless they turn it off."}</div></div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px"}}>{"Nobody is listed at "+_an+" yet — list yourself and climbers searching it can find you."}</div>}</div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px",marginBottom:12}}>Sign in to see who climbs here, and to list yourself.</div>}</div>;})():<><SL first={![...OPEN_CREWS,...(dbCrews||[])].some(oc=>oc.routeId===route.id&&oc.spots>0)}>Find a partner for this route</SL><div style={{background:C.blueBg,borderRadius:11,padding:"11px 13px",marginBottom:12,border:`1px solid ${C.blueDim}`}}><div style={{fontSize:12,color:C.textSub}}>These climbers marked this route as an objective. Connect to plan a trip together.</div></div></>}
        {(USE_DB&&who&&!cragOnly)?<div style={{marginBottom:12}}>{_rpRes.isLoading?<div style={{fontSize:12,color:C.textMuted,padding:"6px 2px"}}>Finding climbers who saved this route…</div>:_rpRes.error?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,padding:"6px 2px"}}>Couldn’t load the climbers who saved this route — check your connection and try again.</div>:realPartners.length?<div>{realPartners.map(function(p){/* The same two actions an example card offers. A real row could only be OPENED, so adding a climber who saved this route, or forming a crew with them, took a detour through their profile. connect() and onPlan() both handle a real (uuid) climber. */var c={id:p.id,name:p.name||"Climber",avatar:p.avatar||"",username:p.username||"",showName:!!p.show_name,_real:true,objectiveIds:(_rpObj.data&&_rpObj.data[p.id])||[]};var fs=friendState(p.id);return <div key={p.id}><RealClimberRow p={p} objIds={_rpObj.data?_rpObj.data[p.id]:undefined} objErr={_rpObj.isError} onOpen={onViewProfile}/><div style={{display:"flex",gap:7,margin:"-2px 0 10px"}}><button onClick={()=>onConnect(c)} style={{...BTN,flex:1,background:(fs==="friends"||fs==="in")?C.greenChip:fs==="out"?C.surface:C.blueChip,color:(fs==="friends"||fs==="in")?C.green:fs==="out"?C.textMuted:"#fff",border:`1px solid ${fs==="out"?C.border:"transparent"}`}}>{fs==="friends"?"✓ Friends":fs==="out"?"Requested · undo":fs==="in"?"Accept":"+ Add friend"}</button><button onClick={()=>onPlan(c)} style={{...BTN,flex:1,background:C.surface,color:C.amber,border:`1px solid ${C.amber}44`}}>Form crew</button></div></div>;})}<div style={{fontSize:11.5,color:C.textMuted,marginTop:2,lineHeight:1.5}}>{savedNote(realPartners.length)+"Climbers appear here if they are listed — everyone is unless they turn it off."}</div></div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px"}}>{"No listed climber has saved this route yet — save it yourself and climbers searching it can find you."+(savedNote(0)?" "+savedNote(0):"")}</div>}{partners.length?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,margin:"12px 0 8px"}}>Example profiles, to show how matching works — not real accounts.</div>:null}</div>:null}{(USE_DB&&!who&&!cragOnly)?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,padding:"6px 2px",marginBottom:12}}>Sign in to see the climbers who saved this route, and to add them.</div>:null}{partners.length===0?((USE_DB||cragOnly)?null:<EmptyState C={C} icon="partners">No partners listed yet for this route.</EmptyState>):(partnersExpand?partners:partners.slice(0,4)).map(c=>{const sc=compat(ME,c);return <div key={c.id} style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:ROUTE_GAP,border:`1px solid ${C.green}66`}}><div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}><Av src={c.avatar} size={46}/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{pubName(c)}</div><div style={{fontSize:12,color:C.textSub}}>{c.level}{c.hikingSpeedFtHr?" · "+uRate(c.hikingSpeedFtHr):""}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:700,color:sc>=70?C.green:C.blue}}>{sc}%</div><div style={{fontSize:12,color:C.textMuted}}>match</div></div></div><p style={{fontSize:13,color:C.textSub,lineHeight:1.5,margin:"0 0 9px",fontStyle:"italic"}}>"{c.bio}"</p><div style={{display:"flex",gap:7}}><button onClick={()=>onConnect(c)} style={{...BTN,flex:1,background:(friendState(c.id)==="friends"||friendState(c.id)==="in")?C.greenChip:friendState(c.id)==="out"?C.surface:C.blueChip,color:(friendState(c.id)==="friends"||friendState(c.id)==="in")?C.green:friendState(c.id)==="out"?C.textMuted:"#fff",border:`1px solid ${friendState(c.id)==="out"?C.border:"transparent"}`}}>{friendState(c.id)==="friends"?"✓ Friends":friendState(c.id)==="out"?"Requested · undo":friendState(c.id)==="in"?"Accept":"+ Add friend"}</button><button onClick={()=>onViewProfile(c)} style={{...BTN,flex:1,background:C.surface,color:C.textSub,border:`1px solid ${C.border}`}}>Full profile</button><button onClick={()=>onPlan(c)} style={{...BTN,flex:1,background:C.surface,color:C.amber,border:`1px solid ${C.amber}44`}}>Form crew</button></div></div>;})}{partners.length>4?<button onClick={()=>setPartnersExpand(v=>!v)} style={{...BTN,width:"100%",border:"1px solid "+C.border,background:C.surface,color:C.blue}}>{partnersExpand?"Show fewer":"See "+(partners.length-4)+" more partner"+(partners.length-4!==1?"s":"")}</button>:null}{onFindPartners?<button onClick={onFindPartners} style={{...BTN,width:"100%",marginTop:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid}}>{"Explore all partners in the finder ›"}</button>:null}
      </div>:null}
      {tab==="planner"?<>{planBody(true)}{condTab?null:condPanels}</>:null}
      {tab==="safety"?<div>{/* THE ORDER (owner, 2026-10-24: "Forecast should be at the top of safety tab … audit the ordering"): what decides the day first, then what can go wrong, then what you do about it — the order NPS climbing pages and trip-planning guides brief a party in. FORECAST, then ACTIVE FIRES (a dropdown), KNOWN HAZARDS, CELL COVERAGE, EMERGENCY & RESCUE (safetyPanels, mounted by ClimbMatch.jsx), and the FLOAT PLAN last, as a dropdown. The forecast is on Safety for EVERY route now, on top of the Conditions tab that also carries it: a climber who opens Safety to decide whether to go must not have to leave it for the weather. */}{wxEl()}{fireEl}{/* CAMPING & BIVY used to mount HERE, and moved to the Planner tab: where you sleep is a
    planning decision, not a hazard, and on Safety it sat behind a tab nobody opens for
    logistics. Its mount was silently lost once already — it lived on this exact dense line,
    main changed the same line, and the merge kept main's copy, leaving the panel defined and
    rendered NOWHERE. No guard catches that: check:dead-props sees props, not unmounted
    components, and the column was populated so a data check would have looked healthy too.
    The mount is now on the planner line beside <Calculator/>; if you touch either line,
    confirm CAMPING & BIVY still reaches the screen. */}<Capped><SafetyMatrix route={route} activity={activity} mountain={mtn} hzVotes={hzVotes} onVote={onVoteHazard} onEdit={openFix} onOpenHazards={(seed)=>{/* Hazards is a MULTI field, so its prefill is an ARRAY of strings. A bare string crashed the form (filledStr calls .join), and the KNOWN HAZARDS "✎ Suggest a fix" button passed its click EVENT here as the seed — the editor read event.indexOf and the whole route page fell over. Only a string seeds. */setFixPrefill(typeof seed==="string"&&seed.trim()?{haz:[seed.trim()]}:null);openFix("haz");}}/></Capped>{(()=>{const cm=rxOf(route.id).comms;/* Cell coverage is contributable (the `comms` field) and this was the only panel on the Safety tab with no way to correct what it says — every neighbour here has an EditIconButton. Coverage is also the one fact on this screen that changes with a carrier and a new tower rather than with the rock, so it is exactly the kind of thing the last party knows better than the catalog. */
        if(!cm)return route.comms?<div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5}}><CardHead>Cell / sat coverage</CardHead><EditIconButton onClick={()=>{openFix("comms");}} title="Edit cell / satellite coverage"/></div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{route.comms}</div></div>:<div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:5}}>Cell / sat coverage</CardHead><GapNote what="No coverage report yet" why="Nothing says whether a phone works here or if you need a satellite messenger." cta="Add coverage" onFix={()=>{openFix("comms");}}/></div>;const COV={none:{t:"No service",c:C.red,bg:C.redBg},spotty:{t:"Spotty signal",c:C.amber,bg:C.amberBg},good:{t:"Good signal",c:C.green,bg:C.greenBg}};return <div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:cm.note?5:0}}><CardHead>Cell coverage</CardHead><span style={{fontSize:11.5,fontWeight:700,color:(COV[cm.coverage]||COV.none).c,background:(COV[cm.coverage]||COV.none).bg,padding:"2px 8px",borderRadius:10}}>{(COV[cm.coverage]||COV.none).t}</span></div>{cm.note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{cm.note}</div>:null}</div>;})()}{safetyPanels}{(["alpine","mountaineering","ice","mixed"].includes(route.discipline)||(route.gainFt||0)>=3000||(route.routeFt||0)>=1000)?<FloatPlanFold coverage={(rxOf(route.id).comms||{}).coverage} onFile={onFloatPlan?function(){onFloatPlan(route);}:null}/>:null}</div>:null}
      {/* "Got beta?" closes the tabs whose content IS route facts a climber can edit — Overview,
    Plan and Safety — as the last thing above Top contributors and the Discussion (owner,
    2026-10-22: "move this to the bottom of relevant tabs … we don't need that box on trip
    report tabs"). It sat mid-Overview at the end of the beta cluster before that. It stays off
    Reports (trip reports are the climber's own, and that tab has its own Log / report button),
    Conditions (a forecast — "Missing gear/rack, length" read as being about the weather, owner
    2026-10-07), Partners and Photos. Crag routes have no Plan tab, so theirs closes Overview and Safety. */}{(tab==="overview"||tab==="planner"||tab==="safety")?betaCta:null}{photoLightbox?createPortal(<div onClick={function(){setPhotoLightbox(null);}} role="dialog" aria-modal="true" aria-label="Photo" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",overflowY:"auto",overscrollBehavior:"contain"}}><div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,width:"100%",maxWidth:520,borderRadius:"16px 16px 0 0",border:"1px solid "+C.border,borderBottom:"none",maxHeight:"92vh",overflowY:"auto",overscrollBehavior:"contain"}}><div style={{position:"sticky",top:0,background:C.bg,zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid "+C.border}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{"Photo"}</div><button aria-label="Close photo" onClick={function(){setPhotoLightbox(null);}} style={POP_CLOSE}>{"✕"}</button></div><div style={{position:"relative"}}><MediaImg loading="lazy" decoding="async" src={photoLightbox.ph.url} alt={photoAlt(photoLightbox.ph&&photoLightbox.ph.alt,(photoLightbox.ph&&photoLightbox.ph.caption)||("Photo of "+route.name))} style={{width:"100%",maxHeight:"50vh",objectFit:"contain",background:"#000"}} onError={onImgErr(FALLBACK_COVER)}/></div><div style={{padding:"12px 16px 20px"}}>{photoLightbox.ph.by?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:8}}>{"Photo by "+photoLightbox.ph.by}</div>:null}{(photoLightbox.ph._rowId||photoLightbox.ph._saved)&&/^https?:/.test(photoLightbox.ph.url||"")?<SaveOfflineChip key={photoLightbox.ph.url} entry={{url:photoLightbox.ph.url,kind:"photo",routeId:route.id,row:{url:photoLightbox.ph.url,alt:photoLightbox.ph.alt||null,by:photoLightbox.ph.by||null,avatar:photoLightbox.ph.avatar||null,date:photoLightbox.ph.date||null}}} style={{marginBottom:10}}/>:null}<div style={{display:"flex",gap:16,alignItems:"center",marginBottom:6}}><span {...clickable(function(){setPhotoLikes(function(p){var cur=p[photoLightbox.key]||{likedByMe:false,likes:0};var o={};Object.assign(o,p);o[photoLightbox.key]={likedByMe:!cur.likedByMe,likes:cur.likes+(cur.likedByMe?-1:1)};return o;});})} style={{fontSize:13,fontWeight:700,color:(photoLikes[photoLightbox.key]||{}).likedByMe?C.blue:C.textMuted,cursor:"pointer"}}>{(photoLikes[photoLightbox.key]||{}).likedByMe?"Liked":"Like"}</span>{(photoLikes[photoLightbox.key]||{}).likes?<span style={{fontSize:13,color:C.textMuted}}>{<Lbl s={"👍 "+(photoLikes[photoLightbox.key]||{}).likes}/>}</span>:null}{photoLightbox.ph.ascent&&onOpenReport?<span {...clickable(function(){onOpenReport(Object.assign({},photoLightbox.ph.ascent,{route:route,mtn:mtn}));setPhotoLightbox(null);})} style={{fontSize:13,fontWeight:700,color:C.blue,cursor:"pointer",marginLeft:"auto"}}>{"View full trip report →"}</span>:null}{(onRemovePhoto&&photoLightbox.ph._rowId&&(photoLightbox.ph._mine||canModeratePhotos))?<span {...clickable(function(){if(photoRemoving)return;var _ph=photoLightbox.ph;askConfirm(_ph._mine?{title:"Remove your photo?",body:"It is removed for everyone and cannot be undone.",confirmLabel:"Remove photo"}:{title:"Take down this photo"+(_ph.by?(" by "+_ph.by):"")+"?",body:"It is removed for everyone and cannot be undone.",confirmLabel:"Take down"}).then(function(ok){if(!ok)return;setPhotoRemoving(true);Promise.resolve(onRemovePhoto(_ph)).then(function(){setPhotoLightbox(null);}).finally(function(){setPhotoRemoving(false);});});})} style={{fontSize:13,fontWeight:700,color:C.red,cursor:"pointer",marginLeft:"auto",padding:"8px 10px"}}>{photoRemoving?"Removing…":(photoLightbox.ph._mine?"Remove":"Take down")}</span>:null}{(onReportPhoto&&photoLightbox.ph._rowId&&!photoLightbox.ph._mine)?<span {...clickable(function(){setPhotoReporting(function(v){return !v;});})} style={{fontSize:13,fontWeight:700,color:C.textMuted,cursor:"pointer",marginLeft:photoLightbox.ph._mine?"auto":14,padding:"8px 10px"}}>{photoReporting?"Cancel":"Report"}</span>:null}</div>{photoReporting?<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{[["not_this_route","Not this route"],["inappropriate","Inappropriate"],["not_their_photo","Not their photo"],["other","Something else"]].map(function(r){return <button key={r[0]} onClick={function(){setPhotoReporting(false);onReportPhoto(photoLightbox.ph,r[0]);}} style={{padding:"7px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{r[1]}</button>;})}</div>:null}<Comments blockedIds={(blocked||[]).map(function(b){return b.id;})} onBlock={onBlockClimber} targetId={photoLightbox.key} comments={comments||[]} onAdd={commentApi.onAdd} onViewProfile={onViewProfile} onEdit={commentApi.onEdit} onDelete={commentApi.onDelete} onLike={commentApi.onLike} onReply={commentApi.onReply} mentionCandidates={connections}/></div></div></div>,document.body):null}{quickPhotoOpen?createPortal(<div onClick={function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}} role="dialog" aria-modal="true" aria-label="Add a photo" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:410,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",border:"1px solid "+C.border,borderBottom:"none",padding:18,maxHeight:"88vh",overflowY:"auto",overscrollBehavior:"contain"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:16,fontWeight:700,color:C.text}}>Add a photo</div><button aria-label="Close photo picker" onClick={function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}} style={POP_CLOSE}>{"✕"}</button></div><div style={{fontSize:12,color:C.textMuted,marginBottom:12,lineHeight:1.5}}>Just the photo — no need to log a climb for this.{onAddPhotos?" It's shared with everyone who opens this route.":" You're signed out, so this stays on your device for this visit only — sign in to share a photo with other climbers."}</div><label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"22px 12px",borderRadius:11,border:"1px dashed "+C.border,background:C.surface,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:12}}>{<Lbl s={"📷 Choose from camera or library"}/>}<input type="file" accept="image/*" multiple className="cm-file-input" onChange={function(e){var files=Array.from(e.target.files||[]);/* keep the File beside its preview URL: a blob: URL is enough to SHOW a photo and useless for uploading one, and discarding the File here is why this sheet could only ever be local. */setQuickPhotoPick(files.map(function(f){return {url:URL.createObjectURL(f),file:f};}));}}/></label>{/* ONE box on this sheet: the picker. Each picked photo used to carry a second, "Describe this photo (optional)" text box under it, and the owner removed it as redundant (2026-10-24); what was picked shows as thumbnails, and the photo's alt falls back to its route like every route photo without one. */}{quickPhotoPick.length?<div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14}}>{quickPhotoPick.map(function(u,i){return <img key={i} loading="lazy" decoding="async" src={u.url} alt={"Selected photo "+(i+1)} style={{width:64,height:64,flexShrink:0,objectFit:"cover",borderRadius:8}}/>;})}</div>:null}{/* The confirm button exists ONLY once something has been picked. It used to render always, disabled, labelled "Choose photos to add" — a second button under the picker that instructed an action it could not perform, so the sheet read as two buttons with a broken one. Choosing is the label above; this is the confirm. */}{quickPhotoPick.length?<button disabled={photoBusy} onClick={function(){/* Two different promises, so two different code paths. With onAddPhotos the parent uploads and files a contributions row, and the photo comes BACK through the route's contributions — so it must NOT also be pushed into quickPhotos, or it renders twice. Without it we are signed out, the sheet has already said the photo stays on this device, and the local blob is all we can honestly offer. */if(onAddPhotos){setPhotoBusy(true);Promise.resolve(onAddPhotos(quickPhotoPick.map(function(u){return u.file;}),quickPhotoPick.map(function(u){return u.alt||"";}))).then(function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}).finally(function(){setPhotoBusy(false);});return;}setQuickPhotos(function(p){return p.concat(quickPhotoPick.map(function(u){return {url:u.url,alt:(u.alt||"").trim()||null,by:ME.name,avatar:ME.avatar,date:"just now"};}));});setQuickPhotoOpen(false);setQuickPhotoPick([]);}} style={{width:"100%",padding:12,background:photoBusy?C.surface:C.blueSolid,color:photoBusy?C.textMuted:C.onSolid,border:"none",borderRadius:11,fontSize:14.5,fontWeight:700,cursor:photoBusy?"default":"pointer"}}>{photoBusy?"Adding…":("Add "+quickPhotoPick.length+" photo"+(quickPhotoPick.length>1?"s":""))}</button>:null}</div></div>,document.body):null}{/* TOP CONTRIBUTORS used to render HERE, which put an area-level
      leaderboard at the foot of EVERY route sub-tab — including Partners, where it reads as
      "people to climb with", and above both the Emergency & rescue card and the Discussion,
      which ClimbMatch.jsx mounts AFTER this component. It now renders from there instead, as
      the last thing before each tab's Discussion, and only on the tabs where an area's
      contributors are relevant. Do not re-add it here: nothing in this file can sit below a
      sibling panel that is mounted outside it. */}

    </div>
  </div>;
}
const WX_CODE_LABEL={0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",56:"Freezing drizzle",57:"Freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Light rain showers",81:"Rain showers",82:"Heavy rain showers",85:"Snow showers",86:"Heavy snow showers",95:"Thunderstorms",96:"Thunderstorms",99:"Thunderstorms"};
const WX_COMPASS=["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
function degToCompass(deg){if(deg==null||isNaN(deg))return null;return WX_COMPASS[Math.round((((deg%360)+360)%360)/22.5)%16];}
function circMeanDeg(arr){if(!arr||!arr.length)return null;let sx=0,sy=0;arr.forEach(function(d){const r=d*Math.PI/180;sx+=Math.cos(r);sy+=Math.sin(r);});return (Math.atan2(sy,sx)*180/Math.PI+360)%360;}
function modeOf(arr){if(!arr||!arr.length)return null;const c={};let best=arr[0],bc=0;arr.forEach(function(v){c[v]=(c[v]||0)+1;if(c[v]>bc){bc=c[v];best=v;}});return best;}
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
/* WHEN a day's rain falls, Mountain-Forecast style: " · mostly at night" when one part of the day holds 60% or more of
   the rain its parts carry. The parts' night runs on to 6 AM, so this names a part, never a share of the day total. */
const RAIN_PART_WORD={AM:"in the morning",PM:"in the afternoon",Night:"at night"};
function rainMostly(dy){var ps=(dy.parts||[]).filter(function(p){return p.rain>0;});var tot=ps.reduce(function(a,p){return a+p.rain;},0);if(!(dy.precipIn>0)||!ps.length||tot<0.01)return "";var top=ps.reduce(function(a,p){return p.rain>a.rain?p:a;});return top.rain>=0.6*tot&&RAIN_PART_WORD[top.label]?" · mostly "+RAIN_PART_WORD[top.label]:"";}
function gustWorthShowing(dy){const surf=dy.wind10Max;return !(typeof surf==="number"&&isFinite(surf))||dy.gustMax>surf;}
function wxCondColor(code){if(code==null)return C.blue;if(code>=95)return C.red;if(code===0||code===1)return C.green;if(code===2||code===3||code===45||code===48)return C.textSub;return C.blue;}
function wxUvColor(uv){return uv>=11?C.purple:uv>=8?C.red:uv>=6?C.amber:uv>=3?C.yellow||C.amber:C.green;}
function wxUvLabel(uv){return uv>=11?"Extreme":uv>=8?"Very High":uv>=6?"High":uv>=3?"Moderate":"Low";}
const FROSTBITE_WINDCHILL_F=-19;
function metWxLabel(code){
  if(!code)return null;
  const s=code.replace(/_(day|night|polartwilight)$/,"");
  const MAP={clearsky:"Clear",fair:"Fair",partlycloudy:"Partly cloudy",cloudy:"Cloudy",fog:"Fog",rain:"Rain",lightrain:"Light rain",heavyrain:"Heavy rain",rainshowers:"Rain showers",lightrainshowers:"Light rain showers",heavyrainshowers:"Heavy rain showers",sleet:"Sleet",lightsleet:"Light sleet",heavysleet:"Heavy sleet",sleetshowers:"Sleet showers",lightsleetshowers:"Light sleet showers",heavysleetshowers:"Heavy sleet showers",snow:"Snow",lightsnow:"Light snow",heavysnow:"Heavy snow",snowshowers:"Snow showers",lightsnowshowers:"Light snow showers",heavysnowshowers:"Heavy snow showers"};
  if(MAP[s])return MAP[s];
  if(s.indexOf("thunder")>=0)return "Thunderstorms";
  return s;
}
/* CONDITIONS — the crag Conditions tab (sport, trad, top-rope, bouldering; never alpine, scrambling,
   mountaineering, ice or mixed, where a dry-rock friction number would be wrong). The scoring is
   lib/conditionsScore.js; this renders it as SECTIONS, each under its own heading and one idea per
   row, because the tab is long and must read section by section:
     RIGHT NOW · BEST TIME TO CLIMB · HOURLY · ROCK & DRYING · SUN ON THE WALL · AIR QUALITY · SEASON
   (the route page then adds the weather sources and ROAD CONDITIONS below it).
   The forecast is fetched at the CRAG's coordinate, so a crag route with no waypoints still gets one.
   Every number is accountable: tapping an hour lists each factor's points, the rows add up to the
   points line, a cap names its reason, and a factor with no input says "not measured" instead of
   counting as zero or as a pass. A failed fetch says so and shows no stars — it is not a rating;
   a failed air-quality or climate read says "not measured", never "clean" or "no season". */
const _cragWx={},_cragAir={},_cragClim={},_cragSp={};
const DIR8=["N","NE","E","SE","S","SW","W","NW"];
const agoH=function(h){return h<48?h+" h ago":Math.round(h/24)+" days ago";};
const condBox={background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 14px"};
const dayBox={display:"block",background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"6px 8px",minWidth:0,minHeight:68,boxSizing:"border-box"};
const dayLbl={display:"block",fontSize:11.5,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4};
const dayVal={display:"block",fontSize:14,fontWeight:800,marginTop:2,lineHeight:1.25,overflowWrap:"normal"};
const daySub={display:"block",fontSize:11.5,color:C.textSub,marginTop:1,lineHeight:1.35};
const aqiTone=function(a){return a==null?C.textMuted:a<=50?C.green:a<=100?C.amber:a<=150?C.orange:C.red;};
function ConditionsScoreCard({route,mtn,onAddAspect}){
  const disc=catOf(route);const on=CRAG_SCORE_DISCIPLINES.includes(disc);
  const lat=mtn&&typeof mtn.lat==="number"?mtn.lat:(mtn&&mtn.lat!=null?+mtn.lat:null),lng=mtn&&typeof mtn.lng==="number"?mtn.lng:(mtn&&mtn.lng!=null?+mtn.lng:null);
  const hasPt=lat!=null&&lng!=null&&isFinite(lat)&&isFinite(lng);
  const ck=hasPt?lat.toFixed(3)+","+lng.toFixed(3):"";
  const [wx,setWx]=useState(function(){return ck&&_cragWx[ck]?{data:_cragWx[ck]}:null;});
  const [aq,setAq]=useState(function(){return ck&&_cragAir[ck]?{data:_cragAir[ck]}:null;});
  const [clim,setClim]=useState(function(){return ck&&_cragClim[ck]?{data:_cragClim[ck]}:null;});
  const [tries,setTries]=useState(0);const [aqTries,setAqTries]=useState(0);const [climTries,setClimTries]=useState(0);
  const [dayI,setDayI]=useState(0);const [hrI,setHrI]=useState(null);const [showPrefs,setShowPrefs]=useState(false);
  const cp=useCondPrefs();
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragWx[ck]){setWx({data:_cragWx[ck]});return;}
    let live=true;setWx(null);
    fetchCragForecastMeasured(lat,lng).then(function(j){_cragWx[ck]=j;if(live)setWx({data:j});},function(){if(live)setWx({error:true});});
    return function(){live=false;};
  },[ck,tries]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the crag coordinate key (ck encodes lat/lng) and retry count; on/hasPt follow the route
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragAir[ck]){setAq({data:_cragAir[ck]});return;}
    let live=true;setAq(null);
    fetchCragAir(lat,lng).then(function(j){_cragAir[ck]=j;if(live)setAq({data:j});},function(){if(live)setAq({error:true});});
    return function(){live=false;};
  },[ck,aqTries]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the crag coordinate key (ck encodes lat/lng) and retry count; on/hasPt follow the route
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragClim[ck]){setClim({data:_cragClim[ck]});return;}
    let live=true;setClim(null);
    fetchCragClimate(lat,lng).then(function(m){_cragClim[ck]=m;if(live)setClim({data:m});},function(){if(live)setClim({error:true});});
    return function(){live=false;};
  },[ck,climTries]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on the crag coordinate key (ck encodes lat/lng) and retry count; on/hasPt follow the route
  /* A SECOND READ of three other models' rain (owner, 2026-10-28: the alpine card says when models disagree; a crag
     never did). Adds a line when they split, and NOTHING when it fails: no read is not agreement, but it is no flag. */
  const [sp,setSp]=useState(function(){return ck&&_cragSp[ck]?_cragSp[ck]:null;});
  useEffect(function(){
    if(!hasPt||!on)return;
    if(_cragSp[ck]){setSp(_cragSp[ck]);return;}
    let live=true;setSp(null);
    fetchAlpineSpread(lat,lng,null).then(function(j){_cragSp[ck]=j;if(live)setSp(j);},function(){if(live)setSp(null);});
    return function(){live=false;};
  },[ck,hasPt,on,lat,lng]);
  useEffect(function(){setDayI(0);setHrI(null);},[route.id]);
  const [wantDate,setWantDate]=useState(function(){var d=OPEN_DAY.date;OPEN_DAY.date=null;return d;});
  const rk=routeRock(route);
  const aspectText=route.aspect||route.face||(route._dbArea&&route._dbArea.aspect)||null;
  const score=useMemo(function(){
    if(!wx||!wx.data)return null;
    return scoreForecast(wx.data,{lat:lat,lng:lng,aspect:aspectText,family:rk?rk.family:null,rock:rk?rk.rock:null,discipline:disc},scorePrefs(cp),undefined,aq&&aq.data?aq.data:null);
  },[wx,aq,cp,route.id,rk&&rk.family,aspectText]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed on rock family and route id; lat/lng/disc/rk follow the route and rk is rebuilt each render
  useEffect(function(){if(!wantDate||!score)return;var i=score.days.findIndex(function(d){return d.date===wantDate;});if(i>=0){setDayI(i);setHrI(null);}setWantDate(null);},[score,wantDate]);
  if(!on)return null;
  const box={background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:ROUTE_GAP};
  const head=<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><CardHead style={{marginBottom:0}}>CONDITIONS SCORE</CardHead>{hasPt?<button onClick={function(){setShowPrefs(!showPrefs);}} aria-expanded={showPrefs} aria-label="Your ideal conditions" style={{minHeight:44,background:"none",border:"1px solid "+(showPrefs?C.blue:C.border),color:showPrefs?C.blue:C.textSub,borderRadius:8,padding:"5px 9px",fontSize:11.5,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:5}}><ActionIcon name="settings" size={12} color="currentColor"/>Your conditions</button>:null}</div>;
  if(!hasPt)return <div style={box}>{head}<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>No score for this climb: the crag it is on has no location on file yet, so there is no forecast to score.</div></div>;
  if(wx&&wx.error)return <div style={box}>{head}<div style={{fontSize:12.5,color:C.amber,lineHeight:1.55,marginBottom:8}}>Couldn’t load the forecast, so there is no score. This is not a rating of the conditions.</div><button onClick={function(){setTries(tries+1);}} style={{background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:8,padding:"7px 12px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Try again</button></div>;
  if(!score)return <div style={box} aria-busy="true">{head}<LoadingRows C={C} label="Loading the forecast…"/></div>;
  const days=score.days;const day=days[Math.min(dayI,days.length-1)];
  if(!day)return <div style={box}>{head}<div style={{fontSize:12.5,color:C.textSub}}>The forecast came back with no days ahead to score.</div></div>;
  const col=function(s){return s==null?C.border:s>=4?C.green:s>=2.5?C.amber:C.red;};
  const fmt=function(s){return s==null?"–":s.toFixed(1);};
  const starRow=function(s){var out=[];for(var i=1;i<=5;i++)out.push(<span key={i} style={{color:s!=null&&s>=i-0.25?col(s):C.borderHi}}>★</span>);return out;};
  const dayName=function(d,i){if(i===0)return "Today";return new Date(d.date+"T12:00:00Z").toLocaleDateString(DLOCALE,{weekday:"short",timeZone:"UTC"});};
  const dayDate=function(d){return new Date(d.date+"T12:00:00Z").toLocaleDateString(DLOCALE,{month:"short",day:"numeric",timeZone:"UTC"});};
  const whenOf=function(x){var i=days.findIndex(function(d){return d.date===x.date;});return (i===0?"today":i===1?"tomorrow":i>0?dayName(days[i],i):x.date)+" "+clockHr(x.hr);};
  const hrs=day.hours;
  /* ONE CLOCK AXIS for every day's hour strip (owner, 2026-10-24: "the boxes aren't consistent size"): the columns
     run from the earliest daylight hour any day offers to the latest, and each hour sits in its own clock column.
     Sized by the day's own count, an evening's one remaining hour stretched across the whole card while a full day
     drew eleven narrow tiles; and the best-three-hours mark, a shadow on top of those tiles, made them look taller. */
  const hrLo=Math.min.apply(null,days.map(function(d){return d.hours.length?d.hours[0].hr:24;})),hrHi=Math.max.apply(null,days.map(function(d){return d.hours.length?d.hours[d.hours.length-1].hr:-1;}));
  const hrCol=function(x){return x.hr-hrLo+1;};
  const hrGrid={display:"grid",gridTemplateColumns:"repeat("+Math.max(1,hrHi-hrLo+1)+",minmax(0,1fr))",gap:3};
  const selI=hrI!=null&&hrI<hrs.length?hrI:(day.best?day.best.i+1:0);const h=hrs[selI];
  const top=h?h.stars:day.stars;const lbl=starsLabel(top);const lblCol=col(top);
  const shadeAt=(function(){if(!day.sun||day.sun.set==null)return null;var r=day.sun.rise,st=day.sun.set,n=Date.now();if(n>=r&&n<=st)return n;var bh=day.best?day.hours[day.best.i]:null;return bh&&bh.utc>=r&&bh.utc<=st?bh.utc:Math.round((r+st)/2);})();
  const rockLbl=rk?rk.label:"Rock unknown";
  const facKeys=["temp","humidity","dry","wind","sun"];
  const facNote=function(k,f){
    if(k==="temp")return uTemp(f.val)+" · "+f.note;
    if(k==="humidity")return Math.round(f.val)+"% humidity"+(f.dew!=null?" · dew point "+uTemp(f.dew):"")+(f.friction?" · "+f.friction.label:"");
    if(k==="dry")return (f.raining?"Rain in the past hour ("+uPrecip(f.precip)+")":(f.atLeast?"No rain in the past 14 days":"Last rain "+agoH(f.val)))+" · "+rockLbl+" dries in about "+f.need+" h"+(!f.raining&&f.frac<1?" · about "+Math.round(f.frac*100)+"% dry":"")+(f.pop?" · "+f.pop+"% chance of rain":"")+(f.damp?" · air at its dew point":"");
    if(k==="wind")return uWind(f.val)+(f.gust!=null&&f.gust>f.val+3?", gusts "+uWind(f.gust):"");
    if(k==="sun")return (f.lit?"Wall in sun":"Wall in shade")+(f.want==="either"?"":" · you want "+f.want);
    return "";
  };
  const notMeasured=function(k){
    if(k==="sun")return score.aspectVaries?"Sun / shade: the wall faces several ways, so sun isn’t scored":"Sun / shade: this climb has no wall direction on file";
    return FACTOR_LABEL[k]+": no forecast value for this hour";
  };
  const cur=score.now;
  const wetSand=score.sandstone&&cur&&cur.dryFrac!=null&&cur.dryFrac<1;
  const dryLine=score.dryFrom?whenOf(score.dryFrom):score.dryBeyond?"Not within the 7-day forecast":null;
  /* WHEN WILL IT BE DRY — for any hour: the first later hour the drying model calls dry, or null when none does inside
     the forecast. The countdown chip and the tapped hour both read it, so they cannot disagree with "Likely dry from". */
  const dryAfter=function(x){if(!x||x.dryFrac==null||x.dryFrac>=1)return null;for(const d of days)for(const y of d.all)if(y.utc>x.utc&&y.dryFrac!=null&&y.dryFrac>=1)return y;return null;};
  /* A WET MORNING UNDER A GOOD DAY (owner's note, 2026-10-28: "red boxes in the morning because the rock may still be
     wet, but ... it says good conditions"). The day's score is its best 3 hours, so a dry afternoon makes it Good
     beside red morning tiles; this line says so in words, and each tile's own score (and its tapped "Why") stays the
     hour's. Null unless some daylight hour of the selected day is wet and the rock dries later that same day. */
  const wetTill=(function(){var w=hrs.filter(function(x){return x.dryFrac!=null&&x.dryFrac<1;});if(!w.length||!day.best)return null;var y=dryAfter(w[w.length-1]);return y&&y.date===day.date&&y.daylight?y:null;})();
  /* ...and the same for DEW: most red mornings under a Good day were not rain at all (audit, 2026-10-28: 24 of 71 Good
     days at 18 crags had red hours before 11 AM, most from the dew-point cap, on dry desert mornings at Vantage and
     Smith Rock). The first hour after the last dew-capped hour before the best 3 hours; null if the best hours are damp too. */
  const dewTill=(function(){if(!day.best)return null;var dew=function(x){return x.caps.some(function(c){return /dew point/.test(c.why);});};if(hrs.slice(day.best.i,day.best.i+3).some(dew))return null;var last=-1;for(var i=0;i<day.best.i;i++)if(dew(hrs[i]))last=i;return last>=0&&hrs[last+1]?hrs[last+1]:null;})();
  // The day's rain, the amount this card prints among three other models' (modelSpread, the alpine card's rule): null unless they split.
  const rainSplit=function(d){var m=sp&&d.rain!=null?modelSpread(sp,d.date,null,d.rain):null;return m&&m.over.indexOf("rain")>=0?m.rain:null;};
  const dayRainSplit=rainSplit(day);
  const dryChip=(function(){if(!cur||cur.dryFrac==null||cur.dryFrac>=1||wetSand)return null;var y=dryAfter(cur),hrs=y?Math.max(1,Math.round((y.utc-Date.now())/3600e3)):null;
    var txt=cur.factors.dry&&cur.factors.dry.raining?"Raining — rock is wet":"Rock drying · about "+Math.round(cur.dryFrac*100)+"% dry";
    var when=y?(hrs<=36?"Dry in about "+hrs+" h ("+whenOf(y)+")":"Dry by "+whenOf(y)):"Not dry within the 7-day forecast";
    return <div data-dry-countdown="1" style={{background:C.amberBg,border:"1px solid "+C.amber,borderRadius:10,padding:"8px 12px",marginBottom:8}}><div style={{fontSize:13,fontWeight:800,color:C.amber}}>{txt}</div><div style={{fontSize:12.5,color:C.text,marginTop:2}}>{when}</div></div>;})();
  const sec=function(title,body,first){return <div key={title}><SL first={first}>{title}</SL>{body}</div>;};
  const aqNow=aq&&aq.data&&cur&&cur.aqi!=null?cur.aqi:null;const aqCat=aqiCategory(aqNow);
  const dayAqCat=aqiCategory(day.aqiMax);
  const curF=cur&&cur.factors.dry;
  const sandWarn=<div role="alert" style={{background:C.redBg,border:"1px solid "+C.red,borderRadius:10,padding:"9px 12px",marginBottom:8}}><div style={{fontSize:13,fontWeight:800,color:C.red}}>Wet sandstone is weak — holds can break. Stay off it until it’s dry</div><div style={{fontSize:12.5,color:C.text,marginTop:3,lineHeight:1.45}}>{dryLine?"Likely dry from "+dryLine+".":"Can’t tell yet when it will be dry."}</div></div>;
  return <div data-conditions-score="1">
    {cur?sec("Right now",<div style={condBox}>
      {wetSand?sandWarn:dryChip}
      <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:6}}><div style={{fontSize:26,fontWeight:800,lineHeight:1,color:C.text}}>{fmt(cur.stars)}</div><div><div aria-hidden="true" style={{fontSize:15,letterSpacing:1.2}}>{starRow(cur.stars)}</div><div style={{fontSize:12,color:col(cur.stars),fontWeight:800}}>{starsLabel(cur.stars)+" · "+clockHr(cur.hr)}</div></div></div>
      {cur.caps.length?condRow("Held down by",cur.caps.map(function(c){return c.why;}).join(" · "),C.amber):null}
      {condRow("Temperature",cur.temp!=null?uTemp(cur.temp)+(cur.feels!=null&&uTempN(cur.feels)!==uTempN(cur.temp)?" · feels like "+uTemp(cur.feels):""):"Not measured")}
      {condRow("Friction",cur.friction?cur.friction.label:"Not measured",cur.friction?(cur.friction.key==="crisp"?C.green:cur.friction.key==="ok"?C.text:C.amber):C.textMuted)}
      {condRow("Humidity",cur.rh!=null?Math.round(cur.rh)+"%"+(cur.dew!=null?" · dew point "+uTemp(cur.dew):""):"Not measured")}
      {condRow("Wind",cur.wind!=null?uWind(cur.wind)+(cur.windDir!=null?" from the "+DIR8[Math.round(cur.windDir/45)%8]:"")+(cur.gust!=null&&uWindN(cur.gust)>uWindN(cur.wind)?", gusts "+uWind(cur.gust):""):"Not measured")}
      {condRow("Cloud cover",cur.cloud!=null?Math.round(cur.cloud)+"% · "+skyWord(cur.cloud):"Not measured")}
      {condRow("Rain",cur.precip==null?"Not measured":cur.precip>0?uPrecip(cur.precip)+" in the past hour":"None in the past hour")}
      {condRow("Air quality",aqNow!=null?"AQI "+Math.round(aqNow)+" · "+aqCat.label:aq&&aq.error?"Not measured (didn’t load)":!aq?"Loading…":"Not measured",aqNow!=null?aqiTone(aqNow):C.textMuted)}
    </div>,true):null}
    {sec("Best time to climb",<div style={box}>{head}
    {showPrefs?<div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"10px 12px",marginBottom:10}}>
      <div style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,marginBottom:8}}>They change the score on every crag route and in the Best day to climb view. Also in the Menu and Settings.</div>
      <CondPrefsControls disc={disc}/>
    </div>:null}
    <div role="group" aria-label="Day" style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4,marginBottom:10}}>{days.map(function(d,i){var on=i===Math.min(dayI,days.length-1);return <button key={d.date} onClick={function(){setDayI(i);setHrI(null);}} aria-pressed={on} aria-label={dayName(d,i)+", "+(d.stars==null?"no score":fmt(d.stars)+" stars")} style={{flex:"0 0 58px",width:58,boxSizing:"border-box",minHeight:58,padding:"6px 2px",borderRadius:9,border:"1px solid "+(on?C.green:C.border),background:on?C.greenBg:"transparent",color:C.text,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:11.5,fontWeight:700}}>{dayName(d,i)}</div><div style={{fontSize:12,fontWeight:800,color:col(d.stars)}}>{fmt(d.stars)+" ★"}</div><div style={{fontSize:10.5,color:C.textMuted}}>{d.hi!=null?uTemp(d.hi)+"/"+uTemp(d.lo):""}</div></button>;})}</div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}><div style={{fontSize:34,fontWeight:800,lineHeight:1,color:C.text}}>{fmt(top)}</div><div><div aria-hidden="true" style={{fontSize:19,letterSpacing:1.5,lineHeight:1.1}}>{starRow(top)}</div><span style={{display:"inline-block",marginTop:3,padding:"2px 9px",borderRadius:20,fontSize:11.5,fontWeight:800,color:lblCol,background:top>=4?C.greenBg:top>=2.5?C.amberBg:C.redBg}}>{lbl}</span>{h?<div style={{fontSize:11,color:C.textMuted,marginTop:3}}>{"Overall score at "+clockHr(h.hr)+" · pick another hour below"}</div>:null}</div></div>
    <div style={{fontSize:13,color:C.text,marginBottom:day.capWhy.length?4:10}}>{day.best?<span>{"Best 3 hours "}<b>{clockHr(day.best.start)+" – "+clockHr(day.best.end)}</b>{" · "}<b style={{color:col(day.stars)}}>{fmt(day.stars)+" ★"}</b><span style={{color:C.textMuted}}>{" (the day’s score)"}</span></span>:(dayI===0?"Fewer than three daylight hours left to score":"Fewer than three daylight hours to score")}</div>
    {day.capWhy.length?<div style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Held down by: "+day.capWhy.join(" · ")}</div>:null}
    {dayRainSplit?<div data-rain-split="1" style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Forecast models disagree on rain this day ("+uPrecip(dayRainSplit[0])+"–"+uPrecip(dayRainSplit[1])+"): treat the rain, and the drying after it, as uncertain."}</div>:null}
    {wetTill?<div data-wet-until="1" style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Rock likely wet until "+clockHr(wetTill.hr)+": the hours before it score lower than the day. Tap one to see why."}</div>:null}
    {dewTill&&!(wetTill&&wetTill.hr>=dewTill.hr)?<div data-dew-until="1" style={{fontSize:12,color:C.amber,lineHeight:1.45,marginBottom:10}}>{"Air at its dew point until "+clockHr(dewTill.hr)+": dew may dampen the rock, so earlier hours score lower than the day. Tap one to see why."}</div>:null}
    {hrs.length?<div style={{marginBottom:10}}>
      <div style={{fontSize:10.5,fontWeight:800,color:C.textMuted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:5}}>{dayI===0?"Pick an hour, rest of today ":"Pick an hour "}<span style={{textTransform:"none",letterSpacing:0,fontWeight:500}}>(daylight hours · colour is the overall score)</span></div>
      <div style={hrGrid}>{hrs.map(function(x,i){return <button key={x.time} onClick={function(){setHrI(i);}} aria-pressed={i===selI} aria-label={clockHr(x.hr)+", overall score "+fmt(x.stars)+" stars"+(day.best&&i>=day.best.i&&i<day.best.i+3?", one of the best 3 hours":"")+(x.dryFrac!=null&&x.dryFrac<1?", rock about "+Math.round(x.dryFrac*100)+"% dry":"")+(x.precip>0?", "+uPrecip(x.precip)+" of rain":"")} style={{gridColumn:hrCol(x),boxSizing:"border-box",height:44,padding:0,borderRadius:5,cursor:"pointer",background:col(x.stars),opacity:0.6+(x.stars||0)/5*0.4,border:"2px solid "+(i===selI?C.text:"transparent")}}/>;})}</div>
      {day.best?<div aria-hidden="true" style={Object.assign({},hrGrid,{marginTop:3})}>{hrs.slice(day.best.i,day.best.i+3).map(function(x){return <div key={x.time} style={{gridColumn:hrCol(x),height:3,borderRadius:2,background:C.green}}/>;})}</div>:null}
      <div style={Object.assign({},hrGrid,{marginTop:3})}>{hrs.map(function(x,i){var c=hrCol(x);return <div key={x.time} style={{gridColumn:c,fontSize:9.5,color:C.textMuted,textAlign:"center",whiteSpace:"nowrap"}}>{i===0||((c-1)%3===0&&c-hrCol(hrs[0])>=3)?clockHr(x.hr).replace(" ",""):""}{score.bearing!=null?<div aria-hidden="true" style={{fontSize:10,color:x.lit?C.yellow:C.textMuted}}>{x.lit?"●":"▪"}</div>:null}{hrs.some(function(y){return y.precip>0;})?<div aria-hidden="true" style={{fontSize:10,color:C.blue,minHeight:13}}>{x.precip>0?"•":""}</div>:null}</div>;})}</div>
    </div>:null}
    {h?<div>
      <div style={{fontSize:10.5,fontWeight:800,color:C.textMuted,letterSpacing:0.5,textTransform:"uppercase",marginBottom:6}}>{"Why "+clockHr(h.hr)+" scores "+fmt(h.stars)+" · "+h.pts+" of "+h.max+" points"}</div>
      {h.dryFrac!=null&&h.dryFrac<1?(function(){var y=dryAfter(h);return <div data-hour-dry="1" style={{fontSize:12.5,color:C.amber,fontWeight:700,marginBottom:8}}>{(h.factors.dry&&h.factors.dry.raining?"Raining at "+clockHr(h.hr):"Rock about "+Math.round(h.dryFrac*100)+"% dry at "+clockHr(h.hr))+" · "+(y?"likely dry from "+whenOf(y):"not dry within the 7-day forecast")}</div>;})():null}
      <div style={{display:"flex",flexDirection:"column",gap:7}}>{facKeys.filter(function(k){return h.factors[k];}).map(function(k){var f=h.factors[k],pc=f.pts/WEIGHTS[k];var fc=pc>=0.75?C.green:pc>=0.45?C.amber:C.red;return <div key={k} data-factor={k}>
        <div style={{display:"grid",gridTemplateColumns:"92px minmax(0,1fr) 44px",gap:8,alignItems:"center",fontSize:12.5}}><span style={{color:C.text}}>{FACTOR_LABEL[k]}</span><div style={{height:7,background:C.borderLight,borderRadius:4,overflow:"hidden"}}><div style={{width:Math.round(pc*100)+"%",height:"100%",background:fc}}/></div><span style={{textAlign:"right",color:C.textSub,fontVariantNumeric:"tabular-nums"}}>{f.pts+"/"+WEIGHTS[k]}</span></div>
        <div style={{fontSize:11.5,color:C.textMuted,marginLeft:100,lineHeight:1.45}}>{facNote(k,f)}</div>
      </div>;})}</div>
      {h.caps.length?<div data-caps="1" style={{fontSize:12,color:C.amber,marginTop:9,paddingLeft:9,borderLeft:"2px solid "+C.amber,lineHeight:1.5}}>{h.caps.map(function(c){return <div key={c.why}>{"Capped at "+c.stars+" ★ — "+c.why}</div>;})}<div style={{color:C.textMuted}}>{"The factors alone would give "+fmt(h.rawStars)+"."}</div></div>:null}
      {h.missing.length?<div style={{fontSize:11.5,color:C.textMuted,marginTop:9,paddingLeft:9,borderLeft:"2px solid "+C.borderLight,lineHeight:1.5}}>{"Not measured, so left out of the score: "+h.missing.map(notMeasured).join("; ")+"."}{h.missing.indexOf("sun")>=0&&onAddAspect?<button onClick={onAddAspect} style={{display:"block",marginTop:4,padding:"3px 0",border:"none",background:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{"Know which way it faces? Add the wall direction →"}</button>:null}</div>:null}
    </div>:null}
    </div>)}
    {sec("Day by day",<div data-day-table="1" style={Object.assign({},condBox,{padding:0,overflow:"hidden"})}>
      {days.map(function(d,i){var on=i===Math.min(dayI,days.length-1);var trace=d.rain!=null&&d.rain>0&&uImp()&&d.rain<0.005;
        var tLine=d.hi!=null?uTemp(d.hi)+" / "+uTemp(d.lo)+(d.feelsHi!=null?", feels "+uTemp(d.feelsHi)+" / "+uTemp(d.feelsLo):""):"Temperature not measured";
        var rWhen=d.rain>0&&d.rainFrom!=null?clockHr(d.rainFrom)+"–"+clockHr(d.rainTo):"";
        var rLine=(d.rain==null?"Rain not measured":d.rain===0?"No rain":(trace?"A trace of rain (under 0.01\") over "+d.rainHrs+" h":uPrecip(d.rain)+" of rain over "+d.rainHrs+" h")+(rWhen?", "+rWhen:""))+(d.popMax?" · hourly chance up to "+d.popMax+"%":"");
        var wLine=[d.windMax!=null?"Wind to "+uWind(d.windMax)+(d.gustMax!=null&&uWindN(d.gustMax)>uWindN(d.windMax)?", gusts "+uWind(d.gustMax):""):"Wind not measured",d.rhMin!=null?"humidity "+Math.round(d.rhMin)+"–"+Math.round(d.rhMax)+"%":null,d.cloudAvg!=null?skyWord(d.cloudAvg).toLowerCase()+" ("+Math.round(d.cloudAvg)+"% cloud)":null].filter(Boolean).join(" · ");
        /* The day name and its stars sit on their OWN line above the boxes: beside them, at 390 px, three boxes
           shared what was left of a 50 px column and broke "52° / 38°" mid-number. A missing value is "—" here
           (the row's spoken label still says "not measured"); "Not measured" did not fit a third of a phone. */
        return <button key={d.date} onClick={function(){setDayI(i);setHrI(null);}} aria-pressed={on} aria-label={dayName(d,i)+", "+(d.stars==null?"no score":fmt(d.stars)+" stars")+". "+tLine+". "+rLine+". "+wLine+"."} style={{display:"block",width:"100%",textAlign:"left",padding:"11px 14px",margin:0,border:"none",borderTop:i?"1px solid "+C.border:"none",borderRadius:0,background:on?C.greenBg:"transparent",boxShadow:on?"inset 3px 0 0 "+C.green:"none",color:C.text,cursor:"pointer",font:"inherit"}}>
          <span style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:6}}><span style={{fontSize:12.5,fontWeight:800}}>{dayName(d,i)}</span><span style={{fontSize:11.5,color:C.textMuted}}>{dayDate(d)}</span><span style={{fontSize:12,fontWeight:800,color:col(d.stars)}}>{fmt(d.stars)+" ★"}</span></span>
          <span style={{minWidth:0,display:"block"}}>
            <span style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:5}}>
              <span style={dayBox}><span style={dayLbl}>Temp</span><span style={Object.assign({},dayVal,{color:d.hi!=null?wxTempColor(d.hi):C.textMuted})}>{d.hi!=null?uTemp(d.hi)+" / "+uTemp(d.lo):"—"}</span><span style={daySub}>{d.hi!=null?"high / low"+(d.feelsHi!=null?", feels "+uTemp(d.feelsHi)+" / "+uTemp(d.feelsLo):""):""}</span></span>
              <span style={dayBox}><span style={dayLbl}>Rain</span><span style={Object.assign({},dayVal,{color:d.rain==null?C.textMuted:d.rain>0?C.blue:C.text})}>{d.rain==null?"—":d.rain===0?"None":trace?"Trace":uPrecip(d.rain)}</span><span style={daySub}>{(d.rain>0?d.rainHrs+" h"+(rWhen?", "+rWhen:""):"")+(d.rain>0&&d.popMax?" · ":"")+(d.popMax?"hourly chance up to "+d.popMax+"%":"")+(rainSplit(d)?" · models split "+uPrecip(rainSplit(d)[0])+"–"+uPrecip(rainSplit(d)[1]):"")}</span></span>
              <span style={dayBox}><span style={dayLbl}>Wind</span><span style={Object.assign({},dayVal,{color:d.windMax!=null?wxWindColor(d.windMax):C.textMuted})}>{d.windMax!=null?"to "+uWind(d.windMax):"—"}</span><span style={daySub}>{d.gustMax!=null&&d.windMax!=null&&uWindN(d.gustMax)>uWindN(d.windMax)?"gusts to "+uWind(d.gustMax):""}</span></span>
            </span>
            <span style={{display:"block",fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:4}}>{[d.rhMin!=null?"Humidity "+Math.round(d.rhMin)+"–"+Math.round(d.rhMax)+"%":null,d.cloudAvg!=null?skyWord(d.cloudAvg)+" ("+Math.round(d.cloudAvg)+"% cloud)":null].filter(Boolean).join(" · ")}</span>
          </span>
        </button>;})}
      <div style={Object.assign({},condNote,{marginTop:0,padding:"9px 14px 11px",borderTop:"1px solid "+C.border})}>Temperature and rain cover the whole day; wind, humidity and cloud its daylight hours. Tap a day to open it above and in the charts.</div>
    </div>)}
    {sec("Hour by hour",<div style={condBox}>
      <div role="group" aria-label="Day for the hourly charts" style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:4,marginBottom:4}}>{days.slice(0,7).map(function(d,i){var on=i===Math.min(dayI,days.length-1);return <button key={d.date} onClick={function(){setDayI(i);setHrI(null);}} aria-pressed={on} aria-label={dayName(d,i)+", "+dayDate(d)} style={{flex:"0 0 58px",width:58,minHeight:44,boxSizing:"border-box",padding:"6px 2px",borderRadius:9,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:"transparent",color:on?C.onSolid:C.textSub,cursor:"pointer",textAlign:"center"}}><div style={{fontSize:12,fontWeight:on?800:700}}>{dayName(d,i)}</div><div style={{fontSize:10.5,color:on?C.blue:C.textMuted}}>{dayDate(d)}</div></button>;})}</div>
      <HourlyChart all={day.all} selUtc={h?h.utc:null}/>
    </div>)}
    {sec("Rock & drying",<div style={condBox}>
      {condRow("Rock",rockLbl,rk?C.text:C.textMuted)}
      {condRow("Drying time","About "+score.dryNeed+" h after a typical rain"+(cp.rain==="cautious"?" (you give it longer)":"")+"; less after a drizzle, longer after a soaking")}
      {condRow("Past rain",score.rainMeasured?(function(){var t=score.rainMeasured.through,l=score.local(t);return "Measured up to "+clockAt(score,t)+(l.date===days[0].date?" today":" "+new Date(l.date+"T12:00:00Z").toLocaleDateString(DLOCALE,{weekday:"long",timeZone:"UTC"}))+"; forecast after that";})():"Modelled — no rain measurements reach this crag",score.rainMeasured?C.text:C.textMuted)}
      {curF?condRow("Last rain",curF.raining?"In the past hour":curF.atLeast?"None in the past 14 days":agoH(curF.val)+" · "+uPrecip(curF.rain24)+" in the day before it stopped"):null}
      {cur&&cur.dryFrac!=null?condRow("Rock now",cur.dryFrac>=1?(cur.factors.dry&&cur.factors.dry.damp?"Dried out from rain, but the air is at its dew point — shaded rock may be damp":"Likely dry"):"Likely wet — about "+Math.round(cur.dryFrac*100)+"% dried",cur.dryFrac>=1?C.green:C.amber):null}
      {dryLine?condRow("Likely dry from",dryLine):null}
      {score.seep?condRow("Seepage risk",<span><b style={{color:score.seep.risk==="high"?C.red:score.seep.risk==="moderate"?C.amber:C.green}}>{score.seep.risk==="high"?"High":score.seep.risk==="moderate"?"Moderate":"Low"}</b>{" · "+uPrecip(score.seep.rain7)+" of rain in 7 days, "+uPrecip(score.seep.rain14)+" in "+(score.seep.short?"the days on record":"14 days")}</span>):null}
      <div style={condNote}>Seepage is a risk from recent rain, not a reading: cracks, seams and overhangs can stay wet for days after the face is dry. Drying times are rules of thumb for the rock type.</div>
    </div>)}
    {sec("Sun on the wall",<div style={condBox}>
      {day.sun?condRow("Sunrise",clockAt(score,day.sun.rise)):null}
      {day.sun&&day.sun.set!=null?condRow("Sunset",clockAt(score,day.sun.set)):null}
      {score.bearing!=null?condRow("Wall faces",DIR8[Math.round(score.bearing/45)%8]):null}
      {score.bearing!=null&&day.wallSun?condRow("Sun on the wall",day.wallSun.on!=null?"Hits the wall at "+clockAt(score,day.wallSun.on)+" · leaves at "+clockAt(score,day.wallSun.off):"No direct sun on this wall today",day.wallSun.on!=null?C.yellow:C.textSub):null}
      {score.bearing==null?condRow("Sun on the wall",(score.aspectVaries?"The wall faces several ways, so when the sun reaches it isn’t worked out, and sun isn’t scored":"No wall direction on file for this climb, so when the sun reaches it isn’t worked out")+". The shade map below shows where the terrain casts shadow.",C.textMuted):null}
      {score.bearing!=null?<div style={condNote}>Times assume a clear sky; a yellow dot under the hours above marks the ones forecast to be in sun. Terrain and trees that shade the wall aren’t known.</div>:null}
    </div>)}
    {sec("Shade map",<div style={condBox}>{shadeAt!=null?<ShadeMap lat={lat} lng={lng} rise={day.sun.rise} set={day.sun.set} at0={shadeAt} dayKey={day.date} clock={function(u){return clockAt(score,u);}} C={C}/>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>The forecast has no sunrise and sunset for this day, so the shade can’t be drawn.</div>}</div>)}
    {sec("Air quality",<div style={condBox}>
      {!aq?<LoadingRows C={C} label="Loading air quality…"/>:aq.error?<div><div style={{fontSize:12.5,color:C.amber,lineHeight:1.5,marginBottom:8}}>Couldn’t load air quality, so smoke is not measured. This is not a clean-air reading.</div><button onClick={function(){setAqTries(aqTries+1);}} style={{background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:8,padding:"7px 12px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Try again</button></div>:<div>
        {condRow("Now",aqNow!=null?"AQI "+Math.round(aqNow)+" · "+aqCat.label:"Not measured",aqNow!=null?aqiTone(aqNow):C.textMuted)}
        {condRow(dayI===0?"Worst today":"Worst "+dayName(day,dayI),day.aqiMax!=null?"AQI "+Math.round(day.aqiMax)+" · "+dayAqCat.label:"No air-quality forecast this far ahead",day.aqiMax!=null?aqiTone(day.aqiMax):C.textMuted)}
        {cur&&cur.pm25!=null?condRow("Fine smoke",Math.round(cur.pm25)+" µg/m³ of PM2.5 now"):null}
        <div style={condNote}>{"Above AQI "+score.aqLimits[0]+" the score is held to 2 ★, above "+score.aqLimits[1]+" to 1 ★ — smoke makes hard breathing the day’s real hazard."+(cp.aq?" (Your air-quality setting.)":"")}</div>
      </div>}
    </div>)}
    {sec("Season",<div style={condBox}>
      {!clim?<LoadingRows C={C} label="Loading the climate history…"/>:clim.error?<div><div style={{fontSize:12.5,color:C.amber,lineHeight:1.5,marginBottom:8}}>Couldn’t load the climate history for this crag. This says nothing about its season.</div><button onClick={function(){setClimTries(climTries+1);}} style={{background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:8,padding:"7px 12px",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Try again</button></div>:<SeasonChart clim={clim.data} band={score.band}/>}
    </div>)}
  </div>;
}
function pickForecastWaypoints(waypoints){
  const wps=(waypoints||[]).filter(wpPlaced).map(function(w){return (typeof w.lat==="number"&&typeof w.lng==="number")?w:{...w,lat:+w.lat,lng:+w.lng};});
  const trailhead=wps.find(function(w){return wpIs(w,"Trailhead");})||null;
  const summit=wps.find(function(w){return wpIs(w,"Summit")||wpIs(w,"Topout");})||null;
  const rest=wps.filter(function(w){return w!==trailhead&&w!==summit;});
  const camps=rest.filter(function(w){return wpIs(w,"Campsite");});
  var mid=null;
  if(camps.length){
    mid=camps.slice().sort(function(a,b){return (b.elev||0)-(a.elev||0);})[0]; // the highest camp is the most useful mid-mountain read
  }else if(rest.length){
    const midElev=(trailhead&&trailhead.elev!=null&&summit&&summit.elev!=null)?(trailhead.elev+summit.elev)/2:null;
    const midDist=(trailhead&&trailhead.distMi!=null&&summit&&summit.distMi!=null)?(trailhead.distMi+summit.distMi)/2:null;
    mid=rest.slice().sort(function(a,b){
      const sa=midElev!=null&&a.elev!=null?Math.abs(a.elev-midElev):(midDist!=null&&a.distMi!=null?Math.abs(a.distMi-midDist)*1000:99999);
      const sb=midElev!=null&&b.elev!=null?Math.abs(b.elev-midElev):(midDist!=null&&b.distMi!=null?Math.abs(b.distMi-midDist)*1000:99999);
      return sa-sb;
    })[0]; // no camp on the route — fall back to whichever waypoint sits closest to the trailhead/summit midpoint
  }
  return [trailhead,mid,summit].filter(Boolean);
}
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
function WeatherPanel({waypoints,showPlan,fallback,crag}){
  const _picked=crag?[]:pickForecastWaypoints(waypoints);
  const points=_picked.length||!fallback?_picked:[fallback];
  const [data,setData]=useState({});
  const [expandedDay,setExpandedDay]=useState({});
  const key=points.map(function(w){return w.type+"_"+w.name;}).join("|");
  useEffect(function(){
    if(!points.length)return;
    // Cancelled on cleanup: the three forecast fetches resolve after an unmount (leaving the route
    // page) or after the waypoint set changes, and each used to write into a dead panel.
    let live=true;
    points.forEach(function(w){
      const k=w.type+"_"+w.name;
      // forecast_days=16 is Open-Meteo's max — pulls the full range it forecasts
      // out to, not just the next 24 hours, so the panel below can lay it out
      // day by day instead of a single next-day summary.
      // precipitation_unit=inch also switches freezing_level_height (and other
      // length fields) from meters to feet, so freezeMax arrives in CANONICAL
      // FEET — never scale it by 3.28 again. DISPLAYING it still goes through
      // uElev(), exactly like every other tile in this panel: converting the
      // canonical value to the climber's own unit is a different operation
      // from the re-conversion this warns about, and skipping it is what left
      // the Freezing level tile reading feet to a metric climber.
      // The three requests live in lib/forecast.js now (fetchForecastRaw), shared with the Safety tab.
      // Open-Meteo, NWS, and MET Norway run different models from different
      // organizations and can legitimately disagree by several degrees over
      // complex mountain terrain — fetch both secondary sources' own series too
      // so the panel can flag divergence instead of presenting one number as
      // gospel. Both secondary sources are short-range (~4-7 days); Open-Meteo
      // alone still drives the full 16-day view and is the only one broken into
      // AM/PM/Night + hourly detail — the secondary sources stay lighter (a
      // high/low, wind, and one weather label) by design, not full parity.
      // MET Norway (api.met.no) — an independent forecast from a different
      // national weather service (ECMWF-derived outside the Nordics), not
      // affiliated with NOAA. Browsers won't let JS set a custom User-Agent
      // (a forbidden fetch header), so this relies on the browser's own UA —
      // fine at this request volume, but MET Norway's own guidance prefers an
      // identifying one for high-traffic server-side use.
      fetchForecastRaw(w).then(function(res){return {res:res};}).then(function(o){
        const res=o.res;
        const json=res[0],nwsJson=res[1],metJson=res[2];
        const h=json&&json.hourly;
        if(!h||!h.temperature_2m||!h.time)throw new Error("no data");
        const offsetSec=json.utc_offset_seconds||0;
        const toLocalDay=function(utcIso){return new Date(new Date(utcIso).getTime()+offsetSec*1000).toISOString().slice(0,10);};
        const prevDayStr=function(dateStr){return new Date(new Date(dateStr+"T00:00:00Z").getTime()-86400000).toISOString().slice(0,10);};
        // Group hourly samples by the local calendar date Open-Meteo returns
        // (timezone=auto) rather than by 24-hour blocks from fetch time, so
        // "today" lines up with the site's own day instead of drifting with
        // whatever hour the request happened to go out. AM/PM/Night parts are
        // bucketed separately: pre-dawn hours (0-5) join the PRECEDING day's
        // "Night" bucket rather than starting a new one, since the coldest
        // part of an overnight is usually just before dawn — matching how
        // mountain-forecast sites group an alpine-start overnight window.
        const byDay={},byPart={};
        h.time.forEach(function(t,i){
          const date=t.slice(0,10),hr=parseInt(t.slice(11,13),10);
          if(!byDay[date])byDay[date]={temps:[],feels:[],codes:[],winds:[],winds10:[],gusts:[],pops:[],precips:[],snows:[],fz:[],uvs:[],hours:[]};
          const dd=byDay[date];
          dd.temps.push(h.temperature_2m[i]);
          dd.feels.push(h.apparent_temperature[i]);
          dd.codes.push(h.weather_code[i]);
          dd.winds.push(h.wind_speed_80m[i]);
          if(h.wind_speed_10m)dd.winds10.push(h.wind_speed_10m[i]);
          dd.gusts.push(h.wind_gusts_10m[i]);
          dd.pops.push(h.precipitation_probability[i]);
          dd.precips.push(h.precipitation[i]);
          dd.snows.push(h.snowfall[i]);
          dd.fz.push(h.freezing_level_height[i]);
          dd.uvs.push(h.uv_index[i]);
          /* The HOURLY rows pair the wind with the gust beside it, and the only gust published is at 10 m -- so the hour's
             wind (and its direction) is the 10 m one too. The 80 m figure in that box read a calm-looking 10 m gust as
             weaker than its own wind. The day tile's headline stays at 80 m (check:units says why). An older saved
             forecast without the 10 m series shows "Not measured", never an 80 m figure under a 10 m label. */
          dd.hours.push({hr:hr,tempF:h.temperature_2m[i],code:h.weather_code[i],windMph:h.wind_speed_10m?h.wind_speed_10m[i]:null,dir:h.wind_direction_10m?h.wind_direction_10m[i]:null,pop:h.precipitation_probability[i],gustMph:h.wind_gusts_10m[i],precipIn:h.precipitation[i]});
          const partKey=hr<6?"night":hr<12?"am":hr<18?"pm":"night";
          const partDate=hr<6?prevDayStr(date):date;
          const pk=partDate+"_"+partKey;
          if(!byPart[pk])byPart[pk]={temps:[],codes:[],winds:[],dirs:[],precips:[],pops:[]};
          /* RAIN BY PART OF THE DAY. precipitation[T] is the rain of the hour BEFORE T, so it belongs to the part that
             hour BEGAN in: the 6 AM value is the night's, the noon value the morning's. */
          const bHr=hr===0?23:hr-1,bDate=hr===0?prevDayStr(date):date;
          const rk=(bHr<6?prevDayStr(bDate):bDate)+"_"+(bHr<6?"night":bHr<12?"am":bHr<18?"pm":"night");
          if(!byPart[rk])byPart[rk]={temps:[],codes:[],winds:[],dirs:[],precips:[],pops:[]};
          if(h.precipitation[i]!=null)byPart[rk].precips.push(h.precipitation[i]);
          if(h.precipitation_probability[i]!=null)byPart[rk].pops.push(h.precipitation_probability[i]);
          byPart[pk].temps.push(h.temperature_2m[i]);
          byPart[pk].codes.push(h.weather_code[i]);
          byPart[pk].winds.push(h.wind_speed_80m[i]);
          byPart[pk].dirs.push(h.wind_direction_80m[i]);
        });
        const sum=function(arr){return arr.reduce(function(s,v){return s+(v||0);},0);};
        const avg=function(arr){return arr.length?sum(arr)/arr.length:0;};
        const buildPart=function(label,pk){const b=byPart[pk];if(!b||!b.temps.length)return null;const pCode=modeOf(b.codes);return {label:label,temp:Math.round(avg(b.temps)),wx:WX_CODE_LABEL[pCode]||null,wxCode:pCode,wind:Math.round(avg(b.winds)),dir:degToCompass(circMeanDeg(b.dirs)),rain:b.precips.length?Math.round(sum(b.precips)*1000)/1000:null,pop:b.pops.length?Math.round(Math.max.apply(null,b.pops)):null};};
        // Secondary-source extras (wind + one weather label per day) — a
        // lighter read than Open-Meteo's per-part/hourly breakdown, by design.
        const nwsByDay={},nwsWindByDay={},nwsWxByDay={};
        /* NWS temperatures are for THEIR grid cell's own height, not this point's. Raw, they read warmer than the
           height-adjusted series beside them at every summit (Rainier: cell 3,890 m, pin 4,392 m) and tripped
           "differs" on a difference of height, not of forecast. Shifted by the standard lapse rate, stated. */
        const nwsShift=nwsHeightShiftF(nwsJson,w.elev);
        if(nwsJson&&nwsJson.properties){
          const tvals=nwsJson.properties.temperature&&nwsJson.properties.temperature.values;
          if(tvals)tvals.forEach(function(v){if(typeof v.value!=="number")return;const day=toLocalDay(v.validTime.split("/")[0]);if(!nwsByDay[day])nwsByDay[day]=[];nwsByDay[day].push(v.value*9/5+32+nwsShift);});
          const wvals=nwsJson.properties.windSpeed&&nwsJson.properties.windSpeed.values;
          if(wvals)wvals.forEach(function(v){if(typeof v.value!=="number")return;const day=toLocalDay(v.validTime.split("/")[0]);if(!nwsWindByDay[day])nwsWindByDay[day]=[];nwsWindByDay[day].push(v.value*0.621371);});
          const xvals=nwsJson.properties.weather&&nwsJson.properties.weather.values;
          if(xvals)xvals.forEach(function(v){const w0=v.value&&v.value[0]&&v.value[0].weather;if(!w0)return;const day=toLocalDay(v.validTime.split("/")[0]);if(!nwsWxByDay[day])nwsWxByDay[day]=[];nwsWxByDay[day].push(w0);});
        }
        const metByDay={},metWindByDay={},metWxByDay={};
        if(metJson&&metJson.properties&&metJson.properties.timeseries){
          metJson.properties.timeseries.forEach(function(e){
            const det=e&&e.data&&e.data.instant&&e.data.instant.details;
            if(!det||typeof det.air_temperature!=="number")return;
            const day=toLocalDay(e.time);
            if(!metByDay[day])metByDay[day]=[];
            metByDay[day].push(det.air_temperature*9/5+32);
            if(typeof det.wind_speed==="number"){if(!metWindByDay[day])metWindByDay[day]=[];metWindByDay[day].push(det.wind_speed*2.23694);}
            const sym=(e.data.next_1_hours&&e.data.next_1_hours.summary&&e.data.next_1_hours.summary.symbol_code)||(e.data.next_6_hours&&e.data.next_6_hours.summary&&e.data.next_6_hours.summary.symbol_code);
            if(sym){if(!metWxByDay[day])metWxByDay[day]=[];metWxByDay[day].push(sym);}
          });
        }
        const cap=function(s){return s?s.charAt(0).toUpperCase()+s.slice(1):null;};
        /* NWS ships its weather values as snake_case English (rain_showers, freezing_rain,
           blowing_snow), so replacing the separator LABELS THE WHOLE VOCABULARY rather than
           the codes somebody remembered -- unlike metWxLabel, which needs a map because
           `clearsky` and `partlycloudy` are not words. */
        const nwsWxLabel=function(s){return s?cap(String(s).replace(/_/g," ")):null;};
        const days=Object.keys(byDay).sort().map(function(date){
          const d=byDay[date];
          const parts=[buildPart("AM",date+"_am"),buildPart("PM",date+"_pm"),buildPart("Night",date+"_night")].filter(Boolean);
          const nd=nwsByDay[date];
          const nws=(nd&&nd.length>=3)?{adj:nwsShift,lo:Math.round(Math.min.apply(null,nd)),hi:Math.round(Math.max.apply(null,nd)),wind:nwsWindByDay[date]?Math.round(Math.max.apply(null,nwsWindByDay[date])):null,wx:nwsWxLabel(modeOf(nwsWxByDay[date]))}:null;
          const md=metByDay[date];
          const met=(md&&md.length>=3)?{lo:Math.round(Math.min.apply(null,md)),hi:Math.round(Math.max.apply(null,md)),wind:metWindByDay[date]?Math.round(Math.max.apply(null,metWindByDay[date])):null,wx:metWxLabel(modeOf(metWxByDay[date]))}:null;
          const wxCode=modeOf(d.codes);
          return {date:date,tempLo:Math.round(Math.min.apply(null,d.temps)),tempHi:Math.round(Math.max.apply(null,d.temps)),feelsLo:Math.round(Math.min.apply(null,d.feels)),feelsHi:Math.round(Math.max.apply(null,d.feels)),wx:WX_CODE_LABEL[wxCode]||null,wxCode:wxCode,windMax:Math.round(Math.max.apply(null,d.winds)),wind10Max:d.winds10.length?Math.round(Math.max.apply(null,d.winds10)):null,gustMax:Math.round(Math.max.apply(null,d.gusts)),popMax:Math.round(Math.max.apply(null,d.pops)),precipIn:Math.round(sum(d.precips)*1000)/1000,snowIn:Math.round(sum(d.snows)*100)/100,freezeMax:Math.round(Math.max.apply(null,d.fz)),uvMax:Math.round(Math.max.apply(null,d.uvs)*10)/10,parts:parts,hours:d.hours,nws:nws,met:met};
        });
        if(!live)return;
        setData(function(p){return Object.assign({},p,{[k]:{days:days}});});
      }).catch(function(){if(!live)return;setData(function(p){return Object.assign({},p,{[k]:{error:true}});});});
    });
    return function(){live=false;};
  },[key]); // eslint-disable-line react-hooks/exhaustive-deps -- key is derived from points; refetch only when the point set changes, not on array identity
  if(!points.length)return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px"}}><CardHead style={{marginBottom:6}}>WEATHER FORECAST</CardHead><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6}}>{crag?"No forecast yet — this crag has no location to forecast from.":"No forecast yet — this route has no named waypoints to forecast from. "+(showPlan?"Add a trailhead and summit waypoint on the Plan tab to unlock AM/PM/Night forecasts here.":"Once a trailhead and summit waypoint are added, AM/PM/Night forecasts appear here.")}</div></div>;
  /* A fourth copy of the waypoint colour/icon map lived here, under its own names, which is
     why the first sweep missed it: a grep for the other copies' variable name cannot find a
     synonym. It happened to agree with them today and would not have for long — that is the
     whole failure mode, three copies agreeing with each other while all three were wrong.
     Reads from the shared WP_STYLE now, like everything else. */
  return <div style={{marginBottom:ROUTE_GAP}}>
    <SL>{crag?"Forecast at the crag":"Forecast at key points"}</SL>
    <div style={{display:"flex",flexDirection:"column",gap:ROUTE_GAP}}>{points.map(function(w){const k=w.type+"_"+w.name;const d=data[k];const expDate=expandedDay[k];const _wty=wpType(w);const wCol=wpColor(_wty);return <div key={k} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:wCol+"22",border:"1.5px solid "+wCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:wCol,flexShrink:0}}>{wpGlyph(_wty)}</div>
        <div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{w.name+(w.elev!=null?" · "+uElev(w.elev):"")}</div>
      </div>
      {!d?<LoadingRows C={C} label="Loading forecast…"/>:d.error?<div style={{fontSize:12,color:C.textMuted}}>Forecast unavailable — check your connection.</div>:<><div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:3}}>{d.days.map(function(dy,di){
        const dt=new Date(dy.date+"T12:00:00");
        const lbl=di===0?"Today":dt.toLocaleDateString(DLOCALE,{weekday:"short"});
        const sub=dt.toLocaleDateString(DLOCALE,{month:"short",day:"numeric"});
        const chilly=dy.feelsLo<=dy.tempLo-5;
        const frostbite=dy.feelsLo<=FROSTBITE_WINDCHILL_F;
        const hasSnow=dy.snowIn>=0.05;
        const omMid=(dy.tempHi+dy.tempLo)/2;
        const nwsMid=dy.nws?(dy.nws.hi+dy.nws.lo)/2:null;
        const diverges=nwsMid!=null&&Math.abs(nwsMid-omMid)>=6;
        const metMid=dy.met?(dy.met.hi+dy.met.lo)/2:null;
        const metDiverges=metMid!=null&&Math.abs(metMid-omMid)>=6;
        const isExpanded=expDate===dy.date;
        const condColor=wxCondColor(dy.wxCode);
        return <div key={dy.date} style={{flexShrink:0,width:272,display:"flex",flexDirection:"column",background:C.surface,borderRadius:12,padding:"12px 13px",border:"1px solid "+C.border,borderTop:"3px solid "+wxTempColor(dy.tempLo)}}>
          <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
            <div>
              <div style={{fontSize:13.5,fontWeight:800,color:C.text}}>{lbl}</div>
              <div style={{fontSize:10.5,color:C.textMuted}}>{sub}</div>
            </div>
            {dy.wx?<span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:condColor,background:condColor+"1a",border:"1px solid "+condColor+"55",borderRadius:20,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0,marginLeft:8}}><WeatherIcon code={dy.wxCode} color={condColor} size={12}/>{dy.wx}</span>:null}
          </div>
          <div style={{fontSize:17,fontWeight:800,marginBottom:3}}><span style={{color:wxTempColor(dy.tempHi)}}>{"High "+uTemp(dy.tempHi)}</span><span style={{color:C.textMuted,fontWeight:600}}>{"  ·  "}</span><span style={{color:wxTempColor(dy.tempLo)}}>{"Low "+uTemp(dy.tempLo)}</span></div>
          <div style={{fontSize:11,fontWeight:frostbite?700:400,color:frostbite?C.red:chilly?C.blue:C.textMuted,marginBottom:10}}>{"Feels like: High "+uTemp(dy.feelsHi)+" · Low "+uTemp(dy.feelsLo)+(chilly?" (wind chill)":"")+(frostbite?" — frostbite risk in 30 min":"")}</div>
          {dy.parts.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>{dy.parts.map(function(p){return <div key={p.label} style={{background:C.card,borderRadius:9,padding:"7px 6px",border:"1px solid "+C.border}}>
            <div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>{p.label}</div>
            <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9.5,color:C.textSub,marginBottom:5,minHeight:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><WeatherIcon code={p.wxCode} color={C.textMuted} size={11}/>{p.wx||"—"}</div>
            <div style={{fontSize:13.5,fontWeight:800,color:wxTempColor(p.temp)}}>{uTemp(p.temp)}</div>
            <div style={{fontSize:9,fontWeight:600,color:wxWindColor(p.wind),marginTop:2}}>{uWind(p.wind)+(p.dir?" "+p.dir:"")}</div>
            <div style={{fontSize:9.5,fontWeight:700,color:p.rain>0?C.blue:C.textMuted,marginTop:3}}>{p.rain==null?"Rain —":p.rain>0?uPrecip(p.rain)+(p.pop!=null?" · "+p.pop+"%":""):"No rain"+(p.pop?" · "+p.pop+"%":"")}</div>
          </div>;})}</div>:null}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:diverges||metDiverges?10:0}}>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Wind</div><div style={{fontSize:13,fontWeight:800,color:wxWindColor(dy.windMax)}}>{uWind(dy.windMax)}</div>{gustWorthShowing(dy)?<div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{"gusts to "+uWind(dy.gustMax)+", any hour"}</div>:null}</div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Precip</div><div style={{fontSize:13,fontWeight:800,color:dy.precipIn>0?C.blue:C.text}}>{dy.precipIn>0?uPrecip(dy.precipIn):"None"}</div><div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{dy.popMax+"% chance"+rainMostly(dy)}</div></div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>UV index</div><div style={{fontSize:13,fontWeight:800,color:wxUvColor(dy.uvMax)}}>{dy.uvMax}</div><div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{wxUvLabel(dy.uvMax)}</div></div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Freezing level</div><div style={{fontSize:13,fontWeight:800,color:C.text}}>{uElev(dy.freezeMax)}</div></div>
            {hasSnow?<div style={{gridColumn:"span 2",background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4}}>Snow expected</div><div style={{fontSize:13,fontWeight:800,color:C.blue}}>{uSnowfall(dy.snowIn)}</div></div>:null}
          </div>
          {diverges||metDiverges?<div style={{display:"flex",flexDirection:"column",gap:5}}>
            {diverges?<div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:10.5}}><span style={{flexShrink:0,fontSize:9,fontWeight:800,color:C.textMuted,background:C.card,border:"1px solid "+C.border,borderRadius:5,padding:"1.5px 5px",marginTop:1}}>NWS</span><span style={{color:C.amber,lineHeight:1.4}}>{"High "+uTemp(dy.nws.hi)+" · Low "+uTemp(dy.nws.lo)+" — differs "+uTempDelta(Math.abs(nwsMid-omMid))+"°"+(Math.abs(dy.nws.adj)>=1?" · adjusted "+uTempDelta(Math.abs(dy.nws.adj))+"° "+(dy.nws.adj<0?"colder":"warmer")+" for this height":"")}</span></div>:null}
            {metDiverges?<div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:10.5}}><span style={{flexShrink:0,fontSize:9,fontWeight:800,color:C.textMuted,background:C.card,border:"1px solid "+C.border,borderRadius:5,padding:"1.5px 5px",marginTop:1}}>MET</span><span style={{color:C.amber,lineHeight:1.4}}>{"High "+uTemp(dy.met.hi)+" · Low "+uTemp(dy.met.lo)+" — differs "+uTempDelta(Math.abs(metMid-omMid))+"°"}</span></div>:null}
          </div>:null}
          </div>
          {dy.hours&&dy.hours.length?<div style={{marginTop:"auto",paddingTop:10}}>
          <button onClick={function(){setExpandedDay(function(p){const o=Object.assign({},p);o[k]=isExpanded?null:dy.date;return o;});}} aria-expanded={isExpanded} style={{minHeight:44,width:"100%",padding:"8px",borderRadius:9,border:"1px solid "+C.blueDim,background:isExpanded?C.blueBg:C.card,color:isExpanded?"#fff":C.blue,fontSize:11,fontWeight:700,cursor:"pointer"}}>{isExpanded?"Hide hourly ":"Hourly forecast "}<Chevron inline open={isExpanded} size={12} color={C.blue}/></button>
          {isExpanded?<div>
            <div style={{marginTop:8,maxHeight:380,overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderRadius:9}}>{dy.hours.map(function(hh,hi){const t=typeof hh.tempF==="number"?Math.round(hh.tempF):null,wm=typeof hh.windMph==="number"?Math.round(hh.windMph):null,gm=typeof hh.gustMph==="number"?Math.round(hh.gustMph):null;return <div key={hi} style={{padding:"8px 9px",background:hi%2?"transparent":C.card,borderBottom:hi<dy.hours.length-1?"1px solid "+C.borderLight:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><span style={{width:62,flexShrink:0,fontSize:15,fontWeight:800,color:C.text}}>{clockHr(hh.hr)}</span><span style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><WeatherIcon code={hh.code} color={C.textMuted} size={14}/>{WX_CODE_LABEL[hh.code]||"—"}</span></div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:5}}>
                <span style={dayBox}><span style={dayLbl}>Temp</span><span style={Object.assign({},dayVal,{color:t!=null?wxTempColor(t):C.textMuted})}>{t!=null?uTemp(t):"Not measured"}</span><span style={daySub}>{"At "+clockHr(hh.hr)}</span></span>
                <span style={dayBox}><span style={dayLbl}>Wind</span><span style={Object.assign({},dayVal,{color:wm!=null?wxWindColor(wm):C.textMuted})}>{wm!=null?uWind(wm):"Not measured"}</span><span style={daySub}>{"At "+clockHr(hh.hr)+", 10 m up"+(wm!=null&&compass(hh.dir)?", from the "+compass(hh.dir):"")}</span></span>
                <span style={dayBox}><span style={dayLbl}>Gusts</span><span style={Object.assign({},dayVal,{color:gm!=null?wxWindColor(gm):C.textMuted})}>{gm!=null?uWind(gm):"Not measured"}</span><span style={daySub}>{"During "+spanEnding(hh.hr)}</span></span>
                <span style={dayBox}><span style={dayLbl}>Rain</span><span style={Object.assign({},dayVal,{color:hh.precipIn>0?C.blue:C.text})}>{hh.precipIn==null?"Not measured":hh.precipIn>0?uPrecip(hh.precipIn):"None"}</span><span style={daySub}>{(hh.pop!=null?hh.pop+"% chance, ":"")+"during "+spanEnding(hh.hr)}</span></span>
              </div></div>;})}</div></div>:null}
          </div>:null}
        </div>;
      })}</div></>}
    </div>;})}</div>
  </div>;
}
export default RouteDetail;
