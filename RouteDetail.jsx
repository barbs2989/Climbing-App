// The route-detail screen and every helper used only by it — split out of
// ClimbMatchCore.jsx so this ~290KB of source loads as its own lazy chunk the
// first time a route is opened, not at startup. Mechanically extracted (the
// dependency closure of RouteDetail minus everything reachable from any other
// export); shared helpers stay in core and are imported below.
import { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy, memo } from "react";
import { ROAD_KEYS, ACCESS_KEYS, TIMING_KEYS, CROWDS_KEYS, PARTNER_KEYS, SEASONAL_KEYS, EMERGENCY_KEYS, LOGISTICS_KEYS, DIFFICULTY_KEYS, CLIMATE_KEYS, SEASHAZ_KEYS } from "./lib/objKeys.js";
import { createPortal } from "react-dom";
import { DISC_LABELS as DL } from "./lib/discLabels";
/* rackFromText / _rackEdited / contribRack / routeRackFor / DISC_RACK moved to lib/rack.js so
   the crew card can answer the same question without core importing this lazy-loaded file.
   Moved verbatim; the correction-precedence rule and its history live beside them there. */
import { rackFromText, _rackEdited, _ropeEdited, contribRack, routeRackFor, DISC_RACK } from "./lib/rack";
import { trackIsJustTheWaypoints, WAYPOINT_LINE_CAVEAT, waypointCaveat, trackCoverage, trackCoverageCaveat } from "./lib/track";
import { accessCheckedLine } from "./lib/road";
import { USE_DB, supabase } from "./lib/supabase";
import {useComments, addComment as dbAddComment, editComment as dbEditComment, deleteComment as dbDeleteComment, setCommentLike, submitContribution, fetchCrewMessages, markDmThreadRead, fetchCrewLastReads, countCrewUnread, markCrewRead, useRouteContributions, dbRouteToCamel, useAreaRoutes, useMyContributions, useProfilesByIds, useFullProfile, useRoutesByIds, useStates, useAreaChildren, useAreaSearch, useSubtreeRoutes, useAreaTopos, topoPhotoUrl, uploadTopoPhoto, submitTopoLine, updateTopoLine, deleteTopoLine, deleteTopoPhoto, useAreaPaths, useRouteSearch, useMyObjectives, useObjectiveCounts, saveObjective, removeObjective, useMyCrews, createCrew, updateCrewRow, deleteCrewRow, addCrewMember as dbAddCrewMember, ackCrewDay, unackCrewDay, useProfileSearch, useMyCrewInvites, updateCrewMemberStatus, removeCrewMember, useUserLogs, createClimbLog, updateClimbLog, deleteClimbLog, uploadLogPhoto, useUserVouches, useClimberVouches, giveVouch, revokeVouch, useBelajCatches, logBelajCatch, addVerification, useVerificationRecords, inviteToCrewByEmail, useCrewEmailInvites, deleteCrewEmailInvite, sendCrewMessage, useCrewMessages, fetchOlderCrewMessages, sendDirectMessage, useDirectMessages, fetchMyDirectMessages, fetchOlderDirectMessages, markMessageAsRead, useCrewMessagesRealtime, useDirectMessagesRealtime, fetchRouteArea, useRouteTripReports} from "./lib/db";
import { fetchTrustScore } from "./lib/feedbackLoop";
import FireNearRoute from "./lib/FireNearRoute";
import { downloadStateOffline, offlineDownloads, removeStateOffline } from "./lib/offline";
import { useSession, signOut, getProfile, saveProfile } from "./lib/auth";
import { useRoutePresence } from "./lib/presence";
import AuthModal from "./lib/AuthModal";
// Stable empty array for query fallbacks — a fresh [] each render would change identity
// every time and invalidate every useMemo that depends on it.
const EMPTY_ARR=[];
import { clickable } from "./lib/clickable";
import { PeakMetadataPanel, SeasonalGuidancePanel, CrowdsPanel, PartnerRequirementsPanel, splitParagraphs, monthRank } from "./EnrichmentPanels";
import { renderToStaticMarkup } from "react-dom/server";
import { MAP_TILE_URLS, loadLeaflet, applyBaseLayer, BaseLayerToggle, ViewToggle, pinHtml } from "./lib/mapKit";
import { shortGrade, gradeDetail, cruxGrade } from "./lib/grade";
import { routeTerrain, fitAdvice, fitGear, saysNotApplicable } from "./lib/terrain";
import { rappelReportedMax, rappelHeaderLabel, rappelSingleRopeWarning } from "./lib/rappels";
import { mergeHazards } from "./lib/hazards";
import { sectionProvenance } from "./lib/provenance";
import { routeTags } from "./lib/routeTags";
import {wpType,wpIs,wpPlaced,trailheadPoint,uImp,_uNum,NOVAL,catOf,DISC_GEAR,C,Av,DISC,Pill,ActionIcon,CAT,ME,Bar,routeAscentFt,gainBelowOwnPins,uElev,uDist,uDistMi,CountUp,normTag,CLIMBERS,ago,scarfHrs,techHrs,pitchedFraction,loggedTimeStats,fmtDurMin,gn,Hr,vScore,seedAuthor,buildConsensus,SZ3,Stars,MONTHS,MOUNTAINS,Lbl,enrichRoute,onImgErr,FALLBACK_COVER,getAvailableItineraries,itinDaysToDraft,blankItinDay,itinDraftToStructured,itinToText,uMass,ItineraryEditor,SL,DLOCALE,MAX_WAYPOINTS,MAX_BIVY,ADDR_GRADES,ADDR_HAZ,ADDR_STYLE,ADDR_YDS,ADDR_AIDS,gradeGroups,distMiles,intOnly,WaypointMapPicker,WP_SINGLE_TYPES,WP_TYPES,WP_STYLE,wpColor,wpGlyph,mtnOf,BailoutForm,StartLocationForm,ALL_CLIMBERS,ROUTES,isHazardTag,DiscIcon,gradeLabel,protOf,OPEN_CREWS,FALLBACK_AV,GPXMap,isRecent,RECENT_DAYS,ElevChart,GearTiers,rxOf,condRep,ReportStats,renderMD,compat,pubName,uRate,gpxDownload,FloatPlan,missingFacts,Comments,shapeOf,gainCoversWholeOuting,ProvChip} from "./ClimbMatchCore.jsx";
const GpsSubmissionModal = lazy(() => import("./lib/GpsSubmissionModal"));
const SZ4={display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8};
const uGain=m=>uImp()?Math.round(m*3.28084).toLocaleString()+" ft":Math.round(m).toLocaleString()+" m";
const recShapeOf=route=>(route&&(route.outingShape||route.outing_shape))||null;
/* The stored vocabulary is exactly three codes — measured against the live catalog, where
   outing_shape is populated on 172 routes and holds only outback (141), loop (20), point (11).
   These labels are the ones the planner already uses in prose a few hundred lines down
   ("retracing its approach" / "loops back to the trailhead by a different line" / "finishes at
   a different trailhead"), so the contribute form names each shape the same way the screen
   explains it. A code with no entry falls through to "—" rather than rendering the raw token. */
const SHAPE_LABEL={outback:"Out and back",loop:"Loop",point:"Point to point"};
const itinTotalMi=route=>{const days=route&&route.itinerary&&route.itinerary.days;return (days&&days.length)?days.reduce((a,d)=>a+(d.miles||0),0):null;};
// A recorded loop/point does not retrace its approach, so its itinerary total is the
// whole outing rather than a doubled walk-in. Only halve when the trip really is there-and-back.
const effDistIsWholeTrip=route=>{const sh=recShapeOf(route);return !!itinTotalMi(route)&&(sh==="loop"||sh==="point");};
const effDistKm=route=>{const totMi=itinTotalMi(route);if(!totMi)return route&&route.distKm;return effDistIsWholeTrip(route)?totMi*1.60934:(totMi*1.60934)/2;};
const uLen=m=>{const n=_uNum(m);return n===null?NOVAL:(uImp()?Math.round(n*3.28084)+" ft":n+" m");};
function needsRopedGlacierTravel(r){const parts=[r.proNeeds,(r.gear||[]).join(" "),(r.rack||[]).join(" "),Array.isArray(r.detailedRack)?r.detailedRack.join(" "):(r.detailedRack||"")].filter(Boolean).join(" ").toLowerCase();if(!parts)return true;if(/\b(no|not|non-technical|none)\b[^.]{0,40}(rope|roped|technical protection)/.test(parts))return false;return /\brope\b|crevasse[- ]?rescue/.test(parts);}
function isPitched(r){return !["mountaineering","scrambling","hiking","scramble","hike","glacier","snow","bouldering"].includes((r&&r.discipline)||"");}
// isPitched asks the DISCIPLINE, but whether a pitch_detail entry is a roped pitch is a
// property of the ENTRY. 919 routes carry pitch_detail; classifying per route put 117 of
// them under "PITCH-BY-PITCH" whose entries are a walking itinerary ("Trailhead to
// Cathedral Pass", "Approach gully", "Summit snowfield") and 88 under "ROUTE STAGES"
// whose entries are numbered pitches. Worse, 144 routes hold BOTH — wa_big_four_mountain_
// tower_route is "Approach gully / First tower / Notch rappel / Second and third towers /
// Summit snowfield" — so no per-route verdict can be right about it.
// Classify per entry instead. Both kinds render in ROUTE BREAKDOWN, in the record's own
// array order, because that order is the sequence of the climb and a mixed route interleaves
// them; what the classification decides is how a row is DRAWN — a roped pitch gets the square
// P-badge and the per-pitch detail, a travel leg gets a round badge and a terrain chip.
// Nothing is dropped; 2,181 entries read as pitches and 1,388 as sections.
const PITCH_NUM_RE=/^p?\s*\d+\s*(?:[-–]\s*p?\s*\d+)?$|^pitch(?:es)?\s*\d+/i;
const TRAVEL_LBL_RE=/\b(approach|trailhead|trail\s?head|trail to|road|drive|parking|camp|bivy|bivouac|descent|descend|bushwhack|hike|walk|ford|shuttle|return)\b/i;
const TECH_GRADE_RE=/\b5\.\d|\bV\d|\bAI\s?\d|\bWI\s?\d|\bM\d\b|\bA[0-5]\b|\bC[0-4]\b|\b(?:easy|low|mid|hard|moderate)\s+5th\b|\b5th\s+class\b/i;
// Order matters. A label naming travel wins outright ("Approach gully" is graded "low 5th
// class" and is still an approach). Then a real climbing grade, then bolts/anchor — only a
// roped pitch carries those. A bare "1" is decided last and by discipline, because on a
// walk-up it numbers a leg, not a pitch (wa_baldy_standard: "1","2", both Class 2).
function pitchEntryKind(p,route){
  const lbl=String((p&&(p.pitch!=null?p.pitch:p.n))||"").trim();
  if(TRAVEL_LBL_RE.test(lbl))return "stage";
  if(TECH_GRADE_RE.test(String((p&&p.grade)||"")))return "pitch";
  if(p&&(p.bolts!=null||(p.anchor&&String(p.anchor).trim())))return "pitch";
  if(PITCH_NUM_RE.test(lbl))return isPitched(route)?"pitch":"stage";
  return "stage";
}
// The PITCH-BY-PITCH heading reads "N of M". That comparison is only valid when N and M count
// the same thing, and after splitPitchDetail they do not: N is the ROPED half, while M
// (`route.pitches`) counts whatever the route was recorded as having. The rest of the entries
// are not missing — they render on the SAME TAB under ROUTE BETA, a few hundred pixels up.
// Measured on the live catalog 2026-09-02: 55 routes claimed a shortfall, and on 52 of them
// `route.pitches` is EXACTLY the pitch_detail entry count, i.e. the denominator was itself
// counting the stages the table removes. wa_monte_cristo_peak_scramble read "1 of 3" with all
// three of its entries described on screen. So a shortfall may only be claimed when the route
// claims more pitches than the page describes ANYWHERE.
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
function hasPlanContent(route){if(!route)return false;const w=route.waypoints;return !!(route.road||route.driveMinSLC||route.approach||route.descent||route.descentText||route.approachLogistics||(w&&w.length)||route.rappels!=null);}
/* hasSafetyContent() lived here and gated the Safety tab the way hasPlanContent still gates Plan. It
   was removed when the Safety tab became unconditional: unlike Plan, that tab is never empty — the
   per-discipline advice, the forecast links and the nearby-fire panel all render without the route
   carrying a single safety field of its own. The predicate was `objHaz || watchOut || comms || bail ||
   waypoints`, if it is ever needed again. */
function routeHasGlacierTravel(route){if(!route)return false;const hay=[(route.hazards||[]).join(" "),route.approach,route.descent,route.descentText,route.overview,route.desc].filter(Boolean).join(" ").toLowerCase();return /glacier|crevasse|bergschrund|icefall|serac/.test(hay);}
function typicalFor(route){if(!route)return null;if(TYPICAL[route.id])return TYPICAL[route.id];if((route.id||"").indexOf("lcc_")===0)return TYPICAL._lcc;const c=catOf(route);const cat=(c==="sport"||c==="trad")?"rock":(c==="alpine"||c==="mountaineering")?"alpine":c;if(!c)return null;const tp=TYPICAL["_"+cat]||TYPICAL._rock;if(cat==="alpine"&&tp===TYPICAL._alpine&&!routeHasGlacierTravel(route)){return {...tp,summary:"An alpine objective on snow and rock where the season, the overnight freeze, and time of day decide whether it is safe.",patterns:tp.patterns.filter(p=>p.label!=="Glacier hazards").map(p=>p.label==="Season sets the picture"?{...p,detail:"Early season means more snow cover and avalanche concern; late season melts out, exposing loose rock and reducing snow travel options."}:p)};}return tp;}
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
const COMMITMENT_EXPLAINERS={I:"A few hours — bail is quick and low-consequence.",II:"Half a day — retreat is straightforward.",III:"Most of a day — retreat takes real time and planning.",IV:"Full day+ — committing. Retreat is difficult once you're in it.",V:"Multi-day — big commitment. Retreat can mean an overnight out.",VI:"Multi-day, remote, or high-altitude — retreat is a serious undertaking on its own."};
function camFmt(z){return z.indexOf(".")>=0?z:("#"+z);}
const GEAR_CATS=[
 {label:"Rope",kw:["rope"]},
 {label:"Trad rack / protection",kw:["rack","cam","nut","protection","stopper","hex","piton","big bro"]},
 {label:"Quickdraws",kw:["draw","quickdraw"]},
 {label:"Helmet",kw:["helmet"]},
 {label:"Harness",kw:["harness"]},
 {label:"Belay / rappel device",kw:["belay device","atc","grigri"]},
 {label:"Chalk & brush",kw:["chalk","brush"]},
 {label:"Crampons",kw:["crampon"]},
 {label:"Ice axe / tools",kw:["ice axe","ice tool"]},
 {label:"Ice screws",kw:["ice screw"]},
 {label:"Aiders / ascenders",kw:["aider","etrier","ascender","jumar"]},
 {label:"Trekking poles",kw:["trekking pole","poles"]},
 {label:"Microspikes",kw:["microspike","spike"]},
 {label:"Navigation (map / GPS)",kw:["map","gps","navigation","compass"]},
 {label:"Insulating layers & shell",kw:["layer","shell","insulation","puffy","down jacket"]},
 {label:"Satellite communicator",kw:["communicator","inreach","satellite","plb"]},
 {label:"Footwear (shoes / boots)",kw:["shoe","footwear","boot"]},
 {label:"Crash pad(s)",kw:["crash pad","crashpad"]},
 {label:"Shelter & sleep kit",kw:["shelter","tent","sleep","bivy"]},
 {label:"Water / filter",kw:["water","filter","treatment","hydration"]},
 {label:"Bear canister",kw:["bear","canister"]},
 {label:"Glacier / crevasse kit",kw:["glacier","crevasse","picket","prusik"]}
];

const DISC_ASSUMED={sport:["Rope","Quickdraws","Harness","Belay / rappel device","Personal anchor / sling","Helmet","Climbing shoes","Chalk"],trad:["Rope","Trad rack","Harness","Belay / rappel device","Helmet","Climbing shoes","Chalk","Nut tool"],bouldering:["Climbing shoes","Chalk","Brush"],aid:["Harness","Belay / rappel device","Helmet","Aiders / etriers","Daisy chains","Ascenders"],ice:["Harness","Belay / rappel device","Helmet","Ice tools","Crampons","Mountaineering boots","Warm layers"],mixed:["Harness","Belay / rappel device","Helmet","Ice tools","Crampons","Warm layers"],alpine:["Harness","Belay / rappel device","Helmet","Ice axe","Crampons","Mountaineering boots","Glacier / crevasse kit","Warm layers","Navigation"],mountaineering:["Ice axe","Crampons","Mountaineering boots","Harness","Helmet","Glacier / crevasse kit","Navigation","Warm layers"],scrambling:["Approach shoes","Helmet","Navigation (map / GPS)"]};
// "alpine" spans a 5.8 rock rib at Washington Pass and a glaciated north face, so
// assuming one kit for both put a glacier/crevasse kit, an ice axe, crampons and
// mountaineering boots onto pure rock climbs that never touch snow — reported from
// the app on South Early Winters Spire's SW Rib, whose own stored rack is correct.
// Show the snow and glacier items only where the route gives evidence it needs them.
const _GLACIER_RE=/glacier|crevasse|bergschrund|schrund|icefall|serac/i;
const _SNOW_RE=/\bsnow|\bcouloir|\bnev[\u00e9e]|\bice\b|ice axe|crampon|posthol|cornice|glissad|\bfirn\b|\bmoat\b/i;
// Joined with "; " rather than " " so each field, and each entry of a gear/hazard array, is
// its own clause. The regexes above do not care, but _snowEvidence splits on sentence
// punctuation, and a gear array flattened with spaces welds "ice axe and crampons in early
// season" onto whatever field follows it — which is exactly the hedge that must stay isolated.
const _routeGearText=function(r){if(!r)return "";var flat=function(v){return Array.isArray(v)?v.join("; "):(v==null?"":String(v));};return [r.name,r.grade,r.overview,r.approach,r.descentText,r.season,flat(r.hazards),flat(r.gear),flat(r.objHaz)].filter(Boolean).join("; ");};
/* A route that says you MIGHT need snow gear is not a route that needs it.

   Liberty Bell's Beckey Route — a 5.6 rock climb — stores "ice axe and crampons in early
   season". Mountain Project says climbers "may want an axe and/or crampons depending on snow
   conditions in the gully". North Cascade Mountain Guides lists boots, crampons and axe under
   "TECHNICAL EQUIPMENT – SPRING" and notes that later in the season you "walk to the base in a
   pair of lightweight hiking boots". So the stored data was right, and the RENDERING was
   wrong: _SNOW_RE matched the route's own hedge, dropped the condition, and printed Ice axe,
   Crampons AND Mountaineering boots as kit the climber is assumed to be carrying — boots
   being asserted by no source whatsoever.

   49 alpine/mountaineering routes are in this position, including Cutthroat West Ridge,
   Prusik Peak West Ridge and Liberty Crack (scripts/oneoff/audit-conditional-snow-gear.mjs).
   Hedged evidence now yields a CONDITIONAL tier quoting the route's own sentence, rather than
   a silent promotion to required. */
const _HEDGE_RE=/\b(early[- ]season|late[- ]season|in spring|spring only|depending on|if (?:there is |the )?snow|if snow|when snow|may want|optional|conditions? (?:dependent|permitting|vary)|as needed|sometimes|seasonal(?:ly)?|lingering|can be|occasionally)\b/i;
function _snowEvidence(route){
  var txt=_routeGearText(route);
  if(!_SNOW_RE.test(txt))return {snowy:false,glaciated:false,hedged:false,quote:null};
  var glaciated=_GLACIER_RE.test(txt);
  var hits=String(txt).split(/(?<=[.;])\s+/).filter(function(s){return _SNOW_RE.test(s);});
  // A glaciated route is never "conditional" — the glacier does not melt out in August.
  var hedged=!glaciated&&hits.length>0&&hits.every(function(s){return _HEDGE_RE.test(s);});
  /* Quote the sentence that tells the climber WHEN to carry it, not merely the first one
     that happened to contain the word "snow". On Prusik Peak's West Ridge the first match is
     an approach line about skirting Colchuck Lake, which explains nothing; the useful one
     names the gear. Prefer a hit that mentions the kit, then fall back. */
  var best=hits.find(function(s){return /ice axe|crampon|ice tool/i.test(s);})||hits[0];
  return {snowy:true,glaciated:glaciated,hedged:hedged,quote:hedged?String(best).trim().replace(/^[;\s]+|[;\s]+$/g,""):null};
}
function assumedFor(route,disc){
  var base=DISC_ASSUMED[disc]||[];
  if(disc!=="alpine"&&disc!=="mountaineering")return base;
  var ev=_snowEvidence(route);
  return base.filter(function(item){
    if(/glacier|crevasse/i.test(item))return ev.glaciated;
    if(/ice axe|crampons|mountaineering boots/i.test(item))return ev.snowy&&!ev.hedged;
    return true;
  });
}
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
function gearKey(s){
  var head=String(s==null?"":s).toLowerCase().split(/\s*[(—\[]|\s+--\s+|\s*[,;:]\s+|\s+–\s+/)[0];
  return head.replace(/[^a-z0-9+/ ]/g," ").replace(/\s+/g," ").trim()
    /* Crude singularisation, applied to BOTH sides, so "ropes"/"Rope" and
       "boots"/"Mountaineering boots" meet. Words of 3 or fewer characters are left alone so
       "gps" survives, and a double-s ending is left alone so "harness" does not become
       "harnes" — which would still have matched itself, but only by accident. */
    .split(" ").map(function(w){return (w.length>3&&/s$/.test(w)&&!/ss$/.test(w))?w.slice(0,-1):w;}).join(" ");
}
/* Two keys name the same item when one is the other with more said about it — "rope" inside
   "light 30m rope for the crux slot". Whole-word, so "axe" cannot match inside a longer word,
   and a floor of 3 characters so a stray short token cannot swallow half the list. */
function sameGear(a,b){
  var s=a.length<=b.length?a:b,l=a.length<=b.length?b:a;
  if(s.length<3)return false;
  return new RegExp("(^|\\s)"+s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|\\s)").test(l);
}
/* One list: the standard kit in its existing order, with any route-specific entry naming the
   same item REPLACING the stock wording in place, and genuinely new entries appended. */
function mergeGearList(assumed,extras,condItems){
  var out=[],keys=[];
  function push(txt){
    var kk=gearKey(txt);if(!kk)return;
    var i=-1;for(var j=0;j<keys.length;j++){if(keys[j]===kk||sameGear(keys[j],kk)){i=j;break;}}
    if(i<0){keys.push(kk);out.push(txt);return;}
    /* Keep the text that tells the climber more, but keep the SHORTER key — it is the one
       that goes on matching further spellings of the same item further down the list. */
    if(String(txt).length>String(out[i]).length)out[i]=txt;
  }
  (assumed||[]).forEach(push);
  var condKeys=(condItems||[]).map(gearKey).filter(Boolean);
  (extras||[]).forEach(function(x){
    var kk=gearKey(x);if(!kk)return;
    /* Anything the "only if there is snow" block owns stays there and nowhere else. Printing
       it here as well would have one section assert both that the gear is standard kit and
       that it is conditional — the "one Overview, two different racks" defect. */
    for(var j=0;j<condKeys.length;j++){if(condKeys[j]===kk||sameGear(condKeys[j],kk))return;}
    push(x);
  });
  return out;
}
function conditionalFor(route,disc){
  if(disc!=="alpine"&&disc!=="mountaineering")return null;
  var ev=_snowEvidence(route);
  if(!ev.snowy||!ev.hedged)return null;
  var items=(DISC_ASSUMED[disc]||[]).filter(function(i){return /ice axe|crampons/i.test(i);});
  return items.length?{items:items,quote:ev.quote}:null;
}
const DISC_HAZ={sport:["Loose rock","Runout","Warms up / sun-affected"],trad:["Rockfall","Loose rock","Runout","Serious exposure","Warms up / sun-affected"],bouldering:["Bad landing zone","Loose rock","Warms up / sun-affected"],aid:["Rockfall","Loose rock","Runout","Serious exposure"],ice:["Avalanche terrain","Rockfall","Serious exposure"],mixed:["Rockfall","Loose rock","Avalanche terrain","Serious exposure"],alpine:["Rockfall","Loose rock","Lightning / storms","Avalanche terrain","Crevasse hazard","Cornices","Serious exposure","Complex route-finding","River / creek crossing"],mountaineering:["Rockfall","Lightning / storms","Avalanche terrain","Crevasse hazard","Cornices","Serious exposure","Complex route-finding","River / creek crossing"],hiking:["Avalanche terrain","River / creek crossing","Complex route-finding","Serious exposure"],scrambling:["Rockfall","Loose rock","Serious exposure"]};
/* The Protection tile is a half-width column at 13px, so it needs a label, not a paragraph. Researched racks are written as full sentences ("Cams: doubles from small sizes through #3 — trip reports call for…"), which would dump the whole rack into that column. Keep only compact, rack-shaped entries and fall back to the generic label rather than overflowing. The full rack still renders in its own section on the Plan tab. */
/* Judge each rack entry on its own and drop the negated or conditional ones. A researched rack says things like "ice screws are rarely used here and are not worth carrying" or "protected with rock gear, not screws"; read as a flat word list, those advertise exactly the gear the route says to leave behind. Anything matching a rack against keywords must go through this first. */
const RACK_NEG=/\bnot worth\b|\bnot needed\b|\bnot necessary\b|\bnot required\b|\bno need\b|\bunnecessary\b|\brarely\b|\bseldom\b|\bnever\b|\bdon'?t\b|\bdo not\b|,\s*not\b|\bnot\s+(?:the\s+)?(?:screws|cams|nuts|pickets|pins|bolts)\b/i;
/* Conditional phrasing ("only if you plan to belay") is not a negation — it is real gear you may not need. The compact tile leaves it out; the packing checklist keeps it, because a checklist should over-include rather than send someone up short. */
const RACK_COND=/\bonly if\b|\bunless\b|\bif you\b|\boptional\b/i;
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
function rackAffirmed(rack){var a=Array.isArray(rack)?rack:(rack?[String(rack)]:[]);return a.filter(function(g){return typeof g==="string"&&!RACK_NEG.test(g)&&!RACK_COND.test(g);});}
/* Per-OCCURRENCE negation for keyword matching. Dropping a whole entry loses affirmative gear that shares a sentence with a negation — "belays are often pins rather than screws" genuinely calls for pins. A category counts as present if any single mention of it is not negated in its immediate context. */
function rackMentions(rack,kw){var a=Array.isArray(rack)?rack:(rack?[String(rack)]:[]);
  for(var i=0;i<a.length;i++){var e=a[i];if(typeof e!=="string")continue;var low=e.toLowerCase();
    for(var k=0;k<kw.length;k++){var p=low.indexOf(kw[k]);while(p>=0){if(!RACK_NEG.test(low.slice(Math.max(0,p-45),p+kw[k].length+30)))return true;p=low.indexOf(kw[k],p+1);}}}
  return false;}
function rackSummary(rack){
  var a=Array.isArray(rack)?rack:(rack?[String(rack)]:[]);var strs=a.filter(function(g){return typeof g==="string";});if(!strs.length)return "Gear-protected";
  var NEG=RACK_NEG;
  var low=rackAffirmed(rack).join(" · ").toLowerCase();
  /* Derive a compact label from prose so a researched rack still says something concrete. Only sizes written as "#3" or "to 3 inches" count — never a bare number, which would read pitch or grade numbers as cam sizes. */
  var parts=[],nums=[],m,re=/#(\d+(?:\.\d+)?)/g;while((m=re.exec(low)))nums.push(parseFloat(m[1]));
  re=/\bto (?:a )?(\d+(?:\.\d+)?)\s*(?:in\b|inch)/g;while((m=re.exec(low)))nums.push(parseFloat(m[1]));
  if(/\bcams?\b|camalot|friend/.test(low)){var top=nums.length?Math.max.apply(null,nums):null;parts.push(top!=null?"Cams to #"+top:"Cams");}
  if(/\bnuts?\b|stopper|\bwires?\b/.test(low))parts.push("nuts");
  if(/offset/.test(low))parts.push("offsets");
  if(/piton|knifeblade|\bpins?\b|\bangles?\b/.test(low))parts.push("pins");
  if(/\bscrews?\b/.test(low))parts.push("screws");
  if(/picket/.test(low))parts.push("pickets");
  var dm=low.match(/(\d+\s*(?:-|–|to)\s*\d+|\d+)\s*\+?\s*(?:quickdraws|draws)/);
  if(dm)parts.push(dm[1].replace(/\s*(?:to|–)\s*/,"-")+" draws");else if(/quickdraw|\bdraws\b/.test(low))parts.push("draws");
  if(/two \d*\s*m?\s*ropes|two ropes|double[- ]rope|half or twin|twin ropes/.test(low))parts.push("2 ropes");
  var s=parts.join(" · ");
  /* Nothing derivable — fall back to whole entries short enough to sit in the column, then to the generic label. */
  if(!s)s=strs.filter(function(g){return !NEG.test(g)&&g.length<=60&&/cam|rack|nut|stopper|draw|hex|tricam|piece|gear/i.test(g);}).join(", ");
  if(!s)return "Gear-protected";
  return s.length>64?s.slice(0,63).replace(/[\s,;:·—-]+$/,"")+"…":s;
}
function gearReadout(route,owners){
  /* The per-discipline defaults assume snow and glacier terrain for everything filed as
     alpine or mountaineering, which put an ice axe and crampons on the packing list for dry
     summer rock routes. Filter them against what the route's own row says it crosses; the
     rack-derived additions below stay unconditional, since a rack naming crampons IS the
     evidence that the route needs them. */
  const disc=catOf(route);const base=fitGear(DISC_GEAR[disc]||[],routeTerrain(route)).items.slice();
  /* Match per occurrence, or a rack saying "ice screws are not worth carrying" adds Ice screws to the packing checklist. */
  const src=((route&&route.rack)||[]).concat(((route&&route.gearTiers&&route.gearTiers.required)||[]));
  GEAR_CATS.forEach(c=>{if(rackMentions(src,c.kw)&&base.indexOf(c.label)<0)base.push(c.label);});
  const owned=(owners||[]).map(g=>(g||[]).join(" ").toLowerCase());
  return base.map(label=>{const c=GEAR_CATS.find(x=>x.label===label)||{kw:[label.toLowerCase()]};return {label:label,have:owned.some(t=>c.kw.some(k=>t.includes(k)))};});
}
const GEAR_MARGIN_TIERS=[["ultralight","Ultralight",[]],["midweight","Midweight",["Extra insulating layer","Headlamp + spare batteries"]],["cautious","Extra cautious",["Extra insulating layer","Headlamp + spare batteries","First aid kit","Emergency bivy / space blanket","Extra food & water","Backup navigation (paper map/compass)"]]];
function fmtSlingVal(v){if(v==null||v===false||v==="")return null;if(typeof v==="string"||typeof v==="number")return String(v);if(Array.isArray(v)){var items=v.map(fmtSlingVal).filter(Boolean);return items.length?items.join("; "):null;}if(typeof v==="object"){/* A {size,count} pair is a QUANTITY, and the generic branch below read it out as the   pipeline's own shape: "size: #0 C3 to 0.75 in, count: 2". 16 of 242 stored values   rendered that way in the RACK box. A count of 1 adds nothing, and a NON-numeric count   ("a few extra") cannot be a multiplier, so it goes in brackets after the size rather   than in front of it. *//* A `note` RIDES ALONG WITH size/count ON 8 OF THE 242, and requiring the object to hold nothing else let all 8 fall through to the generic branch — so half the machine text survived a fix aimed at exactly it. The note is folded into the SAME bracket as a non-numeric count rather than given its own, because two parentheticals in a row read worse than the thing they replaced. */if(v.size!=null&&Object.keys(v).every(function(k){return k==="size"||k==="count"||k==="note"||k==="notes";})){var _sz=fmtSlingVal(v.size);if(!_sz)return null;var _ct=v.count,_no=fmtSlingVal(v.note!=null?v.note:v.notes),_n=Number(_ct),_hasCt=(_ct!=null&&_ct!=="");var _head=(_hasCt&&isFinite(_n)&&_n>1)?(_n+"× "+_sz):_sz;var _ex=[];if(_hasCt&&!isFinite(_n))_ex.push(String(_ct));if(_no)_ex.push(_no);return _ex.length?(_head+" ("+_ex.join("; ")+")"):_head;}var parts=Object.keys(v).map(function(k){var sub=fmtSlingVal(v[k]);return sub?(k.replace(/_/g," ")+": "+sub):null;}).filter(Boolean);return parts.length?parts.join(", "):null;}return null;}
function fmtSlingRack(sr){if(!sr)return null;if(Array.isArray(sr)){if(!sr.length)return null;if(sr[0]&&typeof sr[0]==="object"&&"sizeCm" in sr[0])return sr.map(function(s){return s.qty+"× "+s.sizeCm+"cm";}).join(", ");return sr.map(fmtSlingVal).filter(Boolean).join("; ");}if(typeof sr!=="object")return null;var parts=Object.keys(sr).map(function(k){var v=sr[k];if(v===false||v==null||v==="")return null;var label=k.replace(/_/g," ");if(/^\d+(\.\d+)?(cm|in|mm)$/i.test(k)&&(typeof v==="number"||/^\d+$/.test(v)))return v+"× "+k;var sub=fmtSlingVal(v);return sub?(label+": "+sub):null;}).filter(Boolean);return parts.length?parts.join(", "):null;}
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
/* THE COLUMN IS CALLED `sling_rack` AND 84% OF IT IS NOT SLINGS. Measured over all 242 stored
   values: 162 carry a `cams` key and 154 a `nuts` key, plus pickets, pitons, ice screws and
   tricams — and every one of them rendered under a single bullet reading "Slings — ...". A wrong
   label on a rack is worse than a long one: a climber scanning for what to bring reads the first
   word.

   It was also a paragraph in a bullet (p50 85, p90 172, max 454 characters), which is the
   check:token-boxes question one element over. One bullet per gear type fixes both at once, and
   fixes them from the data rather than by truncating: the keys are already there.

   An ARRAY value keeps the "Slings" label, because there it is genuinely a sling list
   ({qty,sizeCm} on 21 routes -> "5x 60cm, 2x 120cm"). Only the keyed-object shape was mislabelled.
   A plain STRING still yields nothing — that is the recorded blocker on making this column
   contributable, and it is deliberately NOT changed here. */
function rackLines(sr){
  if(!sr)return[];
  if(Array.isArray(sr)){var _a=fmtSlingRack(sr);return _a?[{label:"Slings",text:_a}]:[];}
  if(typeof sr!=="object")return[];
  return Object.keys(sr).map(function(k){
    var t=fmtSlingVal(sr[k]);
    if(!t)return null;
    var l=k.replace(/_/g," ");
    return {label:l.charAt(0).toUpperCase()+l.slice(1),text:t};
  }).filter(Boolean);
}
function RouteRackBox({route,onEditRack,rack,onSeeReports,rackGeneric}){const items=gearReadout(route,[]);const cams=(route&&route.cams)||[];const _rackLines=rackLines(route.slingRack);const lines=[];/* draws/screws/ropeLen are contributable in SuggestFix and were rendered NOWHERE — a climber could correct the quickdraw count, the screw count or the rope length, watch it pass the 3-agree gate, and never see it on the route. They belong on the same list as the alpine draws and the rope that were already here. ropeLen is the contributed spelling ("60 m"); ropeLengthM is the enrichment column, and they can disagree because NOTHING mirrors one onto the other. An agreed correction wins (_ropeEdited); absent one the enrichment number is the better value, since it is a number rather than free text. Never print two rope lines. */if(route.draws)lines.push(route.draws+" quickdraws");if(route.screws)lines.push(route.screws+" ice screws");_rackLines.forEach(function(rl){lines.push(rl.label+" — "+rl.text);});if(route.alpineDraws)lines.push(route.alpineDraws+" alpine draws");var _ropeContrib=route.ropeLen?String(route.ropeLen).replace(/\s+/g,""):"";var _ropeLen=(_ropeEdited(route)&&_ropeContrib)?_ropeContrib:(route.ropeLengthM?(route.ropeLengthM+"m"):_ropeContrib);if(route.ropeType||_ropeLen)lines.push("Rope — "+[route.ropeType,_ropeLen].filter(Boolean).join(" "));/* ropeNote used to be appended here in brackets, which meant two things: a note on a route with no ropeType and no length rendered NOWHERE (63 WA routes), and the 381 that did render put a whole paragraph inside a bullet — median 186 chars, max 716. It has its own box below now. *//* No route-level anchor line: `anchorType` was deliberately removed from SS ("anchors are per-pitch
   now"), `routes` has no anchor_type column, and no seed route carries the key — so this read could
   never fire. The live anchor records are `station.anchorType` on a bailout and `wp.anchorType` on a
   waypoint, both of which render elsewhere. */if(route.ascender&&route.ascender!=="Not needed")lines.push("Ascender — "+route.ascender);const specificItems=(rack&&rack.length)?rack:items.map(x=>x.label);const allRack=lines.concat(cams.map(camFmt)).concat(specificItems);const _gbX=((route.activity)||[]).filter(a=>a&&a.gearBeta).map(a=>({who:a.user,avatar:a.avatar,date:a.date,note:a.gearBeta}));const beta=_gbX.concat((route.gearBeta&&route.gearBeta.length)?route.gearBeta:(((route.activity)||[]).filter(a=>a&&a.text&&/(\bcams?\b|\brack\b|doubles|#\d|\bnuts?\b|draws|quickdraw|\bropes?\b|screws|pickets|\bset of\b)/i.test(a.text)).slice(0,3).map(a=>({who:a.user,avatar:a.avatar,date:a.date,note:a.text}))));if(!allRack.length&&!onEditRack)return null;return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3,gap:10}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>RACK</span>{onEditRack?<EditIconButton onClick={()=>onEditRack(allRack.join("\n"))} title={allRack.length?"Suggest a rack correction":"Add the rack for this route"}/>:null}</div><div style={{fontSize:12,color:C.textMuted,marginBottom:10,lineHeight:1.45}}>{rackGeneric?"Standard rack for this discipline — nobody has recorded what this route itself takes, so treat it as a starting point and check it in the field":(route&&route.gearConfidence==="inferred"?"Protection and technical gear — inferred from this route's own description, not confirmed against trip reports":"Protection and technical gear")}.</div>{allRack.length?<div style={{display:"flex",flexDirection:"column",gap:5}}>{allRack.map((gi,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12.5,color:C.text,lineHeight:1.45}}><span style={{color:C.blue,flexShrink:0}}>•</span><span>{gi}</span></div>)}</div>:<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5}}>No rack listed yet — climbed it? Add what you brought.</div>}{beta.length?<div style={{marginTop:11,paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}><div style={{fontSize:11.5,fontWeight:700,color:C.textSub,marginBottom:7}}>Rack beta</div>{beta.map((b,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:8}}>{b.avatar?<Av src={b.avatar} size={24}/>:null}<div style={{flex:1,minWidth:0}}><div style={{fontSize:11.5,color:C.textMuted,marginBottom:1}}>{(b.who||"A climber")+(b.date?" · "+b.date:"")}</div><div style={{fontSize:12.5,color:C.text,lineHeight:1.5,fontStyle:"italic"}}>{"\""+b.note+"\""}</div></div></div>)}{onSeeReports?<button onClick={onSeeReports} style={{marginTop:2,padding:"7px 12px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>Reports →</button>:null}</div>:null}</div>;}
/* `essentials` is route.whatToBring, which is CATALOG ENRICHMENT — import-alpine.mjs maps it
   from catalog/ JSON, the same path as approach/descent/beta. It is not submitted by app
   users and there is no editor for it (the RACK box above has a pencil; this list has none).
   So it must not be attributed to people: #732 shipped this block captioned "Called out by
   climbers who have been up it", which reads as first-hand testimony from named ascensionists
   the row does not contain. Same family as #756 printing a real partner as "Climber" and the
   hash-fabricated user data before it — enrichment described as if a person said it. "on
   file" is the vocabulary the rest of the screen already uses for this, including the
   standard-kit caption two elements down. Do not warm it back up. */
/* WAYPOINTS, rendered once. This markup existed TWICE — byte-identical for 2,300 characters
   under `cragOnly` and under `!cragOnly`, differing only in the empty-state copy — so every
   fix to it had to be made twice or silently applied to half the catalog. That is the shape
   the four-grade-parsers note in CLAUDE.md is about, and the reason it is extracted here
   rather than edited in place twice.

   Two behaviours are new, and they are the two halves of "the waypoints aren't clickable":

   1. A row with a coordinate is now a CONTROL. Tapping it pans the map above to that pin and
      opens its popup. Before this the map's own pins were tappable (a 14px transparent hit
      circle sits under each 6px marker for exactly that reason) but the list below it was
      inert, so the obvious thing to tap — the named row, with the note on it — did nothing.
   2. A row WITHOUT a coordinate says so. `GPXMap` skips `wp.lat == null` silently, so such a
      waypoint is listed here and simply absent from the map above; tapping it could never
      work and the climber had no way to know why. Measured on the live catalog: 44 pins
      across 17 WA alpine routes. An honest line beats a dead control — and note which way
      this points, since the alternative is a row that LOOKS tappable and is not. */
function WaypointList({waypoints,onFocus,emptyCopy,onAdd}){
  if(!(waypoints&&waypoints.length))return <div style={{background:C.card,borderRadius:11,padding:"14px 13px",border:`1px dashed ${C.border}`,textAlign:"center"}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6,marginBottom:9}}>{emptyCopy}</div><button onClick={onAdd} style={{padding:"8px 14px",borderRadius:9,border:"none",background:C.blueSolid,color:"#fff",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Add waypoints</button></div>;
  /* The affordance is taught ONCE, here, rather than repeated as a "Show on map" line on
     every row. These rows look like content and behave like controls, and on a phone there
     is no hover to reveal that — but eight identical hints is the clutter the row hint was
     trying to avoid. One line above the list says it for all of them. */
  const anyPlaced=waypoints.some(wpPlaced);
  return <>{(onFocus&&anyPlaced)?<div style={{fontSize:11.5,color:C.textMuted,marginBottom:8,lineHeight:1.45}}>Tap a waypoint to find it on the map.</div>:null}{waypoints.map((wp,i)=>{
    const _wt=wpType(wp),col=wpColor(_wt),ic=wpIs(wp,"Hazard")?<ActionIcon name="alert" size={16} color={col}/>:wpGlyph(_wt);
    const prevWp=i>0?waypoints[i-1]:null;
    const _samePt=!!(prevWp&&prevWp.lat!=null&&prevWp.lng!=null&&wp.lat!=null&&wp.lng!=null&&Number(prevWp.lat)===Number(wp.lat)&&Number(prevWp.lng)===Number(wp.lng));
    const segMi=(!_samePt&&prevWp&&wp.distMi!=null&&prevWp.distMi!=null)?(wp.distMi-prevWp.distMi):null;
    const segFt=(!_samePt&&prevWp&&wp.elev!=null&&prevWp.elev!=null)?(wp.elev-prevWp.elev):null;
    const placed=wpPlaced(wp);
    const card={background:C.card,borderRadius:11,padding:"10px 12px",marginBottom:7,border:`1px solid ${C.border}`,display:"flex",gap:10};
    const act=(placed&&onFocus)?{...clickable(function(){onFocus(i);}),"aria-label":"Show "+(wp.name||_wt||"this waypoint")+" on the map"}:{};
    return <div key={i}>{prevWp&&(segMi!=null||segFt!=null)?<div style={{display:"flex",alignItems:"center",gap:6,padding:"1px 0 6px 17px",fontSize:11,color:C.textMuted}}><span style={{color:C.border}}>│</span><span>{[segMi!=null?uDistMi(Math.abs(segMi))+" from last":null,segFt!=null?((segFt>=0?"+":"−")+uElev(Math.abs(segFt))+(segFt>=0?" gain":" loss")):null].filter(Boolean).join(" · ")}</span></div>:null}<div {...act} style={(placed&&onFocus)?{...card,cursor:"pointer"}:card}><div style={{width:34,height:34,borderRadius:"50%",background:`${col}22`,border:`1.5px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:15}}>{ic}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><span style={{fontWeight:700,fontSize:13.5}}>{wp.name}</span><div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>{uDistMi(wp.distMi)}</div><div style={{fontSize:12,color:C.textMuted}}>{uElev(wp.elev)}</div></div></div><Pill label={_wt} color={col} bg={`${col}22`} sm/>{wp.note?<div style={{fontSize:12,color:C.textSub,marginTop:4,lineHeight:1.5}}>{wp.note}</div>:null}{wp.directions?<div style={{fontSize:12,color:C.textSub,marginTop:6,lineHeight:1.5,paddingLeft:8,borderLeft:"2px solid "+col}}><span style={{fontWeight:700,color:C.text}}>{"Getting here — "}</span>{wp.directions}</div>:null}{placed?null:<div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.45}}>No coordinate on file — this point is not on the map above. Know where it is? Add it with the edit pencil.</div>}</div></div></div>;
  })}</>;
}
function RouteGearEssentialsBox({route,essentials,onEdit}){const [gearTier,setGearTier]=useState("midweight");const disc=catOf(route);const _itDays=(route&&route.itinerary&&route.itinerary.days&&route.itinerary.days.length)||0;const _multiDay=_itDays>1;const assumed=assumedFor(route,disc).concat(["First aid kit"]).concat(_multiDay?["Tent / shelter","Sleeping bag","Sleeping pad","Stove + fuel","Extra food (overnight)"]:[]);const cond=conditionalFor(route,disc);const _hasOwn=!!(essentials&&essentials.length);const items=mergeGearList(assumed,essentials,cond?cond.items:[]);if(!items.length)return null;return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:3}}><span style={{fontSize:13,fontWeight:700,color:C.text}}>GEAR & ESSENTIALS</span>{onEdit?<EditIconButton onClick={function(){onEdit();}} title={_hasOwn?"Suggest a correction to this route's essentials":"Add gear this route needs beyond the standard kit"}/>:null}</div><div style={{fontSize:12,color:C.textMuted,marginBottom:10,lineHeight:1.45}}>{_hasOwn?("Standard kit for "+(DISC[disc]&&DISC[disc].label?DISC[disc].label.toLowerCase():disc)+", merged with what this route's own notes add. Check it against the notes above, which take precedence."):("Standard kit for "+(DISC[disc]&&DISC[disc].label?DISC[disc].label.toLowerCase():disc)+" — check it against this route's own notes above, which take precedence.")}</div><div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:11}}>{items.map((gi,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12.5,color:C.text,lineHeight:1.45}}><span style={{color:C.blue,flexShrink:0}}>•</span><span>{gi}</span></div>)}</div>{(function(){const cond=conditionalFor(route,disc);if(!cond)return null;return <div style={{paddingTop:10,borderTop:`1px solid ${C.borderLight}`,marginBottom:11}}><div style={{fontSize:11.5,fontWeight:700,color:C.amber,marginBottom:3}}>Only if there is snow</div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:7,lineHeight:1.45}}>This route mentions snow gear conditionally, not as standard kit — check current conditions before you carry it.</div><div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:cond.quote?8:0}}>{cond.items.map((gi,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12.5,color:C.text,lineHeight:1.45}}><span style={{color:C.amber,flexShrink:0}}>?</span><span>{gi}</span></div>)}</div>{cond.quote?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,background:C.surface,borderRadius:8,padding:"7px 9px",fontStyle:"italic"}}>{"“"+cond.quote+"”"}</div>:null}</div>;})()}{/* The "Specific to this route" section used to sit here. It is gone deliberately: its
       contents are merged into the single list above by mergeGearList, because measured against
       real data it was mostly a second copy of that list under a heading claiming the opposite.
       Do not reintroduce it — a route-specific entry now REPLACES the stock wording in place, so
       the qualifier ("Crampons (early/mid-season)") survives without the duplicate line. */}<div style={{paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}><div style={{fontSize:11.5,fontWeight:700,color:C.textSub,marginBottom:7}}>Margin</div><div style={{display:"flex",gap:5,marginBottom:8}}>{GEAR_MARGIN_TIERS.map(t=>{const on=gearTier===t[0];return <button key={t[0]} onClick={()=>setGearTier(t[0])} aria-current={on?"true":undefined} style={{flex:1,padding:"9px 4px",borderRadius:8,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{t[1]}</button>;})}</div>{(()=>{const margin=(GEAR_MARGIN_TIERS.find(t=>t[0]===gearTier)||GEAR_MARGIN_TIERS[1])[2];return margin.length?<div style={{display:"flex",flexDirection:"column",gap:5}}>{margin.map((gi,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12.5,color:C.textSub,lineHeight:1.45}}><span style={{color:C.amber,flexShrink:0}}>+</span><span>{gi}</span></div>)}</div>:<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>Core only.</div>;})()}</div></div>;}
function RouteGearCheck({route,onSeeReports,rack,onEditRack,onEditEssentials,essentials,rackGeneric,onEditRopeNote}){const disc=catOf(route);
  if(disc==="bouldering")return null;
  if(disc==="sport"){const pd=route.pitchDetail||[];const bolts=pd.reduce((s2,p)=>s2+(p.bolts||0),0);const maxB=pd.reduce((m,p)=>Math.max(m,p.bolts||0),0);const np=route.pitches||pd.length||1;const note=bolts>0?(""+bolts+" bolts"+(np>1?(" across "+np+" pitches"):"")+" — bring about "+(maxB+2)+" quickdraws"+(np>1?(" (most-bolted pitch has "+maxB+"; reuse them each pitch)"):" (bolts plus the anchor)")+"."):"Bring quickdraws for the most-bolted pitch plus two for the anchor, and reuse them every pitch.";/* A sport route can still need natural gear, and until this the page could not say so. The
   branch above computes a quickdraw count from the bolt counts and returns — correct for a
   pure sport line, where the rack IS draws, and a lie for the exception. `wa_technicians_of_the_sacred`
   is a 6-pitch 5.12c whose own pitch 6 reads "Hand crack, natural gear; only unbolted pitch";
   a party racking off this page brought draws and nothing to place. Measured: 3 of 2,714 WA
   sport routes say gear is needed somewhere on the route (`probe-sport-routes-needing-natural-gear.mjs`
   — 19 before negations were handled, since most sport rows say "no trad gear needed").
   Only the route's OWN rack is shown. `rackGeneric` means the list is the stock per-discipline
   one, which for sport is quickdraws — printing that here would restate the note above it and
   re-create the duplication mergeGearList exists to remove. */
const ownRack=(!rackGeneric&&Array.isArray(rack)&&rack.length)?rack:null;
return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:6}}>What to bring</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{note}</div>{ownRack?<div style={{marginTop:9,paddingTop:9,borderTop:`1px solid ${C.borderLight}`}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:5}}>ON THIS ROUTE</div>{ownRack.map(function(g,i){return <div key={i} style={{display:"flex",gap:7,fontSize:12.5,color:C.textSub,lineHeight:1.5,marginBottom:3}}><span style={{color:C.textMuted}}>{"•"}</span><span>{g}</span></div>;})}</div>:null}</div>;}
// `rope_note` is populated on 444 WA routes and had no reader of its own — it was appended
// in brackets to the "Rope — " rack bullet, which only exists when ropeType or a rope length
// is set, so 63 notes reached no screen at all. Same shape as descent_text (#707): the
// column was right, the reader was missing.
//
// The simul line is DERIVED FROM THE ROUTE'S OWN WORDS and says so. 108 WA routes already
// state it — "Most parties simul-climb much of the terrain and rope up only for the low-5th
// sections" (Black Peak NE Ridge) — but it is buried in `beta` (42) or a per-pitch note (80),
// where nothing surfaces it. It is deliberately NOT inferred from grade: "parties commonly
// simul-climb this" is a claim about a specific route, and deriving it from "4th class and
// long" would manufacture that claim on 415 routes at once.
const SIMUL_RE=/\bsimul[- ]?climb|\bsimul\b|moving together|move together|running belay/i;
function simulMentioned(route){
  if(!route)return false;
  const parts=[route.ropeNote,route.beta,route.descentText];
  const pd=Array.isArray(route.pitchDetail)?route.pitchDetail:[];
  for(const p of pd) parts.push(p&&(p.notes||p.note),p&&p.anchor,p&&p.grade);
  return parts.some(function(t){return t&&SIMUL_RE.test(String(t));});
}
function RopeworkBox({route,onEdit}){
  const note=route&&route.ropeNote&&String(route.ropeNote).trim();
  const simul=simulMentioned(route);
  if(!note&&!simul)return null;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:note?7:0,gap:10}}>
      <span style={{fontSize:13,fontWeight:700,color:C.text}}>ROPEWORK</span>
      {onEdit?<EditIconButton onClick={onEdit} title="Edit the ropework note"/>:null}
    </div>
    {note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,wordBreak:"break-word",overflowWrap:"break-word"}}>{note}</div>:null}
    {simul?<div style={{marginTop:note?10:8,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:10,padding:"9px 11px"}}>
      <div style={{fontSize:12.5,fontWeight:700,color:C.blue,marginBottom:3}}>{"Parties move together on this one"}</div>
      <div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>
        {"This route's own notes mention simul-climbing or running belays. On long 4th- and low-5th-class ground that is often what makes the summit possible in a day — pitching it all out can cost more time than the route has. It is an advanced technique: a fall pulls both climbers, so it needs conditions, a rack you can keep between you, and a partner you have done it with."}
      </div>
    </div>:null}
  </div>;
}
  return <><RouteRackBox route={route} onEditRack={onEditRack} rack={rack} onSeeReports={onSeeReports} rackGeneric={rackGeneric}/><RopeworkBox route={route} onEdit={onEditRopeNote}/><RouteGearEssentialsBox route={route} essentials={essentials} onEdit={onEditEssentials}/></>;
}
const EditIconButton=({onClick,title})=><button onClick={onClick} title={title} aria-label={title} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"8px 12px",borderRadius:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>{"✎ Edit"}</button>;
function weatherIconKind(code){if(code==null)return null;if(code===0||code===1)return "sun";if(code===2)return "cloudSun";if(code===3)return "cloud";if(code===45||code===48)return "fog";if(code===95||code===96||code===99)return "storm";if([71,73,75,77,85,86].indexOf(code)>=0)return "snow";if([51,53,55,56,57,61,63,65,66,67,80,81,82].indexOf(code)>=0)return "rain";return "cloud";}
function WeatherIcon({code,color,size}){const kind=weatherIconKind(code);if(!kind)return null;const s=size||16;const p={width:s,height:s,viewBox:"0 0 24 24",fill:"none",stroke:color||"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",style:{flexShrink:0}};if(kind==="sun")return <svg {...p}><circle cx="12" cy="12" r="4.5"/><line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/><line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/><line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/><line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/></svg>;if(kind==="cloudSun")return <svg {...p}><circle cx="8" cy="8" r="3.2"/><line x1="8" y1="2.5" x2="8" y2="4"/><line x1="2.5" y1="8" x2="4" y2="8"/><line x1="3.8" y1="3.8" x2="4.8" y2="4.8"/><path d="M8.5 20h8a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.4-2A4.5 4.5 0 0 0 6.5 20z"/></svg>;if(kind==="cloud")return <svg {...p}><path d="M6.5 20h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 20z"/></svg>;if(kind==="fog")return <svg {...p}><path d="M6.5 15h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 15z"/><line x1="4" y1="19" x2="20" y2="19"/><line x1="6" y1="22" x2="18" y2="22"/></svg>;if(kind==="rain")return <svg {...p}><path d="M6.5 14h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 14z"/><line x1="8" y1="18" x2="7" y2="21"/><line x1="12" y1="18" x2="11" y2="21"/><line x1="16" y1="18" x2="15" y2="21"/></svg>;if(kind==="snow")return <svg {...p}><path d="M6.5 14h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 14z"/><line x1="8" y1="18" x2="8" y2="22"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="16" y1="18" x2="16" y2="22"/><line x1="6.5" y1="20" x2="9.5" y2="20"/><line x1="10.5" y1="20" x2="13.5" y2="20"/><line x1="14.5" y1="20" x2="17.5" y2="20"/></svg>;if(kind==="storm")return <svg {...p}><path d="M6.5 13h11a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.5-2A4.5 4.5 0 0 0 6.5 13z"/><polyline points="13 13 10 18 13 18 11 23"/></svg>;return null;}
const VERIF={verified:{label:"Verified",icon:"✓",color:C.green,bg:C.greenBg},community:{label:"Community",icon:"👥",color:C.blue,bg:C.blueBg},unverified:{label:"Flagged",icon:"⚠",color:C.amber,bg:C.amberBg},unreviewed:{label:"Not reviewed",icon:"i",color:C.textMuted,bg:C.surface}};
function VerifyBadge({v,sm}){const t=VERIF[(v||{}).status]||VERIF.unverified;const st=(v||{}).status;const ic={verified:"check",community:"user",unreviewed:"info"}[st]||"alert";return <Pill icon={<ActionIcon name={ic} size={sm?11:13} color={t.color}/>} label={t.label} color={t.color} bg={t.bg} sm={sm}/>;}
/* ProvenancePanel (the DATA CONFIDENCE box) was removed with its only call site: it and
   DATA QUALITY both answered "how complete is this route's data" at the top of Overview,
   and per-section GapNotes answer it where it is actionable instead. Its 'Confirm accurate'
   action went with it — nothing else called onConfirmData, so that wiring is gone from
   ClimbMatch.jsx too. */
function axBlurb(key,disc){
  const D={
    physical:{_:"How hard your body has to work — power, stamina, and endurance.",bouldering:"Raw power and body tension — how hard you pull and squeeze on each move.",sport:"Sustained pump and power held over the whole pitch.",trad:"Strenuous climbing, plus hanging on long enough to place gear.",ice:"Calf and forearm endurance from swinging tools and kicking crampons.",mixed:"Power and core tension on steep tooling with little rest.",aid:"Less raw power, more grind — hauling, jugging, and long hours on the wall.",alpine:"Whole-day endurance: vertical gain, pack weight, altitude, and distance.",mountaineering:"Whole-day endurance: vertical gain, pack weight, altitude, and distance.",scrambling:"Aerobic effort — distance, elevation gain, and time on your feet.",hiking:"Aerobic effort — distance, elevation gain, and time on your feet."},
    technical:{_:"How skilled and precise the movement and technique need to be.",bouldering:"Intricate, precise movement — balance, heel hooks, exact body positions.",sport:"Movement difficulty — how technical the hardest sequences are.",trad:"Hard moves, plus the skill to place solid protection while climbing.",ice:"Tool and crampon technique — reading the ice and placing tools cleanly.",mixed:"Dry-tooling precision and linking moves from rock to ice.",aid:"Aid craft — placing and trusting marginal gear and running the systems.",alpine:"Mixed skills — snow, rock, and route management while moving.",mountaineering:"Mixed skills — snow, rock, and route management while moving.",scrambling:"Hands-on moves and careful footwork on steep, exposed ground.",hiking:"Footing and balance on rough or steep trail."},
    exposure:{_:"How airy the position feels and how consequential a fall would be.",bouldering:"Usually low — you are close to the pads, though highballs raise the stakes.",ice:"Airy positions, plus the danger of falling onto tools and ice.",mixed:"Airy positions, plus the danger of falling onto tools and ice.",aid:"How airy the wall feels and how serious a fall or gear failure would be.",alpine:"Big-mountain exposure — drop-offs where a slip has real consequences.",mountaineering:"Big-mountain exposure — drop-offs where a slip has real consequences.",scrambling:"Big drop-offs with no rope — a slip can be serious.",hiking:"Generally low; any notable drop-offs are flagged."},
    commitment:{_:"How committing the route is and how hard it is to bail once started.",bouldering:"Low — you can step or down-climb off most problems anytime.",sport:"Moderate — retreat usually just means lowering off.",trad:"How hard it is to retreat once committed, and how much gear it takes.",ice:"Retreat can mean cold V-thread rappels; weather closes the window.",mixed:"Retreat can mean cold V-thread rappels; weather closes the window.",aid:"High — a wall commits you to the route and a planned descent.",alpine:"How much of a full day (or more) it demands, and how hard it is to turn back.",mountaineering:"How much of a full day (or more) it demands, and how hard it is to turn back.",scrambling:"Committing ground where reversing can be harder than going up.",hiking:"Mostly distance and daylight — turning back is usually straightforward."},
    routefinding:{_:"How hard it is to find and follow the correct line.",bouldering:"Minimal — the problem and its holds are right in front of you.",sport:"Usually straightforward — follow the bolts.",trad:"Reading the line and the right gear placements as you go.",ice:"Picking and protecting a line through the ice features.",mixed:"Picking and protecting a line through ice and rock features.",aid:"Following the crack systems and the topo.",alpine:"Real navigation — glaciers, couloirs, and finding the way in changing conditions.",mountaineering:"Real navigation — glaciers, couloirs, and finding the way in changing conditions.",scrambling:"Easy to wander off the safe line; staying on route is a skill.",hiking:"Following the trail and any junctions or off-trail sections."}
  };
  const m=D[key]||{};return m[disc]||m._;
}
function DiffRadar({d,disc,ratings,onRate}){
  if(!d)return null;
  const rt=ratings||{};const W=6;const dv=k=>{const b=d[k]||0;const votes=Object.keys(rt[k]||{}).map(function(uid){return rt[k][uid];});if(!votes.length)return b;const avg=votes.reduce(function(s,v){return s+v;},0)/votes.length;return Math.round(((b*W+avg*votes.length)/(W+votes.length))*10)/10;};
  const ax=[["physical","Physical","Phys",d.physical],["technical","Technical","Tech",d.technical],["exposure","Exposure","Expo",d.exposure],["commitment","Commitment","Comm",d.commitment],["routefinding","Route-finding","Route",d.routefinding]],N=ax.length,R=50,cx=70,cy=62,pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/N;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];},poly=ax.map((x,i)=>pt(i,(dv(x[0])/5)*R).join(",")).join(" "),grid=[1,2,3,4,5].map(g=>ax.map((_,i)=>pt(i,(g/5)*R).join(",")).join(" "));
  const dl=(CAT[disc]||{}).label||disc||"this route";
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:2}}>DIFFICULTY BREAKDOWN</div><div style={{fontSize:12,color:C.textMuted,marginBottom:9,lineHeight:1.5}}>A 1–5 read on what makes this hard, and what each part means for {dl} — blended from the base rating and every climber's own read below.</div><div style={{marginBottom:8}}><svg width="200" height="186" viewBox="0 -6 140 130" style={{display:"block",margin:"0 auto 12px"}}>{grid.map((g,i)=><polygon key={i} points={g} fill="none" stroke={C.border} strokeWidth="1"/>)}{ax.map((x,i)=>{const[ex,ey]=pt(i,R);return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke={C.border} strokeWidth="1"/>;})}<polygon points={poly} fill={`${C.blue}33`} stroke={C.blue} strokeWidth="2"/>{ax.map((x,i)=>{const[lx,ly]=pt(i,R+10);return <text key={i} x={lx} y={ly} fontSize="7.5" fill={C.textSub} textAnchor="middle" dominantBaseline="middle">{x[2]}</text>;})}</svg><div>{ax.map(x=>{const cur=dv(x[0]);const mine=(rt[x[0]]||{})[ME.id];const nRated=Object.keys(rt[x[0]]||{}).length;return <div key={x[0]} style={{marginBottom:7}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{fontSize:12,color:C.textSub,width:74,flexShrink:0}}>{x[1]}</span><div style={{flex:1}}><Bar val={cur} max={5} color={cur>=4?C.red:cur>=3?C.amber:C.green} h={5}/></div><span style={{fontSize:13,fontWeight:600,color:C.textSub,width:34,textAlign:"right"}}>{cur}/5</span></div><div style={{display:"flex",alignItems:"center",gap:7,paddingLeft:80,flexWrap:"wrap",marginTop:4}}><span style={{fontSize:11.5,color:C.textMuted,marginRight:2}}>your read</span>{[1,2,3,4,5].map(v=><button key={v} onClick={()=>onRate&&onRate(x[0],v)} aria-pressed={mine===v} aria-label={x[1]+": rate "+v+" of 5"} style={{width:30,height:30,borderRadius:"50%",border:"1.5px solid "+(mine===v?C.blue:C.border),background:mine===v?C.blueSolid:"transparent",color:mine===v?"#fff":C.textMuted,fontSize:14,fontWeight:700,cursor:"pointer",padding:0,lineHeight:1,flexShrink:0}}>{v}</button>)}{mine!=null?<span style={{fontSize:11.5,color:C.blue,marginLeft:3}}>{"✓ counted"+(nRated>1?" · "+nRated+" climbers rated":"")}</span>:(nRated?<span style={{fontSize:11.5,color:C.textMuted,marginLeft:3}}>{nRated+" climber"+(nRated!==1?"s":"")+" rated"}</span>:null)}</div></div>;})}</div></div><div style={{marginTop:6,borderTop:`1px solid ${C.borderLight}`,paddingTop:8}}>{ax.map(x=><div key={x[0]} style={{marginBottom:7}}><div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:12,fontWeight:700,color:dv(x[0])>=4?C.red:dv(x[0])>=3?C.amber:C.green}}>{x[1]}</span><span style={{fontSize:12,color:C.textMuted}}>{dv(x[0])}/5</span></div><div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:1}}>{axBlurb(x[0],disc)}</div></div>)}</div></div>;
}
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
   the same row reports more, the label says so instead of quietly disagreeing. */
function rappelLabel(route){var n=(!_rapEdited(route)&&route&&route.rappelDetail&&route.rappelDetail.length)?route.rappelDetail.length:null;
  if(n!=null){var mx=rappelReportedMax(route);return (mx!=null&&mx>n)?(n+"\u2013"+mx+"x"):(n+"x");}
  var r=route&&route.rappels;if(r==null)return null;if(typeof r==="object")return r.count!=null?r.count+"x":null;var t=String(r).trim();if(/^\d+$/.test(t))return t+"x";var m=t.match(/^~?\s*(\d+)\s*[-\u2013]\s*(\d+)/);if(m)return m[1]+"\u2013"+m[2];var n2=rappelCount(route);return n2!=null?"~"+n2+"x":null;}
function rappelCount(route){if(!_rapEdited(route)&&route&&route.rappelDetail&&route.rappelDetail.length)return route.rappelDetail.length;var r=route&&route.rappels;if(r==null)return null;if(typeof r==="object")return r.count!=null?r.count:null;var s=String(r).trim();if(/^\d+$/.test(s))return parseInt(s,10);var m=s.match(/^~?\s*(\d+)\s*[-–]?\s*(?:rappels?|raps?)?\b/i);if(m)return parseInt(m[1],10);m=s.match(/\b(\d+)\s*[-–]?\s*(?:rappels?|raps?)\b/i);if(m)return parseInt(m[1],10);return null;}
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
  return !RAP_ALT_RE.test(s);
}
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
function TechStats({route,onEdit}){
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
    :recShape==="point"?" This route finishes at a different trailhead, so there is no round trip to show."
    :" This route is a loop or point-to-point outing, so no round-trip distance is shown.";
  let stats,note;
  if(disc==="bouldering"){
    stats=[["Crux grade",cruxGrade(route.cruxGrade||route.grade),C.amber]];
    if(hasDist)stats.unshift(["Approach",uDist(distKm),C.blue]);
    if(hasDist&&isOutBack)stats.splice(1,0,["Round trip",uDist(roundTripKm),C.blue]);
    if(route.routeFt)stats.unshift(["Boulder height",uElev(route.routeFt),C.orange]);
    note="Height is the boulder itself. The approach is just the walk in — there is no meaningful elevation gain to a single boulder."+rtNote+"";
  }else if(disc==="hiking"||disc==="mountaineering"){
    stats=[];
    if(hasAscent)stats.push(["Total ascent","↑ "+uElev(totalAscentFt),C.green]);
    if(hasDist)stats.push(["Distance",uDist(distKm),C.blue]);
    if(hasDist&&isOutBack)stats.push(["Round trip",uDist(roundTripKm),C.blue]);
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
    if(hasDist)stats.push(["Distance",uDist(distKm),C.blue]);
    if(hasDist&&isOutBack)stats.push(["Round trip",uDist(roundTripKm),C.blue]);
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
    if(route.pitches>0)stats.push(["Pitches",route.pitches,C.blue]);
    if(hasAscent)stats.push([gainIsWholeOuting?"Total ascent":"Approach gain","↑ "+uElev(totalAscentFt),C.green]);
    if(hasDist)stats.push([distIsWholeTrip?"Distance":"Approach dist",uDist(distKm),C.blue]);
    if(hasDist&&isOutBack)stats.push(["Round trip",uDist(roundTripKm),C.blue]);
    if(route.cruxGrade||route.grade)stats.push(["Crux grade",cruxGrade(route.cruxGrade||route.grade),C.amber]);
    if(route.maxAngle)stats.push(["Max slope",route.maxAngle+"°",C.orange]);
    if(route.peakMetadata&&route.peakMetadata.prominence)stats.push(["Prominence",uElev(route.peakMetadata.prominence),C.purple]);
    /* Second copy of the Rappels tile — same reasoning as the pitched branch above. */
    const _gainClause=!hasAscent?"":(gainIsWholeOuting?"Total ascent is the whole day from the trailhead, not just the walk in.":"Approach gain is the hike in to the base.");const _distClause=!hasDist?"":(distIsWholeTrip?" Distance is the whole outing, not just the walk in.":" Approach distance is the hike in to the base.");const _bothApproach=hasAscent&&hasDist&&!gainIsWholeOuting&&!distIsWholeTrip;note=(hasAscent||hasDist)?(climbLabel+" is the climbing itself. "+(_bothApproach?"Approach gain and distance are the hike in to the base — kept separate so the climb is not buried in approach numbers.":(_gainClause+_distClause).trim())+rtNote+""):null;
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
  if(route.rock)stats.push(["Rock",String(route.rock),C.textSub]);
  if(route.crux)stats.push(["Crux",String(route.crux),C.textSub]);
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>TECHNICAL STATS</div>{onEdit?<EditIconButton onClick={onEdit} title="Edit technical stats"/>:null}</div>{(function(){var ag=route.alpineGrade||route.alpine_grade,rg=route.rockGrade||route.rock_grade,ig=route.iceGrade||route.ice_grade,adg=route.aidGrade||route.aid_grade,cm=route.commitment,gg=route.grade;var P=[];if(rg)P.push(["Rock",rg]);if(cm)P.push(["Commitment",cm]);if(ag)P.push(["Alpine",ag]);if(ig)P.push(["Ice",ig]);if(adg)P.push(["Aid",adg]);if(P.length<1&&gg)P.push(["Grade",gg]);var notes=[];[["Rock",rg],["Commitment",cm],["Alpine",ag],["Ice",ig],["Aid",adg],["Grade",gg]].forEach(function(p){var d=p[1]?gradeDetail(p[1]):"";if(!d||notes.some(function(n){return n[1]===d;}))return;notes.push([p[0],d]);});if(P.length<1)return null;var cmExp=cm?COMMITMENT_EXPLAINERS[String(cm).replace(/^Grade\s*/i,"").trim()]:null;var bailWps=(route.waypoints||[]).filter(function(w){return wpIs(w,"Bailout")&&w.distMi!=null;}).sort(function(a,b){return a.distMi-b.distMi;});var nearBail=bailWps[0];return <div style={{marginBottom:11,paddingBottom:11,borderBottom:"1px solid "+C.border}}><div style={{fontSize:11,color:C.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:0.4,marginBottom:7}}>Composite Grade</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{P.map(function(p){return <span key={p[0]} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:13,fontWeight:700,color:C.text,background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"3px 9px"}}><span style={{color:C.textMuted,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:0.3}}>{p[0]}</span>{shortGrade(p[1])}</span>;})}</div>{notes.length?<div style={{marginTop:8}}>{notes.map(function(n){return <div key={n[0]} style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:4}}><span style={{fontSize:10,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3}}>{n[0]}</span>{" · "+n[1]}</div>;})}</div>:null}{cmExp?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:8}}>{nearBail?("Committing — nearest bail point is "+(nearBail.timeToSafety||(uDistMi(nearBail.distMi)+" away"))+"."):cmExp}</div>:null}{cmExp?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:4}}>{"Commitment counts the climb, not the walk in — a long approach can make a Grade II a multi-day trip."}</div>:null}</div>;})()}<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>{stats.map(st=><div key={st[0]} style={{background:C.surface,borderRadius:9,padding:"8px 10px"}}><div style={{fontSize:15,fontWeight:700,color:st[2]}}><CountUp value={st[1]}/></div><div style={{fontSize:11,color:C.textMuted,marginTop:2,textTransform:"uppercase",letterSpacing:0.4}}>{st[0]}</div></div>)}</div>{route.fa&&!(route.peakMetadata&&route.peakMetadata.firstAscent)?<div style={{marginTop:10,fontSize:12.5,color:C.textSub,lineHeight:1.4}}><span style={{fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4}}>First Ascent</span>{" · "+route.fa}</div>:null}{note?<div style={{fontSize:11.5,color:C.textMuted,marginTop:8,lineHeight:1.5}}>{note}</div>:null}</div>;
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
function PitchConsensus({p,onSuggestFix}){
  const FACTS=[["Bolts (this pitch)",p.bolts!=null?String(p.bolts):null],["Anchor",p.anchor||null]].filter(f=>f[1]!=null);
  if(!FACTS.length)return null;
  return <div style={{background:C.surface,borderRadius:8,padding:"10px 11px",marginBottom:9,border:"1px solid "+C.border}}>
    <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8,textTransform:"uppercase",letterSpacing:0.4}}>Pitch gear</div>
    {FACTS.map(f=>{const label=f[0];return <div key={label} style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
      <span style={{fontSize:12.5,color:C.textSub}}>{label}</span><span style={{fontSize:13,fontWeight:700,color:C.text}}>{f[1]}</span>
    </div>;})}
    {onSuggestFix?<button onClick={onSuggestFix} style={{padding:"9px 12px",marginTop:3,background:"transparent",color:C.textSub,border:"1px solid "+C.border,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>Suggest a fix</button>:null}
  </div>;
}
function BetaDiff({route}){
  const acts=(route.activity||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  if(!acts.length)return null;
  const MN=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtShort=d=>{if(!d)return "recently";const q=String(d).split("-");return (MN[parseInt(q[1])]||"")+" "+(q[2]?parseInt(q[2]):"");};
  const recent=acts.slice(0,6);const tagCount={};recent.forEach(a=>(a.condTags||[]).forEach(t=>{t=normTag(t);tagCount[t]=(tagCount[t]||0)+1;}));
  const tags=Object.keys(tagCount).sort((a,b)=>tagCount[b]-tagCount[a]).slice(0,5);const latest=acts[0];
  return <div style={{background:"linear-gradient(155deg,#0f1e14,#10241a)",border:"1px solid "+C.greenDim,borderRadius:13,padding:"13px 14px",marginBottom:13}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}><div style={{fontSize:14,fontWeight:700,color:C.green}}>What’s changed</div><span style={{fontSize:11.5,fontWeight:700,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:6,padding:"2px 7px"}}>{"✓ "+acts.length+" report"+(acts.length!==1?"s":"")}</span></div><div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:tags.length?10:0}}>{recent.length+" recent part"+(recent.length!==1?"ies":"y")+" checked in. Latest: "+(latest.user?latest.user.split(" ")[0]:"a climber")+" on "+fmtShort(latest.date)+(latest.tickType?" · "+latest.tickType:"")+"."}</div>{tags.length?<div><div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>What recent parties are flagging</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tags.map(t=><span key={t} style={{fontSize:11.5,fontWeight:600,color:C.text,background:C.card,border:"1px solid "+C.border,borderRadius:7,padding:"3px 8px"}}>{t}{tagCount[t]>1?" ×"+tagCount[t]:""}</span>)}</div></div>:null}</div>;
}
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
/* ONE SECTION, ONE SEQUENCE. `pitch_detail` was rendered as two boxes stacked on the Plan tab —
   ROUTE BETA (the travel legs) and then PITCH-BY-PITCH (the roped pitches) — and on the 144 routes
   that hold both kinds that ordering is a claim the record never made. wa_big_four_mountain_tower_
   route is "Approach gully / First tower / Notch rappel / Second and third towers / Summit
   snowfield": travel, climbing, descent, climbing, travel. Split into two boxes it read as three
   walks followed by two pitches, which is not the climb. The record's own array ORDER is the
   sequence, and the only way to show it is one list.
   WHAT DOES NOT MERGE IS THE VOCABULARY, and that was the explicit ask: a roped pitch and a walk
   are different kinds of ground and must stay distinguishable at a glance. So a pitch keeps its
   square P-badge, its blue accent and its full detail (length, bolts, anchor, per-pitch consensus,
   photos, beta comments); a section keeps a round badge, a terrain chip and its own three tiles.
   The spine down the left is what carries the integration — it runs through both kinds, in order.
   `data-kind` / `data-label` are on each row for check:pitch-split, which used to tell the two
   apart by which HEADING an entry landed under. With one heading the classification is only
   visible in the markup, and asserting it per row also lets that guard check the ORDER, which is
   the property this change is about. */
function breakdownRows(route){
  const pd=(route&&Array.isArray(route.pitchDetail))?route.pitchDetail:[];
  let nP=0,nS=0,cum=0;
  let rows=pd.map(function(p,i){
    const kind=pitchEntryKind(p,route);
    const raw=p.n!=null?p.n:(p.pitch!=null?p.pitch:i+1);
    const lbl=String(raw==null?"":raw).trim();
    // `_n` is the raw label and stays the comment key. `_badge` is what the 26px badge can
    // actually hold and `_title` is the descriptive label — "Chimney pitch", "Gendarme" —
    // which had no reader at all: the badge rendered "P"+label, i.e. "PChimney pitch".
    const num=/^p?\s*(\d+)/i.exec(lbl);
    const bare=/^p?\s*\d+\s*(?:[-–]\s*p?\s*\d+)?$/i.test(lbl);
    const row=Object.assign({},p,{_i:i,_kind:kind,_n:raw,
      _note:p.note!=null?p.note:(p.notes||"")});
    if(kind==="pitch"){row._pIdx=nP++;row._badge=num?num[1]:String(nP);row._title=bare?"":lbl;}
    else {row._seq=++nS;row._label=lbl||("Section "+nS);}
    return row;
  });
  // Sort only when every label is a number and nothing is interleaved with it — descriptive
  // labels ("Chimney pitch") are already in route order and `a._n-b._n` on them is NaN, which
  // is not an ordering, and a mixed route's two label spaces ("1" and "Approach gully") cannot
  // be compared at all. On a pure-pitch route this is exactly the old behaviour.
  if(!nS){
    const allNum=rows.every(p=>typeof p._n==="number"||(typeof p._n==="string"&&p._n.trim()!==""&&!isNaN(Number(p._n))));
    if(allNum)rows=rows.slice().sort((a,b)=>Number(a._n)-Number(b._n));
  }
  // Cumulative height gained is a CLIMBING figure: it counts roped pitches and steps over the
  // walking between them, which is what "N ft up" has always meant on this row.
  rows.forEach(function(r){if(r._kind==="pitch"){cum+=(r.lengthM||0);r._cum=cum;}});
  return {rows:rows,pitchCount:nP,stageCount:nS};
}
function RouteBreakdown({route,focus,onEdit,comments,commentsUnavailable,onCommentAdd}){
  const [open,setOpen]=useState(null);
  const {rows,pitchCount,stageCount}=breakdownRows(route);
  useEffect(function(){if(focus==null)return;const hit=rows.filter(r=>r._kind==="pitch")[focus];if(hit)setOpen(hit._i);},[focus]);
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
  const short=pitchShortfall(route,rows.length)?(" The route lists "+route.pitches+" pitches and "+rows.length+" section"+(rows.length!==1?"s are":" is")+" described here."):"";
  const intro=(pitchCount&&stageCount)
    ?("The whole climb in order — "+rows.length+" sections, of which "+pitchCount+" are roped pitches and "+stageCount+" are travel or route-finding legs."+short)
    :(pitchCount
      ?(pitchCount+" roped pitch"+(pitchCount!==1?"es":"")+", in route order."+short)
      :("How the route goes, section by section — "+stageCount+" leg"+(stageCount!==1?"s":"")+". These are stages of travel and route-finding, not roped pitches."));
  return <div style={{marginBottom:14}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:18,marginBottom:9,gap:10}}>
      <SL prov={sectionProvenance(route,"pitchDetail")}>ROUTE BREAKDOWN</SL>
      <div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}><div style={{fontSize:11.5,fontWeight:700,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:7,padding:"4px 9px",whiteSpace:"nowrap"}}>Tap for detail</div>{onEdit?<EditIconButton onClick={onEdit} title="Edit the route breakdown"/>:null}</div>
    </div>
    <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>{intro}</div>
      {rows.map(function(r,idx){
        const isOpen=open===r._i;
        const isPitch=r._kind==="pitch";
        const last=idx===rows.length-1;
        const hasMore=isPitch||!!(r.grade||r.lengthM!=null||r.anchor);
        const accent=r.crux?C.amber:(isPitch?C.blue:C.border);
        return <div key={r._i} data-kind={r._kind} data-label={isPitch?("P"+r._badge+(r._title?" "+r._title:"")):r._label} id={isPitch?("pitch-"+r._pIdx):undefined} style={{display:"flex",gap:10,marginBottom:last?0:9,scrollMarginTop:"80px"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
            <div aria-hidden="true" style={{width:26,height:26,borderRadius:isPitch?7:13,background:r.crux?C.amberBg:(isPitch?C.blueBg:C.surface),border:"1px solid "+(r.crux?C.amber:(isPitch?C.blueDim:C.border)),display:"flex",alignItems:"center",justifyContent:"center",fontSize:isPitch?11.5:12,fontWeight:700,color:r.crux?C.amber:(isPitch?C.blue:C.textSub)}}>{isPitch?("P"+r._badge):r._seq}</div>
            {last?null:<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:14}}/>}
          </div>
          <div style={{flex:1,minWidth:0,background:C.surface,border:"1px solid "+C.border,borderLeft:"3px solid "+accent,borderRadius:10}}>
            <div {...(hasMore?clickable(function(){setOpen(isOpen?null:r._i);}):{})} aria-expanded={hasMore?isOpen:undefined} aria-label={hasMore?(isPitch?pitchRowName(r):stageRowName(r)):undefined} style={{padding:"9px 11px",cursor:hasMore?"pointer":"default"}}>
              {(isPitch&&r._title)?<div style={{fontSize:12.5,fontWeight:700,color:C.text,marginBottom:3,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r._title}</div>:null}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap",marginBottom:r._note?5:0}}>
                <span style={{fontSize:13,fontWeight:700,color:isPitch?C.amber:C.text,minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{isPitch?(r.grade||("Pitch "+r._badge)):r._label}{r.crux?<span style={{color:C.red,fontSize:11.5,marginLeft:6,fontWeight:700,whiteSpace:"nowrap"}}>CRUX</span>:null}</span>
                {/* A stage's `grade` is TERRAIN PROSE, not a grade token: measured across the
                    live catalog it runs to 51 characters ("Class 2-3 rock scramble (easy snow
                    ridge in winter)", "Glacier travel to a bergschrund/moat"). Drawn as a
                    nowrap chip in a flexShrink:0 group it measured 315px wide and put its own
                    row's right edge at x=392 on a 390px phone, clipping the ▸ expander off
                    screen. So this group SHRINKS and WRAPS, and only the ▸ is pinned. Do not
                    restore whiteSpace:nowrap here — that is what a pitch grade wants, and a
                    stage is the other half of pitch_detail. */}
                <span style={{display:"flex",alignItems:"center",gap:7,flexShrink:1,minWidth:0,flexWrap:"wrap",justifyContent:"flex-end",marginLeft:"auto"}}>
                  {(!isPitch&&r.grade)?<span style={{fontSize:11.5,fontWeight:700,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:6,padding:"2px 7px",minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r.grade}</span>:null}
                  {(isPitch?hasPitchLen:(hasStageLen&&r.lengthM!=null))?<span style={{fontSize:11.5,color:C.textMuted,whiteSpace:"nowrap"}}>{r.lengthM!=null?uLen(r.lengthM):"—"}</span>:null}
                  {(isPitch&&hasPitchLen&&r._cum)?<span style={{fontSize:11.5,color:C.textMuted,opacity:0.6,whiteSpace:"nowrap"}}>{uLen(r._cum)+" up"}</span>:null}
                  {hasMore?<span aria-hidden="true" style={{fontSize:11.5,color:C.blue,fontWeight:700,whiteSpace:"nowrap"}}>{isOpen?"▾":"▸"}</span>:null}
                </span>
              </div>
              {r._note?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,wordBreak:"break-word",overflowWrap:"break-word"}}>{r._note}</div>:null}
            </div>
            {isOpen?<div style={{padding:"0 11px 11px"}}>
              <div style={{marginTop:2,paddingTop:9,borderTop:"1px solid "+C.borderLight,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:isPitch?9:0}}>
                {(isPitch
                  ?[["Length",r.lengthM!=null?uLen(r.lengthM):"—",C.blue],["Bolts (this pitch)",r.bolts!=null?String(r.bolts):"—",C.amber],["Anchor",r.anchor||"—",/bolt/i.test(r.anchor||"")?C.green:C.blue]]
                  :[["Terrain",r.grade||"—",C.amber],["Length",r.lengthM!=null?uLen(r.lengthM):"—",C.blue],["Anchor / belay",r.anchor||"—",C.blue]]
                ).map(function(s){return <div key={s[0]} style={{background:C.card,borderRadius:8,padding:"7px 9px",textAlign:"center",minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:s[2],overflowWrap:"anywhere"}}>{s[1]}</div><div style={{fontSize:11,color:C.textMuted,marginTop:2,lineHeight:1.3}}>{s[0]}</div></div>;})}
              </div>
              {isPitch?<><PitchConsensus p={r} onSuggestFix={onEdit}/><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Photos</div>{r.photos&&r.photos.length?<PhotoRow items={r.photos} w={160} h={108}/>:<div style={{background:C.card,borderRadius:8,padding:"14px 12px",textAlign:"center",border:`1px dashed ${C.border}`}}><div style={{marginBottom:3,display:"flex",justifyContent:"center"}}><ActionIcon name="camera" size={21} color={C.textMuted}/></div><div style={{fontSize:12,color:C.textMuted}}>No photos yet — add route photos for this pitch</div></div>}<PitchComments targetId={route.id+"_pitch_"+r._n} comments={comments} commentsUnavailable={commentsUnavailable} onAdd={onCommentAdd}/></>:null}
            </div>:null}
          </div>
        </div>;})}
    </div>
  </div>;
}
/* The trailhead was one line of text — `Trailhead: Killen Creek Trailhead (Trail #113,
   FR-2329)` — followed by prose. Everything else the row already knew was somewhere else or
   nowhere: the coordinates (650 routes carry trailheadLat/Lng and none of them rendered as a
   number you could read out or paste into a GPS), the elevation the Trailhead waypoint
   stores, the bearing and straight-line distance from the car to the peak, the approach
   distance and gain from the route itself, and the seasonal gate that decides whether the
   road is even open. Those are the facts you check standing at an unmarked junction in the
   dark, so they belong in one block above the prose rather than spread across GETTING THERE,
   WAYPOINTS and the header stat strip.

   Everything here is DERIVED from stored fields. Nothing is inferred: a tile is omitted when
   its input is missing rather than filled with a plausible number, which is the failure mode
   this file has hit repeatedly (see scarfHrs coercing a missing approach to a zero one). */
function compass16(lat1,lng1,lat2,lng2){
  const R=Math.PI/180;
  const y=Math.sin((lng2-lng1)*R)*Math.cos(lat2*R);
  const x=Math.cos(lat1*R)*Math.sin(lat2*R)-Math.sin(lat1*R)*Math.cos(lat2*R)*Math.cos((lng2-lng1)*R);
  const deg=(Math.atan2(y,x)/R+360)%360;
  return ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(deg/22.5)%16];
}
function TrailheadCard({route,onEdit}){
  const [copied,setCopied]=useState(false);
  const al=route.approachLogistics||{};
  const wp=(route.waypoints||[]).find(w=>wpIs(w,"Trailhead"))||null;
  /* THE DESTINATION COMES FROM trailheadPoint(), THE SAME FUNCTION THE MAP AND BOTH "Directions
     to…" BUTTONS USE. This card resolved approach_logistics FIRST and the pin second — the exact
     opposite precedence — so on 290 routes the map drew a pin in one place while this card's
     Directions link, its copy-to-clipboard value and its "To the peak" bearing all pointed
     somewhere else. CLAUDE.md has recorded that split as user-visible since the trailhead sweep;
     #1215 consolidated two of the three surfaces and this is the third.
     Consistency is the whole fix. WHICH record is true stays a data question — CLAUDE.md is
     explicit that swapping a priority to settle that would only move the error — but a page must
     not offer two destinations for one trailhead. */
  const tp=trailheadPoint(route);
  const lat=tp?Number(tp.lat):null,lng=tp?Number(tp.lng):null;
  const hasCoord=!!tp;
  /* THE NAME DOES NOT SIMPLY FOLLOW THE COORDINATE, and measuring is what settled it: taking the
     pin's name wholesale changed 530 cards and nearly all were DOWNGRADES — "Killen Creek
     Trailhead (Trail #113, FR-2329)" losing its road and trail number to a bare "Killen Creek
     Trailhead". approach_logistics.trailhead is the curated field and where both records mean the
     same place it is simply better copy.
     It is only wrong when the two records mean DIFFERENT places, and the measured distribution
     says where that boundary is rather than leaving it to taste: the split runs CONTINUOUSLY to
     457 m (p50 46, p90 290 — one trailhead recorded twice, imprecisely) and then jumps straight to
     5,733 m. Nothing lies between. The four beyond it are peaks with two GENUINE approaches, where
     the logistics name really is describing the other one, so those four take the pin's name. */
  const _nameFollows=!!(tp&&!tp.derived&&tp.alt&&distMiles(tp,tp.alt)*1609.34>1000);
  /* WHEN THE TITLE FOLLOWED THE PIN, THE DIRECTIONS PROSE BELOW IS ABOUT THE OTHER RECORD, and
     unlabelled it makes the card contradict itself: #1231 correctly flipped the NAME on the four
     routes past the 1,000 m gap and left `al.trailheadDirection` — which is the LOGISTICS record —
     rendering underneath it. Measured on screen (probe-trailheadcard-name-vs-directions.mjs): 3 of
     the 4 read as e.g. "Thirtymile Trailhead" titled above "From the Andrews Creek Trailhead…",
     two starts 7.8 km apart on one card. The fourth is already honest, because its own prose says
     "Two common trailheads on US-2 in Chelan County give access."
     ATTRIBUTED RATHER THAN SUPPRESSED: on these routes the other approach is real and worth
     keeping, and dropping it would lose the only description of it. And deliberately NOT worded as
     "this peak has two approaches" — the rule fires on DISTANCE, and CLAUDE.md is explicit that a
     disagreement says one record is wrong, not which. "Directions on file describe a different
     start" is true either way. */
  const _dirIsOther=_nameFollows&&!!al.trailhead;
  const name=(_nameFollows&&tp.name)?tp.name:(al.trailhead||(wp&&wp.name)||(tp&&tp.name)||null);
  /* The elevation is the PIN's, so it may only be shown beside the PIN's coordinate. Printing a
     pin's height next to a logistics coordinate welds two records into one claim. */
  const elev=(tp&&wp&&wpPlaced(wp)&&Number(wp.lat)===Number(tp.lat)&&Number(wp.lng)===Number(tp.lng)&&wp.elev!=null)?wp.elev:null;
  // Straight-line only, and labelled as such — the trail is always longer, and a "distance to
  // the peak" a climber mistook for trail mileage would understate the day.
  const toPeak=(hasCoord&&al.peakLat!=null&&al.peakLng!=null)
    ?{dir:compass16(lat,lng,al.peakLat,al.peakLng),mi:distMiles({lat,lng},{lat:al.peakLat,lng:al.peakLng})}
    :null;
  if(!name&&!hasCoord)return null;
  const tiles=[];
  if(elev!=null)tiles.push(["Elevation",uElev(elev),C.blue]);
  if(route.distKm!=null&&route.distKm>0)tiles.push(["Approach (one way)",uDist(route.distKm),C.green]);
  if(toPeak)tiles.push(["To the peak",toPeak.dir+" "+uDistMi(Math.round(toPeak.mi*10)/10),C.orange]);
  const dir=al.trailheadDirection;
  const dup=dir&&(route.approach||"").slice(0,80).indexOf(dir.slice(0,40))!==-1;
  const copy=function(){
    if(!hasCoord)return;
    var _p;try{_p=navigator.clipboard&&navigator.clipboard.writeText(lat.toFixed(5)+", "+lng.toFixed(5));}catch(e){}if(_p&&_p.then)_p.then(function(){setCopied(true);setTimeout(()=>setCopied(false),1600);}).catch(function(){});
  };
  return <div style={{background:C.surface,borderRadius:10,padding:"11px 12px",border:"1px solid "+C.border,marginTop:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:tiles.length?9:6}}>
      <div style={{display:"flex",gap:8,minWidth:0,alignItems:"flex-start"}}>
        <span aria-hidden="true" style={{color:WP_STYLE.Trailhead.color,fontSize:14,lineHeight:1.35,flexShrink:0}}>{WP_STYLE.Trailhead.glyph}</span>
        <div style={{minWidth:0}}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:0.5,marginBottom:2}}>TRAILHEAD</div>
          <div style={{fontSize:13.5,fontWeight:700,color:C.text,lineHeight:1.4,wordBreak:"break-word"}}>{name||"Location on file"}</div>
        </div>
      </div>
      {onEdit?<EditIconButton onClick={onEdit} title="Edit trailhead and approach"/>:null}
    </div>
    {tiles.length?<div style={{display:"grid",gridTemplateColumns:"repeat("+tiles.length+",1fr)",gap:7,marginBottom:9}}>{tiles.map(t=><div key={t[0]} style={{background:C.card,borderRadius:8,padding:"7px 8px",textAlign:"center",minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:t[2],overflowWrap:"anywhere"}}>{t[1]}</div><div style={{fontSize:10.5,color:C.textMuted,marginTop:2,lineHeight:1.3}}>{t[0]}</div></div>)}</div>:null}
    {(dir&&!dup)?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,marginBottom:9}}>{_dirIsOther?<span style={{color:C.textMuted}}>{"Directions on file describe a different start \u2014 "+al.trailhead+": "}</span>:null}{dir}</div>:null}
    {hasCoord?<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      <a href={"https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng} target="_blank" rel="noreferrer" style={{flex:"1 1 150px",textAlign:"center",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.greenDim,background:C.greenBg,color:C.green,fontSize:12.5,fontWeight:700,textDecoration:"none"}}>Drive here</a>
      <button onClick={copy} style={{flex:"1 1 150px",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.card,color:copied?C.green:C.textSub,fontSize:12.5,fontWeight:700,cursor:"pointer",fontVariantNumeric:"tabular-nums"}}>{copied?"Copied":lat.toFixed(5)+", "+lng.toFixed(5)}</button>
    </div>:<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>No trailhead coordinates on file yet.</div>}
  </div>;
}
function RappelTable({route,onEdit}){
  if(!route.rappelDetail||!route.rappelDetail.length)return null;
  const raps=route.rappelDetail.map((r,i)=>({...r,_n:r.n!=null?r.n:i+1})).sort((a,b)=>a._n-b._n);
  /* `lengthM` is legitimately null where no source publishes a per-station distance — that is the
     honest value, and writing the ROPE's capacity there instead is what made one route claim 560m
     of rappel down a 244m face. But summing with `||0` then turns "unknown" into "zero", so a
     table with 2 known rappels of 30m and 1 unknown printed "60 m total" and read as the whole
     descent. Count what is actually known and say so when it is only part of the line. */
  const known=raps.filter(r=>r.lengthM!=null);
  const total=known.reduce((a,r)=>a+r.lengthM,0);
  const partial=known.length>0&&known.length<raps.length;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}>
    <div style={SZ4}><div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>{rappelHeaderLabel(route)}</div><ProvChip prov={sectionProvenance(route,"rappels")}/></div>{total>0?<div style={{fontSize:12,color:C.textMuted}}>{uLen(total)+(partial?(" across "+known.length+" of "+raps.length):" total")}</div>:null}</div>{onEdit?<EditIconButton onClick={onEdit} title="Edit rappel information"/>:null}</div>
    {(function(){var w=rappelSingleRopeWarning(route);return w?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:9,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 9px"}}>{w}</div>:null;})()}
    {route.rappelCountNote?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:9,background:C.surface,borderRadius:8,padding:"7px 9px"}}>{route.rappelCountNote}</div>:null}
    {/* A rappel row answers four questions in the order you ask them on the ground:
        WHERE is the station (`station`) — the one a party actually gets stuck on, and the one
        a bare "60m, bolted" row never answered; HOW LONG and off WHAT (`lengthM`/`anchor`);
        WHAT GOES WRONG (`hazards`) — pendulum swings, a pull that jams, a station you can
        rappel straight past; and anything else (`notes`). Every key is optional and each
        block is gated on its own value, so a route carrying only the old {lengthM, anchor,
        notes} shape renders exactly as it did before. */}
    {raps.map((r,idx)=>{const _haz=Array.isArray(r.hazards)?r.hazards.filter(Boolean):(r.hazards?[r.hazards]:[]);return <div key={r._n+"-"+idx} style={{display:"flex",gap:10,padding:"9px 11px",alignItems:"flex-start",border:"1px solid "+C.border,borderRadius:10,marginBottom:8}}><div style={{width:26,height:26,borderRadius:7,background:C.surface,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:C.textSub}}>{"R"+r._n}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2,gap:8}}><span style={{fontSize:13,fontWeight:700,color:C.red,flexShrink:0,whiteSpace:"nowrap"}}>{r.lengthM!=null?uLen(r.lengthM):"—"}</span><span style={{fontSize:11.5,fontWeight:600,color:/bolt/i.test(r.anchor||"")?C.green:C.blue,textAlign:"right",minWidth:0,wordBreak:"break-word",overflowWrap:"anywhere"}}>{r.anchor||"—"}</span></div>{r.station?<div style={{marginTop:5,marginBottom:_haz.length||r.notes||r.pull?6:0,background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"6px 9px"}}><div style={{fontSize:9.5,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:2}}>Finding the station</div><div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{r.station}</div></div>:null}{_haz.length?<div style={{marginBottom:r.notes||r.pull?6:0,display:"flex",flexDirection:"column",gap:4}}>{_haz.map((h,hi)=><div key={hi} style={{display:"flex",gap:6,alignItems:"flex-start",background:C.redBg,border:"1px solid "+C.red+"55",borderRadius:8,padding:"5px 8px"}}><span style={{flexShrink:0,marginTop:1}}><ActionIcon name="alert" size={12} color={C.red}/></span><span style={{fontSize:11.5,color:C.text,lineHeight:1.45}}>{h}</span></div>)}</div>:null}{r.pull?<div style={{fontSize:11.5,color:C.amber,lineHeight:1.45,marginBottom:r.notes?5:0}}><span style={{fontWeight:800,textTransform:"uppercase",letterSpacing:0.4,fontSize:9.5,color:C.textMuted,marginRight:5}}>Pull</span>{r.pull}</div>:null}{r.notes?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{r.notes}</div>:null}</div></div>;})}
  </div>;
}
/* CLIMBING ROUTE — the pitch table's counterpart for terrain that has no pitches.
   A scramble or a mountaineering line has an actual-climbing section every bit as real as a
   pitched route's, and until now there was nowhere to put it: the only structured slot was
   pitch_detail, which those routes legitimately leave empty. So that description went into
   `approach` instead, which is why approach prose on unpitched routes so often walks you past
   the base of the climb and keeps going to the summit — and why a party looking for where the
   climbing STARTS had to reverse-engineer it out of a paragraph about a trail.
   Gated on isPitched() being false: a route with real pitches keeps PITCH-BY-PITCH and this
   never renders, so the two can never both claim to describe the same ground. */
export function ClimbingRouteTable({route,onEdit}){
  const segs=Array.isArray(route.climbingRoute)?route.climbingRoute:[];
  if(!segs.length)return null;
  const list=segs.map((s,i)=>({...s,_n:s.n!=null?s.n:i+1})).sort((a,b)=>a._n-b._n);
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}>
    <div style={SZ4}><div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>{"CLIMBING ROUTE · "+list.length+" section"+(list.length!==1?"s":"")}</div></div>{onEdit?<EditIconButton onClick={onEdit} title="Edit the climbing route"/>:null}</div>
    <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>From the base of the climbing to the top — the technical ground itself, not the walk in.</div>
    {list.map((s,idx)=><div key={s._n+"-"+idx} style={{display:"flex",gap:10,padding:"9px 11px",alignItems:"flex-start",border:"1px solid "+C.border,borderRadius:10,marginBottom:8}}>
      <div style={{width:26,height:26,borderRadius:7,background:C.surface,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:C.textSub}}>{s._n}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:s.notes?3:0}}>
          <span style={{fontSize:13,fontWeight:700,color:C.text,minWidth:0,wordBreak:"break-word"}}>{s.label||("Section "+s._n)}</span>
          {s.class?<span style={{flexShrink:0,fontSize:11,fontWeight:800,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:20,padding:"2px 9px",whiteSpace:"nowrap"}}>{s.class}</span>:null}
        </div>
        {s.notes?<div style={{fontSize:12,color:C.textSub,lineHeight:1.55}}>{s.notes}</div>:null}
      </div>
    </div>)}
  </div>;
}

/* APPROACH — one card per distinct way in, because a route usually has more than one and the
   single `approach` paragraph could only ever describe whichever one the writer had in mind.
   `baseFinding` gets its own highlighted block rather than a sentence inside `notes`: it is
   the answer to "how do I know I'm at the start of the climbing", which is the question that
   actually gets parties lost, and burying it mid-paragraph is exactly how it got lost before.
   Renders ALONGSIDE the existing `approach` prose, never instead of it — the prose is the
   long-form account and is often the only thing a route has. */
export function ApproachVariants({route,onEdit}){
  const vars=Array.isArray(route.approachVariants)?route.approachVariants:[];
  if(!vars.length)return null;
  return <div style={{marginBottom:12}}>
    <SL action={onEdit?<EditIconButton onClick={onEdit} title="Edit the approaches"/>:null}>{"APPROACHES · "+vars.length+" way"+(vars.length!==1?"s":"")+" in"}</SL>
    <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,margin:"-4px 0 9px"}}>Which one is right depends on the season — read the window on each before you pick.</div>
    {vars.map((v,i)=>{
      const haz=Array.isArray(v.hazards)?v.hazards.filter(Boolean):(v.hazards?[v.hazards]:[]);
      /* `season` on an approach variant is a WINDOW, and 534 of 801 variants (67%, across 470
         routes) hold a paragraph instead — up to 392 characters. It rendered in a pill carrying
         BOTH white-space:nowrap AND flex-shrink:0, so the text could neither wrap nor shrink and
         a long value pushed the row past the edge of a 390px phone. Worse than the camping chips,
         which at least wrapped into a blob.
         Defended the way the header strap already defends the top-level `season` column, with the
         same seasonShort() — and the full sentence renders as PROSE below rather than being lost,
         because the explanation is worth reading, just not inside a pill. */
      const seasonFull=String(v.season||"").trim().replace(/\s+/g," ");
      const seasonPill=seasonShort(seasonFull,48);
      const facts=[v.hours?v.hours+(/\bh|hour/i.test(String(v.hours))?"":" hr"):null,v.distMi!=null?uDistMi(v.distMi):null,v.gainFt!=null?uElev(v.gainFt)+" gain":null].filter(Boolean);
      return <div key={i} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px",marginBottom:9}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:9,marginBottom:6}}>
          <div style={{fontSize:13.5,fontWeight:800,color:C.text,minWidth:0,wordBreak:"break-word"}}>{v.name||("Approach "+(i+1))}</div>
          {seasonPill?<span style={{flexShrink:0,fontSize:11,fontWeight:700,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:20,padding:"2px 9px",whiteSpace:"nowrap"}}>{seasonPill}</span>:null}
        </div>
        {facts.length?<div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:7}}>{facts.map((f,fi)=><span key={fi} style={{fontSize:11.5,color:C.textSub}}>{f}</span>)}</div>:null}
        {seasonPill&&seasonPill!==seasonFull?<p style={{fontSize:12.5,color:C.textSub,lineHeight:1.6,margin:"0 0 7px"}}>{seasonFull}</p>:null}
        {v.notes?splitParagraphs(v.notes).map((p,pi)=><p key={pi} style={{fontSize:12.5,color:C.textSub,lineHeight:1.6,margin:pi===0?"0 0 7px":"7px 0 0"}}>{p}</p>):null}
        {v.baseFinding?<div style={{marginTop:7,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"8px 10px"}}>
          <div style={{fontSize:9.5,fontWeight:800,color:C.green,textTransform:"uppercase",letterSpacing:0.5,marginBottom:3}}>Finding the base of the climbing</div>
          <div style={{fontSize:12.5,color:C.text,lineHeight:1.55}}>{v.baseFinding}</div>
        </div>:null}
        {haz.length?<div style={{marginTop:7,display:"flex",flexDirection:"column",gap:4}}>{haz.map((h,hi)=><div key={hi} style={{display:"flex",gap:6,alignItems:"flex-start",background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:8,padding:"5px 8px"}}><span style={{flexShrink:0,marginTop:1}}><ActionIcon name="alert" size={12} color={C.amber}/></span><span style={{fontSize:11.5,color:C.text,lineHeight:1.45}}>{h}</span></div>)}</div>:null}
      </div>;
    })}
  </div>;
}

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
/* `bivy[].elev` holds FEET and `bivy[].elevM` holds METRES, and the two NEVER co-occur —
   measured on the live catalog: of 175 sites, 77 carry elev, 55 carry only elevM, 43 carry
   neither, and 0 carry both. So this column holds two conventions, the shape dist_km and
   gain_ft already record. uElev() takes feet, so reading `elev` alone silently rendered NO
   elevation for 31% of sites. Converted at READ time, never normalised in the DB — the same
   rule the waypoint vocabulary follows. */
function campElevFt(s){
  if(!s)return null;
  if(s.elev!=null)return s.elev;
  if(s.elevM!=null)return s.elevM*3.28084;
  return null;
}
/* The TRAILHEAD is the only thing either number can be measured FROM, and the waypoint store is
   its only record. Measured on the live catalog: of 800 routes carrying camping, 687 have a
   trailhead elevation on a waypoint, ZERO have one only in `approach_logistics`, and the 2 that
   carry both agree exactly — so there is no second source to reconcile and the figure cannot
   depend on which record happened to be read. The other way this silently goes wrong is a route
   with TWO trailheads, where "the" trailhead is arbitrary; measured at 0 of 757 camping routes,
   so taking the first is safe here in a way it would not be catalog-wide. */
function trailheadFt(route){
  const ws=Array.isArray(route.waypoints)?route.waypoints:[];
  for(let i=0;i<ws.length;i++)if(wpIs(ws[i],"Trailhead"))return campElevFt(ws[i]);
  return null;
}
/* TRAIL distance, and only trail distance. A campsite WAYPOINT records distMi/distKm — the walked
   path — on 410 of 445 sites. The researched `bivy` store records no distance under any spelling
   (measured: 5,083 sites, zero distance-ish keys) and carries a coordinate on 4 of them, so there
   is nothing to read and nothing to compute. A straight line between two points is NOT this
   number and must never be substituted for it: a trail cannot be SHORTER than its own chord,
   which is the entire premise of audit:waypoint-distances. A site with no recorded distance
   therefore shows none, which is the honest answer rather than a plausible one. */
function campDistMi(w){
  if(!w)return null;
  if(w.distMi!=null&&w.distMi!=="")return Number(w.distMi);
  if(w.distKm!=null&&w.distKm!=="")return Number(w.distKm)/1.60934;
  return null;
}
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
export function climbsAPeak(route){
  if(!route)return false;
  const seed=(typeof MOUNTAINS!=="undefined"&&Array.isArray(MOUNTAINS))?MOUNTAINS.find(function(m){return m&&m.id===route.mountainId;}):null;
  const a=seed||route._dbArea||{};
  return String(a.areaType||"").toLowerCase()==="peak";
}
/* The gate itself, exported so a guard can ask it directly rather than inferring it from a
   rendered screen. Note it does NOT decide whether anything is drawn: CampingPanel returns null
   with no sites, so widening this cannot put an empty section anywhere. */
export function campingGate(route){
  return ["alpine","mountaineering","scrambling","ice","mixed"].includes(catOf(route))||climbsAPeak(route);
}
function campSites(route){
  const bivy=Array.isArray(route.bivy)?route.bivy:[];
  const thFt=trailheadFt(route);
  const gainOf=function(ft){return (ft==null||thFt==null)?null:ft-thFt;};
  const key=v=>String((v==null?"":v)).trim().toLowerCase();
  const seen=new Set(bivy.map(b=>key(b&&b.name)).filter(Boolean));
  const wps=(Array.isArray(route.waypoints)?route.waypoints:[]).filter(w=>wpIs(w,"Campsite")&&!seen.has(key(w&&w.name)));
  /* `type` is camp | bivy | hut on the 77 sites that carry it. It is the one field that says
     WHICH of the two things this section merges you are looking at, so it earns a chip. */
  /* The label for `camp` is deliberately the neutral "Camp", NOT "Established camp": a dispersed
     basin site and a developed campground are both stored as `camp`, so the stronger word would
     be a false claim on every dispersed site. The capacity chip carries that distinction. */
  const TYPE={camp:"Camp",bivy:"Bivy",hut:"Hut"};
  /* The waypoint half reads its elevation through campElevFt() too, not `w.elev` raw. Waypoints
     carry the same two conventions the bivy store does, so reading one spelling silently rendered
     no elevation for the sites that use the other — and an elevation missing is also a GAIN
     missing, so the defect compounds now rather than merely showing one blank. */
  return bivy.map(b=>({name:b&&b.name,elev:campElevFt(b),gainFt:gainOf(campElevFt(b)),distMi:null,kind:(b&&TYPE[String(b.type||"").toLowerCase()])||null,capacity:b&&b.capacity,water:b&&b.water,permit:b&&b.permit,notes:b&&b.notes,onTrack:false}))
    .concat(wps.map(w=>({name:w&&w.name,elev:campElevFt(w),gainFt:gainOf(campElevFt(w)),distMi:campDistMi(w),kind:null,notes:(w&&w.directions)||"",onTrack:true})));
}
/* CAPACITY, WATER and PERMIT are PROSE, and they used to render as CHIPS. Measured on the live
   catalog: median 130 / 136 / 297 characters, up to 1,386 — so 5,001 / 5,008 / 5,020 of 5,083
   sites carried a paragraph inside a rounded pill. That is the failure CLAUDE.md already records
   for `season` (a window that got a 232-char explanation) and `grade` (a grade that got a
   qualifier): enrichment prose written into a DISPLAY field. The repair is the one those two
   took — defend it on the READ side. The pill is gone and the prose renders as a labelled block
   inside the disclosure, which is the right shape for a paragraph.
   Exported because this is the half a static guard can actually prove: whether the prose is
   SELECTED for display is a pure question; whether a tap reveals it is a browser one. */
/* ONE chip, not two, because both numbers answer the same question — how far from the road is
   this? — and repeating "the trailhead" on the same row reads as two unrelated facts.
   A site BELOW the trailhead says "below" rather than rendering a negative gain. That is not
   cosmetic: 527 of 3,243 comparable sites (16%) sit below their trailhead, and they are
   overwhelmingly valley car-campgrounds — roadside vocabulary appears in 72% of them against 9%
   of the sites above, a 63-point gap, so the population is real and not an artefact of bad
   elevations. "-1,250 ft of gain" for a campground you DRIVE to is both ugly and the wrong
   framing; "1,250 ft below the trailhead" is the same arithmetic worded as the fact it is, and
   it tells a climber the useful thing — this is a valley basecamp, not a high camp.
   A gain that rounds to zero is dropped rather than shown as "0 ft above", which is noise.
   Exported for the same reason campDetail() is: what a site SAYS is a pure question a static
   guard can answer, where whether it reaches the screen needs a render. */
export function campFromTrailhead(s){
  if(!s)return "";
  const d=(s.distMi!=null&&isFinite(s.distMi))?uDistMi(s.distMi):null;
  const g=(s.gainFt!=null&&isFinite(s.gainFt)&&Math.round(s.gainFt)!==0)?s.gainFt:null;
  if(d==null&&g==null)return "";
  const head=[d,g!=null?uElev(Math.abs(g)):null].filter(Boolean).join(" \u00b7 ");
  return head+(g!=null?(g>0?" above":" below"):" from")+" the trailhead";
}
export function campDetail(b){
  return [["Capacity",b&&b.capacity],["Water",b&&b.water],["Permit",b&&b.permit]]
    .filter(function(r){return String(r[1]==null?"":r[1]).trim()!=="";});
}
/* One site, collapsed to the fields that are AUTHORED AND STRUCTURED — name, elevation, type,
   and whether it is pinned on the track. Deliberately NOT a derived "water · no permit" summary,
   which was the obvious design and was measured before being rejected
   (scripts/oneoff/measure-camping-verdict-vocabulary.mjs): a keyword rule leaves 44% of permits
   and 30% of waters in no bucket at all, and where it DOES fire it is wrong in the dangerous
   direction — "Free self-issued wilderness permit at the Killen Creek trailhead" reads as *no
   permit* to any negation rule, and a self-issued permit is one you still have to fill in.
   Being wrong about a permit costs a fine; being wrong about water sends a party up dry. This is
   the same refusal the rappel columns already record: do not read a fact out of English prose.
   So the summary line carries only what somebody wrote into a field that holds a VALUE, and the
   prose is one tap away rather than one guess away. */
function CampSite({b,i}){
  const [open,setOpen]=useState(false);
  const detail=campDetail(b);
  const more=detail.length>0||!!String((b&&b.notes)||"").trim();
  const nm=(b&&b.name)||("Camp "+(i+1));
  /* An explicit aria-label, because the row's own text nodes are a name and an elevation in
     separate elements and this app has been bitten by "Friends2" — a count welded to a label in
     the accessibility tree, where CSS margins do not exist. An authored name cannot glue. */
  const fromTh=campFromTrailhead(b);
  const label=nm+(b&&b.elev!=null?", "+uElev(b.elev):"")+(b&&b.kind?", "+b.kind:"")+(fromTh?", "+fromTh:"");
  return <div style={{border:"1px solid "+C.border,borderRadius:10,marginBottom:8,overflow:"hidden"}}>
    <div {...(more?clickable(function(){setOpen(!open);}):{})} aria-expanded={more?open:undefined} aria-label={more?((open?"Hide":"Show")+" camping detail for "+label):undefined} style={{padding:"9px 11px",cursor:more?"pointer":"default"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:9,marginBottom:(b.kind||b.onTrack||more||fromTh)?5:0}}>
        <div style={{fontSize:13,fontWeight:700,color:C.text,minWidth:0,wordBreak:"break-word"}}><span style={{marginRight:6}}>{"☾"}</span>{nm}</div>
        {b.elev!=null?<span style={{flexShrink:0,fontSize:11.5,fontWeight:700,color:C.purple,whiteSpace:"nowrap"}}>{uElev(b.elev)}</span>:null}
      </div>
      {(b.kind||b.onTrack||more||fromTh)?<div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6}}>
        {fromTh?<span style={{fontSize:11,fontWeight:700,color:C.textSub,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"2px 9px"}}>{fromTh}</span>:null}
        {b.kind?<span style={{fontSize:11,fontWeight:700,color:C.purple,background:C.card,border:"1px solid "+C.purple+"55",borderRadius:20,padding:"2px 9px"}}>{b.kind}</span>:null}
        {b.onTrack?<span style={{fontSize:11,fontWeight:700,color:C.textMuted,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"2px 9px"}}>{"Marked on the track"}</span>:null}
        {more?<span style={{fontSize:11.5,fontWeight:700,color:C.blue,marginLeft:"auto",whiteSpace:"nowrap"}}>{open?"▾ Less":"▸ More"}</span>:null}
      </div>:null}
    </div>
    {open&&more?<div style={{borderTop:"1px solid "+C.borderLight,padding:"10px 11px"}}>
      {detail.map(function(r,ri){return <div key={ri} style={{marginBottom:9}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,letterSpacing:0.5,marginBottom:3}}>{r[0].toUpperCase()}</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.55}}>{r[1]}</div></div>;})}
      {b.notes?<div style={{fontSize:12,color:C.textSub,lineHeight:1.55}}>{b.notes}</div>:null}
    </div>:null}
  </div>;
}
function CampingPanel({route,onEdit}){
  const sites=campSites(route);
  if(!sites.length)return null;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginBottom:13}}>
    <div style={SZ4}><div style={{fontSize:12,fontWeight:700,color:C.purple}}>{"CAMPING & BIVY · "+sites.length}</div>{onEdit?<EditIconButton onClick={onEdit} title="Edit camping and bivy sites"/>:null}</div>
    {/* The "also a pin on the route track" sentence is CONDITIONAL, because it is only true of
        waypoint-derived sites. Most researched bivy rows carry no coordinate at all — measured:
        4 of 175 catalog-wide — so stating it unconditionally tells a climber to look for pins
        that are not there. Claim it only when at least one site actually is on the track. */}
    <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>{"Where you can sleep on this route — camps, approach bivies and high camps. Worth reading even if you plan to go car-to-car, for the day that runs long or the weather that turns."+(sites.some(s=>s.onTrack)?" Anything marked on the track is also a pin under ROUTE TRACK.":"")}</div>
    {sites.map((b,i)=><CampSite key={i} b={b} i={i}/>)}
  </div>;
}
export function PitchComments({targetId,comments,commentsUnavailable,onAdd}){
  const list=(comments||[]).filter(c=>c.targetId===targetId&&!c.parentId).slice().sort((a,b)=>new Date(a.ts).getTime()-new Date(b.ts).getTime());
  const [txt,setTxt]=useState("");
  const add=()=>{const t=txt.trim();if(!t)return;if(onAdd)onAdd(targetId,t);setTxt("");};
  return <div style={{marginTop:10}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{"Pitch comments"+(list.length?" · "+list.length:"")}</div>{list.length?list.map((c,i)=><div key={c.id||i} style={{background:C.surface,borderRadius:8,padding:"8px 10px",marginBottom:6}}><div style={{fontSize:11.5,fontWeight:700,color:C.text}}>{(c.userId===0?ME:CLIMBERS.find(x=>x.id===c.userId)||{name:c.name||"Climber"}).name}<span style={{fontSize:11.5,color:C.textMuted,fontWeight:400,marginLeft:6}}>{ago(c.ts)}</span></div><div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:2}}>{c.text}</div></div>):<div style={{fontSize:11.5,color:C.textMuted,marginBottom:7}}>{commentsUnavailable?"Couldn’t load the comments on this pitch — beta may already be here, so do not read this as none.":"No comments yet — be the first to add beta for this exact pitch."}</div>}<div style={{display:"flex",gap:6,marginTop:2}}><input value={txt} onChange={e=>setTxt(e.target.value)} aria-label="Add a pitch comment" placeholder="Add a comment on this pitch…" style={{flex:1,minWidth:0,padding:"7px 9px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.text,fontSize:12,boxSizing:"border-box",outline:"none"}}/><button onClick={add} style={{padding:"10px 15px",borderRadius:8,border:"none",background:C.blueSolid,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>Post</button></div></div>;
}
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
function Calculator({route,activity,fit:fitProp,setFit:setFitProp}){
  const [fitLocal,setFitLocal]=useState("intermediate");
  const fit=fitProp||fitLocal,setFit=setFitProp||setFitLocal;
  const [pack,setPack]=useState(10),[party,setParty]=useState(2),[depart,setDepart]=useState(6);
  const hasPublishedSummitH=route.timing&&route.timing.summitTimeHrs!=null;
  const derivedSummitH=(!hasPublishedSummitH&&route.timing&&route.timing.totalHrs!=null)?Math.max(0,route.timing.totalHrs-(route.timing.approachTimeHrs||0)-(route.timing.descentTimeHrs||0)):null;
  const hasDerivedSummitH=derivedSummitH!=null&&derivedSummitH>0;
  // scarfHrs() coerces a missing distance or gain to 0, so a route with neither
  // reported "0.0hr Approach / 0.0hr Total" and a return time equal to the
  // departure minute -- a multi-day Olympic approach shown as summiting at 6:00 AM.
  // A published summit time that equals the published total, with no separate
  // approach figure, is a car-to-car number: the whole day already. Adding a
  // separate approach estimate to it double-counts the walk in.
  const publishedIsWholeDay=!!(route.timing&&route.timing.summitTimeHrs!=null&&route.timing.totalHrs!=null&&route.timing.summitTimeHrs===route.timing.totalHrs&&route.timing.approachTimeHrs==null);
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
  const hikeInputsComplete=_missHike.length===0;const hikeCoversWholeDay=gainCoversWholeOuting(route);
  /* ...and that flag now reaches the RETURN, not just the label. `hikeCoversWholeDay` is true when
     the row's gain and loss agree to within 3% — 433 of the 484 WA rows that qualify have them
     EXACTLY equal, which is a round trip or a traverse ending at its start elevation, not a
     coincidence on a one-way approach. For those rows the tile is already relabelled "On foot" and
     TECH STATS already says "Total ascent is the whole day from the trailhead, not just the walk
     in" — and then the return leg added another 75% of that same walk on top. Label and arithmetic
     contradicting each other on one screen: wa_ptarmigan_traverse read `21.6hr On foot` and then
     put Est. return 16.2 hr after Est. summit.

     SCOPED TO THE WALK BRANCH, and getting that wrong nearly shipped a second defect. A pitched
     route's return is `techH*0.7` — the descent of the CLIMB, which the walk never double-counted
     — so short-circuiting the whole expression the way `publishedIsWholeDay` does would strip a
     real descent leg from the 212 whole-outing rows that carry pitches. Only the `hikeH*0.75`
     branch is affected.

     This moves Est. return EARLIER, which is normally the dangerous direction; it is safe here
     only because the figure removed was never a second leg, it was the first one counted twice. */
  /* A gain PRESENT and contradicted, as opposed to absent. _missHike above names what is
     missing; this names what is impossible. Both make the number below a floor, so they are
     worded the same way and sit together. */
  const gainShort=gainBelowOwnPins(route);
  const missHikeLabel=_missHike.length===1?_missHike[0]:_missHike.slice(0,-1).join(", ")+" or "+_missHike[_missHike.length-1];
  const hasAnyEstimate=hasHikeInputs||hasPublishedSummitH||hasDerivedSummitH||!!route.pitches;
  const hikeH=scarfHrs(route.distKm,route.gainM,route.lossM,fit,pack),techH=hasPublishedSummitH?route.timing.summitTimeHrs:hasDerivedSummitH?derivedSummitH:techHrs(route.pitches,route.avgPitchLength||35,gn(route.grade)),totalH=(publishedIsWholeDay?techH:hikeH+techH)+(party>2?(party-2)*0.4:0),sumH=depart+totalH,retH=publishedIsWholeDay?sumH:sumH+(route.pitches>0?techH*0.7:(hikeCoversWholeDay?0:hikeH*0.75));
  const fmt=h=>{let total=Math.round(h*60);const day=Math.floor(total/1440);total=total%1440;const hr=Math.floor(total/60),mn=total%60,ap=hr>=12?"PM":"AM",h12=hr%12||12;return `${h12}:${String(mn).padStart(2,"0")} ${ap}${day>0?" (+"+day+"d)":""}`;};
  const late=retH>18.5,sumLate=!publishedIsWholeDay&&sumH>13,multiDay=route.campOptions&&route.campOptions.some(c=>c.stars>0);
  // The N/A on the Approach tile was only half that fix. Total, Est. summit and Est. return
  // all still add hikeH, and hikeH is 0 whenever the approach inputs are missing -- 204,469
  // of the catalog's 205,492 routes. It used to be obvious (0.0hr Total, summit at the
  // departure minute); once a pitch count made techH non-zero it merely looked plausible,
  // so the tell went away and the fault did not. These are lower bounds, not estimates.
  // Never paint one green either: a green "Est. return" asserts you are down before dark,
  // and with the walk in and the walk out both counted as zero we cannot assert that.
  const approachUnknown=hasAnyEstimate&&!hikeInputsComplete&&!publishedIsWholeDay;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
    <div style={{fontSize:14,fontWeight:700,color:C.blue,marginBottom:4}}>{["sport","trad","rock","aid","ice","mixed"].indexOf(route.discipline)>=0?"Time Estimate":route.discipline==="bouldering"?"Approach Time":"Time-to-Summit"}</div>
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
    {route.timing?(function(){var tm=route.timing;var sb=Array.isArray(tm.sectionBreakdown)?tm.sectionBreakdown:[];var _sbDup=sectionsCoveredByItinerary(route);var _sbShow=_sbDup?[]:sb;return <div style={{background:C.blueBg,borderRadius:10,padding:"10px 12px",margin:"4px 0 12px",border:`1px solid ${C.blueDim}`}}><div style={{fontSize:11,fontWeight:800,color:C.blue,letterSpacing:0.3,marginBottom:6}}>PUBLISHED TIMES</div>{tm.recommendedStart?<div style={{fontSize:12.5,color:C.textSub,marginBottom:8}}>{"Recommended start: "}<b style={{color:C.text}}>{tm.recommendedStart}</b></div>:null}<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:_sbShow.length?8:0}}>{[["Approach",tm.approachTimeHrs],["Summit",tm.summitTimeHrs],["Descent",tm.descentTimeHrs],["Total",tm.totalHrs]].filter(function(x){return x[1]!=null;}).map(function(x,i){return <div key={i} style={{flex:"1 1 56px",background:C.surface,borderRadius:8,padding:"6px 4px",textAlign:"center"}}><div style={{fontSize:10,color:C.textMuted,fontWeight:700}}>{x[0].toUpperCase()}</div><div style={{fontSize:14,fontWeight:800,color:x[0]==="Total"?C.blue:C.text}}>{x[1]+" hr"}</div></div>;})}</div>{_sbShow.map(function(s,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"6px 0",borderTop:`1px solid ${C.borderLight}`}}><div style={{minWidth:0}}><div style={{fontSize:12.5,fontWeight:600,color:C.text}}>{s.section}{s.fromTo?<span style={{color:C.textMuted,fontWeight:400}}>{" · "+s.fromTo}</span>:null}</div>{s.note?<div style={{fontSize:11,color:C.textMuted,marginTop:1,lineHeight:1.4}}>{s.note}</div>:null}</div><div style={{fontSize:12.5,fontWeight:700,color:C.blue,flexShrink:0,whiteSpace:"nowrap"}}>{s.hrs+" hr"}</div></div>;})}</div>;})():null}
    {/* What parties actually took, above the model that predicts it. Ordering is the point:
        the guidebook figure first (route.timing), then measured reality, then the estimate —
        so a formula never sits above evidence. Renders only when somebody has logged a real
        number; there is no empty state, because "0 parties have logged this" is noise on the
        204,000 routes nobody has logged. */}
    {(function(){var _lt=loggedTimeStats(activity);if(!_lt)return null;var _spread=_lt.minMin!==_lt.maxMin?(fmtDurMin(_lt.minMin)+"–"+fmtDurMin(_lt.maxMin)):null;var _legLbl={approachMin:"approach",climbMin:"climb",descentMin:"descent"};var _legs=Object.keys(_lt.legs).map(function(k){return _legLbl[k]+" "+fmtDurMin(_lt.legs[k].medianMin);});
      return <div style={{background:C.greenBg,borderRadius:10,padding:"10px 12px",margin:"4px 0 12px",border:"1px solid "+C.greenDim}}>
        <div style={{fontSize:11,fontWeight:800,color:C.green,letterSpacing:0.4,marginBottom:4}}>{"WHAT PARTIES ACTUALLY TOOK"}</div>
        <div style={{fontSize:13,color:C.text,fontWeight:700,marginBottom:2}}>{fmtDurMin(_lt.medianMin)+" car-to-car"+(_spread?" · "+_spread:"")}</div>
        <div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>{"Median of "+_lt.n+" logged trip"+(_lt.n!==1?"s":"")+(_legs.length?" · "+_legs.join(", "):"")}</div>
        <div style={{fontSize:11,color:C.textMuted,lineHeight:1.4,marginTop:4}}>{_lt.n===1?"One party, one day's conditions — treat it as a data point, not a forecast.":"Reported by climbers, not adjusted for your fitness or pack."}</div>
      </div>;})()}
    <div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>{/* Names what this number IS, never how it is computed. The formula was on screen
        ("Scarf's Rule + exponential technical grade penalty") and told a climber nothing
        they could act on — the inputs below already say what it responds to. */}
      {route.timing?"Or estimate for your party":"Estimate for your party"}</div>
    {multiDay?<div style={{background:C.amberBg,borderRadius:9,padding:"9px 11px",marginBottom:12,border:`1px solid ${C.amber}44`,fontSize:12,color:C.textSub,lineHeight:1.5}}>This route is typically done over multiple days. The single-push estimate below is a reference only — use the <b style={{color:C.amber}}>Plan</b> tab for a realistic day-by-day plan.</div>:null}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
      <div><div style={{fontSize:12,color:C.textMuted,marginBottom:3,fontWeight:700}}>FITNESS</div><select aria-label="Your fitness level" value={fit} onChange={e=>setFit(e.target.value)} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13}}>{["beginner","intermediate","advanced","expert"].map(f=><option key={f} value={f}>{f[0].toUpperCase()+f.slice(1)}</option>)}</select></div>
      {/* `pack` is kilograms because scarfHrs' penalty tiers are kg (>8, >15), but this was the one input in the app that ignored the unit setting — hardcoded "PACK (KG)" while UNITS defaults to imperial. A US climber typing 30 for a 30 lb pack had it read as 30 kg and got the heaviest slowdown applied to a planning estimate. Show and accept the reader's unit; keep kg in state. */}
      <div><div style={{fontSize:12,color:C.textMuted,marginBottom:3,fontWeight:700}}>{uImp()?"PACK (LB)":"PACK (KG)"}</div><input aria-label="Pack weight" type="number" value={uImp()?Math.round(pack/0.4536):pack} onChange={e=>{var n=Number(e.target.value);if(isNaN(n))return;setPack(uImp()?n*0.4536:n);}} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
      <div><div style={{fontSize:12,color:C.textMuted,marginBottom:3,fontWeight:700}}>PARTY SIZE</div><input aria-label="Party size" type="number" value={party} onChange={e=>setParty(Number(e.target.value))} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/></div>
      <div><div style={{fontSize:12,color:C.textMuted,marginBottom:3,fontWeight:700}}>DEPART</div><select aria-label="Departure time" value={depart} onChange={e=>setDepart(Number(e.target.value))} style={{width:"100%",padding:"7px 8px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13}}>{Array.from({length:25},(_,i)=>2+i*0.5).map(h=><option key={h} value={h}>{fmt(h)}</option>)}</select></div>
    </div>
    <div style={{background:C.surface,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:10,textAlign:"center"}}>
        <div><div style={{fontSize:17,fontWeight:700,color:C.green}}>{publishedIsWholeDay?"incl.":hasHikeInputs?(approachUnknown?"≥":"")+hikeH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>{hikeCoversWholeDay?"On foot":"Approach"}</div></div>
        <div><div style={{fontSize:17,fontWeight:700,color:C.blue}}>{(hasPublishedSummitH||hasDerivedSummitH||route.pitches)?techH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>{publishedIsWholeDay?"Car-to-car":"Climbing"}</div></div>
        <div><div style={{fontSize:17,fontWeight:700,color:C.amber}}>{hasAnyEstimate?(approachUnknown?"≥":"")+totalH.toFixed(1)+"hr":"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Total</div></div>
      </div>
      <Hr/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
        <div style={{textAlign:"center",background:sumLate?C.redBg:approachUnknown?C.card:C.greenBg,borderRadius:8,padding:8}}><div style={{fontSize:17,fontWeight:700,color:sumLate?C.red:approachUnknown?C.text:C.green}}>{publishedIsWholeDay?"N/A":hasAnyEstimate?(approachUnknown?"≥":"")+fmt(sumH):"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Est. {route.discipline==="bouldering"?"top-out":["sport","trad","rock","aid","ice","mixed"].indexOf(route.discipline)>=0?"finish":"summit"}</div>{sumLate?<div style={{fontSize:12,color:C.red,marginTop:1}}>Leave earlier</div>:null}</div>
        <div style={{textAlign:"center",background:late?C.redBg:approachUnknown?C.card:C.greenBg,borderRadius:8,padding:8}}><div style={{fontSize:17,fontWeight:700,color:late?C.red:approachUnknown?C.text:C.green}}>{hasAnyEstimate?(approachUnknown?"≥":"")+fmt(retH):"N/A"}</div><div style={{fontSize:12,color:C.textMuted}}>Est. return</div>{late?<div style={{fontSize:12,color:C.red,marginTop:1}}>After dark</div>:null}</div>{approachUnknown?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Lower bounds only — this climb has no recorded "+missHikeLabel+", and anything missing counts as zero. Your real day will be longer."}</div>:null}{gainShort?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Lower bound — the recorded gain of "+uElev(gainShort.gainFt)+" is less than the "+uElev(gainShort.riseFt)+" between this route’s own trailhead and summit pins. The times above are figured on the smaller number, so your real day will be longer."}</div>:null}{(!hasPublishedSummitH&&!hasDerivedSummitH&&route.pitches&&pitchedFraction(gn(route.grade))<1)?<div style={{gridColumn:"1 / -1",fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>{"Climbing time assumes a party moving continuously on ground this easy rather than belaying every pitch. That is an assumption inside the estimate, not something this route reports — if you plan to pitch it out, roughly double that figure."}</div>:null}
      </div>
    </div>
    {(route.segments||[]).map((seg,i)=>{
      const sh=scarfHrs(seg.distKm,seg.gainM,seg.lossM,fit,pack)+(seg.type==="technical"?techHrs(2,35,gn(route.grade)):0);
      const cumH=depart+route.segments.slice(0,i+1).reduce((s,sg)=>s+scarfHrs(sg.distKm,sg.gainM,sg.lossM,fit,pack)+(sg.type==="technical"?techHrs(2,35,gn(route.grade)):0),0);
      return <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`}}><div style={{width:24,height:24,borderRadius:"50%",background:C.blueBg,border:`1px solid ${C.blueDim}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:C.blue}}>{i+1}</div><div style={{flex:1}}><div style={{fontSize:13.5,fontWeight:700}}>{seg.name}</div><div style={{fontSize:12,color:C.textMuted}}>{uDist(seg.distKm)} · ↑{uGain(seg.gainM)} · {seg.type}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:C.blue}}>{sh.toFixed(1)}hr</div><div style={{fontSize:12,color:C.textMuted}}>ETA {fmt(cumH)}</div></div></div>;
    })}
  </div>;
}
const HAZ_KW={"Rockfall":["rockfall","rock fall","falling rock","bowling alley"],"Loose rock":["loose rock","loose block","choss","crumbly","kitty litter"],"Verglas / thin ice":["verglas","thin ice","black ice"],"Runout / sparse pro":["runout","run-out","run out","sparse pro","sparse protection","poorly protected","scary lead"],"Deep / unstable snow":["posthol","deep snow","wallow","unconsolidated","rotten snow","sugar snow"],"Cornice":["cornice"],"Crevasse":["crevasse","crevass"],"Serac / icefall":["serac","icefall","ice fall","hanging ice"],"Avalanche":["avalanche","wind slab","wind-slab","wind loading"],"Wet / seeping rock":["wet rock","seeping","seepage","damp rock"],"Route-finding":["route-finding","route finding","routefinding","off-route","off route","got lost","hard to follow"],"High exposure":["exposed","exposure","no-fall","airy"],"Lightning / storms":["lightning","thunderstorm","afternoon storm","storm rolled"],"River / creek crossing":["river crossing","creek crossing","high water"]};
const COND_KW={"Dry / clean":["dry","bluebird","clean rock"],"Wet / damp":["wet","damp","seeping","greasy"],"Snow on route":["snow","boot-pack","bootpack","boot pack"],"Firm névé / boot-pack":["firm neve","supportable","styrofoam","firm snow","good boot"],"Icy":["icy","verglas","glazed"],"Crowded":["crowd","busy","conga","queue","packed"],"Quiet":["quiet","to ourselves","solitude"],"Windy":["wind","gusts","blustery","gale"],"Hot":["hot","baking","scorching"],"Cold":["cold","frigid","freezing"]};
const NEG_CUES=["no ","not ","n't ","without ","never ","free of ","zero ","none ","no sign of ","didn't see","did not see","didnt see","little to no","absent","wasn't any","were no ","no more "];
function _negAt(hay,idx){const pre=hay.slice(Math.max(0,idx-24),idx);return NEG_CUES.some(ng=>pre.indexOf(ng)>=0);}
function _hits(hay,k){let idx=hay.indexOf(k),pos=0,neg=0;while(idx>=0){if(_negAt(hay,idx))neg++;else pos++;idx=hay.indexOf(k,idx+1);}return {pos,neg};}
const SEASON_OF=m=>(m<=1||m===11)?"winter":m<=4?"spring":m<=7?"summer":"fall";
function seasonSummary(months){if(!months||!months.length)return null;const u=[...new Set(months)].sort((a,b)=>a-b);const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const ss=[...new Set(u.map(SEASON_OF))];if(u.length>=7||ss.length>=3)return "year-round";if(u.length===1)return mn[u[0]];if(u.length<=3)return mn[u[0]]+"–"+mn[u[u.length-1]];return ss.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ");}
function kwScan(reports,vocab){const trustOf=n=>{const a=seedAuthor(n);return a?vScore(a):50;};const out={};const nowY=new Date().getFullYear();reports.forEach(r=>{const hay=((r.text||"")+" "+((r.condTags||[]).join(" "))).toLowerCase();const yr=r.date?new Date(r.date+"T12:00:00").getFullYear():null;const mo=r.date?new Date(r.date+"T12:00:00").getMonth():null;const w=(0.5+0.5*(trustOf(r.user)/100))*(r.crewId?1:0.72);Object.keys(vocab).forEach(lab=>{let pos=0,neg=0;vocab[lab].forEach(k=>{const h=_hits(hay,k);pos+=h.pos;neg+=h.neg;});if(!out[lab]&&(pos>0||neg>0))out[lab]={label:lab,count:0,weight:0,year:0,neg:0,months:[],reports:[]};if(pos>0){out[lab].count++;out[lab].weight+=w;if(yr&&yr>out[lab].year)out[lab].year=yr;if(mo!=null)out[lab].months.push(mo);out[lab].reports.push({user:r.user,date:r.date||null,avatar:r.avatar,stars:r.stars,trust:trustOf(r.user)});}else if(neg>0){out[lab].neg++;}});});return Object.values(out).filter(o=>o.count>0).map(o=>({label:o.label,count:o.count,weight:o.weight,year:o.year||null,recent:o.year?(nowY-o.year)<=1:false,neg:o.neg,months:o.months,season:seasonSummary(o.months),seasons:[...new Set(o.months.map(SEASON_OF))].length,reports:o.reports})).sort((a,b)=>b.count-a.count||(b.year||0)-(a.year||0));}
function routeKw(route){const reports=route.activity||[];const off=(route.hazards||[]).map(x=>x.toLowerCase());const hazards=kwScan(reports,HAZ_KW).map(h=>{const official=off.some(o=>HAZ_KW[h.label].some(k=>o.indexOf(k)>=0));const promoted=!official&&h.count>=5&&h.seasons>=2;return {...h,official,promoted};});const conditions=kwScan(reports,COND_KW);const byL={};conditions.forEach(c=>{byL[c.label]=c;});const dry=byL["Dry / clean"],wet=byL["Wet / damp"],icy=byL["Icy"];const conflicts=[];if(dry&&dry.count>=2&&((wet&&wet.count>=2)||(icy&&icy.count>=2)))conflicts.push("Some climbers report dry rock, others wet or icy — conditions vary or are changing fast. Check the most recent reports.");const trustOf=n=>{const a=seedAuthor(n);return a?vScore(a):50;};const dts=reports.map(r=>r.date).filter(Boolean).sort();const lastY=dts.length?new Date(dts[dts.length-1]+"T12:00:00").getFullYear():null;const nowY=new Date().getFullYear();const recentN=reports.filter(r=>r.date&&(nowY-new Date(r.date+"T12:00:00").getFullYear())<=1).length;const avgTrust=reports.length?Math.round(reports.reduce((a,r)=>a+trustOf(r.user),0)/reports.length):0;let cs=Math.min(4,reports.length)+(recentN>=2?2:recentN===1?1:0)+(avgTrust>=80?2:avgTrust>=60?1:0)+((lastY&&nowY-lastY>=3)?-2:0);const confidence=cs>=7?"High":cs>=4?"Medium":"Low";return {total:reports.length,hazards,conditions,conflicts,confidence,recentN,avgTrust,lastY,nowY};}
function CRow({item,kind,openK,setOpenK,routeId,hzVotes,onVote}){const key=kind+":"+item.label;const open=openK===key;const badge=item.promoted?{t:"community-verified",c:C.purple,b:C.purpleBg}:item.official?{t:"✓ in route info",c:C.green,b:C.greenBg}:kind==="h"?{t:"community-flagged",c:C.amber,b:C.amberBg}:null;return <div style={{marginBottom:6}}><div {...clickable(()=>setOpenK(open?null:key))} style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",cursor:"pointer"}}><span style={{fontSize:12.5,color:C.text,fontWeight:600,flex:1,minWidth:84}}>{item.label}</span>{badge?<span style={{fontSize:12,fontWeight:700,color:badge.c,background:badge.b,borderRadius:6,padding:"2px 6px"}}>{badge.t}</span>:null}<span style={{fontSize:12,color:C.text,fontWeight:700}}>{item.count+(item.count===1?" report":" reports")}</span>{item.season?<span style={{fontSize:12,color:C.textMuted}}>{item.season}</span>:null}{item.year?<span style={{fontSize:12,color:item.recent?C.green:C.textMuted,fontWeight:600}}>{(item.recent?"● ":"")+item.year}</span>:null}<span style={{fontSize:12,color:C.blue}}>{open?"▲":"▼"}</span></div>{open?<div style={{margin:"5px 0 9px",paddingLeft:8,borderLeft:`2px solid ${C.border}`}}>{item.reports.slice(0,8).map((rp,ri)=><div key={ri} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><Av src={rp.avatar} size={16}/><span style={{fontSize:12,color:C.textSub,flex:1}}>{rp.user}</span><span style={{fontSize:12,color:C.textMuted}}>{rp.date||""}</span><span style={{fontSize:12,color:rp.trust>=80?C.green:C.textMuted,fontWeight:600}}>{""+rp.trust}</span></div>)}{item.neg?<div style={{fontSize:12,color:C.amber,marginTop:4}}>{item.neg+" recent report"+(item.neg!==1?"s":"")+" said it was not present — may be resolving."}</div>:null}{kind==="h"&&onVote?(()=>{const vk=routeId+"|"+item.label;const v=(hzVotes&&hzVotes[vk])||{still:0,gone:0,mine:null};return <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.textMuted}}>Still accurate?</span><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"still");}} aria-pressed={v.mine==="still"} style={{fontSize:12,fontWeight:700,border:`1px solid ${v.mine==="still"?C.green:C.border}`,background:v.mine==="still"?C.greenBg:"transparent",color:v.mine==="still"?C.green:C.textSub,borderRadius:7,padding:"3px 8px",cursor:"pointer"}}>{"Still there"+(v.still?" "+v.still:"")}</button><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"gone");}} style={{fontSize:12,fontWeight:700,border:`1px solid ${v.mine==="gone"?C.amber:C.border}`,background:v.mine==="gone"?C.amberBg:"transparent",color:v.mine==="gone"?C.amber:C.textSub,borderRadius:7,padding:"3px 8px",cursor:"pointer"}}>{"Gone now"+(v.gone?" "+v.gone:"")}</button></div>;})():null}</div>:null}</div>;}
/* Exported for scripts/oneoff/probe-consensus-outage-copy.mjs, which renders it directly: it is
   the one surface here that takes the outage flag as a PROP, so it can be driven without a live
   query. Same reason seasonShort and campingGate are exported. */
export function ConsensusPanel({route,activity,hzVotes,onVote,reportsUnavailable}){
  const activityAll=activity||route.activity;
  const [openK,setOpenK]=useState(null);const voteFor=useCallback(function(label){return hzVotes&&hzVotes[route.id+"|"+label];},[route.id,hzVotes]);const c=useMemo(()=>buildConsensus(activityAll,voteFor),[activityAll,voteFor]);const k=useMemo(()=>routeKw(Object.assign({},route,{activity:activityAll})),[route.id,activityAll,route.hazards]);const kh=useMemo(()=>k.hazards.filter(x=>x.count>=2),[k.hazards]);const kc=useMemo(()=>k.conditions.filter(x=>x.count>=2),[k.conditions]);
  if(!c)return <div style={{color:C.textMuted,fontSize:13,padding:10}}>{reportsUnavailable?"Couldn’t load this route's reports — try again in a moment.":"No reports yet — be the first to log this climb."}</div>;const _dates=(activityAll||[]).map(function(a){return a.date;}).filter(Boolean).sort();const _latest=_dates[_dates.length-1];/* ONE age ladder, not two. This was a private reimplementation of core's ago(), and the two
     rendered the SAME DATE about 700px apart on this tab: "Updated 3mo ago" above "Most recent
     report: 2mo ago - 2026-06-20", because this ROUNDED (Math.round(75/30) is 3) where ago()
     FLOORS (2). Measured over every distinct date the seed catalog renders, the two disagreed on
     34 of 35. It also had no year bucket at all, so a 2023 report read "44mo ago". The
     four-grade-parsers shape, on dates. ago() is already imported here and already formats
     c.lastDate below -- the very value _latest duplicates -- so this is a consolidation onto the
     helper that was already right, not a third spelling. */
  const _fresh=_latest?"Updated "+ago(_latest):"";const _rc=(activityAll||[]).slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date));})[0];const _rtx=_rc?(((_rc.condTags||[]).join(" ")+" "+(_rc.text||"")).toLowerCase()):"";const _good=/(dry|perfect|firm|bluebird|tacky|cool|crisp|prime|stellar)/.test(_rtx);const _bad=/(wet|greasy|humid|snow|ice|verglas|slick|warm|hot|damp|muddy|seep|soaked)/.test(_rtx);const _trend=(_good&&!_bad)?{a:"↗",l:"trending good",c:C.green}:((_bad&&!_good)?{a:"↘",l:"trending poor",c:C.red}:{a:"→",l:"holding steady",c:C.textSub});
  const confCol=c.confidence==="high"?C.green:c.confidence==="medium"?C.amber:C.red;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginBottom:14}}>{/* A PARTIAL CONSENSUS IS NOT A CONSENSUS. `activity` is route.activity + myReports + dbReports, so a failed reports read silently drops the DB half and buildConsensus runs on what is left — the panel then presents a DERIVED SAFETY JUDGEMENT as if it had seen everything filed. `reportsUnavailable` was already passed in and was consulted ONLY on the empty branch, so exactly this case said nothing. Found by walking the Conditions sub-tab in check:outage for the first time: under a blanket outage the screen CHANGED (3,388 -> 3,384 chars) and acknowledged nothing, which is rule 1. */}{reportsUnavailable?<div style={{fontSize:11.5,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 9px",marginBottom:10,lineHeight:1.45}}>{"Some reports couldn’t load, so this is based on the ones that did — not on everything filed for this route."}</div>:null}{_fresh?<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:11,fontSize:11.5,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:C.green,flexShrink:0,animation:"cm-pulse 2s infinite"}}/><span style={{color:C.textMuted}}>{_fresh}</span><span style={{color:_trend.c,fontWeight:700}}><span className="cm-pop" style={{display:"inline-block"}}>{_trend.a}</span>{" "+_trend.l}</span></div>:null}
    <div style={SZ3}><div style={{fontSize:14,fontWeight:700}}>Community Consensus</div><Pill label={`${c.confidence} confidence · ${c.reportCount} reports`} color={confCol} bg={`${confCol}22`} sm/></div>{c.hazards&&c.hazards.length?<div style={{background:C.redBg,border:`1px solid ${C.red}55`,borderRadius:10,padding:"10px 12px",marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:6}}>Recent hazard reports</div>{c.hazards.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,marginBottom:i<c.hazards.length-1?6:0}}><Av src={h.avatar} size={20}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,color:C.text,fontWeight:600}}>{h.tags.join(" · ")}</div><div style={{fontSize:12,color:C.textMuted}}>{h.user+" · "+h.date}</div></div><span style={{fontSize:12,color:h.trust>=90?C.green:h.trust>=70?C.blue:C.amber,fontWeight:700,flexShrink:0}}>{""+h.trust}</span></div>)}</div>:null}{c.lastDate?<div style={{fontSize:12,color:C.textMuted,marginBottom:10}}>Most recent report: <span style={{color:C.textMuted}}>{ago(c.lastDate)+" · "+c.lastDate}</span>{c.verifiedCount?" · "+c.verifiedCount+" of "+c.reportCount+" reports from verified climbers":""}</div>:null}
    {(kh.length||kc.length||k.conflicts.length)?<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px 12px",marginBottom:13}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9,flexWrap:"wrap"}}><span style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"uppercase",borderLeft:"3px solid "+C.blue,paddingLeft:9,letterSpacing:0.5,flex:1}}>What trip reports consistently mention</span><span style={{fontSize:12,fontWeight:700,color:k.confidence==="High"?C.green:k.confidence==="Medium"?C.amber:C.red,background:(k.confidence==="High"?C.green:k.confidence==="Medium"?C.amber:C.redSolid)+"22",borderRadius:6,padding:"2px 7px"}}>{k.confidence+" confidence in these tags"}</span></div>{k.conflicts.length?<div style={{background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11.5,color:C.amber,lineHeight:1.45}}>{k.conflicts[0]}</div>:null}{kh.length?<div style={{marginBottom:kc.length?11:0}}><div style={{fontSize:11.5,fontWeight:700,color:C.red,marginBottom:7}}>Hazards climbers report</div>{kh.map(h=><CRow key={h.label} item={h} kind="h" routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>)}</div>:null}{kc.length?<div><div style={{fontSize:11.5,fontWeight:700,color:C.teal,marginBottom:7}}>Conditions climbers report</div>{kc.slice(0,6).map(co=><CRow key={co.label} item={co} kind="c" routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>)}</div>:null}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:9,paddingTop:9,borderTop:`1px solid ${C.borderLight}`}}>From {k.total} report{k.total!==1?"s":""}; a signal needs 2+ to show. Tap a row for its sources. <span style={{color:C.green,fontWeight:700}}>✓</span> official · <span style={{color:C.amber,fontWeight:700}}>⚑</span> community-flagged · <span style={{color:C.purple,fontWeight:700}}>✦</span> verified across seasons · ● within last year.</div></div>:null}
    {c.conditions&&Object.keys(c.conditions).length?<div style={{marginBottom:14}}><div style={{fontSize:12,color:C.blue,fontWeight:800,letterSpacing:0.4,marginBottom:6}}>{"CONDITIONS NOW"}</div>{VOLATILE_DISC.indexOf(catOf(route))>=0?<div style={{display:"flex",alignItems:"center",gap:6,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:8,padding:"6px 9px",marginBottom:8,fontSize:11.5,color:C.amber,lineHeight:1.4}}><span>⚠</span><span>This route's conditions can change fast — verify before you go.</span></div>:null}<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["carToCar","⏱ Car-to-car"],["tempF","🌡 Temp"],["snow","❄ Snow"],["snowDepth","📏 Snow depth"],["freezing","🧊 Freezing lvl"],["water","💧 Water"],["bugs","🦟 Bugs"],["trail","🥾 Trail"],["seepage","💦 Seepage"],["mud","🟤 Mud"]].map(function(p){var cd=c.conditions[p[0]];return cd?<div key={p[0]} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:8,padding:"5px 9px",fontSize:12}}><span style={{color:C.textMuted}}>{p[1]+" "}</span><span style={{color:C.text,fontWeight:700}}>{cd.value}</span>{cd.n?<span style={{color:C.textMuted,fontSize:11}}>{" · "+cd.n+(cd.mostRecent?" · "+ago(cd.mostRecent):"")}</span>:null}</div>:null;})}</div></div>:null}<div style={{display:"flex",gap:12,alignItems:"center",marginBottom:14}}>
      <div style={{textAlign:"center"}}><div style={{fontSize:29,fontWeight:700,color:C.amber}}>{c.avgStars.toFixed(1)}</div><Stars n={c.avgStars}/><div style={{fontSize:12,color:C.textMuted,marginTop:2}}>avg rating</div></div>
      <div style={{flex:1}}><div style={{fontSize:12,color:C.textMuted,marginBottom:5,fontWeight:600}}>TOP CONDITIONS REPORTED</div>{c.topTags.map(t=><div key={t.tag} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,marginBottom:3}}><span style={{fontSize:12,color:C.text}}>{t.tag}</span><span style={{fontSize:12,fontWeight:700,color:C.teal,flexShrink:0}}>{t.pct}%</span></div><Bar val={t.pct} color={C.teal} h={6}/></div>)}</div>
    </div>
    <div style={{fontSize:12,color:C.textMuted,marginBottom:6,fontWeight:600}}>SEASONAL HEATMAP (user reports)</div>
    <div style={{display:"flex",gap:3}}>{MONTHS.map((mo,i)=>{const md=c.byMonth[i];const intensity=md?Math.min(1,(md.stars/md.count)/5):0;const isBest=c.bestMonths.includes(mo);return <div key={mo} style={{flex:1,textAlign:"center"}}><div style={{height:32,borderRadius:4,background:intensity>0?`rgba(63,185,80,${0.15+intensity*0.85})`:`${C.border}44`,border:isBest?`1px solid ${C.green}`:"none",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:intensity>0.5?"white":C.textMuted,fontWeight:600}}>{md?md.count:""}</div><div style={{fontSize:12,color:isBest?C.green:C.textMuted,marginTop:2,fontWeight:600}}>{mo}</div></div>;})}</div>
    {c.bestMonths.length>0?<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,alignItems:"center"}}><span style={{fontSize:12,color:C.textMuted}}>Best months:</span>{c.bestMonths.map(mo=><span key={mo} style={{background:C.greenBg,color:C.green,padding:"2px 9px",borderRadius:7,fontSize:12,fontWeight:700}}>{mo}</span>)}</div>:null}
    {c.faCredits&&c.faCredits.length?<div style={{marginTop:14,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:6}}>First Ascent Credit</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{c.faCredits.map(name=><span key={name} style={{fontSize:12,color:C.amber,background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:6,padding:"4px 9px",fontWeight:600}}>{name}</span>)}</div></div>:null}
    {c.isDeveloped?<div style={{marginTop:12,background:C.greenBg,border:`1px solid ${C.green}55`,borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>Route Development</div><div style={{fontSize:12.5,color:C.textSub,marginTop:4}}>This route has been bolted or developed by climbers in the community.</div></div>:null}
    {c.photos&&c.photos.length?<div style={{marginTop:14}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>Recent Photos</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{c.photos.map((p,i)=><div key={i} style={{position:"relative",paddingBottom:"100%",borderRadius:8,overflow:"hidden",background:C.card,cursor:"pointer",border:`1px solid ${C.border}`}}><img loading="lazy" decoding="async" src={p.url} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={()=>{}} />{p.user?<div style={{position:"absolute",left:0,right:0,bottom:0,padding:"8px 6px 4px",background:"linear-gradient(transparent,rgba(0,0,0,0.72))",fontSize:11,color:"#fff",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.user.split(" ")[0]}</div>:null}</div>)}</div></div>:null}
  </div>;
}
const SAFETY_ESSENTIALS={
sport:{title:"Clipping & lowering",items:["Recheck your knot and your partner's belay before you leave the ground.","Watch for back-clips and Z-clips on the first few bolts.","Make sure the rope reaches the anchor, and knot the belay end.","Lower and clean the anchor deliberately; call for 'take' clearly."]},
trad:{title:"Gear & anchors",items:["Build redundant, equalized anchors from independent pieces.","Place protection before the hard moves, not after them.","Manage rope drag; extend placements on wandering pitches.","Know your bail options if the crack thins or blanks out."]},
bouldering:{title:"Spotting & landing",items:["Set pads over uneven ground and the likely fall zone.","A spotter protects your head and spine, they do not catch you.","Down-climb when you can; commit to a clean fall when you cannot.","On highballs, treat the top-out like a solo, a fall is serious."]},
scrambling:{title:"Exposure & route-finding",items:["Know the spots where a slip turns into a long fall.","Most incidents happen off-route on loose ground, so stay on route.","Wet, icy, or sandy rock changes everything, turn back for weather.","On chains and narrow ledges, wait for two-way traffic to clear."]},
hiking:{title:"Navigation & weather",items:["Carry a map or GPS and check the forecast and your daylight.","Turn back for afternoon storms, especially above treeline.","Carry more water than you expect and know reliable sources.","Share your plan and expected return time with someone."]},
alpine:{title:"Snow, weather & timing",items:["Check the avalanche forecast and recent freeze-thaw history.","Start early to beat afternoon warming and thunderstorms.","Set a turnaround time and know your bail routes.","Watch for altitude effects; pace yourself and stay hydrated."]},
mountaineering:{title:"Glacier & high-mountain",items:["Travel roped on glaciers and know crevasse rescue.","Check avalanche danger and overnight snow stability.","Start in the dark for a firm freeze and turn around on time.","Manage altitude, cold, and fast-changing weather."]},
mountaineering_nontech:{title:"Snow travel & weather",items:["No rope or crevasse-rescue gear needed on the standard route — carry ice axe and crampons and know self-arrest.","Check avalanche danger and overnight snow stability before you go.","Start early for a firm freeze and turn around on time.","Manage altitude, cold, and fast-changing mountain weather."]},
ice:{title:"Ice quality & falling hazard",items:["Test the ice and your screws; avoid sun-rotten or detached daggers.","Falling ice is the main danger, so mind any teams above you.","It climbs best after a good overnight freeze; warm spells are risky.","Belay out of the fall line of ice and dropped tools."]},
mixed:{title:"Mixed & dry-tooling",items:["Falling ice and rock are constant; helmet on and belay off the line.","Verify ice features and fixed gear before you commit.","Conditions swing fast with sun and temperature.","Manage rope drag across the rock-to-ice transitions."]},
aid:{title:"Aid & big-wall",items:["Back up every critical placement and test it before weighting.","Watch for gear failure and zipper falls on marginal pieces.","Manage haul lines and anchor transitions methodically.","Fixed gear varies, so inspect it rather than trusting it blindly."]},
_default:{title:"Safety essentials",items:["Match your protection and pace to the terrain and conditions.","Check the forecast and set a turnaround time before you commit.","Carry the right gear for the discipline and know how to bail.","Tell someone your plan and expected return time."]}
};
const WATCH={sport:["Ground-fall potential on the first 2-3 bolts — stick-clip the first bolt and keep a sharp belay until you are clipped high.","Avoid back-clipping and Z-clipping; check each clip is correct.","Knot the belayer's end and confirm the rope is long enough before lowering — lowering off the end is a common accident.","Use an attentive, ideally assisted-braking belay; the leader's first clip is the most dangerous moment."],trad:["Place protection before the hard moves, not after — and watch for runout sections with no good gear.","Beware marginal, expanding, or behind-loose-block placements; back up the questionable ones.","Manage rope drag — extend wandering placements so a fall does not zipper your gear.","Build redundant, equalized anchors, and know your bail options if the crack blanks out."],bouldering:["Cover the actual fall and top-out zone with pads, and flatten landings over rocks and roots.","A spotter protects your head and spine — they do not catch you.","Downclimb when you can; on highballs treat a fall like a ground-fall."],scrambling:["Know the spots where a slip becomes a long fall — most incidents happen off-route on loose ground.","Test holds; loose rock is common, and do not knock rock onto people below.","Wet, icy, or sandy rock changes everything — back off for weather.","On chains and narrow ledges, wait for two-way traffic to clear."],hiking:["Carry map / GPS, check daylight, and turn back for afternoon storms — especially above treeline.","Plan your water sources and carry more than you expect.","Cross rivers early when flows are low, and unbuckle your pack hip belt before crossing.","Share your plan and expected return time."],alpine:["Rockfall is worst late morning and in the evening as freeze-thaw loosens rock and ice — move early and fast, and do not linger in couloirs.","Avoid lingering under seracs and icefall; they calve without warning.","Watch for afternoon lightning and fast weather changes; set a turnaround time and keep it.","Couloirs funnel falling rock and ice — minimize time in the firing line."],mountaineering:["Travel roped on glaciers and know crevasse rescue — hidden crevasses and weak snow bridges are a lethal threat.","Avoid routes under seracs and minimize time exposed to icefall and rockfall.","Check the avalanche forecast and recent freeze-thaw; start in the dark for a firm freeze.","Manage altitude (acclimatize, watch for AMS) and cornices on summit ridges."],mountaineering_nontech:["This is a non-technical route — no rope or crevasse-rescue gear is needed on the standard line, but ice axe and crampon self-arrest skills still matter.","Check the avalanche forecast and recent freeze-thaw; start early for a firmer, safer snowpack.","Watch for afternoon thunderstorms and fast-changing mountain weather; set a turnaround time and keep it.","Sun-softened snow and icy glissade chutes can be as hazardous as the climb itself — know when to walk instead of glissade."],ice:["Falling ice is the main danger — belay out of the fall line and mind any team above you.","Watch for brittle ice and dinner-plating; test your tools and screws.","It climbs best after a good overnight freeze; warm spells and sun make it dangerous.","Beware sun-rotten or detached daggers and free-standing pillars."],mixed:["Falling ice and rock are constant — helmet on and belay off the fall line.","Verify fixed gear and ice features before you commit; conditions swing fast with sun and temperature.","Manage rope drag across the rock-to-ice transitions."],aid:["Back up every critical placement and test it before you fully weight it; watch for zipper and factor-2 falls on marginal gear.","Manage haul lines and anchor transitions methodically, and do not drop gear on the party below.","Inspect fixed gear rather than trusting it blindly."],_default:["Match your protection and pace to the terrain and conditions.","Check the forecast and set a turnaround time before you commit.","Tell someone your plan and expected return time."]};
function avyCenterFor(mountain){var st=mountain,g=0;while(st&&st.areaType!=="state"&&st.parentId&&g<8){st=MOUNTAINS.find(function(x){return x.id===st.parentId;});g++;}var stateName=(st&&st.areaType==="state")?st.name:((mountain&&mountain.region)||"");var zone=(mountain&&mountain.avyZone)||"";var host=({Utah:"utahavalanchecenter.org",Washington:"nwac.us",Colorado:"avalanche.state.co.us",California:"sierraavalanchecenter.org"})[stateName]||"avalanche.org";var label=({Utah:"Utah Avalanche Center",Washington:"Northwest Avalanche Center",Colorado:"Colorado Avalanche Information Center",California:"Sierra Avalanche Center"})[stateName]||"avalanche.org";var path=host==="utahavalanchecenter.org"?(zone.indexOf("Uintas")>=0?"/forecast/uintas":zone.indexOf("Salt Lake")>=0?"/forecast/salt-lake":""):"";return [label,host,"https://"+host+path];}
// SAFETY_ESSENTIALS and WATCH each carry dedicated sport/trad/bouldering entries, and the
// bolt-problem reporter below is gated on cat==="sport" -- but all three lived inside
// SafetyMatrix, which only the Safety tab renders, and the tab strip filters "safety" out for
// exactly those three categories (and an effect hard-redirects a deep link away from it). So
// the safety content written for crag climbers was unreachable by every crag climber:
// 191,096 of 205,492 routes, including "stick-clip the first bolt" and a way to report a
// rusted or spinning hanger to local rebolters. One definition, rendered from the Safety tab
// for alpine disciplines and inline on Overview for crag ones.
// Both boxes below used to be chosen by discipline alone, so every alpine route was told to
// "check the avalanche forecast and recent freeze-thaw history" and every mountaineering
// route to carry a glacier kit. Southwest Rib on South Early Winters Spire is seven pitches
// of dry summer granite whose own row records `crevasses: "N/A - no glacier travel"`, and it
// got the full snow-and-glacier briefing. lib/terrain.js answers the question from the
// route's own data and only suppresses a line on positive evidence of absence — see the note
// there on why absent evidence keeps the warning instead of dropping it.
function CragSafetyNotes({route,onOpenHazards}){
  const cat=catOf(route);const safeCat=cat==="mountaineering"&&!needsRopedGlacierTravel(route)?"mountaineering_nontech":cat;
  const terr=routeTerrain(route);
  const dryTerrain=terr.glacier==="no"&&terr.snow==="no";
  // The canned title names terrain the route may not cross ("Snow, weather & timing").
  const titleFor=t=>dryTerrain&&/snow|glacier/i.test(t)?"Weather, timing & exposure":t;
  const tailored=n=>n?("Tailored to this route — "+n+" general "+(n===1?"line":"lines")+" about terrain this climb does not cross "+(n===1?"was":"were")+" left out."):"What matters most for this discipline";
  return <>
    {(()=>{const se=SAFETY_ESSENTIALS[safeCat]||SAFETY_ESSENTIALS._default;const fit=fitAdvice(se.items,terr);const items=fit.lines.length?fit.lines:SAFETY_ESSENTIALS._default.items;return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><span style={{display:"inline-flex"}}><ActionIcon name="shield" size={16} color={C.blue}/></span><span style={{fontSize:14,fontWeight:700,color:C.text}}>{titleFor(se.title)}</span><span style={{marginLeft:"auto",fontSize:13,color:C.text,textTransform:"uppercase",letterSpacing:0.5,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{(CAT[cat]||{}).label||cat}</span></div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:9}}>{tailored(fit.dropped)}</div>{items.map((t,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}><span style={{color:C.blue,fontSize:14,lineHeight:"17px",flexShrink:0}}>{"•"}</span><span style={{fontSize:13.5,color:C.textSub,lineHeight:1.5}}>{t}</span></div>)}</div>;})()}
    {(()=>{const fit=fitAdvice(WATCH[safeCat]||WATCH._default,terr);const items=fit.lines.length?fit.lines:WATCH._default;return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:9,display:"flex",alignItems:"center",gap:7}}><span>⚠️</span>{fit.dropped?"Watch out for on this climb":"Watch out for on this type of climb"}</div>{items.map((t,i)=><div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}><span style={{color:C.amber,fontSize:13,lineHeight:"17px",flexShrink:0}}>{<Lbl s={"▸"}/>}</span><span style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{t}</span></div>)}</div>;})()}
    {cat==="sport"?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:C.amber,marginBottom:3,display:"flex",alignItems:"center",gap:7}}><span>🔩</span>Spot a bolt or anchor problem?</div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:9,lineHeight:1.45}}>Flag worn or unsafe fixed gear so the next party — and local rebolters — know before they clip.</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["Rusted","Spinner / loose","Missing hanger","Worn / sharp","Needs replacement"].map(o=><button key={o} onClick={()=>onOpenHazards&&onOpenHazards("Fixed gear: "+o)} style={{padding:"6px 11px",borderRadius:20,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12,fontWeight:600,cursor:"pointer"}}>{o}</button>)}</div></div>:null}
  </>;
}
function SafetyMatrix({route,mountain,hzVotes,onVote,onOpenContribute,onOpenStartLoc,onOpenHazards,onOpenTurnaround}){
  const [openK,setOpenK]=useState(null);
  const cat=catOf(route);const safeCat=cat==="mountaineering"&&!needsRopedGlacierTravel(route)?"mountaineering_nontech":cat;/* The avalanche panel used to appear for every ice/mixed/alpine/mountaineering route with an
   avy zone on its area. A dry summer rock climb sits in a zone too, and printing a forecast
   block for it reads as a hazard the route does not have — SEWS's own row says as much
   ("N/A - non-glaciated summer rock route"). */
const avyRelevant=["ice","mixed","alpine","mountaineering"].includes(cat)&&routeTerrain(route).avalanche!=="no";const realBail=(route.waypoints||[]).filter(w=>wpIs(w,"Bailout"));const bail=realBail.length?realBail:(route.waypoints||[]).filter(w=>["Junction","Campsite","Trailhead"].includes(w.type));const bailIsReal=realBail.length>0;const kcon=routeKw(route);const flaggedHaz=kcon.hazards.filter(h=>!h.official&&h.count>=2);const confHaz=hstr=>kcon.hazards.find(h=>h.official&&h.count>=2&&HAZ_KW[h.label].some(kk=>hstr.toLowerCase().indexOf(kk)>=0));const envRelevant=["alpine","mountaineering"].includes(cat);const _objHaz=Array.isArray(route.objHaz)?route.objHaz:(route.objHaz?[route.objHaz]:[]);/* The box merges hazards, objHaz and watchOut. It used to de-duplicate the first two by exact
     string equality and compare watchOut against neither, so Southwest Rib on SEWS printed
     "runout slab" twice verbatim and a third time as a full sentence. mergeHazards drops an
     entry only when every significant word in it appears in one that is kept, so the surviving
     line always says at least as much. */
  const _mergedHaz=mergeHazards(route.hazards,_objHaz);const _allHaz=_mergedHaz.items;
  const _watchOut=mergeHazards(route.hazards,_objHaz,route.watchOut).items.filter(function(t){return _allHaz.indexOf(t)<0;});const envHaz=envRelevant?_allHaz.filter(h=>ENV_HAZ_RE.test(h)):[];const physHaz=envRelevant?_allHaz.filter(h=>!ENV_HAZ_RE.test(h)):_allHaz;const _rd=(route.activity||[]).map(a=>a.date).filter(Boolean).sort();const repN=(route.activity||[]).length;const lastRepY=_rd.length?new Date(_rd[_rd.length-1]).getFullYear():null;const nowY=new Date().getFullYear();const stale=lastRepY&&(nowY-lastRepY)>=2;const avyCenter=avyCenterFor(mountain);
  return <div>
    <CragSafetyNotes route={route} onOpenHazards={onOpenHazards}/>
    {/* watchOut is rendered inside this box but was not part of its condition, so a route
        carrying only watch-outs and no hazards printed none of them. */}
    {(physHaz.length||flaggedHaz.length||_watchOut.length)?<div style={{background:C.redBg,borderRadius:12,padding:"13px 15px",marginBottom:12,border:`1px solid ${C.red}44`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>KNOWN HAZARDS</div><ProvChip prov={sectionProvenance(route,"hazards")}/></div>{onOpenHazards?<button onClick={onOpenHazards} style={{padding:"8px 12px",borderRadius:9,border:"1px solid "+C.red+"66",background:C.card,color:C.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>✎ Suggest a fix</button>:null}</div>{physHaz.map((h,i)=>{const cf=confHaz(h);return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0",flexWrap:"wrap"}}><span style={{fontSize:13,color:C.textSub,flex:1,minWidth:120,lineHeight:1.45}}>• {h}</span>{cf?<span style={{fontSize:12,fontWeight:700,color:C.green,background:C.greenBg,borderRadius:6,padding:"2px 7px",whiteSpace:"nowrap"}}>{"✓ confirmed · "+cf.count+" report"+(cf.count===1?"":"s")+(cf.season?" · "+cf.season:"")+(cf.year?" · "+cf.year:"")}</span>:null}</div>;})}{_watchOut.map((w,i)=><div key={"wo"+i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0"}}><span style={{color:C.amber,flexShrink:0,fontSize:13}}>⚠</span><span style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{w}</span></div>)}{flaggedHaz.length?<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.red}33`}}><div style={{fontSize:11.5,fontWeight:700,color:C.amber,marginBottom:7}}>Reported by climbers — not yet in official info</div>{flaggedHaz.map(h=><CRow key={h.label} item={h} kind="h" routeId={route.id} hzVotes={hzVotes} onVote={onVote} openK={openK} setOpenK={setOpenK}/>)}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:7}}>Pulled from recent trip reports and not in the official list yet. Treat them seriously and verify before you commit.</div></div>:null}</div>:<GapNote what="No route-specific hazards recorded" why="The advice above is general to this discipline, not to this line. Nobody has recorded rockfall, cornices, moats or anything else particular to this route — that is missing information, not a clean bill of health." cta="Add what you know" onFix={onOpenHazards?function(){onOpenHazards();}:undefined}/>}{envHaz.length?<div style={{background:C.greenBg,borderRadius:12,padding:"13px 15px",marginBottom:12,border:`1px solid ${C.green}44`}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>WILDLIFE & SEASONAL NOTICES</div>{envHaz.map((h,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"3px 0"}}><span style={{fontSize:13,color:C.textSub,flex:1,lineHeight:1.45}}>• {h}</span></div>)}</div>:null}{kcon.conflicts.length?<div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name="alert" size={14} color={C.amber}/></span><div style={{fontSize:11.5,color:C.amber,lineHeight:1.45}}>{kcon.conflicts[0]}</div></div>:null}{repN?<div style={{display:"flex",alignItems:"flex-start",gap:8,background:stale?C.amberBg:C.surface,border:`1px solid ${stale?C.amber:C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name={stale?"alert":"check"} size={14} color={stale?C.amber:C.textSub}/></span><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>{repN<2?("Only "+repN+" trip report so far — low confidence. Verify conditions yourself, and consider logging one for the climbers after you."):(stale?("Most recent trip report is from "+lastRepY+" — conditions and hazards can change year to year. Verify current conditions before you go."):("Based on "+repN+" trip reports"+(lastRepY?", most recent "+lastRepY:"")+" · "+kcon.confidence+" data confidence. Hazards and conditions update automatically as climbers log new reports."))}</div></div>:<div style={{display:"flex",alignItems:"flex-start",gap:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",marginBottom:12}}><span style={{flexShrink:0}}><ActionIcon name="doc" size={14} color={C.textMuted}/></span><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45}}>Add a trip report from your logbook — be the first to log conditions and hazards for the climbers after you.</div></div>}
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
      if(!rows.length)return null;
      return <div style={{background:C.card,borderRadius:12,padding:"13px 15px",marginBottom:12,border:`1px solid ${C.border}`}}>
        <div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>SEASONAL HAZARDS</div>
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
  if(!(mountain&&mountain.avyZone)&&!_realAvyMonths.length)return null;const AVY_COL={Considerable:[C.red,C.redBg],Moderate:[C.amber,C.amberBg],Low:[C.green,C.greenBg]};return <div style={{background:C.card,borderRadius:12,padding:"13px 15px",marginBottom:12,border:`1px solid ${C.border}`}}><div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:6,marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>AVALANCHE FORECAST</div>{mountain&&mountain.avyZone?<span style={{fontSize:12,color:C.textMuted}}>{mountain.avyZone}</span>:null}</div>{months.length?<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:9}}>{months.map(([month,level])=>{const [col,bg]=AVY_COL[level]||[C.textMuted,C.surface];return <div key={month} style={{background:bg,border:"1px solid "+col+"55",borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:11.5,fontWeight:700,color:col}}>{month}</div><div style={{fontSize:10.5,color:C.textSub}}>{level}</div></div>;})}</div>:null}{_avyNote?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:7}}><span style={{fontWeight:700}}>{"Forecast coverage: "}</span>{_avyNote}</div>:null}<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>This app doesn't pull a live danger rating — check the forecast below before you go.</div><a href={avyCenter[2]} target="_blank" rel="noreferrer" style={{display:"block",marginTop:8,fontSize:12,color:C.blue,textDecoration:"none"}}>{"→ Full forecast at "+avyCenter[1]}</a></div>;})():null}
    <div style={{background:C.card,borderRadius:12,padding:"13px 15px",marginBottom:12,border:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:3}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>BAILOUT & TURNAROUND</div>{route.turnaround&&onOpenTurnaround?<EditIconButton onClick={onOpenTurnaround} title="Edit turnaround guidance"/>:null}</div>
      {/* WHEN to retreat, above WHERE to retreat to — the order a decision is actually
          made in. This prose used to be a TURNAROUND box on the Plan tab, away from the
          bail points it depends on; see the note at that former mount. */}
      {route.turnaround?<div style={{background:C.surface,border:"1px solid "+C.borderLight,borderRadius:9,padding:"8px 10px",margin:"6px 0 9px"}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:0.3,marginBottom:3}}>WHEN TO TURN AROUND</div>{splitParagraphs(String(route.turnaround)).map(function(p,i){return <p key={i} style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,margin:i===0?"0":"7px 0 0"}}>{p}</p>;})}</div>:null}
      {route.bail?<div style={{fontSize:12.5,color:C.textSub,marginBottom:9,lineHeight:1.5}}>{route.bail}</div>:null}
      {(!bail.length&&!route.bail)?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:9,lineHeight:1.45}}>No bail data yet — be the first to add real bail info for this route.</div>:null}
      {bail.length&&!bailIsReal?<div style={{fontSize:11.5,color:C.textMuted,marginBottom:9,lineHeight:1.4}}>No confirmed bail data yet — these are inferred from nearby waypoints, not verified retreat points.</div>:null}
      {bail.map((wp,i)=><div key={i} style={{padding:"7px 0",borderBottom:i<bail.length-1?`1px solid ${C.borderLight}`:"none"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:7,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:600}}>{wp.name}</span>
          {wp.distMi!=null?<span style={{fontSize:12,color:C.textMuted}}>{uDistMi(wp.distMi)+(wp.timeToSafety?" · "+wp.timeToSafety:"")+" from TH"}</span>:null}
        </div>
        {wp.anchorType?<div style={{fontSize:12,color:C.textSub,marginTop:2}}>{wp.anchorType}</div>:null}
        {wp.note?<div style={{fontSize:12,color:C.textSub,marginTop:2}}>{wp.note}</div>:null}
        {wp._source?<div style={{fontSize:11,fontWeight:600,marginTop:3,color:wp._source==="logged"?C.green:C.textMuted}}>{(wp._source==="logged"?"✓ From a logged climb":"Suggested — unclimbed")+(wp._by?" · "+wp._by:"")}</div>:null}
      </div>)}
      <div style={{display:"flex",gap:7}}>{onOpenContribute?<button onClick={onOpenContribute} style={{marginTop:9,padding:"7px 11px",background:C.surface,color:C.blue,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>+ Add a bail point</button>:null}{onOpenStartLoc?<button onClick={onOpenStartLoc} style={{marginTop:9,padding:"7px 11px",background:C.surface,color:C.blue,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>+ Add start location</button>:null}</div>
    </div>
  </div>;
}
const PIN_CATEGORIES=[["belay","Belay/anchor",C.blue],["rappel","Rappel",C.purple],["natural","Natural anchor",C.green],["variant","Variant line",C.amber],["bivy","Bivy",C.teal],["hazard","Hazard",C.red]];
function pinColor(cat){var f=PIN_CATEGORIES.find(function(p){return p[0]===cat;});return f?f[2]:C.textMuted;}
/* A topo point is stored as a percentage, and TopoLineOverlay is `inset:0` with
   preserveAspectRatio="none" — so a stored point means "this far across MY CONTAINER", not
   "this far across the photo". Those are the same thing only when the container IS the
   painted photo, and on all three surfaces that draw a topo it was not:

     surface                     container     object-fit   stored x=10% landed at
     editor  (TopoDrawer)        4:3           cover        14.4% of the photo
     thumbnail (TopoSection)     132x132 (1:1) cover        23.3%
     viewer  (TopoPhotoModal)    auto          contain      10.0%

   (measured on a 3:2 photo — the middle of a line agrees at 50% because cover crops
   symmetrically, which is precisely why the drift is easy to miss: the centre looks right
   and both ends are wrong.) A belay pin placed on the correct flake in the editor rendered
   on a different flake in the strip.

   The fix is to make the container equal the painted photo everywhere: take the aspect ratio
   from the image once it has loaded and fit it with `contain`, so painted rect == container
   rect and a stored percentage means the same thing on every surface. `topos` and
   `topo_lines` were both EMPTY when this changed, so no drawn line moved; once climbers
   start drawing, changing this basis becomes a data migration. */
function useImgAspect(){
  const [ar,setAr]=useState(null);
  const onLoad=function(e){const t=e.currentTarget;if(t&&t.naturalWidth&&t.naturalHeight)setAr(t.naturalWidth+" / "+t.naturalHeight);};
  return [ar,onLoad];
}
const TOPO_IMG={position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",display:"block"};
function TopoLineOverlay({points,pins}){
  if((!points||points.length<2)&&(!pins||!pins.length))return null;
  var path=(points||[]).map(function(p,i){return (i===0?"M":"L")+p.x+","+p.y;}).join(" ");
  return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
    {path?<path d={path} fill="none" stroke={C.amber} strokeWidth={0.6} vectorEffect="non-scaling-stroke" style={{filter:"drop-shadow(0 0 2px rgba(0,0,0,0.8))"}}/>:null}
    {(pins||[]).map(function(pn,i){return <circle key={i} cx={pn.x} cy={pn.y} r={1.6} fill={pinColor(pn.category)} stroke="#fff" strokeWidth={0.4}/>;})}
  </svg>;
}
/* The topo editor. Four things it could not do, each of them the difference between a line a
   climber trusts and one they redraw:

     · Drawing was TAP-ONLY — one point per tap, so a twelve-pitch line was ~15 separate taps
       and any wobble meant starting over. It draws on drag now, sampling a point every 1.5%
       of the frame so a swipe yields a usable polyline rather than 400 coordinates.
     · A mis-placed point could not be fixed. The only tools were "undo last" and "clear all",
       so one bad point four points back cost you the four after it. Every point and pin is a
       draggable handle now, and the selected one can be deleted on its own.
     · No zoom, on a phone-sized image. A belay pin has to land on a specific ledge; at 390px
       wide, 1% of the frame is under 4px. A loupe follows the drag at 3x, which is how touch
       platforms have solved this since iOS text selection.
     · Upload/save errors used alert() — a blocking dialog, in an app that has toasts and
       inline notices everywhere else. Now an inline error inside the section.

   Coordinates stay percentages of the frame, and the frame is the painted photo (see
   TopoLineOverlay) — dragging clamps to 0..100 so a handle pulled off the edge cannot store a
   point that is not on the rock. */
const LOUPE_Z = 3;            // magnification
const DRAW_MIN_STEP = 1.5;    // % of frame between sampled points while dragging
function TopoDrawer({initial,onCancel,onSubmit}){
  const [points,setPoints]=useState((initial&&initial.points)||[]);const [pins,setPins]=useState((initial&&initial.pins)||[]);const [ar,arOnLoad]=useImgAspect();
  const [mode,setMode]=useState("line");const [pinCat,setPinCat]=useState(PIN_CATEGORIES[0][0]);
  const [sel,setSel]=useState(null);      // {kind:"point"|"pin", i} — the handle under edit
  const [loupe,setLoupe]=useState(null);  // {x,y} while a drag is in flight
  const frameRef=useRef(null);
  const drag=useRef(null);                // {kind:"point"|"pin"|"draw", i}
  const photo=initial&&initial.photoUrl;

  // Clamped so a drag that leaves the frame parks the handle on the edge rather than storing
  // a coordinate that is not on the photo.
  const at=function(e){
    const r=frameRef.current.getBoundingClientRect();
    const c=(v,size)=>Math.min(100,Math.max(0,Math.round((v/size)*1000)/10));
    return {x:c(e.clientX-r.left,r.width),y:c(e.clientY-r.top,r.height)};
  };
  const moveTo=function(kind,i,p){
    if(kind==="point")setPoints(function(a){return a.map(function(q,qi){return qi===i?{x:p.x,y:p.y}:q;});});
    else setPins(function(a){return a.map(function(q,qi){return qi===i?Object.assign({},q,{x:p.x,y:p.y}):q;});});
  };
  const onDown=function(e){
    if(!frameRef.current)return;
    const p=at(e);
    const h=e.target&&e.target.dataset&&e.target.dataset.h;   // "point:3" / "pin:1"
    try{e.currentTarget.setPointerCapture(e.pointerId);}catch(_e){}
    if(h){
      const [kind,idx]=h.split(":");
      drag.current={kind:kind,i:+idx};
      setSel({kind:kind,i:+idx});
      setLoupe(p);
      return;
    }
    if(mode==="line"){
      drag.current={kind:"draw"};
      setPoints(function(a){return a.concat([p]);});
      setSel({kind:"point",i:points.length});
    }else{
      setPins(function(a){return a.concat([{x:p.x,y:p.y,category:pinCat,note:""}]);});
      setSel({kind:"pin",i:pins.length});
    }
    setLoupe(p);
  };
  const onMove=function(e){
    if(!drag.current||!frameRef.current)return;
    const p=at(e);
    setLoupe(p);
    if(drag.current.kind==="draw"){
      setPoints(function(a){
        const last=a[a.length-1];
        if(last&&Math.abs(last.x-p.x)<DRAW_MIN_STEP&&Math.abs(last.y-p.y)<DRAW_MIN_STEP)return a;
        return a.concat([p]);
      });
      return;
    }
    moveTo(drag.current.kind,drag.current.i,p);
  };
  const onUp=function(){drag.current=null;setLoupe(null);};

  const delSel=function(){
    if(!sel)return;
    if(sel.kind==="point")setPoints(function(a){return a.filter(function(_q,i){return i!==sel.i;});});
    else setPins(function(a){return a.filter(function(_q,i){return i!==sel.i;});});
    setSel(null);
  };
  const sm=on=>({padding:"8px 12px",borderRadius:15,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"});
  const btn={flex:1,padding:8,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,cursor:"pointer"};
  const handle=function(kind,i,x,y,col){
    const on=sel&&sel.kind===kind&&sel.i===i;
    return <span key={kind+i} data-h={kind+":"+i} title={kind==="point"?("Point "+(i+1)+" — drag to move"):"Pin — drag to move"}
      style={{position:"absolute",left:x+"%",top:y+"%",width:on?18:10,height:on?18:10,marginLeft:on?-9:-5,marginTop:on?-9:-5,
        borderRadius:"50%",background:on?col:col+"99",border:(on?2:1.5)+"px solid "+(on?"#fff":"rgba(255,255,255,0.6)"),
        boxShadow:on?"0 0 0 3px "+C.blue+"66":"none",cursor:"grab",touchAction:"none"}}/>;
  };
  return <div>
    <div style={{display:"flex",gap:6,marginBottom:8}}>{[["line","Draw line"],["pin","Add pins"]].map(function(m){return <button key={m[0]} onClick={function(){setMode(m[0]);setSel(null);}} style={sm(mode===m[0])}>{m[1]}</button>;})}</div>
    {mode==="pin"?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>{PIN_CATEGORIES.map(function(c){return <button key={c[0]} onClick={function(){setPinCat(c[0]);}} aria-current={pinCat===c[0]?"true":undefined} style={{padding:"8px 11px",borderRadius:14,border:"1px solid "+(pinCat===c[0]?c[2]:C.border),background:pinCat===c[0]?c[2]+"22":C.surface,color:pinCat===c[0]?c[2]:C.textSub,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>{c[1]}</button>;})}</div>:null}
    <div style={{fontSize:11.5,color:C.textMuted,marginBottom:6,lineHeight:1.45}}>{mode==="line"?"Drag along the line to draw it, or tap point by point. Drag any dot to move it.":"Tap where the feature is. Drag any dot to move it."}</div>
    {/* touchAction:"none" is load-bearing: without it the browser claims the gesture for
        scrolling and the drag never reaches these handlers on a touch screen.

        HONEST NOTE ON check:clickable: this surface used to be a <div onClick> and was counted
        in that guard's mouse-only baseline. Pointer handlers are not onClick, so the scanner no
        longer sees it and the baseline drops by one — that is the guard losing sight of a
        control, NOT the control becoming keyboard-operable. Freehand drawing on a photo has no
        sensible key-by-key equivalent, so it stays pointer-driven on purpose. What IS reachable
        from a keyboard is everything destructive or corrective: Undo last point, Delete
        selected and Clear all are real <button>s, as are the mode and category chips. */}
    <div ref={frameRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      style={{position:"relative",width:"100%",aspectRatio:ar||"4 / 3",background:C.card,borderRadius:9,overflow:"hidden",cursor:"crosshair",marginBottom:9,border:"1px solid "+C.border,touchAction:"none",userSelect:"none"}}>
      {photo?<img loading="lazy" decoding="async" src={photo} alt="" onLoad={arOnLoad} draggable={false} style={TOPO_IMG}/>:<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.textMuted}}>Tap to place points</div>}
      <TopoLineOverlay points={points} pins={pins}/>
      {points.map(function(p,i){return handle("point",i,p.x,p.y,C.amber);})}
      {pins.map(function(p,i){return handle("pin",i,p.x,p.y,pinColor(p.category));})}
      {(loupe&&photo)?<div style={{position:"absolute",top:8,right:8,width:104,height:104,borderRadius:"50%",overflow:"hidden",border:"2px solid "+C.blue,boxShadow:"0 6px 18px rgba(0,0,0,0.55)",pointerEvents:"none",
        backgroundImage:"url("+photo+")",backgroundRepeat:"no-repeat",backgroundSize:(LOUPE_Z*100)+"% "+(LOUPE_Z*100)+"%",backgroundPosition:loupe.x+"% "+loupe.y+"%"}}>
        <span style={{position:"absolute",left:"50%",top:"50%",width:11,height:11,marginLeft:-5.5,marginTop:-5.5,borderRadius:"50%",border:"1.5px solid "+C.blue,background:"rgba(255,255,255,0.25)"}}/>
      </div>:null}
    </div>
    <div style={{display:"flex",gap:7,marginBottom:9}}>
      <button onClick={function(){if(mode==="line")setPoints(function(p){return p.slice(0,-1);});else setPins(function(p){return p.slice(0,-1);});setSel(null);}} style={btn}>Undo last point</button>
      <button onClick={delSel} disabled={!sel} style={Object.assign({},btn,{opacity:sel?1:0.45,cursor:sel?"pointer":"default"})}>{sel?("Delete "+(sel.kind==="point"?"point "+(sel.i+1):"pin")):"Delete selected"}</button>
      <button onClick={function(){setPoints([]);setPins([]);setSel(null);}} style={btn}>Clear all</button>
    </div>
    {pins.length?<div style={{marginBottom:9}}>{pins.map(function(pn,i){return <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}><span style={{width:9,height:9,borderRadius:"50%",background:pinColor(pn.category),flexShrink:0}}/><input aria-label={(PIN_CATEGORIES.find(function(c){return c[0]===pn.category;})||[])[1]+" — note (optional)"} value={pn.note} onChange={function(e){var v=e.target.value;setPins(function(p){return p.map(function(x,xi){return xi===i?Object.assign({},x,{note:v}):x;});});}} onFocus={function(){setSel({kind:"pin",i:i});}} placeholder={(PIN_CATEGORIES.find(function(c){return c[0]===pn.category;})||[])[1]+" — note (optional)"} style={{flex:1,padding:"6px 9px",borderRadius:8,border:"1px solid "+((sel&&sel.kind==="pin"&&sel.i===i)?C.blue:C.border),background:C.surface,color:C.text,fontSize:12,boxSizing:"border-box",outline:"none"}}/></div>;})}</div>:null}
    <div style={{display:"flex",gap:7}}>
      <button onClick={onCancel} style={{flex:1,padding:9,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button>
      <button disabled={points.length<2&&!pins.length} onClick={function(){onSubmit({points:points,pins:pins});}} style={{flex:2,padding:9,background:(points.length<2&&!pins.length)?C.border:C.blueSolid,color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save topo</button>
    </div>
  </div>;
}
function PhotoRow({items,w,h}){
  const [view,setView]=useState(null);
  if(!items||!items.length)return null;
  const W=w||128,H=h||96;
  return <div><div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:6}}>{items.map((it,i)=>{const url=typeof it==="string"?it:(it.u||it.url);const a=(it&&it.a)||null;const cap=(it&&it.caption)||null;return <div key={i} style={{flexShrink:0,width:W}}><div {...clickable(()=>setView(url))} style={{position:"relative",cursor:"pointer"}}><img loading="lazy" decoding="async" src={url} alt="" onError={onImgErr(FALLBACK_COVER)} style={{width:W,height:H,objectFit:"cover",borderRadius:11,border:`1px solid ${C.border}`}}/>{a&&a.user?<div style={{position:"absolute",left:6,bottom:6,display:"flex",alignItems:"center",gap:4,background:"rgba(0,0,0,0.55)",borderRadius:20,padding:"2px 8px 2px 2px"}}><Av src={a.avatar} size={18}/><span style={{fontSize:12,color:"#fff",fontWeight:600}}>{(a.user||"").split(" ")[0]}</span></div>:null}</div>{cap?<div style={{fontSize:12,color:C.textSub,marginTop:4,lineHeight:1.4}}>{cap}</div>:null}</div>;})}</div>{view?createPortal(<div onClick={()=>setView(null)} role="dialog" aria-label="Photo viewer" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><img loading="lazy" decoding="async" src={view} alt="" onError={onImgErr(FALLBACK_COVER)} style={{maxWidth:"100%",maxHeight:"100%",borderRadius:12,objectFit:"contain"}}/><button onClick={()=>setView(null)}  style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,0.15)",border:"none",color:"white",borderRadius:"50%",width:36,height:36,fontSize:19,cursor:"pointer",lineHeight:1}} aria-label="Close">×</button></div>,document.body):null}</div>;
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
function ItineraryView({route,onSeeReports,onContribute,myItin,onSaveMyItin,crewsForRoute,onShareItinToCrew}){
  const it=route.itinerary;const k=routeKw(route);const repN=(route.activity||[]).length;
  const [showBuilder,setShowBuilder]=useState(false);const [draft,setDraft]=useState(null);const [pickCrew,setPickCrew]=useState(false);const [pickedKey,setPickedKey]=useState(null);
  const avail=getAvailableItineraries(route);
  const startBuilder=function(seedItin){setDraft(seedItin?{days:itinDaysToDraft(seedItin.days)}:{days:[blankItinDay()]});setPickedKey(null);setShowBuilder(true);};
  const draftContentDays=function(){return (itinDraftToStructured(draft).days||[]).length;};
  // itinDraftToStructured drops contentless days, so an untouched builder yields zero
  // days. Saving that used to toast "Saved your plan — added to My Objectives", bump
  // the objectives count and store nothing. Refuse instead of reporting success.
  const saveDraft=function(){if(!draftContentDays())return;onSaveMyItin&&onSaveMyItin(itinDraftToStructured(draft));setShowBuilder(false);setDraft(null);setPickedKey(null);};
  const downloadItin=function(itObj){try{var blob=new Blob([itinToText(itObj,route.name)],{type:"text/plain"});var u=URL.createObjectURL(blob);var el=document.createElement("a");el.href=u;el.download=(route.name||"route").replace(/[^a-z0-9]+/gi,"_")+"_plan.txt";document.body.appendChild(el);el.click();el.remove();setTimeout(function(){URL.revokeObjectURL(u);},1500);}catch(e){}};
  const days=(it&&it.days&&it.days.length)?it.days:[];const proseIt=(typeof it==="string"&&it.trim())?it.trim():null;
  const parsed=(!days.length&&proseIt)?splitItineraryDays(proseIt):{days:[],multi:false};
  const totG=days.reduce((a,d)=>a+(d.gainFt||0),0),totL=days.reduce((a,d)=>a+(d.lossFt||0),0),totMi=days.reduce((a,d)=>a+(d.miles||0),0);
  const conf=k.confidence;const confC=conf==="High"?C.green:conf==="Medium"?C.amber:C.red;
  const flagged=k.hazards.filter(h=>!h.official&&h.count>=2).length;
  const chip=(t,col)=><span style={{fontSize:12,fontWeight:700,color:col,background:col+"22",borderRadius:7,padding:"3px 8px"}}>{t}</span>;
  const stat=(k,ic,val,col)=>val==null||val===""?null:<div key={k} style={{display:"flex",alignItems:"center",gap:4,background:C.surface,borderRadius:8,padding:"5px 9px"}}><span style={{fontSize:12}}>{ic}</span><span style={{fontSize:12,fontWeight:700,color:col||C.text}}>{val}</span></div>;
  return <div>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}><span style={{fontSize:15,fontWeight:700}}>Trip plan</span></div>
    {(days.length||parsed.multi||proseIt)?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:9}}>A <b style={{color:C.textSub}}>recommended</b> itinerary based on how parties commonly climb this route — not the only way to do it. Faster/slower parties, different camps, or a different order are all normal.</div>:null}
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{chip(conf+" confidence",confC)}{repN?<span {...clickable(()=>onSeeReports&&onSeeReports())} style={{cursor:"pointer"}} title="Jump to trip reports">{chip(repN+(repN===1?" trip report":" trip reports")+" →",C.blue)}</span>:chip("0 trip reports",C.textMuted)}{(route.season&&!["trad","sport"].includes(catOf(route)))?chip("Typical season: "+seasonShort(route.season),C.teal):null}</div>{(route.season&&!["trad","sport"].includes(catOf(route))&&seasonShort(route.season)!==String(route.season).trim())?<div style={{fontSize:12,color:C.textSub,margin:"6px 0 0",lineHeight:1.5}}>{route.season}</div>:null}{(route.bestSeason&&!route.seasonalGuidance&&!["trad","sport"].includes(catOf(route)))?<div style={{fontSize:12,color:C.textSub,margin:"6px 0 0",lineHeight:1.5}}><b style={{color:C.teal}}>When to go: </b>{route.bestSeason}</div>:null}{(route.seasonalGuidance&&!["trad","sport"].includes(catOf(route)))?<div style={{fontSize:12,color:C.textMuted,margin:"6px 0 0",lineHeight:1.5,fontStyle:"italic"}}>Full month-by-month seasonal guidance is further down this tab.</div>:null}
    {it&&it.cal?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,marginBottom:4}}>{it.cal}</div>:null}
    {it&&it.totalNote?<div style={{fontSize:12,color:C.textMuted,marginBottom:12}}>{it.totalNote}</div>:<div style={{marginBottom:12}}/>}
    {/* Where the hours actually came from. Populated on 544 routes and read by nothing until
        now, which mattered more than most unread fields: the day-by-day times above look
        equally authoritative whether they came from a trip report, from Beckey, or from
        "no route-specific trip report was found ... timing estimated from its relationship to
        Let it Burn/West Face". Sits beside the confidence chip because it is the sentence that
        chip is summarising. */}
    
    {days.map((d,i)=><div key={i} style={{display:"flex",gap:10,marginBottom:11}}>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}><div style={{width:30,height:30,borderRadius:15,background:C.blueBg,color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{d.n||i+1}</div>{i<days.length-1?<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:18}}/>:null}</div>
      <div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}>
        <div style={{fontSize:13.5,fontWeight:700,marginBottom:d.objective?5:8,lineHeight:1.35}}>{d.title}</div>{d.objective?<div style={{fontSize:12,color:C.textSub,lineHeight:1.45,marginBottom:9}}><span style={{color:C.blue,fontWeight:700}}>Objective · </span>{d.objective}</div>:null}
        <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",marginBottom:d.note?8:0}}>{[stat("gain","↑",d.gainFt!=null?uElev(d.gainFt):null,C.green),stat("loss","↓",d.lossFt!=null?uElev(d.lossFt):null,C.amber),stat("hours","",d.hours?d.hours+" hr":null,C.text),stat("miles","",d.miles?uDistMi(d.miles):null,C.text),stat("pack","",d.packLb?uMass(d.packLb):null,C.purple)]}</div>
        {d.note?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5}}>{d.note}</div>:null}{d.schedule&&d.schedule.length?<div style={{marginTop:d.note?10:9,borderTop:"1px solid "+C.borderLight,paddingTop:10,display:"flex",flexDirection:"column",gap:9}}>{d.schedule.map((st,si)=><div key={si} style={{display:"flex",gap:10,alignItems:"flex-start"}}><span style={{flexShrink:0,width:68,fontSize:12,fontWeight:700,color:st.time?C.blue:C.textMuted,lineHeight:1.35,paddingTop:1,textAlign:"right",wordBreak:"break-word"}}>{st.time||""}</span><div style={{flex:1,minWidth:0,borderLeft:"2px solid "+C.borderLight,paddingLeft:11}}><div style={{fontSize:12.5,color:C.text,lineHeight:1.4,fontWeight:600}}>{st.label}</div>{st.detail?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.45,marginTop:2}}>{st.detail}</div>:null}</div></div>)}</div>:null}
      </div></div>)}
    {(!days.length&&!parsed.multi)?<div style={{fontSize:12.5,color:C.textSub,background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"11px 13px",marginBottom:10}}>No day-by-day plan on file yet for this route.</div>:null}
    {days.length?<div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center",background:C.surface,borderRadius:10,padding:"9px 11px",marginBottom:10}}><span style={{fontSize:12,fontWeight:700,color:C.textMuted,alignSelf:"center",marginRight:2}}>TOTAL</span>{stat("days","",days.length+(days.length===1?" day":" days"),C.text)}{stat("gain","↑",uElev(totG),C.green)}{totL?stat("loss","↓",uElev(totL),C.amber):null}{totMi?stat("miles","",uDistMi(Math.round(totMi*10)/10),C.text):null}</div>:null}
    {days.length?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>Times and pack weights are estimates for an average party — adjust for your fitness, conditions, and the latest <b style={{color:C.textSub}}>Reports</b> and <b style={{color:C.textSub}}>Safety</b> tabs.{flagged?" Climbers have flagged "+flagged+" hazard"+(flagged!==1?"s":"")+" not in the official info — check Safety before you commit.":""}</div>:null}{(!days.length&&parsed.multi)?<div>{parsed.days.map((d,i)=>{const steps=splitItinerarySteps(d.text);return <div key={i} style={{display:"flex",gap:10,marginBottom:11}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}><div style={{width:30,height:30,borderRadius:15,background:C.blueBg,color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{d.n}</div>{i<parsed.days.length-1?<div style={{flex:1,width:2,background:C.border,marginTop:3,minHeight:18}}/>:null}</div><div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 13px"}}><div style={{fontSize:13.5,fontWeight:700,marginBottom:8}}>{"Day "+d.n}</div>{steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:6}}>{steps.map((s,si)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{s}</li>)}</ul>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{d.text}</div>}</div></div>;})}<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginTop:2}}>Day-by-day timing is a general guide — adjust for your fitness, conditions, and the latest <b style={{color:C.textSub}}>Reports</b> and <b style={{color:C.textSub}}>Safety</b> tabs.{flagged?" Climbers have flagged "+flagged+" hazard"+(flagged!==1?"s":"")+" not in the official info — check Safety before you commit.":""}</div></div>:null}
    {(!days.length&&!parsed.multi&&proseIt)?(()=>{const steps=splitItinerarySteps(parsed.days[0].text);return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px"}}>{steps.length>1?<ul style={{margin:0,paddingLeft:18,display:"flex",flexDirection:"column",gap:7}}>{steps.map((s,si)=><li key={si} style={{fontSize:12.5,color:C.textSub,lineHeight:1.55}}>{s}</li>)}</ul>:<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6}}>{parsed.days[0].text}</div>}</div>;})():null}
    {(!days.length&&!proseIt)?<div style={{background:C.card,border:"1px dashed "+C.border,borderRadius:12,padding:"18px 14px",textAlign:"center"}}><div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:4}}>No trip plan yet</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:11}}>Climbed this? Add the day-by-day timing — approach, camps, car-to-car — to help the next party.</div><button onClick={()=>onContribute&&onContribute()} style={{padding:"8px 16px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Add a trip plan</button></div>:null}
    {onSaveMyItin?<div style={{marginTop:16,paddingTop:14,borderTop:"1px solid "+C.borderLight}}>
      <div style={{fontSize:14,fontWeight:700,marginBottom:3}}>My itinerary</div>
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4,marginBottom:9}}>Build your own plan for this route — start from a suggested one or from scratch.</div>
      {!showBuilder?<div>
        {(myItin&&myItin.days&&myItin.days.length)?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 13px",marginBottom:9}}>
          {myItin.days.map(function(d,i){return <div key={i} style={{marginBottom:i<myItin.days.length-1?7:0,paddingBottom:i<myItin.days.length-1?7:0,borderBottom:i<myItin.days.length-1?"1px solid "+C.borderLight:"none"}}><span style={{fontSize:13,fontWeight:700}}>{"Day "+(d.n||i+1)+(d.title?": "+d.title:"")}</span></div>;})}
        </div>:null}
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <button onClick={function(){startBuilder(myItin&&myItin.days&&myItin.days.length?myItin:null);}} style={{padding:"8px 12px",background:C.card,color:C.blue,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{(myItin&&myItin.days&&myItin.days.length)?"Edit my plan":"+ Plan your own itinerary"}</button>
          {(myItin&&myItin.days&&myItin.days.length)?<button onClick={function(){downloadItin(myItin);}} style={{padding:"8px 12px",background:C.card,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Download</button>:null}
          {(myItin&&myItin.days&&myItin.days.length&&crewsForRoute&&crewsForRoute.length)?(pickCrew?<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>{crewsForRoute.map(function(c){return <button key={c.id} onClick={function(){onShareItinToCrew(c.id,myItin);setPickCrew(false);}} style={{padding:"6px 10px",background:C.blueBg,color:C.blue,border:"1px solid "+C.blueDim,borderRadius:8,fontSize:11.5,fontWeight:700,cursor:"pointer"}}>{"→ "+(c.name||"Crew")}</button>;})}</div>:<button onClick={function(){setPickCrew(true);}} style={{padding:"8px 12px",background:C.card,color:C.green,border:"1px solid "+C.green+"55",borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>Share with crew</button>):null}
        </div>
      </div>:<div>
        {avail.length?<div style={{marginBottom:11}}>
          <div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:6}}>START FROM A SUGGESTED PLAN</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>{avail.map(function(a){var on=pickedKey===a.key;return <button key={a.key} onClick={function(){setDraft({days:itinDaysToDraft(a.itin.days)});setPickedKey(a.key);}} aria-current={on?"true":undefined} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:9,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,cursor:"pointer",textAlign:"left",width:"100%",boxSizing:"border-box"}}><div style={{minWidth:0}}><div style={{fontSize:13,fontWeight:700,color:on?C.blue:C.text}}>{a.label}</div>{a.sub?<div style={{fontSize:11.5,color:C.textMuted,marginTop:2}}>{a.sub}</div>:null}</div>{on?<span style={{color:C.blue,fontSize:15,fontWeight:700,flexShrink:0}}>{"✓"}</span>:null}</button>;})}</div>
        </div>:null}
        <ItineraryEditor itin={draft||{days:[blankItinDay()]}} onChange={setDraft}/>
        <div style={{display:"flex",gap:7,marginTop:8}}>
          <button onClick={function(){setShowBuilder(false);setDraft(null);setPickedKey(null);}} style={{flex:1,padding:9,background:C.card,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button>
          <button onClick={saveDraft} disabled={!draftContentDays()} title={draftContentDays()?"":"Add a day title, a note or some numbers first"} style={{flex:2,padding:9,background:draftContentDays()?C.blueSolid:C.surface,color:draftContentDays()?"#fff":C.textMuted,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:draftContentDays()?"pointer":"default"}}>Save my plan</button>
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
  const areaId=route.mountainId;
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
  const dbTopos=useAreaTopos(USE_DB?areaId:null);const toposUnavailable=!!(USE_DB&&dbTopos&&dbTopos.isError);const topoCopy=topoEmptyCopy(toposUnavailable);

  const photos=USE_DB
    ?(dbTopos.data||[]).map(function(t){return {id:t.id,url:topoPhotoUrl(t.storage_path),db:true,storagePath:t.storage_path,
        lines:(t.topo_lines||[]).filter(function(l){return l.route_id===route.id;}).slice().sort(function(a,b){return (b.created_at||"").localeCompare(a.created_at||"");})};})
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
      uploadTopoPhoto(areaId,file).then(function(t){
        setBusy(false);dbTopos.refetch();
        setDrawFor({id:t.id,url:topoPhotoUrl(t.storage_path),db:true,lines:[]});
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
    if(photo.db){
      submitTopoLine(photo.id,route.id,data.points,data.pins,null).then(function(){
        dbTopos.refetch();setDrawFor(null);
      }).catch(function(e){setErr((e&&e.message)||"Couldn't save that line.");});
    } else {
      setLocalLines(function(m){
        const o=Object.assign({},m);
        o[photo.id]=(o[photo.id]||[]).concat([{id:"line_"+Date.now(),points:data.points,pins:data.pins,ts:Date.now()}]);
        return o;
      });
      setDrawFor(null);
    }
  };

  if(USE_DB&&dbTopos.isLoading)return <div style={{marginBottom:14}}><SL>TOPO</SL><div style={{background:C.card,border:"1px solid "+C.border,borderRadius:13,padding:20,textAlign:"center",color:C.textMuted,fontSize:12.5}}>Loading topo photos…</div></div>;

  return <div style={{marginBottom:14}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:18,marginBottom:9}}>
      <SL>TOPO</SL>
      <button onClick={pickFile} disabled={busy} style={{padding:"8px 12px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:11.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?"Uploading…":"+ Add photo"}</button>
    </div>
    {err?<div role="alert" style={{background:C.redBg,border:"1px solid "+C.red+"66",borderRadius:10,padding:"9px 12px",marginBottom:9,display:"flex",alignItems:"center",gap:9}}><span style={{flex:1,fontSize:12.5,color:C.red,lineHeight:1.45}}>{err}</span><button onClick={function(){setErr(null);}} aria-label="Dismiss error" style={{flexShrink:0,background:"none",border:"none",color:C.red,fontSize:16,cursor:"pointer",lineHeight:1,padding:6,margin:-4}}>×</button></div>:null}
    {!photos.length?
      <div style={{background:C.card,border:"1px dashed "+C.border,borderRadius:13,padding:"22px 16px",textAlign:"center"}}>
        <div style={{marginBottom:6,opacity:0.75,display:"flex",justifyContent:"center"}}><ActionIcon name="camera" size={24} color={C.textMuted}/></div>
        <div style={{fontSize:12,fontWeight:700,color:C.textMuted,marginBottom:4}}>{topoCopy.head}</div>
        <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:11}}>{topoCopy.body}</div>
        <button onClick={pickFile} disabled={busy} style={{padding:"8px 16px",borderRadius:9,border:"1px solid "+C.blueDim,background:busy?C.card:C.blueBg,color:busy?C.textMuted:C.blue,fontSize:12.5,fontWeight:700,cursor:busy?"default":"pointer"}}>{busy?"Uploading…":"Add a topo photo"}</button>
      </div>
    :<div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:2}}>
      {photos.map(function(p,i){
        return <TopoThumb key={p.id} p={p} onOpen={function(){setViewerIdx(i);}}/>;
      })}
      <div {...clickable(pickFile)} style={{flexShrink:0,width:132,height:132,borderRadius:11,border:"1px dashed "+C.border,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.blue,fontSize:12,fontWeight:700,gap:6}}>
        <span style={{fontSize:22}}>+</span>Add photo
      </div>
    </div>}
    {(viewerIdx!=null&&photos[viewerIdx])?<TopoPhotoModal photo={photos[viewerIdx]} onClose={function(){setViewerIdx(null);}} onDraw={function(p){setDrawFor(p);}}/>:null}
    {drawFor?createPortal(<div onClick={function(){setDrawFor(null);}} role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:9500,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,borderTopLeftRadius:18,borderTopRightRadius:18,width:"100%",maxWidth:520,padding:"16px 16px 22px",border:"1px solid "+C.border,maxHeight:"92vh",overflowY:"auto",overscrollBehavior:"contain",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:14,fontWeight:800}}>Draw this route's line</div>
          <button onClick={function(){setDrawFor(null);}} style={{width:32,height:32,borderRadius:16,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:15,cursor:"pointer"}} aria-label="Close">✕</button>
        </div>
        <TopoDrawer initial={{photoUrl:drawFor.url}} onCancel={function(){setDrawFor(null);}} onSubmit={function(data){submitLine(drawFor,data);}}/>
      </div>
    </div>,document.body):null}
  </div>;
}
/* Its own component so it can hold the loaded photo's aspect ratio — a hook cannot live in
   the .map that renders the strip. 132 wide with the photo's own aspect rather than a 132
   square crop: the square cropped the sides away while the overlay still spanned the full
   width, which is the drift documented on TopoLineOverlay. */
function TopoThumb({p,onOpen}){
  const [ar,arOnLoad]=useImgAspect();
  const canonical=p.lines[0];
  return <div {...clickable(onOpen)} aria-label={canonical?"Open topo photo":"Open topo photo — no line drawn yet"} style={{flexShrink:0,width:132,aspectRatio:ar||"1 / 1",position:"relative",borderRadius:11,overflow:"hidden",border:"1px solid "+C.border,cursor:"pointer",background:C.card}}>
    <img loading="lazy" decoding="async" src={p.url} alt="" onLoad={arOnLoad} style={TOPO_IMG}/>
    {canonical?<TopoLineOverlay points={canonical.points} pins={canonical.pins}/>:null}
    {!canonical?<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)",color:"#fff",fontSize:11,fontWeight:700,textAlign:"center",padding:8}}>No line drawn</div>:null}
    {p.lines.length>1?<span style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,0.65)",color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 6px"}}>{p.lines.length+" lines"}</span>:null}
  </div>;
}
function TopoPhotoModal({photo,onClose,onDraw}){
  const [altIdx,setAltIdx]=useState(0);
  const active=photo.lines[altIdx]||null;
  return createPortal(<div onClick={onClose} role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:9400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,borderRadius:16,width:"100%",maxWidth:520,border:"1px solid "+C.border,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid "+C.border}}>
        <div style={{fontSize:14,fontWeight:700}}>Topo</div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:16,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:15,cursor:"pointer"}} aria-label="Close">✕</button>
      </div>
      {/* An inline-block shrink-wraps the <img> exactly, so the overlay's `inset:0` box IS the
          painted photo — no aspect bookkeeping and, unlike a sized frame, nothing for the 58vh
          cap to letterbox. The cap has to live on the image here: this is the one topo surface
          with a maximum height, and applying it to a fixed-aspect frame would just move the
          letterbox from the image to the frame. */}
      <div style={{background:"#000",textAlign:"center",fontSize:0}}>
        <div style={{position:"relative",display:"inline-block",maxWidth:"100%",lineHeight:0}}>
          <img loading="lazy" decoding="async" src={photo.url} alt="" style={{display:"block",maxWidth:"100%",maxHeight:"58vh",width:"auto",height:"auto"}}/>
          {active?<TopoLineOverlay points={active.points} pins={active.pins}/>:null}
        </div>
      </div>
      <div style={{padding:"12px 14px"}}>
        {!photo.lines.length?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:10}}>No one has drawn this route's line on this photo yet.</div>:null}
        {photo.lines.length>1?<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>{photo.lines.map(function(l,i){return <button key={l.id||i} onClick={function(){setAltIdx(i);}} aria-current={i===altIdx?"true":undefined} style={{padding:"8px 12px",borderRadius:16,border:"1px solid "+(i===altIdx?C.blue:C.border),background:i===altIdx?C.blueBg:C.surface,color:i===altIdx?C.blue:C.textSub,fontSize:11.5,fontWeight:600,cursor:"pointer"}}>{i===0?"Latest":"Alt "+i}</button>;})}</div>:null}
        <button onClick={function(){onDraw(photo);}} style={{width:"100%",padding:"10px",borderRadius:10,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>{photo.lines.length?"Draw your own line":"Draw this route's line"}</button>
      </div>
    </div>
  </div>,document.body);
}
function seasonName(d){var m=parseInt((d||"").slice(5,7),10)||0;return (m>=12||m<=2)?"Winter":m<=5?"Spring":m<=8?"Summer":"Fall";}
function shortDate(d){try{return new Date(d+"T12:00:00").toLocaleDateString(DLOCALE,{month:"short",day:"numeric",year:"numeric"});}catch(e){return d||"";}}
const ADDR_GEAR=["Quickdraws","Alpine draws","Single rack","Double rack","Micro/offset cams","Cams to #2","Cams to #3","Cams to #4","Cams to #5","Big cams (#5+)","Nuts / stoppers","Offset nuts","Tricams","Hexes","Ball nuts","Nut tool","Long slings","Cordelette","60m rope","70m rope","80m rope","Half / twin ropes","Tag line","Aiders / etriers","Pitons / beaks","Hooks","Ascenders","Ice screws","V-thread tool","Ice tools","Crampons","Pickets","Whippet","Mountaineering boots","Beacon · probe · shovel","Approach shoes","Helmet","Stick clip","Belay gloves","Headlamp","Crash pad(s)"];
/* whatToBring/watchOut are split on NEWLINES, not commas, and the hints have to say so —
   the CONV entries in ClimbMatch.jsx match this contract. gear/haz/style split on commas
   because their items are single words; these two hold sentences that contain commas, and
   comma-splitting them is the exact defect #780 fixed on the read side ("…Victoria Creek at
   5," / "500 ft"). Do not "align" them with the comma fields. */
const HINTS={rappelCountNote:"How the rappel count was arrived at — rope length, number of ropes, or which descent it assumes.",bestSeason:"When to go and why, in prose. The short season window is a separate field above.",whatToBring:"Gear this route needs beyond the standard kit — one item per line.",watchOut:"Specific hazards to expect, one per line. Each line becomes its own warning.",grade:"The overall difficulty rating for the route.",pitch:"Whether it's climbed in one pitch or several.",fa:"Who first climbed it, and the year if known.",descent:"How you get down — rappel or walk off.",rock:"The rock type, e.g. granite or limestone.",aspect:"Which compass direction the route/wall faces — determines when it gets morning vs. afternoon sun, and when it's in shade.",season:"The best time of year to climb it.",protRating:"Protection quality — how well it takes gear (G/PG13/R/X).",draws:"How many quickdraws to bring.",screws:"How many ice screws the route takes.",aidGrade:"The aid difficulty (A0–A5 / C0–C5).",ropeLen:"Rope length needed to climb and rappel safely.",pitchCount:"How many pitches the route has.",rack:"Everything this route takes — tap the sizes, add the hardware, or describe it in your own words if the rack is written as a sentence.",haz:"Known hazards on the route.",objHaz:"Objective hazards — rockfall, avalanche, crevasse, serac, cornice.",comms:"Cell or satellite coverage on the route — where can you call for help?",style:"Climbing style — trad, sport, and so on.",landing:"The boulder landing — flat, sloped, or bad.",pads:"How many crash pads to bring.",startType:"How the problem starts — sit or stand.",length:"Total length of the climb, top to bottom.",crux:"Hardest single pitch — only needed on multipitch.",alpineGrade:"The overall alpine grade (F/PD/AD/D/TD/ED).",commit:"How big a commitment the route is end-to-end — time investment plus how hard it'd be to bail. I is a few hours with an easy walk-off; VI is multi-day with serious, difficult retreat.",condWindow:"When the route is typically in condition.",dist:"Approach distance to the base of the climb.",gain:"Total elevation gain from the trailhead to the top, the climb included — not just the walk in to the base.",loss:"Total elevation lost getting back out. On an out-and-back that equals the gain — record it even then, not only for traverses.",angle:"Steepest snow or ice angle on the route.",rap:"Number of rappels on the descent.",turn:"A sensible turnaround time for the conditions.",permit:"Any permit or pass required to access it.",permitUrl:"Where to get that permit online.",approach:"How to reach the base from the trailhead.",descentText:"The descent described in detail.",overview:"What the line actually climbs, start to finish. This is the description at the top of the route page.",beta:"Tips beyond the description — short ones show as PRO TIPS, longer write-ups as BETA.",bail:"Where a party can retreat from and how. Shown under BAILOUT POINTS.",outingShape:"Whether the day comes back the way it went out, loops, or finishes somewhere else — this decides whether the approach distance is doubled.",timing:"Published times for a fit party in good conditions — the guidebook figure, not your own day. Log your own times on a trip report instead.",pitchDetail:"A pitch-by-pitch breakdown — grade, length, bolts and the anchor at the top of each one.",camp:"Where to camp or bivy.",waypoints:"Key waypoints — trailhead, water, camp, summit.",itinerary:"A suggested day-by-day plan.",name:"Correct the route's name.",other:"Anything else worth noting.",rockGrade:"Hardest rock pitch (YDS) if it has technical rock.",iceGrade:"Ice or alpine-ice grade (WI3, AI3).",face:"The named face or route-group, e.g. Emmons Glacier."};
function itinSummaryStr(it){return (it&&it.days&&it.days.length)?it.days.map(function(d,i){return "Day "+(i+1)+": "+(d.title||"");}).join(" · "):"";}
/* Drawn from what the catalog's own 845 anchor strings say, not invented: "gear" is far and
   away the most common (352), then bolted stations (48 + 32), walk-offs (36), ice screws,
   trees, slung horns and pickets. */
const PITCH_ANCHORS=["Bolted","Gear","Tree","Slung horn / block","Fixed pin","Picket","Ice screws","Walk-off (no belay)"];
const GRADE_SUFFIX_LABEL={"":"·","-":"−","−":"−","+":"+"};
function GradePicker({scale,value,onChange,label}){
  const groups=gradeGroups(scale);
  const active=groups.find(function(g){return g.variants.some(function(x){return x[1]===value;});});
  const [openStem,setOpenStem]=useState(active?active.stem:null);
  const shown=groups.find(function(g){return g.stem===openStem;});
  const chip=function(on){return {padding:"8px 12px",borderRadius:15,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"};};
  const pickStem=function(g){
    setOpenStem(g.stem);
    // One variant means the stem IS the grade — selecting it needs no second question.
    if(g.variants.length===1)onChange(value===g.variants[0][1]?"":g.variants[0][1]);
  };
  return <div>
    <div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"2px 0"}}>{groups.map(function(g){
      const isSel=g.variants.some(function(x){return x[1]===value;});
      return <button key={g.stem} aria-label={label+" "+g.stem} aria-pressed={isSel} onClick={function(){pickStem(g);}} style={chip(isSel||g.stem===openStem)}>{g.stem}</button>;
    })}</div>
    {(shown&&shown.variants.length>1)?<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginTop:7,padding:"7px 9px",background:C.surface,borderRadius:9,border:"1px solid "+C.border}}>
      <span style={{fontSize:11.5,color:C.textMuted,fontWeight:700,marginRight:2}}>{shown.stem}</span>
      {shown.variants.map(function(x){
        const on=value===x[1];
        return <button key={x[1]} aria-label={label+" "+x[1]} aria-pressed={on} onClick={function(){onChange(on?"":x[1]);}} style={Object.assign({},chip(on),{minWidth:38,textAlign:"center",padding:"7px 10px"})}>{GRADE_SUFFIX_LABEL[x[0]]!=null?GRADE_SUFFIX_LABEL[x[0]]:x[0]}</button>;
      })}
      <span style={{fontSize:11.5,color:C.textMuted,marginLeft:"auto"}}>{value?value:"none set"}</span>
    </div>:null}
  </div>;
}
function SuggestFix({route,onClose,onSubmit,onLog,scrollTo,pending,peakCoord,prefill}){
  const scrollRef=useRef(null);
  const [groupOpen,setGroupOpen]=useState({});
  const jumpTo=function(k){setOpen(function(o){return Object.assign({},o,{[k]:true});});setTimeout(function(){if(scrollRef.current){var el=scrollRef.current.querySelector("#sf-section-"+k);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});}},60);};
  useEffect(function(){if(!scrollTo||!scrollRef.current)return;var t=setTimeout(function(){var el=scrollRef.current.querySelector("#sf-section-"+scrollTo);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start"});},80);return function(){clearTimeout(t);};},[scrollTo]);
  // discipline chips → app convention. catTo = filtering category; disc = {discipline, style}
  const DISCS=[[DL.trad,"trad",{discipline:"rock",style:"Trad"}],[DL.sport,"sport",{discipline:"rock",style:"Sport"}],[DL.bouldering,"bouldering",{discipline:"bouldering"}],[DL.alpine,"alpine",{discipline:"alpine"}],[DL.ice,"ice",{discipline:"ice"}],[DL.mixed,"mixed",{discipline:"mixed"}],[DL.aid,"aid",{discipline:"aid"}],[DL.mountaineering,"mountaineering",{discipline:"mountaineering"}],[DL.scrambling,"scrambling",{discipline:"scrambling"}]];
  const catToChip=function(c){if(c==="hiking")return "scrambling";return DISCS.some(function(d){return d[1]===c;})?c:"trad";};
  const [disc,setDisc]=useState(catToChip(catOf(route)));
  const [vals,setVals]=useState(prefill||{});const [note,setNote]=useState("");const [sent,setSent]=useState(false);const [sentN,setSentN]=useState(0);const [open,setOpen]=useState({});/* Which fields this session has already agreed with. "I see this too" re-submits the pending value, and the merge counts any matching value as another agreement — so without this guard one climber could tap three times and push their own suggestion live, defeating the 3-agree threshold. The signed-in path is also protected server-side-ish by counting distinct contributors in the DB merge. */const [agreed,setAgreed]=useState({});const [showBailForm,setShowBailForm]=useState(scrollTo==="bailout");const [bailAdded,setBailAdded]=useState(0);const [showStartForm,setShowStartForm]=useState(scrollTo==="startLocation");const [startAdded,setStartAdded]=useState(0);
  // rack builder (keyed per use; shared across the single rack field)
  const RACK_CATS=[["Cams",["#0.3","#0.4","#0.5","#0.75","#1","#2","#3","#4","#5"],"cam"],["Nuts / stoppers",["#1","#2","#3","#4","#5","#6","#7","#8","#9","#10","#11","#12","#13"],"nut"],["Slings",["60cm","120cm","180cm","240cm"],"sling"],["Alpine draws",["Qty"],"adraw"]];
  const rack=vals.rack||{};const setRack=function(fn){setVals(function(v){return Object.assign({},v,{rack:fn(v.rack||{})});});};
  const itin=vals.itinerary||{days:[blankItinDay()]};
  const setItin=function(next){setVals(function(v){return Object.assign({},v,{itinerary:next});});};
  /* `note` is a reserved key alongside the size counters. A researched rack is prose —
     "Typically climbed with no protection on the standard class 3-4 ramp; a rope and light
     rack are only useful if you take the direct summit-block finish" — and the size steppers
     cannot state that, let alone correct it. Without a free-text path the rack was the one
     field on the route that no contributor could fix. */
  const rackStr=function(rk){var out=[];RACK_CATS.forEach(function(c){var items=c[1].filter(function(s){return rk[c[2]+":"+s];}).map(function(s){return s+" ×"+rk[c[2]+":"+s];});if(items.length)out.push(c[0]+": "+items.join(", "));});var gi=(rk.items||[]);if(gi.length)out.push(gi.join(", "));var note=(rk.note||"").trim();if(note)out.push(note);return out.join("; ");};
  // Absorbed from the deleted `gear` field — the hardware the size steppers cannot express.
  const togRackItem=function(v){setRack(function(r){var arr=r.items||[];return Object.assign({},r,{items:arr.indexOf(v)>=0?arr.filter(function(x){return x!==v;}):arr.concat([v])});});};
  const bumpRack=function(key){setRack(function(r){var n=Object.assign({},r);var q=(n[key]||0)+1;if(q>5)q=0;if(q===0)delete n[key];else n[key]=q;return n;});};
  /* The pitch editor opened on ONE BLANK ROW even when the route already had a full
     pitch-by-pitch breakdown on the screen behind it — 919 catalog routes carry 3,569 pitch
     rows. So correcting pitch 7 meant retyping pitches 1-6 from memory, or submitting a
     one-pitch array that replaces all of them. Start from what is on file and edit that.

     Rows are held in the app's OWN pitch shape rather than a private {grade,len,notes} one.
     That private shape is why lengths vanished from both summary strings: pitchStr read
     pp.len while every stored row uses lengthM, and pendStr's mapper read pp.lengthM off rows
     the editor had just written as pp.len. One shape means prefill is identity and what gets
     submitted is what PitchTable already renders. */
  const blankPitch=function(n){return {pitch:n,grade:"",lengthM:"",gear:"",notes:"",anchor:"",bolts:"",crux:false};};
  const routePitches=(route.pitchDetail&&route.pitchDetail.length)
    ?route.pitchDetail.map(function(p,i){return {pitch:p.pitch!=null?p.pitch:(p.n!=null?p.n:i+1),grade:p.grade||"",lengthM:p.lengthM!=null?p.lengthM:"",gear:p.gear||"",notes:p.note!=null?p.note:(p.notes||""),anchor:p.anchor||"",bolts:p.bolts!=null?p.bolts:"",crux:!!p.crux};}).sort(function(a,b){return a.pitch-b.pitch;})
    :[blankPitch(1)];
  const pitches=vals.pitchDetail||routePitches;const setPitches=function(fn){setVals(function(v){return Object.assign({},v,{pitchDetail:fn(v.pitchDetail||routePitches)});});};
  const pitchStr=function(ps){return ps.map(function(pp,i){var bits=[pp.grade,pp.lengthM?pp.lengthM+"m":"",pp.anchor?("anchor: "+pp.anchor):"",(pp.bolts!==""&&pp.bolts!=null)?(pp.bolts+" bolts"):"",pp.crux?"crux":"",pp.gear,pp.notes].filter(Boolean);return bits.length?("P"+(pp.pitch!=null?pp.pitch:i+1)+": "+bits.join(", ")):"";}).filter(Boolean).join("; ");};
  const setPitch=function(i,k,v){setPitches(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};const addPitch=function(){setPitches(function(p){return p.concat([blankPitch(p.length+1)]);});};const rmPitch=function(i){setPitches(function(p){return p.filter(function(_,j){return j!==i;}).map(function(x,j){return Object.assign({},x,{pitch:j+1});});});};
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
  const OBJ_KEYS={road:ROAD_KEYS,access:ACCESS_KEYS,timing:TIMING_KEYS,crowds:CROWDS_KEYS,partnerRequirements:PARTNER_KEYS,seasonalGuidance:SEASONAL_KEYS,emergency:EMERGENCY_KEYS,approachLogistics:LOGISTICS_KEYS,difficulty:DIFFICULTY_KEYS,climate:CLIMATE_KEYS,seasonalHazards:SEASHAZ_KEYS};
/* An enum row stores the CODE the column already holds (solitudeRating is a number 1-5 on
     499 routes, not a phrase), and shows the label. Printing the raw code in the summary line
     would make the collapsed field read "solitude: 4". */
  const objLabel=function(k,v){if(k[3]!=="enum"||!k[4])return v;var hit=k[4].filter(function(o){return String(o[0])===String(v);})[0];return hit?hit[1]:v;};
  const objStr=function(keys,o){if(!o)return "";return keys.map(function(k){var v=_dget(o,k[0]);/* `String(v)` HERE PUT "[object Object]" ON EVERY ROUTE CARRYING seasonal_hazards. The dotted key specs are the real fix (see the note on SEASHAZ_KEYS), and this is the fail-safe: `crevasses` is a string on 453 rows and an OBJECT on 34, so no single key spec is right for it, and the next column to drift shape would reintroduce the defect. fmtSlingVal is the app's own leaf flattener — despite the name it is generic (string, number, array, keyed object) — so there is one flattener rather than two that drift. */var s=(v!=null&&typeof v==="object")?fmtSlingVal(v):v;return (s==null||String(s).trim()==="")?null:k[1]+": "+s;}).filter(Boolean).join(" · ");};
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
  const difficultyCur=objCur(DIFFICULTY_KEYS);const climateCur=objCur(CLIMATE_KEYS);const seasHazCur=objCur(SEASHAZ_KEYS);const crowdsCur=objCur(CROWDS_KEYS),partnerCur=objCur(PARTNER_KEYS),seasonalCur=objCur(SEASONAL_KEYS),emergencyCur=objCur(EMERGENCY_KEYS),logisticsCur=objCur(LOGISTICS_KEYS);
  const crowdsV=vals.crowds||{},setCrowdsV=objSet("crowds");
  const partnerV=vals.partnerRequirements||{},setPartnerV=objSet("partnerRequirements");
  const seasonalV=vals.seasonalGuidance||{},setSeasonalV=objSet("seasonalGuidance");
  const emergencyV=vals.emergency||{},setEmergencyV=objSet("emergency");
  const logisticsV=vals.approachLogistics||{},setLogisticsV=objSet("approachLogistics");
  const difficultyV=vals.difficulty||{},setDifficultyV=objSet("difficulty");
  const climateV=vals.climate||{},setClimateV=objSet("climate");
  const seasHazV=vals.seasonalHazards||{},setSeasHazV=objSet("seasonalHazards");
  const OBJ_STATE={road:[road,setRoad],access:[access,setAccess],timing:[timing,setTiming],crowds:[crowdsV,setCrowdsV],partnerRequirements:[partnerV,setPartnerV],seasonalGuidance:[seasonalV,setSeasonalV],emergency:[emergencyV,setEmergencyV],approachLogistics:[logisticsV,setLogisticsV],difficulty:[difficultyV,setDifficultyV],climate:[climateV,setClimateV],seasonalHazards:[seasHazV,setSeasHazV]};
  // waypoints builder — structured rows so a confirmed edit writes a real array, not text (a text override used to crash the waypoints list/map, see WP_TYPES-driven renderInput below)
  const blankWp=function(){return {type:"Junction",name:"",lat:"",lng:"",elev:"",distMi:"",note:"",directions:""};};
  const [activeWpIdx,setActiveWpIdx]=useState(0);
  /* Same defect the pitch editor had, and the same fix: this opened on one blank Junction
     row while the route's real waypoints sat listed on the screen behind it, so "edit
     waypoints" could only ever ADD one — correcting the trailhead coordinate meant retyping
     every other waypoint or wiping them. The row shape here is the editor's (lat/lng as
     strings for the text inputs), so stringify on the way in and let the existing submit path
     parse on the way out. */
  const routeWps=(route.waypoints&&route.waypoints.length)
    ?route.waypoints.map(function(w){return {type:w.type||"Junction",name:w.name||"",lat:w.lat!=null?String(w.lat):"",lng:w.lng!=null?String(w.lng):"",elev:w.elev!=null?String(w.elev):"",distMi:w.distMi!=null?String(w.distMi):"",note:w.note||""};})
    :[blankWp()];
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
  const blankVar=function(){return {name:"",season:"",distMi:"",gainFt:"",hours:"",notes:"",hazards:""};};
  const blankBivy=function(){return {name:"",type:"camp",elev:"",capacity:"",water:"",permit:"",notes:""};};
  const routeBivy=(Array.isArray(route.bivy)&&route.bivy.length)
    ? route.bivy.map(function(b){return {name:b.name||"",type:b.type||"camp",elev:b.elev!=null?String(b.elev):(b.elevM!=null?String(Math.round(b.elevM*3.28084)):""),capacity:b.capacity||"",water:b.water||"",permit:b.permit||"",notes:b.notes||""};})
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
        distMi:v.distMi!=null?String(v.distMi):"",gainFt:v.gainFt!=null?String(v.gainFt):"",
        hours:v.hours!=null?String(v.hours):"",notes:v.notes||"",
        hazards:(Array.isArray(v.hazards)?v.hazards.filter(Boolean):(v.hazards?[v.hazards]:[])).join("\n")};})
    :[blankVar()];
  const avars=vals.approachVariants||routeVars;
  const setAvars=function(fn){setVals(function(v){return Object.assign({},v,{approachVariants:fn(v.approachVariants||routeVars)});});};
  const setAvar=function(i,k,v){setAvars(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};
  const addAvar=function(){if(avars.length>=MAX_VAR)return;setAvars(function(p){return p.concat([blankVar()]);});};
  const delAvar=function(i){setAvars(function(p){return p.length<=1?[blankVar()]:p.filter(function(_,j){return j!==i;});});};
  const wps=vals.waypoints||routeWps;const setWps=function(fn){setVals(function(v){return Object.assign({},v,{waypoints:fn(v.waypoints||routeWps)});});};
  const setWp=function(i,k,v){setWps(function(p){return p.map(function(x,j){return j===i?Object.assign({},x,{[k]:v}):x;});});};const addWp=function(){if(wps.length>=MAX_WAYPOINTS)return;setWps(function(p){return p.concat([blankWp()]);});setActiveWpIdx(wps.length);};const rmWp=function(i){setWps(function(p){return p.filter(function(_,j){return j!==i;});});setActiveWpIdx(function(a){return a>=i?Math.max(0,a-1):a;});};
  const gs=ADDR_GRADES[disc]||ADDR_GRADES[route.discipline]||[];var tr=function(x){return x?(String(x).length>44?String(x).slice(0,44)+"…":String(x)):"—";};var onf=function(x){return (x&&x.length)?"✓ on file":"—";};
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
  const FIELDS=[{k:"grade",label:"Grade",type:"grade",cur:route.grade||"—"},{k:"fa",label:"First ascent",type:"text",cur:route.fa||"—"},{k:"rock",label:"Rock type",type:"single",opts:["Granite","Limestone","Sandstone","Quartzite","Basalt","Gneiss"].map(function(x){return [x,x];}),cur:route.rockType||"—"},{k:"aspect",label:"Aspect (sun exposure)",type:"single",opts:["N","NE","E","SE","S","SW","W","NW"].map(function(x){return [x,x];}),cur:route.aspect||"—"},{k:"season",label:"Best season",type:"single",opts:["Spring","Summer","Fall","Winter","Year-round"].map(function(x){return [x,x];}),cur:route.season||"—"},/* NOT a second copy of `season` above. That one is the WINDOW rendered in the header strap and is deliberately a short enum; this is the prose "When to go:" line on Conditions, and the two are separate columns precisely so a paragraph never lands in the strap — see the season note in CLAUDE.md. Labelled for where it appears rather than by column name, since "Best season" is already taken by the enum. */{k:"bestSeason",label:"When to go (detail)",type:"long",cur:tr(route.bestSeason)},{k:"protRating",label:"Protection rating",type:"single",opts:["G","PG-13","R","X"].map(function(x){return [x,x];}),cur:route.protRating||"—"},{k:"draws",label:"# Quickdraws",type:"num",unit:"draws",cur:(route.draws!=null?String(route.draws):"—")},{k:"screws",label:"# Ice screws",type:"num",unit:"screws",cur:(route.screws!=null?String(route.screws):"—")},{k:"aidGrade",label:"Aid grade",type:"single",opts:ADDR_AIDS.map(function(x){return [x,x];}),cur:route.aidGrade||"—"},{k:"ropeLen",label:"Rope length",type:"single",opts:[["50 m","50 m"],["60 m","60 m"],["70 m","70 m"],["80 m","80 m"]],cur:route.ropeLen||"—"},{k:"ropeType",label:"Rope type",type:"single",opts:[["Single","Single"],["Half / twin (2 ropes)","Half / twin (2 ropes)"],["Static (fixed line)","Static (fixed line)"]],cur:route.ropeType||"—"},{k:"ropeNote",label:"Ropework note",type:"text",cur:route.ropeNote||"—"},{k:"alpineDraws",label:"# Alpine draws",type:"num",unit:"draws",cur:(route.alpineDraws!=null?String(route.alpineDraws):"—")},{k:"ascender",label:"Ascender / progress-capture",type:"single",opts:[["Not needed","Not needed"],["Micro Traxion","Micro Traxion"],["Tibloc","Tibloc"],["Petzl Ascension / Jumar","Petzl Ascension / Jumar"],["Prusik cords only","Prusik cords only"]],cur:route.ascender||"—"},{k:"pitchCount",label:"How many pitches?",type:"num",unit:"pitches",cur:(route.pitches>1?String(route.pitches):"—")},{k:"rack",label:"Rack & gear",type:"rack",cur:((contribRack(route)||[]).join(", ")||route.detailedRack||((route.rack&&route.rack.length)?route.rack.join(", "):null)||"—")},{k:"whatToBring",label:"Route-specific essentials",type:"long",cur:((route.whatToBring&&route.whatToBring.length)?route.whatToBring.join("\n"):"—")},{k:"haz",label:"Hazards",type:"multi",opts:(DISC_HAZ[disc]||ADDR_HAZ),cur:(route.hazards&&route.hazards.length?route.hazards.join(", "):"—")},{k:"objHaz",label:"Objective hazards",type:"multi",opts:["Rockfall","Avalanche","Crevasse","Serac","Cornice"],cur:(route.objHaz?(Array.isArray(route.objHaz)?(route.objHaz.length?route.objHaz.join(", "):"—"):route.objHaz):"—")},{k:"watchOut",label:"Watch out for",type:"long",cur:((route.watchOut&&route.watchOut.length)?route.watchOut.join("\n"):"—")},{k:"style",label:"Style / character",type:"multi",opts:ADDR_STYLE,cur:(route.features&&route.features.length?route.features.join(", "):"—")},{k:"landing",label:"Landing",type:"single",opts:["Flat","Sloped","Bad/dangerous"].map(function(x){return [x,x];}),cur:route.landing||"—"},{k:"pads",label:"Crash pads",type:"num",unit:"pads",cur:(route.pads!=null?String(route.pads):"—")},{k:"startType",label:"Start",type:"single",opts:["Stand","Sit"].map(function(x){return [x,x];}),cur:route.startType||"—"},{k:"length",label:"Height / length",type:"num",unit:uImp()?"ft":"m",cur:(route.routeFt?uElev(route.routeFt):"—")},{k:"crux",label:"Crux grade",type:"grade",cur:route.cruxGrade||"—"},{k:"rockGrade",label:"Rock grade",type:"grade",cur:route.rockGrade||"—"},{k:"iceGrade",label:"Ice grade",type:"single",opts:["WI2","WI2+","WI3","WI3+","WI4","WI4+","WI5","WI5+","WI6","AI2","AI3","AI3+","AI4","M4","M4+","M5","M5+","M6","M6+"].map(function(x){return [x,x];}),cur:route.iceGrade||"—"},{k:"face",label:"Face / route-group",type:"text",cur:route.face||"—"},{k:"alpineGrade",label:"Alpine grade",type:"single",opts:["F","F+","PD-","PD","PD+","AD-","AD","AD+","D-","D","D+","TD-","TD","TD+","ED1","ED2","ED3","I","II","III","IV","V","VI"].map(function(x){return [x,x];}),cur:route.alpineGrade||"—"},{k:"commit",label:"Commitment grade (I–VI)",type:"single",opts:["I","II","III","IV","V","VI"].map(function(x){return [x,x];}),cur:route.commitment||"—"},{k:"condWindow",label:"Conditions window",type:"multi",opts:["Year-round","Best in spring","Best in summer","Best in fall","Best in winter","After freeze-thaw stabilizes","Before spring melt/runoff","Dry rock only","Avoid monsoon/rain season","Check current beta before going"],cur:(route.condWindow?(Array.isArray(route.condWindow)?(route.condWindow.length?route.condWindow.join(", "):"—"):route.condWindow):"—")},{k:"dist",label:"Distance",type:"num",unit:uImp()?"mi":"km",cur:route.distKm?(uImp()?(route.distKm*0.621).toFixed(1)+" mi":route.distKm.toFixed(1)+" km"):"—"},{k:"gain",label:"Elev. gain",type:"num",unit:uImp()?"ft":"m",cur:route.gainM?(uImp()?Math.round(route.gainM*3.281)+" ft":Math.round(route.gainM)+" m"):"—"},{k:"loss",label:"Elev. loss",type:"num",unit:uImp()?"ft":"m",cur:route.lossM?(uImp()?Math.round(route.lossM*3.281)+" ft":Math.round(route.lossM)+" m"):"—"},{k:"angle",label:"Max angle (°)",type:"num",unit:"°",cur:route.maxAngle?route.maxAngle+"°":"—"},{k:"rap",label:"Rappels",type:"text",cur:(fmtRappels(route.rappels)||"—")},/* The note that sits ABOVE the rappel table and says how the count was arrived at ("depending on rope length / number of ropes carried"). It rendered with no way to correct it, which matters more here than elsewhere: check:rappel-lengths exists because a table can be repaired while this note still states the method that produced the wrong numbers, and the next enrichment pass then re-derives them. */{k:"rappelCountNote",label:"Rappel count note",type:"long",cur:tr(route.rappelCountNote)},{k:"turn",label:"Turnaround time",type:"text",cur:route.turnaround||"—"},{k:"bail",label:"Bail options",type:"long",cur:tr(route.bail)},{k:"outingShape",label:"Trip shape",type:"single",opts:[["outback","Out and back"],["loop","Loop"],["point","Point to point"]],cur:(SHAPE_LABEL[recShapeOf(route)]||"—")},{k:"permit",label:"Permits",type:"text",cur:route.permits||(route.access&&route.access.permit)||"—"},{k:"permitUrl",label:"Permit link",type:"text",cur:route.permitUrl||"—"},{k:"road",label:"Road & driving",type:"road",cur:roadCur(route)},{k:"access",label:"Access & permits",type:"access",cur:accessCur(route)},{k:"timing",label:"Published times",type:"timing",cur:timingCur(route)},{k:"approachLogistics",label:"Trailhead & directions",type:"approachLogistics",cur:logisticsCur(route,"approachLogistics")},{k:"difficulty",label:"How hard it feels (1-5)",type:"difficulty",cur:difficultyCur(route,"difficulty")},{k:"climate",label:"Climate & forecast zone",type:"climate",cur:climateCur(route,"climate")},{k:"seasonalHazards",label:"Seasonal hazards",type:"seasonalHazards",cur:seasHazCur(route,"seasonalHazards")},{k:"crowds",label:"Crowds & solitude",type:"crowds",cur:crowdsCur(route,"crowds")},{k:"partnerRequirements",label:"What a partner needs",type:"partnerRequirements",cur:partnerCur(route,"partnerRequirements")},{k:"seasonalGuidance",label:"Best window",type:"seasonalGuidance",cur:seasonalCur(route,"seasonalGuidance")},{k:"emergency",label:"Emergency contacts",type:"emergency",cur:emergencyCur(route,"emergency")},{k:"approach",label:"Approach",type:"long",cur:tr(route.approach)},{k:"descentText",label:"Descent detail",type:"long",cur:tr(route.descentText||route.descent)},{k:"overview",label:"Route description",type:"long",cur:tr(route.overview||route.desc)},{k:"beta",label:"Beta & pro tips",type:"long",cur:tr(Array.isArray(route.beta)?route.beta.join(" "):(route.beta||route.desc))},{k:"comms",label:"Cell / sat coverage",type:"single",opts:["Full cell coverage","Spotty cell coverage","No cell coverage","Satellite (inReach/SPOT) recommended","Emergency call box nearby"].map(function(x){return [x,x];}),cur:route.comms||"—"},{k:"approachVariants",label:"Ways in (approach variants)",type:"variants",cur:varCur(route)},{k:"climbingRoute",label:"Climbing route sections",type:"sections",cur:secCur(route)},{k:"pitchDetail",label:"Pitch-by-pitch",type:"pitches",cur:onf(route.pitchDetail)},{k:"waypoints",label:"Key waypoints",type:"waypoints",cur:onf(route.waypoints)},{k:"bivy",label:"Camping & bivy",type:"bivy",cur:onf(route.bivy)},{k:"itinerary",label:"Day-by-day plan",type:"itinerary",cur:(route.itinerary&&route.itinerary.days&&route.itinerary.days.length)?(route.itinerary.days.length+" day"+(route.itinerary.days.length!==1?"s":"")+" on file"):"—"},{k:"name",label:"Route name",type:"text",cur:route.name||"—"}];
  const cat=disc;const roped=["trad","sport","alpine","ice","mixed","aid","mountaineering"].indexOf(cat)>=0;const alpiney=["alpine","mountaineering","ice","mixed","scrambling"].indexOf(cat)>=0;const boulder=cat==="bouldering";
  // single-pitch detection (drives the crux-grade hint) — selected discipline + route's real pitch count
  const singlePitch=boulder||(vals.pitchCount?parseInt(vals.pitchCount)<=1:(route.pitches!=null&&route.pitches<=1));
  // discipline rules: which fields make sense for the SELECTED discipline (live-driven by the chips above)
  const DROP={turn:!alpiney,commit:!alpiney,rockGrade:!alpiney,iceGrade:!alpiney,face:!alpiney,dist:!alpiney,gain:!alpiney,loss:!alpiney,waypoints:!alpiney,itinerary:!alpiney,/* The RACK box renders for every discipline except bouldering and sport (RouteGearCheck),
   so offering the rack field only to trad/aid/alpine/mixed left ice, mountaineering and
   scrambling routes showing a rack with no way to correct it. Match the box. */
rack:(boulder||cat==="sport"),protRating:!(cat==="trad"||cat==="sport"),/* `draws:true` made this the one field in the form unreachable for EVERY discipline — it sat in
   the Protection & gear group, in SS, and in the help text, and could never be filled in. Its
   stated reason does not hold: nothing derives a draw count from a bolt count (there is no
   route-level bolt column). `gearReadout` only parses a number back out of the free-text gear
   prose, so a bolted route with no prose says nothing and had no way to be corrected. Offer it
   where a draw count is the standard beta. */draws:!(cat==="sport"||cat==="trad"||cat==="mixed"||cat==="aid"),screws:!(cat==="ice"||cat==="mixed"),aidGrade:cat!=="aid",ropeLen:!roped||cat==="mountaineering"||cat==="sport",ropeType:!roped||cat==="mountaineering"||cat==="sport",alpineDraws:!(cat==="trad"||cat==="aid"||cat==="alpine"||cat==="mixed"),ascender:!(cat==="alpine"||cat==="mountaineering"||cat==="aid"||cat==="ice"||cat==="mixed"),pitchCount:!roped,angle:!(cat==="mountaineering"||cat==="scrambling"),landing:!boulder,pads:!boulder,startType:!boulder,alpineGrade:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"||cat==="mixed"),condWindow:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"||cat==="mixed"),objHaz:!(cat==="alpine"||cat==="mountaineering"||cat==="ice"),pitchDetail:boulder,rap:boulder,descentText:boulder,approach:boulder,crux:singlePitch};
  const okField=function(k){return !DROP[k];};
  const GROUPS=[["Basics",["name","grade","alpineGrade","rockGrade","iceGrade","crux","face","aidGrade","pitchCount","fa","style","rock","length"]],["Protection & gear",["protRating","ropeLen","ropeType","draws","alpineDraws","screws","ascender","rack","whatToBring","pitchDetail"]],["Bouldering",["landing","pads","startType"]],["Approach & descent",["road","approach","descentText","rap","rappelCountNote","bail","dist","gain","loss","angle","waypoints"]],["Conditions & character",["aspect","season","bestSeason","condWindow","haz","objHaz","watchOut","overview","beta","comms"]],["Logistics",["access","permit","permitUrl","turn","commit","outingShape","timing","itinerary"]]];
  // per-group accent color
  const ACCENT={"Basics":[C.blue,C.blueBg],"Protection & gear":[C.amber,C.amberBg],"Bouldering":[C.teal,C.tealDim],"Approach & descent":[C.green,C.greenBg],"Conditions & character":[C.blue,C.blueBg],"Logistics":[C.textMuted,C.borderLight]};
  const GROUPED=GROUPS.map(function(g){return [g[0],g[1].map(function(k){return FIELDS.find(function(f){return f.k===k;});}).filter(function(f){return f&&okField(f.k);})];}).filter(function(g){return g[1].length;});
  // value helpers per field
  const valOf=function(f){return vals[f.k];};
  // unit-ambiguous numerics: the inputs are labelled in the SUBMITTER's units, so canonicalize here (routeFt/distKm/gainM/lossM) instead of at merge time — the merge runs in the READER's session and would otherwise convert with the wrong setting (3.28x error) and stop two agreeing climbers from ever converging in sameEditValue
  const CANON={length:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n:n*3.28084);},dist:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round((uImp()?n*1.60934:n)*100)/100;},gain:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n/3.28084:n);},loss:function(v){var n=parseFloat(v);return isNaN(n)?null:Math.round(uImp()?n/3.28084:n);}};
  const UNCANON={length:function(n){return uImp()?Math.round(n)+" ft":Math.round(n/3.28084)+" m";},dist:function(n){return uImp()?(Math.round(n/1.60934*100)/100)+" mi":(Math.round(n*100)/100)+" km";},gain:function(n){return uImp()?Math.round(n*3.28084)+" ft":Math.round(n)+" m";},loss:function(n){return uImp()?Math.round(n*3.28084)+" ft":Math.round(n)+" m";}};
  const wpStr=function(ws){return (ws||[]).filter(function(w){return w.name||w.lat||w.note;}).map(function(w){return w.type+(w.name?" — "+w.name:"");}).join("; ");};
  const pendStr=function(f,v){if(v==null)return "";if(UNCANON[f.k]&&v!==""&&!isNaN(parseFloat(v)))return UNCANON[f.k](parseFloat(v));if(f.type==="waypoints")return wpStr(v);if(f.type==="pitches")return pitchStr(v||[]);if(f.type==="itinerary")return itinSummaryStr(v);if(OBJ_KEYS[f.type])return objStr(OBJ_KEYS[f.type],v);if(Array.isArray(v))return v.join(", ");return String(v);};
  const curRefStr=function(f){if(f.type==="pitches")return (route.pitchDetail&&route.pitchDetail.length)?pitchStr(route.pitchDetail):"";if(f.type==="waypoints")return (route.waypoints&&route.waypoints.length)?wpStr(route.waypoints):"";if(f.type==="itinerary")return itinSummaryStr(route.itinerary);if(f.cur==null||f.cur==="—")return "";return Array.isArray(f.cur)?f.cur.join(", "):String(f.cur);};
  const filledStr=function(f){var v=vals[f.k];if(f.type==="multi")return (v&&v.length)?v.join(", "):"";if(f.type==="rack")return v?rackStr(v):"";if(f.type==="pitches")return v?pitchStr(v):"";if(f.type==="waypoints")return v?wpStr(v):"";if(f.type==="itinerary")return v?itinSummaryStr(v):"";if(OBJ_KEYS[f.type])return v?objStr(OBJ_KEYS[f.type],v):"";return v!=null?String(v).trim():"";};
  const isFilled=function(f){return filledStr(f)!=="";};
  const changedFields=FIELDS.filter(function(f){return isFilled(f);});
  const allEmpty=changedFields.every(function(f){return !f.cur||f.cur==="—";});
  const fld={width:"100%",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none"};
  const sm=function(on){return {padding:"8px 12px",borderRadius:15,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"};};
  const setV=function(k,v){setVals(function(p){return Object.assign({},p,{[k]:v});});};
  const togMulti=function(k,o){setVals(function(p){var arr=p[k]||[];return Object.assign({},p,{[k]:arr.indexOf(o)>=0?arr.filter(function(x){return x!==o;}):arr.concat([o])});});};
  // render a single field's input by type
  const renderInput=function(f){var v=valOf(f);
    if(f.type==="grade"){var fgs=f.k==="rockGrade"?ADDR_YDS:gs;return fgs.length?<GradePicker scale={fgs} value={v} label={f.label} onChange={function(g){setV(f.k,g);}}/>:<input aria-label={f.label} value={v||""} onChange={function(e){setV(f.k,e.target.value);}} placeholder="e.g. 5.10a" style={fld}/>;}
    if(f.type==="single")return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{f.opts.map(function(o){var on=v===o[0];return <button key={o[0]} onClick={function(){setV(f.k,on?"":o[0]);}} style={sm(on)}>{o[1]}</button>;})}</div>;
    if(f.type==="multi")return <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{f.opts.map(function(o){var on=(v||[]).indexOf(o)>=0;return <button key={o} onClick={function(){togMulti(f.k,o);}} style={sm(on)}>{o}</button>;})}</div>;
    if(f.type==="num")return <div style={{display:"flex",alignItems:"center",gap:8}}><input aria-label={f.label} value={v||""} onChange={function(e){setV(f.k,e.target.value.replace(/[^0-9.]/g,""));}} inputMode="numeric" placeholder="0" style={Object.assign({},fld,{flex:1})}/>{f.unit?<span style={{fontSize:13,color:C.textMuted,fontWeight:600}}>{f.unit}</span>:null}</div>;
    if(f.type==="text")return <input aria-label="Add a value" value={v||""} onChange={function(e){setV(f.k,e.target.value);}} placeholder="Add a value" style={fld}/>;
    if(f.type==="long")return <textarea aria-label="Add the full text here" value={v||""} onChange={function(e){setV(f.k,e.target.value);}} rows={3} placeholder="Add the full text here" style={Object.assign({},fld,{resize:"vertical",lineHeight:1.5,minHeight:78})}/>;
    if(f.type==="rack"){return <div>{RACK_CATS.map(function(c){return <div key={c[0]} style={{marginBottom:9}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3,marginBottom:6}}>{c[0]}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{c[1].map(function(s){var key=c[2]+":"+s;var qty=rack[key]||0;return <button key={key} onClick={function(){bumpRack(key);}} style={{padding:"7px 10px",borderRadius:10,border:"1px solid "+(qty?C.blue:C.border),background:qty?C.blueBg:C.surface,color:qty?C.blue:C.textSub,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{s}{qty?" ×"+qty:""}</button>;})}</div></div>;})}<div style={{fontSize:11,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{"Tap a size to add one — tap again to add more (cycles up to 5)."}</div>{(function(){var opts=DISC_GEAR[disc]||ADDR_GEAR;if(!opts||!opts.length)return null;return <div style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.borderLight}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3,marginBottom:6}}>{"Other gear"}</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{opts.map(function(o){var on=(rack.items||[]).indexOf(o)>=0;return <button key={o} onClick={function(){togRackItem(o);}} aria-pressed={on} style={{padding:"7px 10px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.blue:C.textSub,fontSize:12,fontWeight:600,cursor:"pointer"}}>{o}</button>;})}</div><div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"Ropes, tools, screws and hardware — the things a rack size cannot describe."}</div></div>;})()}<div style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.borderLight}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3,marginBottom:6}}>{"In your own words"}</div><textarea aria-label="Rack description" value={rack.note||""} onChange={function(e){var v=e.target.value;setRack(function(r){return Object.assign({},r,{note:v});});}} rows={4} placeholder={"e.g. no gear needed on the standard line — a rope and a couple of slings only if you take the direct finish"} style={{width:"100%",boxSizing:"border-box",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13,lineHeight:1.5,outline:"none",resize:"vertical",fontFamily:"inherit"}}/><div style={{fontSize:11,color:C.textMuted,marginTop:5,lineHeight:1.4}}>{"Use this to correct a rack that is written as a sentence, or to say what the sizes above cannot — what you actually placed, and what you carried and never used."}</div></div></div>;}
    if(f.type==="pitches"){const _prefilled=!vals.pitchDetail&&route.pitchDetail&&route.pitchDetail.length;return <div>{_prefilled?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:8,padding:"7px 9px",background:C.surface,borderRadius:8,border:"1px solid "+C.border}}>{"Loaded the "+route.pitchDetail.length+" pitch"+(route.pitchDetail.length!==1?"es":"")+" already on file. Edit what is wrong and leave the rest — you are correcting the breakdown, not replacing it."}</div>:null}{pitches.map(function(pp,idx){return <div key={idx} style={{background:C.surface,border:"1px solid "+(pp.crux?C.amber:C.border),borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7,gap:8}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{"Pitch "+(pp.pitch!=null?pp.pitch:idx+1)}</span><div style={{display:"flex",alignItems:"center",gap:8,marginLeft:"auto"}}><button onClick={function(){setPitch(idx,"crux",!pp.crux);}} aria-pressed={!!pp.crux} style={{padding:"5px 10px",borderRadius:13,border:"1px solid "+(pp.crux?C.amber:C.border),background:pp.crux?C.amberBg:C.card,color:pp.crux?C.amber:C.textMuted,fontSize:11,fontWeight:700,cursor:"pointer"}}>{"Crux pitch"}</button>{pitches.length>1?<button onClick={function(){rmPitch(idx);}} aria-label={"Remove pitch "+(pp.pitch!=null?pp.pitch:idx+1)} style={{background:"none",border:"none",color:C.textMuted,fontSize:17,cursor:"pointer",lineHeight:1,padding:0}}>{"×"}</button>:null}</div></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Pitch "+(idx+1)+" grade"} value={pp.grade} onChange={function(e){setPitch(idx,"grade",e.target.value);}} placeholder="Grade (5.10a)" style={Object.assign({},fld,{flex:1})}/><input aria-label={"Pitch "+(idx+1)+" length in metres"} value={pp.lengthM} onChange={function(e){setPitch(idx,"lengthM",intOnly(e.target.value));}} inputMode="numeric" placeholder="Length (m)" style={Object.assign({},fld,{width:88,flex:"none"})}/><input aria-label={"Pitch "+(idx+1)+" bolt count"} value={pp.bolts} onChange={function(e){setPitch(idx,"bolts",intOnly(e.target.value));}} inputMode="numeric" placeholder="Bolts" style={Object.assign({},fld,{width:72,flex:"none"})}/></div>
      {/* Per-pitch, because that is how anchors actually vary: 845 stored pitch rows carry
          one, and 101 routes use MORE THAN ONE kind across their own pitches (a tree at P1,
          gear at P2, bolts at the top). The route-level "Anchor type" select this replaces
          could not say that, and nothing rendered its answer anyway. Chips write the
          vocabulary the catalog already uses; the text box keeps the qualifier that makes a
          station findable ("2-bolt anchor (alcove)", "gear (large ledge)"). */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{PITCH_ANCHORS.map(function(a){const on=(pp.anchor||"").toLowerCase()===a.toLowerCase();return <button key={a} onClick={function(){setPitch(idx,"anchor",on?"":a);}} aria-pressed={on} style={{padding:"5px 9px",borderRadius:12,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.card,color:on?C.blue:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{a}</button>;})}</div>
      <input aria-label={"Pitch "+(idx+1)+" anchor"} value={pp.anchor} onChange={function(e){setPitch(idx,"anchor",e.target.value);}} placeholder="Anchor — e.g. 2-bolt anchor (alcove), tree (sling)" style={Object.assign({},fld,{marginBottom:6})}/>
      <input aria-label={"Pitch "+(idx+1)+" gear"} value={pp.gear} onChange={function(e){setPitch(idx,"gear",e.target.value);}} placeholder="Gear (e.g. #0.3–#2, nuts)" style={Object.assign({},fld,{marginBottom:6})}/><input aria-label={"Pitch "+(idx+1)+" notes"} value={pp.notes} onChange={function(e){setPitch(idx,"notes",e.target.value);}} placeholder="Notes (belay stance, runout, route-finding…)" style={fld}/></div>;})}<button onClick={addPitch} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.blue,background:C.blueBg,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Add pitch"}</button></div>;}
    if(OBJ_KEYS[f.type]){var _ks=OBJ_KEYS[f.type],_cur=(route[f.type]||{}),_val=OBJ_STATE[f.type][0],_set=OBJ_STATE[f.type][1];
      /* One labelled input per sub-key, each showing what is on file beneath it. Showing the
         current value matters more here than elsewhere: these blocks are usually PARTLY filled,
         so a climber is correcting one line of nine and needs to see which. Leaving a box empty
         leaves that key untouched — structuredVal drops blanks, and the merge assigns over the
         existing object — so nobody has to retype eight correct facts to fix the ninth. */
      return <div>{_ks.map(function(k){var on=_dget(_cur,k[0]);if(on!=null&&typeof on==="object")on=objLabel(k,on);else if(on!=null&&k[3]==="enum")on=objLabel(k,on);return <div key={k[0]} style={{marginBottom:9}}>
        <div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.3,marginBottom:4}}>{k[1]}</div>
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
      <div style={{display:"flex",gap:7,marginBottom:7}}>
        <input aria-label={"Approach "+(idx+1)+" distance in miles"} inputMode="decimal" value={av.distMi} onChange={function(e){setAvar(idx,"distMi",e.target.value.replace(/[^0-9.]/g,""));}} placeholder="miles" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        <input aria-label={"Approach "+(idx+1)+" gain in feet"} inputMode="numeric" value={av.gainFt} onChange={function(e){setAvar(idx,"gainFt",e.target.value.replace(/[^0-9]/g,""));}} placeholder="gain ft" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        <input aria-label={"Approach "+(idx+1)+" hours"} value={av.hours} onChange={function(e){setAvar(idx,"hours",e.target.value);}} placeholder="hrs, e.g. 3-4" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
      </div>
      <input aria-label={"Approach "+(idx+1)+" season"} value={av.season} onChange={function(e){setAvar(idx,"season",e.target.value);}} placeholder="Window, e.g. Jul-Sep" style={Object.assign({},fld,{marginBottom:7})}/>
      <textarea aria-label={"Approach "+(idx+1)+" hazards, one per line"} value={av.hazards} onChange={function(e){setAvar(idx,"hazards",e.target.value);}} rows={2} placeholder="Hazards, one per line" style={Object.assign({},fld,{marginBottom:7,resize:"vertical"})}/>
      <textarea aria-label={"Approach "+(idx+1)+" notes"} value={av.notes} onChange={function(e){setAvar(idx,"notes",e.target.value);}} rows={3} placeholder="What the walk in is actually like" style={Object.assign({},fld,{marginBottom:0,resize:"vertical"})}/>
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
      <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:7}}>
        <input aria-label={"Site "+(idx+1)+" name"} value={b.name} onChange={function(e){setBivy(idx,"name",e.target.value);}} placeholder="Site name, e.g. Boston Basin" style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
        {bivies.length>1?<button onClick={function(){delBivy(idx);}} aria-label={"Remove site "+(idx+1)} style={{flexShrink:0,padding:"7px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.card,color:C.textMuted,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Remove"}</button>:null}
      </div>
      <div style={{display:"flex",gap:7,marginBottom:7}}>
        <select aria-label={"Site "+(idx+1)+" type"} value={b.type} onChange={function(e){setBivy(idx,"type",e.target.value);}} style={Object.assign({},fld,{flex:1,marginBottom:0})}>
          <option value="camp">{"Camp"}</option><option value="bivy">{"Bivy"}</option><option value="hut">{"Hut"}</option>
        </select>
        <input aria-label={"Site "+(idx+1)+" elevation"} inputMode="numeric" value={b.elev} onChange={function(e){setBivy(idx,"elev",e.target.value);}} placeholder={uImp()?"Elevation (ft)":"Elevation (m)"} style={Object.assign({},fld,{flex:1,marginBottom:0})}/>
      </div>
      <input aria-label={"Site "+(idx+1)+" water"} value={b.water} onChange={function(e){setBivy(idx,"water",e.target.value);}} placeholder="Water — is there any, and is it reliable?" style={fld}/>
      <input aria-label={"Site "+(idx+1)+" capacity"} value={b.capacity} onChange={function(e){setBivy(idx,"capacity",e.target.value);}} placeholder="Capacity, e.g. 3 tents on gravel" style={fld}/>
      <input aria-label={"Site "+(idx+1)+" permit"} value={b.permit} onChange={function(e){setBivy(idx,"permit",e.target.value);}} placeholder="Permit — which agency, and is it a quota?" style={fld}/>
      <textarea aria-label={"Site "+(idx+1)+" notes"} value={b.notes} onChange={function(e){setBivy(idx,"notes",e.target.value);}} placeholder="Anything a party arriving at dusk would want to know" rows={2} style={Object.assign({},fld,{marginBottom:0,resize:"vertical"})}/>
    </div>;})}
      {bivies.length<MAX_BIVY?<button onClick={addBivy} style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"1px dashed "+C.border,background:C.card,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"+ Add another site"}</button>:<div style={{fontSize:11.5,color:C.textMuted}}>{"That is the most sites this form takes."}</div>}
      <div style={{fontSize:11,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{"Leave anything you don't know blank — blank means unchanged, not cleared. A site needs a name to be submitted."}</div>
    </div>;}
    if(f.type==="waypoints"){const wpsWithNum=wps.map(function(w){return Object.assign({},w,{lat:w.lat?parseFloat(w.lat):null,lng:w.lng?parseFloat(w.lng):null});});return <div><WaypointMapPicker waypoints={wpsWithNum} activeIdx={activeWpIdx} peakCoord={peakCoord} onPick={function(lat,lng){setWp(activeWpIdx,"lat",lat.toFixed(5));setWp(activeWpIdx,"lng",lng.toFixed(5));}}/>{wps.map(function(wp,idx){var dupType=WP_SINGLE_TYPES.indexOf(wp.type)>=0&&wps.some(function(w,wi){return wi!==idx&&w.type===wp.type;});return <div key={idx} {...clickable(function(){setActiveWpIdx(idx);})} style={{background:C.surface,border:"1px solid "+(idx===activeWpIdx?C.blue:C.border),borderRadius:10,padding:"10px 11px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}><span style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{"Waypoint "+(idx+1)+(wp.lat&&wp.lng?" · 📍 set":"")}</span>{wps.length>1?<button onClick={function(e){e.stopPropagation();rmWp(idx);}} aria-label="Remove waypoint" style={{background:"none",border:"none",color:C.textMuted,fontSize:17,cursor:"pointer",lineHeight:1,padding:0}}>{"×"}</button>:null}</div><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>{WP_TYPES.map(function(t){var on=wp.type===t;var blocked=WP_SINGLE_TYPES.indexOf(t)>=0&&wps.some(function(w,wi){return wi!==idx&&w.type===t;});return <button key={t} disabled={blocked} onClick={function(e){e.stopPropagation();setWp(idx,"type",t);}} title={blocked?"Only one "+t+" per route":undefined} style={Object.assign({},sm(on),blocked?{opacity:0.35,cursor:"not-allowed"}:null)}>{t}</button>;})}</div>{dupType?<div style={{fontSize:11,color:C.amber,marginBottom:6}}>{"Only one "+wp.type+" per route — pick a different type or edit the other one."}</div>:null}<input aria-label="Name" value={wp.name} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"name",e.target.value);}} placeholder="Name (e.g. Pandora Mill Gate)" style={Object.assign({},fld,{marginBottom:6})}/><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label="Lat (or tap map above)" value={wp.lat} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"lat",e.target.value.replace(/[^0-9.\-]/g,""));}} inputMode="decimal" placeholder="Lat (or tap map above)" style={Object.assign({},fld,{flex:1})}/><input aria-label="Lng" value={wp.lng} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"lng",e.target.value.replace(/[^0-9.\-]/g,""));}} inputMode="decimal" placeholder="Lng" style={Object.assign({},fld,{flex:1})}/></div><div style={{display:"flex",gap:6,marginBottom:6}}><input aria-label={"Elevation ("+(uImp()?"ft":"m")+")"} value={wp.elev} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"elev",intOnly(e.target.value));}} inputMode="numeric" placeholder={"Elev ("+(uImp()?"ft":"m")+")"} style={Object.assign({},fld,{flex:1})}/><input aria-label={"Distance ("+(uImp()?"mi":"km")+")"} value={wp.distMi} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"distMi",e.target.value.replace(/[^0-9.]/g,""));}} inputMode="decimal" placeholder={"Dist ("+(uImp()?"mi":"km")+")"} style={Object.assign({},fld,{flex:1})}/></div><input aria-label="Note (optional)" value={wp.note} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"note",e.target.value);}} placeholder="Note (optional)" style={fld}/><input aria-label="How to get here from the last waypoint (optional)" value={wp.directions||""} onClick={function(e){e.stopPropagation();}} onChange={function(e){setWp(idx,"directions",e.target.value);}} placeholder="Getting here — which way to go from the last point" style={Object.assign({},fld,{marginTop:6})}/></div>;})}{wps.length<MAX_WAYPOINTS?<button onClick={addWp} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.blue,background:C.blueBg,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"+ Add waypoint"}</button>:<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",padding:"6px 0"}}>{"Maximum "+MAX_WAYPOINTS+" waypoints per route — keep it to the essentials."}</div>}</div>;}
    return null;};
  const discChanged=disc!==catToChip(catOf(route));
  const discContribs=function(){if(!discChanged)return [];var cfg=(DISCS.find(function(d){return d[1]===disc;})||[])[2]||{discipline:disc};var lbl=(DISCS.find(function(d){return d[1]===disc;})||["",""])[0];var out=[{field:"discipline",label:"Discipline",value:cfg.discipline,cur:route.discipline||"—"}];if(cfg.style)out.push({field:"rockStyle",label:"Style",value:cfg.style,cur:route.style||"—"});return out.map(function(x){return {type:"edit",field:x.field,label:x.label,value:x.value,wasEmpty:(!x.cur||x.cur==="—"),routeId:route.id,note:note,title:route.name,area:mtnOf(route),meta:x.label+": "+(x.cur||"—")+" → "+x.value+" ("+lbl+")",status:"review",when:"just now"};});};
  const structuredVal=function(f){if(f.type==="variants")return (vals.approachVariants||[]).map(function(x){
    var o={name:String(x.name||"").trim(),season:String(x.season||"").trim(),notes:String(x.notes||"").trim()};
    var hz=String(x.hazards||"").split("\n").map(function(h){return h.trim();}).filter(Boolean);
    if(hz.length)o.hazards=hz;
    /* Numbers go in as NUMBERS, matching the 123 gainFt and 120 distMi rows already stored that
       way. A numeric string here would break the tolerant comparison and read as a different
       value from the identical measurement. */
    var d=parseFloat(x.distMi);if(isFinite(d))o.distMi=d;
    var g=parseInt(x.gainFt,10);if(isFinite(g))o.gainFt=g;
    var h=String(x.hours||"").trim();if(h)o.hours=h;
    return o;}).filter(function(x){return x.name||x.notes;});
  if(f.type==="sections")return (vals.climbingRoute||[]).map(function(x,i){return {n:i+1,label:String(x.label||"").trim(),class:String(x.cls||"").trim(),notes:String(x.notes||"").trim()};}).filter(function(x){return x.label||x.notes;});
  if(f.type==="pitches")return (vals.pitchDetail||[]).map(function(p,i){return {n:i+1,grade:p.grade||"",lengthM:parseInt(p.len)||null,gear:p.gear||"",note:p.notes||"",bolts:0,anchor:"",crux:false,photos:[],comments:[]};}).filter(function(p){return p.grade||p.gear||p.note||p.lengthM;});if(f.type==="waypoints")return (vals.waypoints||[]).filter(function(w){return w.name||w.lat||w.note||w.directions;}).map(function(w){return {type:w.type,name:w.name||w.type,lat:w.lat?parseFloat(w.lat):null,lng:w.lng?parseFloat(w.lng):null,elev:w.elev?(uImp()?parseInt(w.elev):Math.round(parseInt(w.elev)*3.28084)):null,distMi:w.distMi?(uImp()?parseFloat(w.distMi):Math.round(parseFloat(w.distMi)/1.60934*100)/100):null,note:w.note||"",directions:w.directions||""};});if(f.type==="itinerary")return itinDraftToStructured(vals.itinerary);if(f.type==="bivy")return (vals.bivy||[]).filter(function(b){return b.name&&String(b.name).trim();}).map(function(b){
  /* elev goes to the DB in FEET, converted from whatever the reader's units are — the same
     handling as a waypoint elevation two branches up. This matters more than it looks: the
     column already holds two conventions (`elev` feet, legacy `elevM` metres) and writing a
     metric number into `elev` would put a third reading into a field uElev() treats as feet.
     Only `elevM` is never written here — the read side converts the legacy spelling, and the
     write side should not add to it. */
  var _e=String(b.elev||"").trim();var _n=_e?parseInt(_e,10):null;
  return {name:String(b.name).trim(),type:b.type||"camp",elev:(_n!=null&&!isNaN(_n))?(uImp()?_n:Math.round(_n*3.28084)):null,capacity:(b.capacity||"").trim(),water:(b.water||"").trim(),permit:(b.permit||"").trim(),notes:(b.notes||"").trim()};
});if(OBJ_KEYS[f.type]){var _ks=OBJ_KEYS[f.type],_src=vals[f.k]||{},_o={};_ks.forEach(function(k){var v=_dget(_src,k[0]);if(v==null)return;v=String(v).trim();if(!v)return;
/* A key marked numeric merges back as a NUMBER. The hour fields are arithmetic — the planner
   derives the summit time as totalHrs-approachTimeHrs-descentTimeHrs — so a string would
   concatenate instead of subtract, silently. Non-numeric input is dropped rather than stored
   as text, because a bad number is worse here than a missing one: the tile still renders.
   group_limit keeps its integer parse, now declared on the key rather than hardcoded here. */
var _pv=(k[3]==="num")?(isFinite(parseFloat(v))?parseFloat(v):undefined):(k[3]==="enum")?((k[4]||[]).some(function(o){return typeof o[0]==="number";})?(isFinite(parseFloat(v))?parseFloat(v):undefined):v):((k[0]==="group_limit"&&/^[0-9]+$/.test(v))?parseInt(v,10):v);if(_pv===undefined)return;/* dotted keys write nested, so `fitnessSpec.hiking` lands inside the object the panel reads */if(String(k[0]).indexOf(".")>=0){_o=_dset(_o,k[0],_pv);}else{_o[k[0]]=_pv;}});return _o;}if(CANON[f.k])return CANON[f.k](filledStr(f));return filledStr(f);};
  const submit=function(){var dc=discContribs();if(!changedFields.length&&!dc.length)return;changedFields.forEach(function(f){var c={type:"edit",field:f.k,label:f.label,value:structuredVal(f),wasEmpty:(!f.cur||f.cur==="—"),routeId:route.id,note:note,title:route.name,area:mtnOf(route),meta:f.label+": "+(f.cur||"—")+" → "+filledStr(f),status:"review",when:"just now"};if(onSubmit)onSubmit(c);});dc.forEach(function(c){if(onSubmit)onSubmit(c);});setSentN(changedFields.length+dc.length);setSent(true);};
  const totalUpdates=changedFields.length+(discChanged?(disc==="trad"||disc==="sport"?2:1):0);const canSubmit=totalUpdates>0;
  const submitLbl=!canSubmit?"Fill in any one field to submit":totalUpdates>1?("Submit "+totalUpdates+" updates"):(allEmpty&&!discChanged?"Add to route":"Submit update");
  return createPortal(<div onClick={onClose} role="dialog" aria-modal="true" aria-label="Contribute info" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:100000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"72px 12px 32px",overflowY:"auto",overscrollBehavior:"contain"}}>
    <div onClick={function(e){e.stopPropagation();}} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:460,border:"1px solid "+C.border,overflowY:"auto",overscrollBehavior:"contain",maxHeight:"92vh",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",borderBottom:"1px solid "+C.border,flexShrink:0}}><div style={{fontSize:16,fontWeight:700,color:C.text}}>{sent?"Thanks for contributing":"Add or fix info"}</div><button onClick={onClose} aria-label="Close" style={{background:C.borderLight,border:"none",color:C.textSub,borderRadius:8,width:36,height:36,fontSize:20,cursor:"pointer"}}>{"✕"}</button></div>
      {sent?<div style={{padding:16}}><div style={{fontSize:40,textAlign:"center",marginBottom:8}}>{"✓"}</div><div style={{textAlign:"center",fontWeight:700,fontSize:15,color:C.text,marginBottom:12}}>{"Thanks — "+sentN+" added"}</div><div style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:11,padding:"11px 13px",fontSize:12.5,color:C.text,lineHeight:1.55,marginBottom:12}}>{allEmpty?"These all filled in right away and credited you — thanks for helping the next party.":"Blank fields fill in right away and credit you; changes to existing values stay a suggestion until 3 climbers agree — then the route updates for everyone."}</div><button onClick={onClose} style={{width:"100%",padding:11,background:C.blueSolid,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer"}}>Done</button></div>:<div>
      <div ref={scrollRef} style={{minHeight:0,padding:16,overflowY:"auto",flex:1}}>
        <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"10px 12px",marginBottom:10}}>{"Spotted something wrong or missing on "}<b>{route.name}</b>{"? Fill in any fields below — leave the rest blank. Empty fields fill in right away; changes to existing values go to review until other climbers confirm them."}</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>{GROUPED.map(function(g){return <button key={g[0]} onClick={function(){jumpTo(g[1][0].k);}} style={{padding:"8px 11px",borderRadius:14,border:"1px solid "+C.border,background:C.card,color:C.textSub,fontSize:11,fontWeight:600,cursor:"pointer"}}>{g[0]}</button>;})}</div>
        <div style={{background:"linear-gradient(180deg,"+C.blueBg+","+C.card+")",border:"1px solid "+C.blue+"55",borderRadius:14,padding:"13px 14px 14px",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:8,marginBottom:10}}><span style={{fontSize:12,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.blue}}>{"Discipline"}</span>{discChanged?<span style={{fontSize:11,fontWeight:700,color:C.amber}}>{"Will update the route"}</span>:null}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{DISCS.map(function(d){var on=disc===d[1];return <button key={d[1]} onClick={function(){setDisc(d[1]);}} aria-current={on?"true":undefined} style={{padding:"8px 14px",borderRadius:11,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueSolid:C.surface,color:on?"#fff":C.textSub,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:on?"0 1px 6px "+C.blue+"66":"none"}}>{d[0]}</button>;})}</div>
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
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,margin:"11px 0 2px"}}><span style={{fontSize:11.5,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:acc[0]}}>{g[0]}</span>{_missing.length?<button aria-label={(_gOpen?"Hide the ":"Fill in the ")+_missing.length+" missing "+g[0]+" field"+(_missing.length===1?"":"s")} onClick={function(){setGroupOpen(function(p){var o=Object.assign({},p);o[g[0]]=!p[g[0]];return o;});}} style={{flexShrink:0,padding:"5px 10px",borderRadius:9,border:"1px solid "+acc[0]+"55",background:_gOpen?acc[1]:"transparent",color:acc[0],fontSize:11,fontWeight:700,cursor:"pointer"}}>{_gOpen?"Hide":("Fill in "+_missing.length+" missing")}</button>:null}</div>
          {g[1].map(function(f,fi){var filled=isFilled(f);var pend=(pending&&pending[f.k]&&!pending[f.k].live)?pending[f.k]:null;var isOpen=!!open[f.k]||(_gOpen&&(!f.cur||f.cur==="—"))||scrollTo===f.k||!!pend;var shown=filled?filledStr(f):(pend?(pend.agrees+"/3: "+pendStr(f,pend.value)):((!f.cur||f.cur==="—")?"Not set yet":f.cur));var dim=!filled&&!pend&&(!f.cur||f.cur==="—");var help=HINTS[f.k]||"";return <div key={f.k} id={"sf-section-"+f.k} style={{marginTop:fi?9:0,paddingTop:fi?9:0,borderTop:fi?"1px solid "+C.borderLight:"none"}}>
            <div {...clickable(function(){setOpen(function(o){return Object.assign({},o,{[f.k]:!o[f.k]});});})} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",padding:"8px 0"}}>
              <span style={{fontSize:12.5,fontWeight:700,color:C.text,flexShrink:0}}>{f.label}</span>
              <span style={{flex:1,minWidth:0,textAlign:"right",fontSize:11.5,color:filled?acc[0]:(pend?C.amber:(dim?C.textMuted:C.textSub)),fontWeight:(filled||pend)?700:400,fontStyle:dim?"italic":"normal",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{shown}</span>
              <span style={{flexShrink:0,width:24,height:24,borderRadius:"50%",background:isOpen?C.blueSolid:C.blueBg,border:"1px solid "+C.blueDim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:isOpen?"#fff":C.blue,transform:isOpen?"rotate(180deg)":"none",transition:"transform .15s, background .15s"}}>{"▾"}</span>
            </div>
            {isOpen?<div style={{marginTop:8}}>{pend?<div style={{background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:9,padding:"7px 9px",marginBottom:8,display:"flex",alignItems:"center",gap:7}}><span style={{flex:1,fontSize:11,color:C.text,lineHeight:1.4}}>{pend.agrees+" of 3 suggested: "}<b>{pendStr(f,pend.value)}</b></span>{agreed[f.k]?<span style={{flexShrink:0,padding:"5px 9px",background:C.greenBg,color:C.green,border:"1px solid "+C.greenDim,borderRadius:7,fontSize:11,fontWeight:700}}>{"✓ You agreed"}</span>:<button onClick={function(e){e.stopPropagation();setAgreed(function(a){var n=Object.assign({},a);n[f.k]=1;return n;});onSubmit&&onSubmit({type:"edit",field:f.k,label:f.label,value:pend.value,wasEmpty:false,routeId:route.id,note:"",title:route.name,area:mtnOf(route),meta:f.label+": "+(f.cur||"—")+" → "+pendStr(f,pend.value),status:"review",when:"just now"});}} style={{flexShrink:0,padding:"5px 9px",background:C.amber,color:"#1a1400",border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer"}}>{"✓ I see this too"}</button>}</div>:null}{help?<div style={{fontSize:11,color:C.textMuted,lineHeight:1.4,marginBottom:7}}>{help}</div>:null}{(function(){var cr=curRefStr(f);return cr?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginBottom:7,background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:"6px 9px"}}><b style={{color:C.text}}>Currently: </b>{cr}</div>:null;})()}{renderInput(f)}</div>:null}
          </div>;})}
        </div>;})}
        <div id="sf-section-bailout" style={{background:C.card,border:"1px solid "+C.green+"40",borderLeft:"4px solid "+C.green,borderRadius:12,padding:"11px 14px 14px",marginBottom:18}}>
          <div style={{fontSize:11.5,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.green,margin:"2px 0 6px"}}>Bailout / retreat points</div>
          <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4,marginBottom:8}}>Know a bail point on this route — even if you never climbed it? Add it here. Suggestions from climbers who didn't climb the route are weighted lower than ones tied to a logged climb, and labeled so others know the difference.</div>
          {!showBailForm?<button onClick={function(){setShowBailForm(true);}} style={{padding:"8px 12px",background:C.surface,color:C.green,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{"+ Add a bail point"+(bailAdded?" ("+bailAdded+" added)":"")}</button>:<BailoutForm peakCoord={peakCoord} onCancel={function(){setShowBailForm(false);}} onSubmit={function(station){onSubmit&&onSubmit({field:"bailout",routeId:route.id,value:station,wasEmpty:false});setBailAdded(function(n){return n+1;});setShowBailForm(false);}}/>}
        </div>
        <div id="sf-section-startLocation" style={{background:C.card,border:"1px solid "+C.blue+"40",borderLeft:"4px solid "+C.blue,borderRadius:12,padding:"11px 14px 14px",marginBottom:18}}>
          <div style={{fontSize:11.5,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.blue,margin:"2px 0 6px"}}>Start of climb</div>
          <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4,marginBottom:8}}>Exact location the technical climbing begins — not the trailhead. When climbers agree, the closest-matching submissions become the shown location; others stay visible as alternates.</div>
          {!showStartForm?<button onClick={function(){setShowStartForm(true);}} style={{padding:"8px 12px",background:C.surface,color:C.blue,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{"+ Add start location"+(startAdded?" ("+startAdded+" added)":"")}</button>:<StartLocationForm peakCoord={peakCoord} onCancel={function(){setShowStartForm(false);}} onSubmit={function(loc){onSubmit&&onSubmit({field:"startLocation",routeId:route.id,value:loc,wasEmpty:false});setStartAdded(function(n){return n+1;});setShowStartForm(false);}}/>}
        </div>
        <div style={{marginBottom:4}}><div style={{fontSize:11.5,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",color:C.textMuted,margin:"2px 0 6px"}}>{"Why / source (optional)"}</div><input aria-label="Why / source (optional)" value={note} onChange={function(e){setNote(e.target.value);}} placeholder="e.g. climbed it last week; guidebook lists WI4" style={fld}/></div>
      </div>
      <div style={{padding:"9px 16px 12px",borderTop:"1px solid "+C.border,flexShrink:0}}>{onLog?<div {...clickable(onLog)} style={{fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",textAlign:"center",marginBottom:9}}>Climbed it? Log a trip report instead →</div>:null}<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",marginBottom:8,lineHeight:1.4}}>No need to fill everything — add or fix only what you know.</div><div style={{display:"flex",gap:8}}><button onClick={onClose} style={{flex:1,padding:11,background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:"pointer",fontWeight:600}}>Cancel</button><button onClick={submit} disabled={!canSubmit} style={{flex:2,padding:11,background:canSubmit?C.blueSolid:C.surface,color:canSubmit?"#fff":C.textMuted,border:canSubmit?"none":"1px solid "+C.border,borderRadius:10,fontSize:14,cursor:canSubmit?"pointer":"default",fontWeight:700}}>{submitLbl}</button></div></div>
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
function gapGear(r){if(!r)return false;const roped=["trad","sport","alpine","ice","mixed","aid"].indexOf(catOf(r))>=0;return roped&&!((r.cams&&r.cams.length)||(r.rack&&r.rack.length)||(r.gearTiers&&(r.gearTiers.required||[]).length)||(r.gearBeta&&r.gearBeta.length));}
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
export function seasonShort(s,max){const lim=typeof max==="number"?max:30;if(!s)return "";s=String(s).trim().replace(/\s+/g," ");if(s.length<=lim)return s;const m=s.match(SEASON_WINDOW_RE);if(m)return m[0];const cut=s.split(/[;.(]/)[0].trim();if(cut.length<=lim)return cut;const w2=s.match(SEASON_WINDOW_WIDE_RE);if(w2)return w2[0];const w=cut.lastIndexOf(" ",lim-1);const keep=w>Math.floor(lim/2)?cut.slice(0,w):cut.slice(0,lim-1);return keep.replace(/[\s,;-]+$/,"")+"…";}
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
function TagChip({t,open,onToggle}){const col=C[t.color]||C.textSub;const bg=C[t.color+"Bg"]||C.surface;
  const name=(t.label||t.short)+(t.detail?", "+t.detail:"")+(t.blurb?" - "+t.blurb:"");
  return <span {...clickable(onToggle)} aria-expanded={!!open} aria-label={name} title={(t.blurb||t.label)+(t.detail?" ("+t.detail+")":"")} style={{display:"inline-flex",alignItems:"center",gap:4,background:bg,border:"1px solid "+col+(open?"":"55"),borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:700,color:col,whiteSpace:"nowrap",cursor:"pointer"}}><span aria-hidden="true">{t.icon}</span>{t.short||t.label}{t.detail?<b style={{fontWeight:800,opacity:0.8,marginLeft:1}}>{t.detail}</b>:null}</span>;}
function RouteTagRow({route}){const tags=routeTags(route);const [open,setOpen]=useState(null);
  if(!tags.length)return null;
  const shown=open!=null?tags[open]:null;
  return <div>
    <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>{tags.map(function(t,i){return <TagChip key={t.kind+":"+t.slug} t={t} open={open===i} onToggle={function(){setOpen(open===i?null:i);}}/>;})}</div>
    {shown&&shown.blurb?<div style={{marginTop:8,background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"8px 11px",fontSize:12,color:C.textSub,lineHeight:1.5}}>{shown.blurb}</div>:null}
  </div>;}
/* trad and sport deliberately omit the season, which left the strap ending in a bare "3p · ". */
function strapTrim(s){return String(s||"").replace(/\s*·\s*$/,"").replace(/^\s*·\s*/,"").trim();}
/* A gap is now the *quietest* thing in its section, not a dashed card competing with the
   content around it. This used to be a filled, dashed, bordered box at 12.5px bold — on a
   bare route (the shape ~99.5% of them have) six of them stacked up and the page read as a
   list of absences rather than a climb. Same words, same fix link, one thin rule and muted
   11.5px text. The button keeps a 30px tap target via padding, since shrinking type must
   not shrink the touch area. */
/* PROTECTION. This was the left half of a two-column card on Overview whose right half was
   "Anchor" — and that half could only ever print "—" for a DB-backed route: there is no
   `routes.anchor` column (confirmed against the live schema) and `dbRouteToCamel` maps no
   such key, so a value existed for seed routes alone. Per-pitch anchors are already in
   PITCH-BY-PITCH, which is the only place they can be specific enough to act on. What is
   left is one fact — what protects this line — so it reads as a section on Plan next to the
   rack it implies, rather than as half of a cramped box on Overview. */
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
function VerifNote({route}){
  const v=route&&route.verif;
  if(!v||typeof v!=="object")return null;
  const st=String(v.status||"").toLowerCase();
  if(!st||st==="verified")return null;
  const note=st==="community"?"Community-reported":"Unverified";
  return <div style={{marginBottom:12,paddingLeft:9,borderLeft:"2px solid "+C.amber+"66"}}><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.55}}><b style={{color:C.amber,fontWeight:700}}>{note}</b></span></div>;
}
function ProtectionCard({route,myReports,onEdit}){
  const hasCams=route.cams&&route.cams.length;const hasRack=route.rack&&route.rack.length;
  if(!hasCams&&!route.bolts&&!hasRack)return null;
  const pro=hasCams?("Cams "+route.cams[0]+"–"+route.cams[route.cams.length-1]):(route.bolts?(route.bolts+" bolts · "+route.bolts+"+ quickdraws"):(hasRack?rackSummary(route.rack):"Gear-protected"));
  const rc=(myReports||[]).length;
  return <div style={{marginBottom:14}}><SL action={onEdit?<EditIconButton onClick={onEdit} title="Edit protection information"/>:null}>PROTECTION</SL><div style={{background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"11px 13px"}}><div style={{fontSize:14,fontWeight:700,color:C.text,lineHeight:1.45}}>{pro}</div><div style={{fontSize:11,color:C.textMuted,marginTop:8,paddingTop:8,borderTop:"1px solid "+C.borderLight,fontWeight:600}}>{rc?("Confirmed on "+rc+" logged ascent"+(rc>1?"s":"")):"No ascents logged here yet"}</div></div></div>;
}
function GapNote({what,why,cta,onFix,mt}){return <div style={{marginTop:(mt||0)+2,marginBottom:11,paddingLeft:9,borderLeft:"2px solid "+C.borderLight}}><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.55}}>{what}{why?" — "+why:""}</span>{onFix?<button onClick={onFix} style={{display:"block",marginTop:1,padding:"5px 0",border:"none",background:"none",color:C.blue,fontSize:11.5,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{(cta||"Add what you know")+" →"}</button>:null}</div>;}
function RouteDetail({route,presence,autoFix,onAutoFixDone,onAddPhotos,onRemovePhoto,onReportPhoto,canModeratePhotos,dbPhotos,photosUnavailable,onSubTab,initialSubTab,myReports,onBack,onPlan,onViewProfile,connections,onConnect,friendState,saved,onToggleSave,onLog,onOpenReport,onOpenRoute,hzVotes,onVoteHazard,offlineSaved,onToggleOffline,onShareRoute,onContribute,onRequestJoin,requested,onFindPartners,diffRatings,setDiffRatings,logged,onOpenCrag,comments,commentsUnavailable,onCommentAdd,onCommentEdit,onCommentDelete,onCommentLike,onCommentReply,onAddTopo,topoConsensus,myItin,onSaveMyItin,crewsForRoute,onShareItinToCrew,myStars,setMyStars,onOpenFireMap}){
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
  const [wpFocus,setWpFocus]=useState(null);
  const focusWaypoint=useCallback(function(i){
    setWpFocus(function(p){return {i:i,n:((p&&p.n)||0)+1};});
    const el=mapWrapRef.current;
    if(el&&el.scrollIntoView){try{el.scrollIntoView({behavior:"smooth",block:"center"});}catch(e){el.scrollIntoView();}}
  },[]);
  const tripQ=useRouteTripReports(USE_DB?route.id:null);/* Derived here rather than beside any other declaration: `tripQ` is a `const`, so a flag reading it from higher up the component is a temporal dead zone — the #1206 blank screen. */const reportsUnavailable=!!(USE_DB&&tripQ&&tripQ.isError);
  const _tripRows=tripQ&&tripQ.data||EMPTY_ARR;
  const _reporterIds=useMemo(function(){return [...new Set(_tripRows.map(function(r){return r.user_id;}).filter(Boolean))];},[_tripRows]);
  const _reporterQ=useProfilesByIds(_reporterIds);
  const dbReports=useMemo(function(){
    var byId={};(_reporterQ&&_reporterQ.data||EMPTY_ARR).forEach(function(p){byId[p.id]=p;});
    /* Shaped exactly like a seed `activity` row, because every consumer downstream — the trip
       report card, the full-report modal, ReportStats, the rack-beta extractor, buildConsensus —
       already reads that shape and none of them needed changing. What is new is that these
       rows now carry what the reporter actually WROTE. They used to arrive with stars and
       cond_tags only, so a route's whole community record was a star average and some chips.
       `cond` is rebuilt with the same key names LogAscent uses (approachMin/climbMin/snow/…),
       which is what ReportStats reads.
       A reporter whose profile row is missing gets no invented name: buildConsensus weights
       an unknown author at the neutral default instead of fabricating one. */
    return _tripRows.map(function(r){var p=byId[r.user_id]||null;var cond={};if(r.approach_minutes!=null)cond.approachMin=r.approach_minutes;if(r.climb_minutes!=null)cond.climbMin=r.climb_minutes;if(r.descent_minutes!=null)cond.descentMin=r.descent_minutes;if(r.car_to_car_minutes!=null){cond.carToCar=Math.floor(r.car_to_car_minutes/60)+"h "+(r.car_to_car_minutes%60)+"m";/* Carry the INTEGER alongside the display string. `carToCar` is prose on the seed path ("3 days", "Turned around") so it can never be parsed back into a number safely; loggedTimeStats reads this field and never that one. */cond.carToCarMin=r.car_to_car_minutes;}if(r.snow_condition)cond.snow=r.snow_condition;if(r.freezing_level_ft!=null)cond.freezing=r.freezing_level_ft+" ft";if(r.water_level)cond.water=r.water_level;if(r.bug_pressure)cond.bugs=r.bug_pressure;if(r.trail_condition)cond.trail=r.trail_condition;if(r.protection_quality)cond.protection=r.protection_quality;if(r.anchor_quality)cond.anchors=r.anchor_quality;if(r.crowd_level)cond.crowds=r.crowd_level;if(r.party_size!=null)cond.partySize=String(r.party_size);if(r.temp_f!=null)cond.tempF=r.temp_f;if(r.snow_depth)cond.snowDepth=r.snow_depth;if(r.seepage)cond.seepage=r.seepage;if(r.mud)cond.mud=r.mud;
      return {_dbId:r.id,user:p&&p.name||"A climber",avatar:p&&p.avatar||"",date:r.date_climbed,stars:r.stars,condTags:r.cond_tags||[],tickType:r.tick_type||undefined,text:r.notes||"",photos:(r.photos||[]).map(function(ph){return ph&&ph.url;}).filter(Boolean),beta:r.beta||undefined,gearBeta:r.gear_beta||undefined,outcomeReasons:r.outcome_reasons||[],outcomeNote:r.outcome_note||undefined,/* buildConsensus derives faCredits from `faAscent` and isDeveloped from `developed`, and RouteDetail renders each as its own panel. `activity` dedupes route.activity -> myReports -> dbReports by _dbId, so YOUR row arrives via myReports carrying the full ClimbMatch shape and keeps these; every other climber's row exists only here. Dropping them meant a panel whose whole purpose is public attribution could only ever credit yourself. Both are booleans the logger asserted about their own ascent — same standing as the seed activity rows that have always fed these panels. */fa:!!r.fa_ascent,faAscent:!!r.fa_ascent,developed:!!r.developed,/* TripReport is what onOpenReport opens these rows INTO, and it reads all three: an itinerary block, a sun block, and gear/beta. Without them another climber's report opened from this page rendered a shorter document than the same row does in its author's own logbook. `partners` is deliberately NOT hydrated: matchClimber does `CLIMBERS.find(c=>c.name===nm&&ascent.partnerIds.includes(c.id))` against seed INTEGER ids, so feeding it uuids takes that branch and returns null for every partner — worse than the name fallback it currently uses. See check:crew-member-readers. */itinerary:r.itinerary||undefined,sunVote:r.sun_vote||undefined,sunNote:r.sun_note||undefined,cond:Object.keys(cond).length?cond:undefined};});
  },[_tripRows,_reporterQ&&_reporterQ.data]);
  const activity=useMemo(function(){var out=[],seen=new Set(),ids=new Set();(route.activity||[]).concat(myReports||[]).concat(dbReports).forEach(function(a){if(!a||seen.has(a))return;var k=a._dbId!=null?a._dbId:a.id;if(k!=null){if(ids.has(k))return;ids.add(k);}seen.add(a);out.push(a);});return out.sort(function(x,y){return (y.date||"").localeCompare(x.date||"");});},[route.activity,myReports,dbReports]);const hzVoteFor=useCallback(function(label){if(!hzVotes||!label)return null;var direct=hzVotes[route.id+"|"+label];if(direct)return direct;var lc=String(label).toLowerCase();var cat=Object.keys(HAZ_KW).find(function(k){return k.toLowerCase()===lc||HAZ_KW[k].some(function(kw){return lc.indexOf(kw)>=0;});});return cat?hzVotes[route.id+"|"+cat]:null;},[hzVotes,route.id]);const ovCC=useMemo(()=>buildConsensus(activity,hzVoteFor),[activity,hzVoteFor]);const topRef=useRef(null);useEffect(()=>{try{if(topRef.current&&topRef.current.scrollIntoView)topRef.current.scrollIntoView({block:"start"});if(typeof window!=="undefined"&&window.scrollTo)window.scrollTo(0,0);}catch(e){}},[route&&route.id]);
  const {data:dbSibs,isError:dbSibsErr,isPending:dbSibsPending}=useAreaRoutes(route.mountainId);/* A failed sibling read used to state, as a fact about the catalog, that this was the only route on the peak. `useAreaRoutes` throws, so `dbSibs` stays undefined and `cragSibs` falls through to filtering the SEED array by a DB area id — which matches nothing — so `sibs` is empty for the same reason a genuinely single-route peak is. Measured on production against a 4-route area: 'The only route catalogued on 19 Mile Wall so far.' */const sibsUnavailable=!!(USE_DB&&dbSibsErr);const sibsPending=!!(USE_DB&&dbSibsPending&&!dbSibsErr);const cragOnly=["trad","sport","bouldering"].includes(catOf(route));const showPlan=!cragOnly||hasPlanContent(route);/* Safety is offered on EVERY route, deliberately unlike Plan. An empty Plan tab is worse than no Plan tab — it promises an approach and a descent and delivers a blank — but the Safety tab is never empty: it carries the per-discipline advice, the forecast links and, since #769, the nearby-fire panel, none of which come from the route's own record. Plan stays content-gated for exactly that reason. This replaced `showSafety=!cragOnly||hasSafetyContent(route)`, which meant 99.5% of the catalog was offered no Safety tab and so had nowhere to put a live wildfire. */const techStatsEl=<div style={{marginBottom:12}}><TechStats route={enrichRoute(route)} onEdit={()=>{setFixOpenSection("grade");setFixOpen(true);}}/></div>;
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
     in the middle of a description of the climb. Rendered FIRST there, above the committing-objective
     banner: the banner is about the trip you have already decided on, this is the thing that decides it.
     It renders THERE AND NOWHERE ELSE, which is only safe because every route is offered a Safety tab.
     While that tab was content-gated this had to fall back to Overview, or the panel disappeared for the
     99.5% of the catalog that is name + grade + pitches. If the gate ever returns, restore the fallback.
     The coordinate comes from the route's area the same way peakCoord does elsewhere: MOUNTAINS for the
     seed catalog, _dbArea for the DB one (which openRoute backfills asynchronously). With neither,
     FireNearRoute renders NOTHING — "no fires near here" about a place we cannot locate would be worse
     than silence. */
  const fireEl=(function(){const _m=MOUNTAINS.find(function(mm){return mm.id===route.mountainId;})||route._dbArea||{};const _c=(_m.lat!=null&&_m.lng!=null)?{lat:_m.lat,lng:_m.lng,name:route.name}:null;/* the ROUTE's name, not the area's: an area name here is often a crag sector label ("(C) Main Wall, left side"), which the fire map would then print as "Distances from (C) Main Wall, left side" */return <FireNearRoute coord={_c} C={C} ActionIcon={ActionIcon} uDistMi={uDistMi} onOpenFireMap={onOpenFireMap&&_c?function(){onOpenFireMap(_c);}:null}/>;})();
  /* One element, two mounts, defined once so the two cannot drift into different copy:
     beside the BETA box on Overview, and as the page footer on the tabs that have no
     beta block to sit beside. Rendering the same node in two places is safe because
     only one of the two branches is ever live for a given `tab`. */
  const betaCta=<div style={{margin:"18px 0 4px",padding:"12px 14px",borderRadius:12,border:"1px dashed "+C.border,background:C.surface,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span style={{fontSize:12.5,color:C.textSub,lineHeight:1.4}}>{missingFacts(route).length?("Missing "+missingFacts(route).slice(0,2).join(", ")+" — got beta?"):"Got beta? Add anything that's missing or fix what's off."}</span><button onClick={()=>setFixOpen(true)} style={{flexShrink:0,padding:"8px 13px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{<Lbl s={"Contribute"}/>}</button></div>;
  /* The fallback used to guard the OBJECT and not the NAME: `MOUNTAINS.find(...)||route._dbArea
   ||{name:"this area"}`. A `_dbArea` built from a path-only `areas(path)` embed is TRUTHY with
   an undefined `name`, so it won the `||` chain and the header rendered the literal word
   "undefined" (uppercased by CSS to UNDEFINED). Seen live on a wishlisted route. The query is
   fixed too; this is the fail-closed half, so the next path-only embed degrades to "this area"
   rather than showing a climber a bug. */
const mtn=(function(){const _s=MOUNTAINS.find(m=>m.id===route.mountainId);if(_s&&_s.name)return _s;const _d=route._dbArea;if(_d&&_d.name)return _d;return Object.assign({},_d||{},{name:"this area"});})(),dc=CAT[catOf(route)]||{color:C.textSub,bg:C.surface,icon:"",label:catOf(route)};const partners=useMemo(()=>ALL_CLIMBERS.filter(c=>c.objectiveIds.includes(route.id)),[route.id]);const avgS=useMemo(function(){var rated=activity.filter(function(a){return a&&a.stars>0;});return rated.length?rated.reduce(function(s,a){return s+a.stars;},0)/rated.length:(route.stars||0);},[activity,route.stars]);const rkw=useMemo(()=>routeKw(route),[route.id,route.activity,route.hazards]);const rkFlagged=useMemo(()=>rkw.hazards.filter(h=>!h.official&&h.count>=2),[rkw.hazards]);const cragSibs=useMemo(()=>USE_DB&&dbSibs?dbSibs.map(dbRouteToCamel):ROUTES.filter(x=>x.mountainId===route.mountainId),[route.mountainId,dbSibs,USE_DB]);const routePhotos=useMemo(()=>(route.activity||[]).flatMap(a=>(a.photos||[]).map(u=>({url:u,by:a.user,avatar:a.avatar,date:a.date,ascent:a,cat:(a.condTags||[]).some(function(t){return isHazardTag(t);})?"Hazards":"Conditions"}))).concat((route.photos||[]).map(u=>({url:u,cat:"Conditions"}))),[route.id,route.activity,route.photos]);
  const [tab,setTab]=useState(initialSubTab||"overview");useEffect(function(){if(onSubTab)onSubTab(tab);},[tab]);useEffect(()=>{if(tab==="planner"&&!showPlan)setTab("overview");},[route&&route.id,showPlan,tab]);const [fixOpen,setFixOpen]=useState(false);const [fixOpenSection,setFixOpenSection]=useState(null);/* Values to seed the fix form with, so a shortcut elsewhere (the bolt-problem chips) can carry its choice into the real contribute flow instead of asserting it filed something. */const [fixPrefill,setFixPrefill]=useState(null);useEffect(function(){if(autoFix&&route&&autoFix===route.id){setFixOpen(true);onAutoFixDone&&onAutoFixDone();}},[autoFix,route&&route.id]);const [trackOpen,setTrackOpen]=useState(null);const [shareOpen,setShareOpen]=useState(false);const [showGpsModal,setShowGpsModal]=useState(false);const [shareSearch,setShareSearch]=useState("");const [partnersExpand,setPartnersExpand]=useState(false),[crewsExpand,setCrewsExpand]=useState(false),[sibsExpand,setSibsExpand]=useState(false);const [trackHistOpen,setTrackHistOpen]=useState(false);const [photoLightbox,setPhotoLightbox]=useState(null);const [photoLikes,setPhotoLikes]=useState({});const [quickPhotoOpen,setQuickPhotoOpen]=useState(false);const [quickPhotos,setQuickPhotos]=useState([]);const [quickPhotoPick,setQuickPhotoPick]=useState([]);const [photoBusy,setPhotoBusy]=useState(false);const [photoRemoving,setPhotoRemoving]=useState(false);const [photoReporting,setPhotoReporting]=useState(false);useEffect(()=>{try{if(topRef.current&&topRef.current.scrollIntoView)topRef.current.scrollIntoView({block:"start"});if(typeof window!=="undefined"&&window.scrollTo)window.scrollTo(0,0);}catch(e){}},[tab]);const shareLink=(typeof window!=="undefined"?window.location.origin+window.location.pathname:"")+"?debugRoute="+route.id;const [linkCopied,setLinkCopied]=useState(false);
  return <div ref={topRef}>{fixOpen?<SuggestFix route={route} pending={route._pendingEdits||{}} scrollTo={fixOpenSection} prefill={fixPrefill} peakCoord={mtn.lat!=null?{lat:mtn.lat,lng:mtn.lng,name:mtn.name}:null} onClose={()=>{setFixOpen(false);setFixOpenSection(null);}} onSubmit={onContribute} onLog={onLog?function(){setFixOpen(false);setFixOpenSection(null);onLog(route);}:undefined}/>:null}
    <div style={{minHeight:188,overflow:"hidden",position:"relative",display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"11px 11px 14px",boxSizing:"border-box"}}>
      <img src={route.cover} className="cover-x" alt={route.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/>{(()=>{var cur=myStars[route.id]||0;return <div style={{position:"absolute",bottom:8,right:10,zIndex:6,display:"flex",alignItems:"center",background:"rgba(13,17,23,0.66)",borderRadius:11,padding:"0 2px",border:"1px solid rgba(255,255,255,0.16)"}}>{[1,2,3,4,5].map(function(n){return <button key={n} onClick={function(e){e.stopPropagation();setMyStars(function(m){var nv=Object.assign({},m);nv[route.id]=(m[route.id]===n?0:n);return nv;});}} aria-label={n+" star"} aria-pressed={n<=cur} style={{background:"none",border:"none",padding:"8px 5px",cursor:"pointer",fontSize:17,lineHeight:1,color:n<=cur?C.amber:"rgba(255,255,255,0.42)"}}>{"★"}</button>;})}</div>;})()}
      <div style={{position:"absolute",inset:0,background:"linear-gradient(rgba(13,17,23,0.5) 0%,transparent 22%,rgba(13,17,23,0.34) 50%,rgba(13,17,23,0.97) 92%)"}}/>
      <div style={{position:"relative",zIndex:5,display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}><button onClick={onBack} style={{flexShrink:0,background:"rgba(13,17,23,0.8)",border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"12px 14px",fontSize:15,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>← Back</button><div style={{display:"flex",flexDirection:"row",alignItems:"center",justifyContent:"flex-end",flexWrap:"wrap",gap:6}}><button onClick={()=>setShareOpen(true)} style={{background:"rgba(13,17,23,0.85)",color:"white",border:"1px solid "+C.border,borderRadius:8,padding:"9px 11px",fontSize:12,cursor:"pointer",fontWeight:700}}>↗ Share</button><button onClick={onToggleSave} title={saved?"Saved to your objectives — tap to remove":"Save to your objectives"} style={{background:saved?C.amberBg:"rgba(13,17,23,0.85)",color:saved?C.amber:"white",border:"1px solid "+(saved?C.amber:C.border),borderRadius:8,padding:"9px 11px",fontSize:12,cursor:"pointer",fontWeight:700}}>{saved?"Saved":"Save"}</button><button onClick={onToggleOffline} title={offlineSaved?"Saved offline — tap to remove":"Save offline for no-signal days"} style={{background:offlineSaved?C.green:"rgba(13,17,23,0.85)",color:offlineSaved?"#04110a":"white",border:"1px solid "+(offlineSaved?C.green:C.border),borderRadius:8,padding:"9px 11px",fontSize:12,cursor:"pointer",fontWeight:700}}>{offlineSaved?"✓ Saved":"Download"}</button></div>
      </div>
      <div style={{position:"relative",zIndex:2,marginTop:14,padding:"0 3px"}}><div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>{route.classic?<Pill label="★ Classic" color={C.amber} bg={C.amberBg} sm/>:null}<Pill icon={<DiscIcon d={catOf(route)} size={12} color={dc.color}/>} label={dc.label} color={dc.color} bg={dc.bg} sm/>{gradeLabel(route)?<Pill label={gradeLabel(route)} color={C.amber} bg={C.amberBg} sm/>:null}</div><div style={{color:"rgba(255,255,255,0.9)",fontSize:11.5,fontWeight:700,letterSpacing:0.7,textTransform:"uppercase",textShadow:"0 1px 4px rgba(0,0,0,0.8)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{<Lbl s={"📍 "+mtn.name}/>}</div><div title={route.name} style={{color:"white",fontSize:(route.name||"").length>52?17.5:(route.name||"").length>34?20.5:25,fontWeight:800,letterSpacing:-0.4,lineHeight:1.14,marginTop:3,textShadow:"0 2px 9px rgba(0,0,0,0.68)",display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:2,overflow:"hidden"}}>{route.name}</div><div style={{color:"rgba(255,255,255,0.8)",fontSize:12.5,fontWeight:600,marginTop:5,paddingRight:160,minHeight:30,textShadow:"0 1px 4px rgba(0,0,0,0.7)",lineHeight:1.35,display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:2,overflow:"hidden"}}>{strapTrim(route.discipline==="bouldering"?((route.rockType?route.rockType+" · ":"")+seasonShort(route.season)):((mtn.elevation!=null?uElev(mtn.elevation)+" · ":"")+(route.pitches>0?(route.pitches+"p · "):"")+(["trad","sport"].includes(catOf(route))?"":(seasonShort(route.season)||"Season TBD"))))}</div></div>
    </div>
    {(()=>{const cells=(route.discipline==="bouldering"?[["Grade",gradeLabel(route),"amber",C.amber],["Approach",effDistKm(route),"textSub",C.textSub],["Height",route.routeFt,"green",C.green],["★",avgS,"amber",C.amber],["Reports",(route.activity||[]).length,"blue",C.blue]]:[["Grade",gradeLabel(route),"amber",C.amber],["trad","sport"].includes(catOf(route))?null:["Dist",effDistKm(route),"textSub",C.textSub],protOf(route)?null:["Gain",routeAscentFt(route),"green",C.green],["★",avgS,"amber",C.amber],["Reports",(route.activity||[]).length,"blue",C.blue]]).filter(Boolean);return <div style={{display:"grid",gridTemplateColumns:"repeat("+cells.length+",1fr)",background:C.surface,borderTop:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}>{cells.map((x,xi)=>{const hasValue=(x[0]==="Grade"?!!gradeLabel(route):x[0]==="Approach"?effDistKm(route)!=null:x[0]==="Height"?route.routeFt!=null:x[0]==="★"?avgS!=null:x[0]==="Dist"?effDistKm(route)!=null:x[0]==="Gain"?routeAscentFt(route)!=null:x[0]==="Reports"?true:true);const val=(x[0]==="Grade"?gradeLabel(route):x[0]==="Approach"?effDistKm(route)!=null?uDist(effDistKm(route)):null:x[0]==="Height"?route.routeFt!=null?uElev(route.routeFt):null:x[0]==="★"?avgS?avgS.toFixed(1):null:x[0]==="Dist"?effDistKm(route)!=null?uDist(effDistKm(route)):null:x[0]==="Gain"?routeAscentFt(route)!=null?"↑"+uElev(routeAscentFt(route)):null:x[0]==="Reports"?(route.activity||[]).length:null);return <div key={x[0]} style={{padding:"7px 3px",textAlign:"center",borderRight:xi===cells.length-1?"none":`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:hasValue?x[3]:C.amber}}>{val==null||val===""?"—":val}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{x[0]}</div></div>;})}</div>;})()}
    {!cragOnly?null:(()=>{var crag=cragSibs;var ci=crag.findIndex(function(x){return x.id===route.id;});var pv=crag[ci-1],nx=crag[ci+1];if(!pv&&!nx)return null;var cell=function(r,dir){return <button onClick={function(){if(r&&onOpenRoute)onOpenRoute(r);}} disabled={!r} style={{flex:"1 1 0",minWidth:0,display:"flex",alignItems:"center",justifyContent:dir<0?"flex-start":"flex-end",gap:4,padding:"8px 11px",background:"transparent",border:"none",cursor:r?"pointer":"default",opacity:r?1:0.3}}>{dir<0?<span style={{color:C.textMuted,fontSize:15,flexShrink:0}}>{"‹"}</span>:null}<div style={{minWidth:0,textAlign:dir<0?"left":"right"}}><div style={{fontSize:12.5,color:C.textSub,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r?r.name:"—"}</div>{r?<div style={{fontSize:10,color:C.textMuted,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{((CAT[catOf(r)]||{}).label||catOf(r))+(gradeLabel(r)?" · "+gradeLabel(r):"")}</div>:null}</div>{dir>0?<span style={{color:C.textMuted,fontSize:15,flexShrink:0}}>{"›"}</span>:null}</button>;};return <div style={{display:"flex",alignItems:"stretch",background:C.surface,borderBottom:"1px solid "+C.border}}>{cell(pv,-1)}<button onClick={function(){if(onOpenCrag)onOpenCrag();}} style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,padding:"0 12px",background:"none",border:"none",borderLeft:"1px solid "+C.border,borderRight:"1px solid "+C.border,cursor:"pointer"}}><span style={{fontSize:12,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.25}}>Routes</span><span style={{fontSize:12,fontWeight:800,color:C.blue,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.25}}>next door ›</span></button>{cell(nx,1)}</div>;})()}<div style={{display:"flex",gap:5,background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 8px",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>{[["overview","Overview"],["planner","Plan"],["conditions",cragOnly?"Send Reports":"Reports"],["safety","Safety"],["partners","Partners"],["photos","Photos"]].filter(x=>x[0]==="planner"?showPlan:true).map(x=><button key={x[0]} onClick={()=>setTab(x[0])} aria-current={tab===x[0]?"true":undefined} style={{flex:"1 0 auto",padding:"10px 8px",textAlign:"center",borderRadius:9,border:"1px solid "+(tab===x[0]?C.blue:C.border),background:tab===x[0]?C.blueBg:C.surface,color:tab===x[0]?C.blue:C.textSub,fontSize:11.5,fontWeight:tab===x[0]?"800":"600",cursor:"pointer",whiteSpace:"nowrap"}}>{x[1]}</button>)}</div>
    <div style={{padding:"13px 14px"}}>
      {shareOpen?createPortal(<div onClick={()=>setShareOpen(false)} role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:230,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",padding:"10px 18px 18px",maxHeight:"86vh",overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderBottom:"none",boxShadow:"0 -10px 44px rgba(0,0,0,0.55)"}}><div {...clickable(()=>setShareOpen(false))} title="Collapse" style={{width:42,height:5,borderRadius:3,background:C.border,margin:"0 auto 12px",cursor:"pointer"}}></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><div style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Share this route</div><button aria-label="Close share" onClick={()=>setShareOpen(false)} style={{background:"none",border:"none",color:C.textMuted,fontSize:22,cursor:"pointer",lineHeight:1,padding:10,margin:-8}}>×</button></div><div style={{fontSize:13,color:C.textSub,marginBottom:15}}>{route.name+" · "+route.grade+" · "+mtnOf(route)}</div><div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Send to a partner</div>{(function(){var q=shareSearch.trim().toLowerCase();var conn=(connections||[]);var others=CLIMBERS.filter(function(c){return c.id!==0&&!conn.some(function(f){return f.id===c.id;});});var pool=conn.concat(others);var matches=q?pool.filter(function(c){return (c.name||"").toLowerCase().indexOf(q)>=0;}):pool;return <div style={{marginBottom:16}}><input aria-label="Search climbers by name" value={shareSearch} onChange={function(e){setShareSearch(e.target.value);}} placeholder="Search climbers by name" style={{width:"100%",padding:"9px 11px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13.5,boxSizing:"border-box",outline:"none"}}/>{matches.length?<div style={{maxHeight:236,overflowY:"auto",overscrollBehavior:"contain",marginTop:8}}>{matches.slice(0,40).map(function(c){var fr=conn.some(function(f){return f.id===c.id;});return <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0"}}><Av src={c.avatar} size={34}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:11.5,color:C.textMuted}}>{(fr?"Partner":"Climber")+(vScore(c)?" · "+vScore(c):"")}</div></div><button onClick={function(){if(onShareRoute)onShareRoute(route,c);setShareOpen(false);setShareSearch("");}} style={{flexShrink:0,padding:"9px 15px",borderRadius:9,border:"none",background:C.blueSolid,color:"#fff",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Send</button></div>;})}</div>:<div style={{fontSize:12.5,color:C.textSub,marginTop:10,lineHeight:1.5}}>{q?("No climbers match “"+shareSearch+"”."):"Add partners to send routes straight into chat — or copy the link below."}</div>}</div>;})()}<div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Route link</div><div style={{display:"flex",gap:7,marginBottom:15}}><div style={{flex:1,minWidth:0,background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"9px 11px",fontSize:12.5,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{shareLink}</div><button onClick={()=>{var _p;try{_p=navigator.clipboard&&navigator.clipboard.writeText(shareLink);}catch(e){}if(_p&&_p.then)_p.then(function(){setLinkCopied(true);setTimeout(()=>setLinkCopied(false),1600);}).catch(function(){});}} style={{flexShrink:0,padding:"9px 14px",borderRadius:9,border:"none",background:C.blueSolid,color:"#fff",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{linkCopied?"✓ Copied":"Copy"}</button></div><div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Or copy & export</div><textarea aria-label="Route summary to copy" readOnly value={""+route.name+" ("+route.grade+")\n"+mtnOf(route)+"\n"+shareLink+"\n\nShared from ClimbMatch · open the link for the full route page: conditions, recorded tracks, gear beta and trip reports."} rows={6} style={{width:"100%",padding:"10px 11px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:12.5,boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.5,overscrollBehavior:"contain"/* six rows against a summary that overflows them by 48px: without this the drag chains to the route page behind the sheet */}}/><div style={{fontSize:12,color:C.textMuted,marginTop:5,lineHeight:1.4}}>Copy this to share anywhere · text, email, or socials.</div></div></div>,document.body):null}{showGpsModal&&route&&createPortal(<Suspense fallback={null}><GpsSubmissionModal routeId={route.id} routeName={route.name} onClose={()=>setShowGpsModal(false)} onSuccess={()=>{/* Deliberately does NOT close the modal. The modal sets showSuccess and calls onSuccess in the same tick, so unmounting here meant its success screen — quality score, review window, emailed-receipt line — could never paint. The user closes it with its own Done button, which calls onClose. */}} /></Suspense>,document.body)}{tab==="overview"?<div>{/* No fire panel here: its home is the Safety tab (see fireEl above), which
    every route now has. It did start on `conditions`, and that is worth not repeating — that tab is
    LABELLED "Reports" / "Send Reports", so a climber looking for hazards never opens it. Same trap
    as #655. */}
      <div style={{marginBottom:6}}>{saved?<div className="cm-pop" style={{display:"flex",alignItems:"center",gap:9,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:11,padding:"7px 13px"}}><span style={{fontSize:13.5,fontWeight:700,color:C.green,flex:1}}>On your objectives</span><button onClick={()=>setTab("partners")} style={{padding:"7px 14px",background:C.blueChip,color:C.blue,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Find partners →</button></div>:<button onClick={onToggleSave} style={{width:"100%",padding:"9px",marginBottom:6,background:C.amberBg,color:C.amber,border:"1px solid "+C.amber,borderRadius:11,fontSize:13,cursor:"pointer",fontWeight:700,boxSizing:"border-box"}}>Save route to your objectives</button>}</div><button onClick={()=>onLog(route)} style={{width:"100%",padding:"9px",marginBottom:6,background:logged?C.greenBg:C.blueBg,color:logged?C.green:C.blue,border:"1px solid "+(logged?C.greenDim:C.blueDim),borderRadius:11,fontSize:13,cursor:"pointer",fontWeight:700}}>{logged?"✓ Logged":"Log ascent?"}</button><button onClick={onToggleOffline} style={{width:"100%",padding:"9px",marginBottom:12,background:offlineSaved?C.greenBg:C.card,color:offlineSaved?C.green:C.textSub,border:"1px solid "+(offlineSaved?C.greenDim:C.border),borderRadius:11,fontSize:13,cursor:"pointer",fontWeight:700,boxSizing:"border-box"}}><div style={{lineHeight:1.3}}>Save to offline</div><div style={{fontSize:11,fontWeight:400,color:offlineSaved?C.green:C.textMuted,marginTop:2}}>Work without cell service</div></button>{route.condWindow?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 14px",marginBottom:12}}><div style={{fontSize:11.5,fontWeight:700,color:C.teal,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>Conditions window</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{Array.isArray(route.condWindow)?route.condWindow.join(", "):route.condWindow}</div></div>:null}{(()=>{var vw=(presence&&presence.count)||0;var viewers=(presence&&presence.viewers)||[];var ey=OPEN_CREWS.filter(function(oc){return oc.routeId===route.id&&oc.spots>0;}).length;var lists=popInterest(route);var asc=route.activity?route.activity.length:0;var chips=[];if(ey)chips.push({n:ey,label:" crew"+(ey!==1?"s":"")+" eyeing"});if(asc)chips.push({n:asc,label:" ascent"+(asc!==1?"s":"")+" logged"});if(lists>0)chips.push({n:lists,label:" list"+(lists!==1?"s":"")+" saved"});var _social=vw||viewers.length||chips.length;return <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:13}}>{_social?<div className="cm-stagger" {...clickable(()=>setTab("partners"))} style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",cursor:"pointer"}}>{vw?<span style={{display:"inline-flex",alignItems:"center",gap:6,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:20,padding:"4px 11px"}}><span style={{width:7,height:7,borderRadius:"50%",background:C.green,flexShrink:0,animation:"cm-pulse 2s infinite"}}/><span style={{fontSize:12,fontWeight:700,color:C.green}}><CountUp value={vw}/> viewing now</span></span>:null}{viewers.slice(0,4).map(function(vwr,i){return <span key={"v"+i} {...clickable(function(e){e.stopPropagation();onViewProfile&&onViewProfile(Object.assign({},CLIMBERS[0],{id:"presence_"+vwr.id,name:vwr.name||"Climber",username:(vwr.name||"climber").toLowerCase().replace(/\s+/g,""),avatar:vwr.avatar||FALLBACK_AV,trustScore:50,vouches:[],bio:"Viewing this route right now.",philosophy:"",verified:false,objectiveIds:[]}));})} title={(vwr.name||"A climber")+" is viewing this route now — tap to connect"} style={{cursor:"pointer",display:"inline-flex"}}><Av src={vwr.avatar} size={22}/></span>;})}{chips.map(function(c,i){return <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,color:C.textSub}}><b style={{color:C.text,fontWeight:800}}><CountUp value={c.n}/></b>{c.label}</span>;})}</div>:null}<RouteTagRow route={route}/></div>;})()}{cragOnly?techStatsEl:null}{/* MERGE NOTE: the card renders when there is a description OR "About this peak", because
    geology has no other home — PeakMetadataPanel stopped rendering it, so gating this card on
    the description alone would leave routes.peak_metadata.geology populated and displayed
    nowhere. The GapNote still fires on a missing DESCRIPTION specifically, which is a
    different claim from a missing peak blurb. */}
{(route.overview||route.desc||_peakGeo)?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:12}}>{(route.overview||route.desc)?splitParagraphs(route.overview||route.desc).map((p,i)=><p key={i} style={{fontSize:14,color:C.textSub,lineHeight:1.75,margin:i===0?"0 0 10px":"10px 0 0"}}>{p}</p>):null}{_peakGeo?<div style={{marginTop:(route.overview||route.desc)?12:0,paddingTop:(route.overview||route.desc)?12:0,borderTop:(route.overview||route.desc)?"1px solid "+C.borderLight:"none"}}><div style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}>About this peak</div>{splitParagraphs(_peakGeo).map((p,i)=><p key={i} style={{fontSize:13.5,color:C.textSub,lineHeight:1.7,margin:i===0?"0":"9px 0 0"}}>{p}</p>)}</div>:null}</div>:null}
{/* This CTA sent the climber to `beta`, and the gap it reports is on `overview||desc` — so
    writing the description could never clear the note, however many people answered it. The
    card above reads overview||desc and BETA is a separate section further down the page, so
    the two are different claims; the fix is to open the field the card actually reads. */}
      {(route.overview||route.desc)?null:<GapNote what="No route description yet" why="Nobody has written up what this line actually climbs or how it goes." cta="Write the description" onFix={()=>{setFixOpenSection("overview");setFixOpen(true);}}/>}{route.face?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 14px",marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:3,letterSpacing:0.3}}>FACE / WHERE ON THE PEAK</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{route.face}</div></div>:null}{cragOnly&&!showPlan?<div style={{marginBottom:12}}><SL action={<EditIconButton onClick={()=>{setFixOpenSection("approach");setFixOpen(true);}} title="Edit approach information"/>} prov={sectionProvenance(route,"approach")}>GETTING THERE</SL>{/* THE LABEL FOLLOWS THE VALUE, because this row shows `driveNote || name` and neither is a
                   trailhead. It said "Trailhead" over text like "Roughly 25-30 minutes (about 20 miles)
                   from Dayton, WA via S 4th Street" on 249 crag-family routes — a description of the
                   DRIVE, under the name of the place you drive to, and the same string the Plan tab
                   prints correctly under "Drive notes". The real trailhead is TrailheadCard's subject.
                   A single label cannot be right for both values, so it is chosen per value rather
                   than picked once and made to cover the other. */}
              {(route.road&&(route.road.driveNote||route.road.name))?<div style={{marginBottom:9}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:2}}>{route.road.driveNote?"The drive":"Road"}</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{route.road.driveNote||route.road.name}</div></div>:null}{route.approach?<div style={{marginBottom:9}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:2}}>Approach</div>{splitParagraphs(route.approach).map((p,i)=><p key={i} style={{fontSize:12.5,color:C.textSub,lineHeight:1.6,margin:i===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}</div>:<GapNote what="No approach description" why="How you get from the car to the base of this climb is not written down yet." cta="Describe the approach" onFix={()=>{setFixOpenSection("approach");setFixOpen(true);}}/>}<div ref={mapWrapRef}><GPXMap pts={route.gpxPts} waypoints={route.waypoints} derivedTrailhead={(()=>{const _t=trailheadPoint(route);return _t&&_t.derived?_t:null;})()} peakCoord={mtn.lat!=null?{lat:mtn.lat,lng:mtn.lng,name:mtn.name}:null} endpointLabels={["alpine","mountaineering"].includes(catOf(route))?{startLabel:"Trailhead",startColor:C.green,finishLabel:"Summit",finishColor:C.orange}:undefined} focusWp={wpFocus}/></div>{gapTrack(route)?<GapNote mt={10} what="No recorded GPS track" why="The map has no line to follow — only the waypoints below, if any. Recorded a GPX on this climb?" cta="Submit a track" onFix={()=>setShowGpsModal(true)}/>:null}{(()=>{const th=trailheadPoint(route);if(!th||th.lat==null)return null;return <button onClick={()=>window.open("https://www.google.com/maps/dir/?api=1&destination="+th.lat+","+th.lng,"_blank")} style={{marginTop:9,width:"100%",padding:"9px",background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Directions to crag (Google Maps)</button>;})()}</div>:null}{cragOnly&&!showPlan?<div style={{marginTop:12}}><SL action={<EditIconButton onClick={()=>{setFixOpenSection("waypoints");setFixOpen(true);}} title="Edit waypoints"/>} prov={sectionProvenance(route,"waypoints")}>WAYPOINTS</SL>{(function(){var _wpCav=waypointCaveat(route.id,route.waypoints);return _wpCav?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{_wpCav}</div>:null;})()}{<WaypointList waypoints={route.waypoints} onFocus={focusWaypoint} emptyCopy={"No named waypoints yet — add the parking/approach point (and anchor, if useful) to help other climbers find this crag."} onAdd={function(){setFixOpenSection("waypoints");setFixOpen(true);}}/>}</div>:null}{/* The Protection/Anchor card lived here; it is now <ProtectionCard/> on Plan, minus the
        Anchor column. See the note on that component for why the Anchor half was dead. */}{rkFlagged.length?<div {...clickable(()=>setTab("safety"))} style={{display:"flex",alignItems:"center",gap:9,background:C.amberBg,border:`1px solid ${C.amber}`,borderRadius:11,padding:"10px 13px",marginBottom:13,cursor:"pointer"}}><span style={{flexShrink:0}}><ActionIcon name="alert" size={17} color={C.amber}/></span><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:700,color:C.amber}}>Climbers are flagging hazards not in the official info</div><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:2}}>{rkFlagged.map(h=>h.label).slice(0,3).join(", ")+" — tap to open Safety."}</div></div><span style={{color:C.amber,fontSize:16,flexShrink:0}}>›</span></div>:null}
        {!cragOnly?techStatsEl:null}<VerifNote route={route}/><PeakMetadataPanel route={enrichRoute(route)} C={C} ActionIcon={ActionIcon}/>{/* DATA CONFIDENCE (ProvenancePanel) and DATA QUALITY (DataQualityPanel, mounted from
        ClimbMatch.jsx) both sat on Overview and both answered "how complete/trusted is this
        route's data" — two boxes for one question, ahead of the route itself. Gaps are now
        reported only by the section that owns the missing field (GapNote), so the reader is
        told where to look instead of being told, twice, that there is somewhere to look. */}{route._startLocConsensus?<div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>START OF CLIMB</div>{route._startLocConsensus.photo?<img loading="lazy" decoding="async" src={route._startLocConsensus.photo} alt="Start of climb" style={{width:"100%",maxHeight:180,objectFit:"cover",borderRadius:9,marginBottom:8}}/>:null}<div style={{fontSize:12.5,color:C.textSub,marginBottom:4}}>{route._startLocConsensus.lat.toFixed(4)+", "+route._startLocConsensus.lng.toFixed(4)}</div>{route._startLocConsensus.note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.45,marginBottom:6}}>{route._startLocConsensus.note}</div>:null}<div style={{fontSize:11.5,color:C.textMuted}}>{route._startLocConsensus.n+" climber"+(route._startLocConsensus.n!==1?"s":"")+" confirmed this location"+(route._startLocConsensus.alternates.length?" · "+route._startLocConsensus.alternates.length+" alternate"+(route._startLocConsensus.alternates.length!==1?"s":"")+" suggested":"")}</div></div>:null}{cragOnly?<div style={{marginTop:13}}><RouteGearCheck route={route} rack={routeRackFor(route)||DISC_RACK[catOf(route)]||[]} rackGeneric={!routeRackFor(route)} essentials={route.whatToBring} onEditEssentials={function(){setFixOpenSection("whatToBring");setFixOpen(true);}} onEditRopeNote={function(){setFixOpenSection("ropeNote");setFixOpen(true);}} onEditRack={cur=>{setFixOpenSection("rack");setFixPrefill(cur?{rack:{note:cur}}:null);setFixOpen(true);}} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){var el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}}/></div>:null}
        {/* The per-discipline safety advice used to render inline here, because #655 found it stranded behind a Safety tab that crag routes were never offered. Every route is offered that tab now, and SafetyMatrix renders the same block at its top — so keeping a copy here would print it twice. The advice did not move out of reach; the tab moved into reach. */}
        {(()=>{const tp=typicalFor(route);if(!tp)return null;const rtags=new Set((route.activity||[]).filter(a=>isRecent(a.date)).flatMap(a=>a.condTags||[]));const conf=(tp.patterns||[]).filter(pat=>{const st=patternStatus(pat.label,rtags);return st&&st.status==="confirmed";}).length;const diff=(tp.patterns||[]).filter(pat=>{const st=patternStatus(pat.label,rtags);return st&&st.status!=="confirmed";}).length;return <div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"13px 15px",marginBottom:13}}><div style={{fontSize:14,fontWeight:700,marginBottom:2}}>What to expect</div><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:8,textTransform:"uppercase",letterSpacing:0.5,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Typical conditions · the general picture</div>{(conf||diff)?<div style={{display:"flex",alignItems:"center",gap:7,background:diff?C.amberBg:C.greenBg,border:`1px solid ${(diff?C.amber:C.green)}44`,borderRadius:9,padding:"7px 10px",marginBottom:10}}><span style={{fontSize:12,fontWeight:600,color:diff?C.amber:C.green}}>{(conf&&diff)?("Recent reports: "+conf+" confirmed · "+diff+" differ"):diff?("Recent reports differ from typical on "+diff+" point"+(diff!==1?"s":"")):("Recent reports back up the typical picture · "+conf+" confirmed")}</span></div>:null}{tp.summary?<div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:(tp.patterns&&tp.patterns.length)?9:0}}>{tp.summary}</div>:null}{(tp.patterns||[]).map((pat,i)=><div key={i} style={{display:"flex",gap:9,padding:"8px 0",borderTop:`1px solid ${C.borderLight}`}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{pat.label}{" "}{pat.when?<span style={{marginLeft:7,fontSize:12,fontWeight:700,color:C.blue,background:C.blueBg,padding:"1px 7px",borderRadius:6,whiteSpace:"nowrap"}}>{pat.when}</span>:null}</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.55}}>{pat.detail}</div>{(()=>{const st=patternStatus(pat.label,rtags);if(!st)return null;const good=st.status==="confirmed";const col=good?C.green:C.amber;const tg=(good?st.matched:(st.countered.length?st.countered:st.matched))||[];return <div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:5,padding:"2px 8px",borderRadius:8,background:good?C.greenBg:C.amberBg,border:`1px solid ${col}44`}}><span style={{fontSize:12,fontWeight:700,color:col}}>{good?"✓ Confirmed by recent reports":st.status==="mixed"?"± Mixed recent reports":"↔ Recent reports differ"}</span>{tg.length?<span style={{fontSize:12,color:C.textMuted}}>{"· "+tg.slice(0,2).join(", ")}</span>:null}</div>;})()}</div></div>)}<div {...clickable(()=>setTab("conditions"))} style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.border,fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>{/* `rtags` is the tag set from RECENT trip reports, and patternStatus returns null without it --
    so with no reports every pattern above is the generic discipline picture, and calling that
    "a consensus from recent trip reports" claimed a consensus that does not exist. On the route
    this was found on the page header read "0 Reports" a few hundred pixels above this line. */}
<Lbl s={reportsUnavailable?"Couldn’t load this route's trip reports, so what follows is the general picture for the discipline rather than this route's own conditions — try again in a moment":rtags.size?"This is a consensus from recent trip reports, not one person's edit — climbed it recently? Log a report to help keep it accurate":((route.activity||[]).length?("No trip reports in the last "+RECENT_DAYS+" days, so this is the general picture for the discipline rather than current conditions — climbed it recently? Log a report to help keep it accurate"):"Nobody has logged a trip report here yet, so this is the general picture for the discipline rather than this route's own conditions — climb it and log one to start a real consensus")}/></div></div>;})()}{cragOnly?null:(()=>{const cc=ovCC;const recent=[...(activity||[])].sort((x,y)=>(y.date||"").localeCompare(x.date||"")).slice(0,3);const confCol=cc?(cc.confidence==="high"?C.green:cc.confidence==="medium"?C.amber:C.red):C.textMuted;const mtn=MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{};const hz=cc&&cc.hazards&&cc.hazards.length?[...new Set(cc.hazards.flatMap(h=>h.tags))]:[];return <div style={{background:C.card,borderRadius:14,border:`1px solid ${hz.length?C.red+"55":C.border}`,padding:"13px 15px",marginBottom:13}}>{cc&&cc.clearedTags&&cc.clearedTags.length?<div style={{fontSize:11.5,color:C.green,fontWeight:700,marginBottom:10,lineHeight:1.4,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"7px 10px"}}>{"✓ Reported cleared: "+cc.clearedTags.join(", ")}</div>:null}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:14,fontWeight:700}}>Conditions & recent activity</div><div style={{display:"flex",gap:5,alignItems:"center"}}>{cc&&cc.lastDate?(()=>{const dd=Math.floor((Date.now()-new Date(cc.lastDate).getTime())/86400000);const fr=dd<=14?["• Fresh",C.green]:dd<=60?["• Recent",C.amber]:["Stale",C.red];return <Pill label={fr[0]} color={fr[1]} bg={fr[1]+"22"} sm/>;})():null}{cc?<Pill label={`${cc.confidence} · ${cc.reportCount}`} color={confCol} bg={`${confCol}22`} sm/>:null}</div></div>{hz.length?<div style={{background:C.redBg,border:`1px solid ${C.red}55`,borderRadius:9,padding:"8px 11px",marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:2}}>Recent hazards reported</div><div style={{fontSize:12,color:C.textSub}}>{hz.slice(0,4).join(" · ")}</div></div>:null}{cc?<div style={{fontSize:12,color:C.textSub,marginBottom:recent.length?12:0}}><span style={{color:C.textMuted}}>{cc.recentCount?("In the last "+RECENT_DAYS+" days: "):"Latest reported: "}</span>{((cc.recentCount?cc.recentTags:cc.topTags)||[]).slice(0,3).map(t=>t.tag).join(" · ")||"—"}{cc.lastDate?<span style={{color:C.textMuted}}>{" · last report "+ago(cc.lastDate)}</span>:null}</div>:<div style={{fontSize:12,color:C.textMuted}}>{reportsUnavailable?"Couldn’t load this route's reports — try again in a moment.":"No reports yet — be the first to log this climb and tell others if it's in."}</div>}{recent.length?<div><div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Recently climbed</div>{recent.map((aa,i)=>{const summ=/summit/i.test(aa.tickType||"");const att=/attempt|bail|retreat|turn/i.test(aa.tickType||"");const _out=summ?"✓ Summited":att?"Attempt":aa.tickType;return <div key={i} aria-label={aa.user+", "+String(_out||"report").replace("✓ ","")+", "+ago(aa.date)} {...clickable(()=>onOpenReport&&onOpenReport({route,mtn,user:aa.user,avatar:aa.avatar,date:aa.date,tickType:aa.tickType,stars:aa.stars,condTags:aa.condTags,text:aa.text,partners:aa.partners,cond:aa.cond,photos:aa.photos,gpxName:aa.gpxName}))} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderTop:i?`1px solid ${C.borderLight}`:"none",cursor:"pointer"}}><Av src={aa.avatar} size={28}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{aa.user}<span style={{marginLeft:7,fontSize:12,fontWeight:700,color:summ?C.green:att?C.amber:C.blue}}>{_out}</span></div><div style={{fontSize:12,color:C.textMuted}}>{ago(aa.date)+" · "+aa.date}</div></div><span style={{color:C.blue,fontSize:14,flexShrink:0}}>›</span></div>;})}</div>:null}<div {...clickable(()=>setTab("conditions"))} style={{marginTop:12,textAlign:"center",fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}>View all reports & conditions →</div></div>;})()}{(()=>{const ph=(route.activity||[]).flatMap(a=>(a.photos||[]).map(u=>({u,a})));if(!ph.length)return null;const nC=new Set(ph.map(x=>x.a.user)).size;return <div style={{marginBottom:13}}><div style={SZ4}><div style={{fontSize:14,fontWeight:700}}>Photos from climbers</div><span style={{fontSize:12,color:C.textMuted}}>{ph.length} photo{ph.length!==1?"s":""} · {nC} climber{nC!==1?"s":""}</span></div><PhotoRow items={ph.slice(0,12)}/></div>;})()}<ElevChart pts={route.elevPts} color={dc.color}/><div style={{marginTop:12}}/>
        <div style={{marginBottom:12}}><DiffRadar d={route.difficulty} disc={catOf(route)} ratings={(diffRatings||{})[route.id]} onRate={setDiffRatings?(axis,val)=>setDiffRatings(p=>{const o=Object.assign({},p);const ro=Object.assign({},o[route.id]);const ao=Object.assign({},ro[axis]);ao[ME.id]=val;ro[axis]=ao;o[route.id]=ro;return o;}):undefined}/></div>
        
        <TopoSection route={route}/>{/* PITCH-BY-PITCH and all of the rappel information moved to the Plan tab, which is where
    the approach, the descent and the rack already live. They were kept together on Overview
    because splitting a route's descent across two tabs is worse than either placement
    (151 routes split it, and 585 with a summary and no table showed nothing here at all —
    scripts/oneoff/count-rappel-shapes.mjs). That constraint is unchanged; both halves simply
    moved to the same tab as the rest of the plan rather than away from it. */}
        {(catOf(route)!=="bouldering"&&route.gearTiers)?<div style={{marginBottom:8}}><GearTiers gear={route.gearTiers}/><div {...clickable(()=>{setFixOpenSection("rack");setFixOpen(true);})} style={{marginTop:10,padding:"9px 12px",borderRadius:10,border:"1px dashed "+C.border,background:C.surface,fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><Lbl s={"✏️ Gear beta off? Suggest a gear update"}/></div></div>:(gapGear(route)?<GapNote what="No gear or rack listed" why="Nothing says what to bring — rack sizes, draws, screws or anchor material are all unrecorded." cta="Add the rack" onFix={()=>{setFixOpenSection("rack");setFixOpen(true);}}/>:null)}
        {(()=>{const _allBeta=(Array.isArray(route.beta)?route.beta:[]).filter(b=>typeof b==="string"&&b.trim());const longBeta=_allBeta.filter(b=>b.length>=220);if(!longBeta.length)return null;return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><span>BETA</span><ProvChip prov={sectionProvenance(route,"beta")}/></span><button onClick={function(e){e.stopPropagation();setFixOpenSection("beta");setFixOpen(true);}} style={{padding:"8px 12px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.card,color:C.blue,fontSize:11,fontWeight:700,cursor:"pointer"}}>✎ Suggest a fix</button></div>{longBeta.map(function(b,i){return <div key={"lb"+i}>{splitParagraphs(b).map(function(p,k){return <p key={k} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:k===0?"0":"8px 0 0"}}>{p}</p>;})}</div>;})}</div>;})()}{(()=>{const shortBeta=(Array.isArray(route.beta)?route.beta:[]).filter(b=>typeof b==="string"&&b.length<220);const tips=shortBeta.concat(route.proTips||[]);if(!tips.length)return null;return <div style={{background:C.blueBg,borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.blueDim}`}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>PRO TIPS</span><button onClick={function(e){e.stopPropagation();setFixOpenSection("beta");setFixOpen(true);}} style={{padding:"8px 12px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.card,color:C.blue,fontSize:11,fontWeight:700,cursor:"pointer"}}>✎ Suggest a fix</button></div>{tips.map((b,i)=><div key={"pt"+i} style={{fontSize:13,color:C.textSub,padding:"3px 0",lineHeight:1.5}}>• {b}</div>)}</div>;})()}{(()=>{const cb=(route.activity||[]).filter(a=>a.beta||a.gearBeta);if(!cb.length)return null;return <div style={{background:C.surface,borderRadius:10,padding:"11px 12px",marginBottom:8,border:"1px solid "+C.border}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>CLIMBER BETA <span style={{color:C.textMuted,fontWeight:400}}>· from logged ascents</span></div>{cb.map((a,i)=><div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderTop:i?"1px solid "+C.borderLight:"none"}}><Av src={a.avatar} size={26}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:11.5,color:C.textSub,marginBottom:2}}><b style={{color:C.text}}>{a.user}</b>{a.date?" · "+a.date:""}</div>{a.beta?<div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{a.beta}</div>:null}{a.gearBeta?<div style={{fontSize:12.5,color:C.amber,lineHeight:1.5,marginTop:3}}>{a.gearBeta}</div>:null}</div></div>)}</div>;})()}
        {/* "Got beta?" lands HERE, at the end of the beta cluster (BETA / PRO TIPS /
            CLIMBER BETA), rather than at the very bottom of the page. It was previously
            the page footer, which put the ask to contribute beta an entire screen below
            the beta it is asking about. */}
        {betaCta}
{/* The `permits` / `permitUrl` pair used to render HERE, loose on Overview between the beta
    blocks and PAIRS WELL WITH, under no heading of any kind — a green banner with no label
    saying what it was, and on a route with permit text but no link, a bare 12px grey line
    with nothing to say it was about a permit at all. Meanwhile everything else about getting
    in past the gate — the permit name, the land manager, the pass, the closures, how to
    apply — sat in ACCESS & REGULATIONS on the PLAN tab, a tab away. Two permit surfaces on
    two different screens, one of them anonymous. It now renders inside that panel, beside
    the rest of what it is about. Do not put it back on Overview. */}
      {(()=>{const pw=rxOf(route.id).pairsWith||[];const cards=pw.map(pp=>{const r2=ROUTES.find(x=>x.id===pp.id);return r2?{r2,note:pp.note}:null;}).filter(Boolean);if(!cards.length)return null;return <div style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:7}}>PAIRS WELL WITH</div>{cards.map(o=><div key={o.r2.id} {...clickable(()=>onOpenRoute&&onOpenRoute(o.r2))} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:7,border:`1px solid ${C.border}`,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:700}}>{o.r2.name}</span><span style={{fontSize:12,color:C.blue,fontWeight:600,flexShrink:0,marginLeft:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.r2.grade} →</span></div><div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginTop:3}}>{o.note}</div></div>)}</div>;})()}<button onClick={()=>onLog(route)} style={{width:"100%",padding:11,marginBottom:13,background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:11,fontSize:14,cursor:"pointer",fontWeight:700}}>✓ Log an ascent</button>{(()=>{const sibs=cragSibs.filter(x=>x.id!==route.id);return <div id={"sibs-"+route.id} style={{marginTop:16,paddingTop:16,borderTop:"1px solid "+C.border}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}><div style={{fontSize:15,fontWeight:700}}>{"More on "+mtn.name}</div>{sibs.length?<span style={{fontSize:11.5,color:C.textMuted}}>{(sibs.length+1)+" routes"}</span>:null}</div><div style={{fontSize:12,color:C.textSub,marginBottom:11,lineHeight:1.5}}>{sibs.length?"Other established lines on this peak — tap any to compare conditions and beta.":sibsUnavailable?"Couldn’t load the other routes on this peak — this is not a claim that there are none. Check your connection and try again.":sibsPending?"Checking for other routes on this peak…":"The only route catalogued on "+mtn.name+" so far. As climbers log ascents, every line on the peak — other routes, ridges and variations — will collect here under the mountain."}</div>{(sibsExpand?sibs:sibs.slice(0,5)).map(sr=><div key={sr.id} {...clickable(()=>onOpenRoute&&onOpenRoute(sr))} style={{display:"flex",alignItems:"center",gap:11,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"9px 11px",marginBottom:8,cursor:"pointer"}}><div style={{width:40,height:40,borderRadius:8,overflow:"hidden",flexShrink:0}}><img loading="lazy" decoding="async" src={sr.cover} className="cover-x" alt="" onError={onImgErr(FALLBACK_COVER)} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700}}>{sr.name}</div><div style={{fontSize:11.5,color:C.textSub}}>{((CAT[catOf(sr)]||{}).label||catOf(sr))+(gradeLabel(sr)?" · "+gradeLabel(sr):"")}</div>{condRep(sr)?<div style={{fontSize:11,color:C.green,fontWeight:700,marginTop:1}}>{"✓ "+condRep(sr)+" report"+(condRep(sr)!==1?"s":"")}</div>:null}</div><span style={{color:C.textMuted,fontSize:15,flexShrink:0}}>→</span></div>)}{sibs.length>5?<button onClick={()=>setSibsExpand(x=>!x)} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{sibsExpand?"Show fewer":"Show all "+(sibs.length+1)+" routes"}</button>:null}</div>;})()}</div>:null}
      {tab==="conditions"?<div>{!logged?<button onClick={()=>onLog(route)} style={{width:"100%",padding:"9px",marginBottom:13,background:C.greenBg,color:C.green,border:"1px solid "+C.greenDim,boxSizing:"border-box",borderRadius:11,fontSize:13.5,cursor:"pointer",fontWeight:700}}>✓ Log your ascent</button>:null}
      {(function(){const cl=route.climate;if(!cl||typeof cl!=="object")return null;const _bs=(cl.bySeason&&typeof cl.bySeason==="object")?cl.bySeason:{};const sv=k=>cl[k]||_bs[k]||null;const SEAS=[["spring","Spring"],["summer","Summer"],["fall","Fall"],["winter","Winter"]].filter(s=>sv(s[0]));if(!cl.typical&&!SEAS.length&&!cl.forecastZone)return null;return <div style={{background:C.card,borderRadius:12,padding:"13px 15px",marginBottom:12,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.teal}}>CLIMATE & SEASON</div><ProvChip prov={sectionProvenance(route,"climate")}/></div>{cl.typical?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.55,marginBottom:SEAS.length?10:0}}>{cl.typical}</div>:null}{SEAS.map(function(s,i){return <div key={s[0]} style={{display:"flex",gap:9,alignItems:"flex-start",padding:"5px 0",borderTop:i===0?"none":`1px solid ${C.borderLight}`}}><span style={{fontSize:11,fontWeight:700,color:C.textMuted,width:52,flexShrink:0,paddingTop:1}}>{s[1]}</span><span style={{fontSize:12.5,color:C.textSub,lineHeight:1.5,flex:1,minWidth:0}}>{sv(s[0])}</span></div>;})}{cl.forecastZone?<div style={{fontSize:11.5,color:C.textMuted,marginTop:9,paddingTop:8,borderTop:`1px solid ${C.borderLight}`,lineHeight:1.45}}>{"Forecast zone — "+cl.forecastZone}</div>:null}</div>;})()}{gapSeason(route)?<GapNote what="No season guidance" why="Nothing records when this is in — which months hold snow, when the moat opens, or when it dries out." cta="Add the season" onFix={()=>{setFixOpenSection("season");setFixOpen(true);}}/>:null}
        <BetaDiff route={route}/><ConsensusPanel route={route} activity={activity} hzVotes={hzVotes} onVote={onVoteHazard} reportsUnavailable={reportsUnavailable}/>
        <div id="trip-reports-section" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:6}}><span style={{fontSize:14,fontWeight:700}}>{cragOnly?"Send Reports":"Trip Reports"}</span><button onClick={()=>onLog&&onLog(route)} style={{flexShrink:0,fontSize:11.5,fontWeight:800,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:8,padding:"5px 11px",cursor:"pointer"}}>{cragOnly?"Log / send":<Lbl s={"Log / report"}/>}</button></div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:11,lineHeight:1.5}}>{"These come straight from climbers logging their ascents — log yours and your conditions, beta & rating appear here automatically."}</div>
        {(activity&&activity.length)?null:<div style={{textAlign:"center",padding:"24px 16px",color:C.textMuted,fontSize:13}}>Add a trip report from your logbook — be the first to log this climb.</div>}
        {(activity||[]).map((a,i)=><div key={i} /* Hand TripReport the WHOLE row. This used to copy thirteen keys by hand, and TripReport
   renders nine more that were not on the list — beta, gearBeta, sunVote, sunNote, fa,
   developed, itinerary, outcomeReasons, outcomeNote. So the send beta and the rack beta a
   climber wrote were shown on the card's parent object, the modal was built to display them,
   and "View full trip report →" opened a report with all of it missing. A hand-copied
   allowlist between two components silently loses every field added to either side after it
   was written; spreading cannot. `route`/`mtn` come last so they cannot be shadowed by a
   same-named key on an activity row. */
{...clickable(()=>onOpenReport&&onOpenReport(Object.assign({},a,{route:route,mtn:MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{}})))} style={{background:C.card,borderRadius:10,padding:"11px 13px",marginBottom:9,border:`1px solid ${C.border}`,cursor:"pointer"}}><div style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:7}}><Av src={a.avatar} size={32}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:13,fontWeight:700}}>{a.user}</div><div style={{fontSize:11.5,color:C.textMuted}}>{(function(){var cl=seedAuthor(a.user);return cl&&cl.level?cl.level+(cl.years?" · "+cl.years+"y exp":""):null;})()}</div><div style={{fontSize:12,color:C.textMuted}}>{a.date}</div></div><div style={{textAlign:"right"}}><Stars n={a.stars}/><br/><Pill label={a.tickType} color={C.blue} bg={C.blueBg} sm/></div></div></div>{(a.outcomeReasons&&a.outcomeReasons.length)?<div style={{fontSize:11.5,color:C.amber,marginTop:2}}>{"Turned back: "+a.outcomeReasons.join(", ")+(a.outcomeNote?" — "+a.outcomeNote:"")}</div>:null}</div><ReportStats cond={a.cond}/><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{(a.condTags||[]).map(t=><span key={t} style={{fontSize:12,color:C.teal,background:C.tealDim,padding:"2px 6px",borderRadius:5}}>{t}</span>)}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{renderMD(a.text)}</div><div style={{fontSize:12,color:C.blue,fontWeight:600,marginTop:8}}>View full trip report →</div></div>)}
      </div>:null}
      {tab==="photos"?(function(){/* Three sources, and the order is oldest-provenance first: photos carried by a trip report, then photos contributed to the route on their own (kind:'photo' rows, which arrive already saved), then anything added locally this session when signed out. */var shown=routePhotos.concat(dbPhotos||[]).concat(quickPhotos);return <div style={{padding:"4px 0"}}><div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"8px 11px",marginBottom:9}}>{"Add photos of the route. Tap any photo to see it full size, like it, and talk about it — photos from climbers’ trip reports show up here too, and tapping one opens the report behind it. To draw a topo line or drop pitch and hazard markers, use the topo section on the Overview tab."}</div><button onClick={function(){setQuickPhotoOpen(true);}} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px dashed "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",marginBottom:9}}>{"+ Add photo"}</button>{shown.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{shown.map(function(ph,pi){var pKey=route.id+"__photo__"+(ph.url||pi);var pTc=(onAddTopo&&topoConsensus)?topoConsensus(pKey):null;return <div key={pi} {...clickable(function(){setPhotoLightbox({ph:ph,key:pKey});})} style={{position:"relative",paddingBottom:"100%",borderRadius:9,overflow:"hidden",background:C.card,cursor:"pointer"}}><img loading="lazy" decoding="async" src={ph.url} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/>{pTc?<span title={pTc.canonical?"Has a topo line — draw and edit lines in the Overview tab's topo section":"No topo line yet — lines are drawn in the Overview tab's topo section"} style={{position:"absolute",right:4,top:4,width:22,height:22,borderRadius:"50%",background:pTc.canonical?C.blueSolid:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="target" size={13} color="#fff"/></span>:null}{ph.by?<div style={{position:"absolute",left:0,right:0,bottom:0,padding:"12px 6px 4px",background:"linear-gradient(transparent,rgba(0,0,0,0.72))",fontSize:12,color:"#fff",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{ph.by.split(" ")[0]}</div>:null}</div>;})}</div>:<div style={{textAlign:"center",padding:"24px 16px",color:C.textMuted,fontSize:13}}>{/* TWO queries feed `shown` and either failing makes it incomplete, so both gate this one sentence -- `routePhotos` comes from route.activity, which on a DB route is composed from useRouteTripReports, and `dbPhotos` from the contributions read. Combining them is right HERE for that reason and nowhere else; every other flag in this app keys on ONE query. Found by the guard rather than by reading: check:outage measured this screen as CHANGED / says-empty=YES / says-broken=no on the first run that walked it. */}{(photosUnavailable||reportsUnavailable)?"Couldn’t load this route’s photos — try again in a moment.":"No photos yet — be the first to add one."}</div>}</div>;})():null}
      {tab==="partners"?<div>
        {(()=>{const rc=OPEN_CREWS.filter(oc=>oc.routeId===route.id&&oc.spots>0);return rc.length?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"12px 13px",marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:3}}>Crews on this climb</div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:10,lineHeight:1.5}}>Open crews forming for this route — request to join one.</div>{(crewsExpand?rc:rc.slice(0,3)).map(oc=>{const org=CLIMBERS.find(c=>c.id===oc.organizer)||{name:"Climber",avatar:FALLBACK_AV,trustScore:50};const req=(requested||[]).includes(oc.id);const sp=oc.spots;return <div key={oc.id} style={{display:"flex",alignItems:"center",gap:10,background:C.surface,border:"1px solid "+C.borderHi,borderRadius:10,padding:"9px 11px",marginBottom:11}}><Av src={org.avatar} size={32}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{org.name.split(" ")[0]+"’s crew"}</div><div style={{fontSize:12,color:C.textMuted}}>{sp+" spot"+(sp!==1?"s":"")+" open"+(oc.date?" · "+new Date(oc.date+"T12:00").toLocaleDateString(undefined,{month:"short",day:"numeric"}):"")}</div></div><button disabled={req} onClick={()=>onRequestJoin&&onRequestJoin(oc.id,route.name)} style={{flexShrink:0,padding:"7px 12px",borderRadius:9,border:"1px solid "+(req?C.border:C.blueDim),background:req?C.surface:C.blueBg,color:req?C.textMuted:C.blue,fontSize:12,fontWeight:700,cursor:req?"default":"pointer"}}>{req?"Requested":"Request join"}</button></div>;})}{rc.length>3?<button onClick={()=>setCrewsExpand(v=>!v)} style={{width:"100%",padding:"8px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>{crewsExpand?"Show fewer":"Show all "+rc.length+" crews"}</button>:null}</div>:null;})()}<div style={{background:C.blueBg,borderRadius:11,padding:"11px 13px",marginBottom:12,border:`1px solid ${C.blueDim}`}}><div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:3}}>Find a partner for this route</div><div style={{fontSize:12,color:C.textSub}}>These climbers marked this route as an objective. Connect to plan a trip together.</div></div>
        {partners.length===0?<div style={{textAlign:"center",padding:30,color:C.textMuted,fontSize:12}}>No partners listed yet for this route.</div>:(partnersExpand?partners:partners.slice(0,4)).map(c=>{const sc=compat(ME,c);return <div key={c.id} style={{background:C.card,borderRadius:14,padding:"12px 14px",marginBottom:9,border:`1px solid ${C.green}66`}}><div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}><Av src={c.avatar} size={46}/><div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{pubName(c)}</div><div style={{fontSize:12,color:C.textSub}}>{c.level} · {vScore(c)}{c.hikingSpeedFtHr?" · "+uRate(c.hikingSpeedFtHr):""}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:17,fontWeight:700,color:sc>=70?C.green:C.blue}}>{sc}%</div><div style={{fontSize:12,color:C.textMuted}}>match</div></div></div><p style={{fontSize:13,color:C.textSub,lineHeight:1.5,margin:"0 0 9px",fontStyle:"italic"}}>"{c.bio}"</p><div style={{display:"flex",gap:7}}><button onClick={()=>onConnect(c)} style={{flex:1,padding:7,background:(friendState(c.id)==="friends"||friendState(c.id)==="in")?C.greenChip:friendState(c.id)==="out"?C.surface:C.blueChip,color:(friendState(c.id)==="friends"||friendState(c.id)==="in")?C.green:friendState(c.id)==="out"?C.textMuted:C.blue,border:`1px solid ${friendState(c.id)==="out"?C.border:"transparent"}`,borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:700}}>{friendState(c.id)==="friends"?"✓ Friends":friendState(c.id)==="out"?"Requested":friendState(c.id)==="in"?"Accept":"+ Add friend"}</button><button onClick={()=>onViewProfile(c)} style={{flex:1,padding:7,background:C.surface,color:C.textSub,border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,cursor:"pointer"}}>Full Profile</button><button onClick={()=>onPlan(c)} style={{flex:1,padding:7,background:C.surface,color:C.amber,border:`1px solid ${C.amber}44`,borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:600}}>Form crew</button></div></div>;})}{partners.length>4?<button onClick={()=>setPartnersExpand(v=>!v)} style={{width:"100%",marginTop:2,padding:"10px",borderRadius:10,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer"}}>{partnersExpand?"Show fewer":"See "+(partners.length-4)+" more partner"+(partners.length-4!==1?"s":"")+" ▾"}</button>:null}{onFindPartners?<button onClick={onFindPartners} style={{width:"100%",marginTop:8,padding:"10px",borderRadius:10,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"Explore all partners in the finder ›"}</button>:null}
      </div>:null}
      {tab==="planner"?<div>{(route.road||route.driveMinSLC)?(function(){var road=route.road||{};function row(label,val){return val?<div style={{marginBottom:9}}><div style={{fontSize:11,fontWeight:700,color:C.textMuted,marginBottom:2}}>{label}</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{val}</div></div>:null;}var driveTxt=route.driveMinSLC?(route.driveMinSLC>=60?(Math.floor(route.driveMinSLC/60)+"h "+(route.driveMinSLC%60?route.driveMinSLC%60+"m ":"")+"from Salt Lake City"):(route.driveMinSLC+" min from Salt Lake City")):null;return <div style={{marginTop:12,background:C.card,borderRadius:12,padding:"12px 14px",border:"1px solid "+C.border}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>GETTING THERE</div>{/* Points at `road`, not `approach`: every row in THIS panel comes from the road block (name / driveNote / status / seasonalGate), so the edit button used to open a form section that could not change a single line of what it sits beside. The overview panel above still opens `approach`, because that one mixes road and approach content. */}<EditIconButton onClick={()=>{setFixOpenSection("road");setFixOpen(true);}} title="Edit road and driving information"/></div>{row("Drive time",driveTxt)}{row("Road / access point",road.name)}{row("Drive notes",road.driveNote)}{road.status?row("Road status",road.status+(road.seasonalGate?" — "+road.seasonalGate:"")):row("Seasonal gate",road.seasonalGate)}{accessCheckedLine(route)?<div style={{marginTop:2,fontSize:11.5,color:C.textMuted,lineHeight:1.5}}>{accessCheckedLine(route)}</div>:null}</div>;})():null}{/* THE TRAILHEAD BELONGS BESIDE THE DRIVE, NOT ON TOP OF THE APPROACH PROSE. This card used
           to open the APPROACH section further down the tab, which put the place you are driving to
           several screens below the road that gets you there — and left APPROACH answering two
           questions at once (where does the walk start, and how does the walk go). GETTING THERE is
           the drive; this is the point it ends at; APPROACH is what you do on foot afterwards.
           IT REPLACES a standalone "Directions to trailhead" button that stood here, not merely
           joins it: that button resolved its destination through trailheadPoint() and so does this
           card's "Drive here", so the two were the same link. trailheadPoint never returns a point
           with a null lat (every branch goes through wpPlaced), so wherever the button rendered the
           card renders too and nothing is lost. */}<TrailheadCard route={route} onEdit={()=>{setFixOpenSection("approach");setFixOpen(true);}}/>{(()=>{const rx=rxOf(route.id);const dbA=route.access||{};const ac={...dbA,...rx.access};const passVal=ac.passRequired===true?"Yes":(typeof ac.passRequired==="string"?ac.passRequired:null);const feesVal=typeof ac.fees==="number"?("$"+ac.fees):ac.fees;/* DISPLAY prefers land_manager: it is the canonical field — 2,103 routes across just 80
   distinct values, "Agency (Ranger District) — Wilderness". landManager is legacy free prose:
   984 routes across 474 distinct values, a quarter of them over 110 chars, sometimes a whole
   sentence ("Most of the route ... lie within the ..."). 604 routes carry BOTH with different
   text, and the || order meant the prose always won and the canonical value was never seen. */
const landMgrVal=ac.land_manager||ac.landManager;const closuresVal=ac.closures||ac.closure||ac.seasonal;/* `permits`/`permitUrl` are TOP-LEVEL columns, not part of the `access` jsonb every other row here comes from — which is why they used to render on a different tab entirely. Kept as their own row rather than folded into ["Permit",ac.permit]: the two say different things and 67% of alpine routes carry both. `ac.permit` is the permit's NAME ("Mount Baker Climbing"); `route.permits` is how it actually works ("Free self-issue Mount Baker Wilderness permit or trailhead registration; no quota or fee"). Collapsing them with a `||` would drop one, which is the exact defect #741 fixed on the Trailhead row. When there IS a link the text renders inside it below, so it is not listed twice. */const _ownPermit=route.permits||null;const _ownPermitUrl=route.permitUrl||null;const rows=[["Permit",ac.permit],["Permit details",_ownPermitUrl?null:_ownPermit],["Fees",feesVal],["Seasonal closures",closuresVal],["Rules & limits",ac.rules],["Group size limit",ac.group_limit!=null?ac.group_limit+" climbers":null],["Land manager",landMgrVal],["Pass required",passVal],["Parking / entrance",ac.parking_pass],["How to apply",ac.notes]].filter(r=>r[1]);/* An empty access block used to render NOTHING — no panel, no heading, and therefore no edit button, so the routes with no access information were exactly the routes on which nobody could add any. That is the shape [[per-section-gap-notices-replaced-page-banner]] exists for: say what is missing where it would have been, and offer the way to fix it. */if(!rows.length&&!_ownPermitUrl)return <GapNote what="No access or permit information" why="Nothing on file says who manages this land, what pass the trailhead needs, or whether a permit is required — and that is the part that turns people around at the gate." cta="Add what you know" onFix={function(){setFixOpenSection("access");setFixOpen(true);}}/>;/* Deliberately NOT landMgrVal — matching reads BOTH land-manager strings, display reads one.
   Neither key alone is a good haystack. Preferring the canonical land_manager loses links the
   legacy prose earned (13 lost, 5 moved: "Mount Rainier National Park" collapses to "National
   Park Service", the Enchantments permit area vanishes from Alpine Lakes routes). Preferring
   the legacy prose loses what only the canonical field says — Mount Torment, Challenger and
   Olympus are Park Service land and linked to NOTHING. The union loses neither, and on its own
   it would let 15 Mt. Baker boilerplate routes through to the wrong agency; PERMIT_PERIPHERAL
   above is what makes it safe. Measured together: 107 wrong links removed, 7 genuine park
   links gained, 1 moved. Do not "tidy" display and matching back into one expression. */
const _pmLm=((ac.land_manager||"")+" "+(ac.landManager||"")+" "+(ac.permit||"")+" "+(feesVal||"")).toLowerCase();/* Match the agency name only where it is ASSERTED, never where it is disclaimed. This haystack is land manager + permit + fees, and 1,282 WA routes carry the fees line "None - no climbing fee (National Forest, not Mount Rainier NP)". A bare /rainier/ test reads that as Rainier and sends a climber on a Snoqualmie or Index route to Mount Rainier's climbing-permit page - contradicting the very sentence it matched. 1,308 of the 1,941 routes showing a permit link were pointed at the wrong agency this way. Same defect the rack summary already guards with RACK_NEG ("ice screws are not worth carrying" must not advertise screws). */const _pmUrl=_pmSays(_pmLm,/enchantment/g)?["Enchantment Permit Area lottery — Recreation.gov","https://www.recreation.gov/permits/233273"]:_pmSays(_pmLm,/north cascades/g)?["North Cascades NP backcountry permits — nps.gov","https://www.nps.gov/noca/planyourvisit/permits.htm"]:_pmSays(_pmLm,/rainier/g)?["Mount Rainier climbing permits — nps.gov","https://www.nps.gov/mora/planyourvisit/climbing.htm"]:_pmSays(_pmLm,/olympic national park/g)?["Olympic NP wilderness permits — nps.gov","https://www.nps.gov/olym/planyourvisit/wilderness-reservations.htm"]:_pmSays(_pmLm,/recreation\.gov/g)?["Reserve on Recreation.gov","https://www.recreation.gov"]:null;return <div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginBottom:8,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>ACCESS & REGULATIONS</div>{/* Points at `access`, not `permit`. Every row above comes from the `access` block; `permit` is the separate top-level column, so this button opened a form section that could not change one line of what it labels. */}<EditIconButton onClick={function(){setFixOpenSection("access");setFixOpen(true);}} title="Edit access & permit information"/></div>{rows.map(r=><div key={r[0]} style={{marginBottom:7}}><div style={{fontSize:13,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:0.5,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{r[0]}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.55}}>{r[1]}</div></div>)}{/* The route's OWN permit link, rehomed here from Overview. It comes first because it is specific to this climb, where `_pmUrl` below is inferred from the land-manager string and only ever points at an agency's general permit page. `rel` gains `noopener` — the Overview copy had `noreferrer` alone, and while every current browser implies the one from the other, stating it is what the two other external links in this panel already do. */}{_ownPermitUrl?<a href={_ownPermitUrl} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:9,padding:"9px 12px",background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:9,fontSize:12.5,fontWeight:700,textAlign:"center",textDecoration:"none"}}>{(_ownPermit||"Get the permit")+" →"}</a>:null}{_pmUrl?<a href={_pmUrl[1]} target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:9,padding:"9px 12px",background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:9,color:C.blue,fontSize:12.5,fontWeight:700,textDecoration:"none",textAlign:"center"}}>{_pmUrl[0]+" →"}</a>:null}<div style={{fontSize:12,color:C.textMuted,marginTop:8,fontStyle:"italic"}}>Confirm current permits and closures with the land manager before you go.</div></div>;})()}{/* The structured approaches come FIRST, then the long-form prose below. A climber
    choosing a way in wants the comparison (which one, what season, how long) before the
    narrative; the narrative is what you read once you have chosen. */}<ApproachVariants route={route} onEdit={()=>{setFixOpenSection("approachVariants");setFixOpen(true);}}/>{/* GATED ON THE PROSE ALONE since the trailhead moved to the top of the tab. The old gate also
           admitted a route that merely had a trailhead, because the card underneath was the thing
           being shown; with the card gone that route would render the APPROACH heading over an empty
           box. It takes the GapNote below instead, which is true — the trailhead is on screen above
           and the walk from it genuinely is not written down. */}{route.approach?<div style={{marginBottom:14}}><SL action={<EditIconButton onClick={()=>{setFixOpenSection("approach");setFixOpen(true);}} title="Edit approach information"/>} prov={sectionProvenance(route,"approach")}>APPROACH</SL><div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}>{splitParagraphs(route.approach).map((p,i)=><p key={i} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:i===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}</div></div>:<GapNote what="No approach description" why="Getting from the trailhead to the start of the climbing is not written down yet." cta="Describe the approach" onFix={()=>{setFixOpenSection("approach");setFixOpen(true);}}/>}{/* TURNAROUND used to be its own box HERE, between the approach and the protection.
    It is gone from the Plan tab: a turnaround is not a plan item, it is the condition
    under which you abandon the plan, and every one of the 1,009 values is prose about
    when to retreat ("turn around before committing above the rock band", "be willing
    to turn around well before dusk"). That belongs with BAILOUT POINTS on the Safety
    tab, which already answers the other half of the same question — WHERE you retreat
    to. The column still reaches a screen, so check:field-renders stays honest; it
    reaches a better one. Do not re-add a box here. */}{/* Up, then down. PROTECTION and PITCH-BY-PITCH sit after the approach and before the
    descent; the rappels follow the descent prose immediately below. All three used to be on
    Overview, which left Plan describing how to reach the base and how to walk off but
    nothing about the climbing in between. */}
{!cragOnly?<ProtectionCard route={route} myReports={myReports} onEdit={()=>{setFixOpenSection("rack");setFixOpen(true);}}/>:null}
{route.discipline!=="bouldering"&&route.pitchDetail&&route.pitchDetail.length?<RouteBreakdown route={route} comments={comments} commentsUnavailable={commentsUnavailable} onCommentAdd={onCommentAdd} onEdit={()=>{setFixOpenSection("pitchDetail");setFixOpen(true);}}/>:(gapPitches(route)?<GapNote what="No pitch-by-pitch breakdown" why={route.pitches+" pitches are listed, but none of them are described — no per-pitch grades, belays or crux."} cta="Add the pitches" onFix={()=>{setFixOpenSection("pitchDetail");setFixOpen(true);}}/>:null)}
{/* The unpitched counterpart, in the SAME slot as PITCH-BY-PITCH. isPitched() is the
    switch, so exactly one of PITCH-BY-PITCH and CLIMBING ROUTE can appear on a route and
    neither can silently shadow the other. Moved here with the pitch table when Plan took
    ownership of the climbing itself. */}
{!isPitched(route)&&(route.climbingRoute||[]).length?<div style={{marginBottom:14}}><ClimbingRouteTable route={route} onEdit={()=>{setFixOpenSection("climbingRoute");setFixOpen(true);}}/></div>:null}
{(route.descent||route.descentText||rxOf(route.id).retreat)?<div style={{marginBottom:14}}><SL action={<EditIconButton onClick={()=>{setFixOpenSection("descentText");setFixOpen(true);}} title="Edit descent information"/>} prov={sectionProvenance(route,"descentText")}>DESCENT</SL>{[["Descent",descentBeta(route)]].concat((!cragOnly&&rxOf(route.id).retreat)?[["Retreat / bail",rxOf(route.id).retreat]]:[]).filter(x=>x[1]).map(x=><div key={x[0]} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:8,border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:5}}>{x[0]}</div>{splitParagraphs(x[1]).map((p,i)=><p key={i} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:i===0?"0 0 8px":"8px 0 0"}}>{p}</p>)}</div>)}</div>:<GapNote what="No descent recorded" why="Nothing says how you get off this route — and on many climbs the way down is the committing part." cta="Describe the descent" onFix={()=>{setFixOpenSection("descentText");setFixOpen(true);}}/>}{/* The rappel table and its prose/count summary, immediately after the descent they belong
    to. Both were on Overview; keeping them adjacent is what matters — see the note where
    they used to sit. */}
{(function(){
  if(rappelsAreNone(route))return null;
  const hasTable=!!(route.rappelDetail&&route.rappelDetail.length);
  const note=rappelNoteText(route);
  const heading=rappelHeadingCount(route);
  /* 245 routes store the summary as a bare digit and have no table. Printing that digit as
     the body under a heading that already says "3 rappels" gives a box whose whole content is
     "3" — the same emptiness the walk-offs had, one step along. Say what is missing instead. */
  const noteIsJustCount=!!note&&/^~?\s*\d+(?:\s*[-–]\s*\d+)?\s*x?$/.test(String(note).trim());
  const prose=(note&&!noteIsJustCount)?note:null;
  if(!hasTable&&!heading&&!prose)return null;
  const openEdit=function(){setFixOpenSection("rap");setFixOpen(true);};
  return <div style={{marginBottom:12}}>
    {hasTable?<RappelTable route={route} onEdit={openEdit}/>:<>
      <SL action={<EditIconButton onClick={openEdit} title="Edit rappel information"/>} prov={sectionProvenance(route,"rappels")}>{"RAPPELS"+(heading?" · "+heading:"")}</SL>
      <div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.7}}>{prose||"No per-rappel breakdown on file yet — the anchors, individual lengths and rope requirement are unrecorded."}</div></div>
    </>}
    {(hasTable&&note)?<div style={{background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`,marginTop:8}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.7}}>{note}</div></div>:null}
  </div>;
})()}{!cragOnly?<div style={{marginBottom:14}}><ItineraryView route={route} onContribute={()=>{setFixOpenSection("itinerary");setFixOpen(true);}} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){var el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}} myItin={myItin} onSaveMyItin={onSaveMyItin} crewsForRoute={crewsForRoute} onShareItinToCrew={onShareItinToCrew}/></div>:null}{!cragOnly?<Calculator route={route} activity={activity}/>:null}{/* CAMPING & BIVY, moved off the Safety tab (see the note on the safety line). It sits directly
    after the time estimate because the two answer one question together — how long this takes,
    and where you stop if it takes longer. SCRAMBLING is in the gate: it was the one discipline
    excluded before, and a scramble that overruns benights a party exactly like an alpine route.
    Gated on campingGate(), which is catOf() PLUS "trad is alpine when it climbs a peak" — catOf()
    folds `rock` into trad/sport first, and a big alpine rock route carries `trad` by convention here. */}{campingGate(route)?<CampingPanel route={route} onEdit={()=>{setFixOpenSection("bivy");setFixOpen(true);}}/>:null}{<><SL action={<EditIconButton onClick={()=>{setFixOpenSection("waypoints");setFixOpen(true);}} title="Edit waypoints and route information"/>} prov={sectionProvenance(route,"gpx")}>ROUTE TRACK</SL><div style={{marginBottom:12}}>{trackIsJustTheWaypoints(route.gpxPts,route.waypoints)?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{WAYPOINT_LINE_CAVEAT}</div>:null}{(function(){var _cov=trackCoverage(route.gpxPts,route.waypoints);return _cov?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:8}}>{trackCoverageCaveat(_cov,_gapDist)}</div>:null;})()}<div ref={mapWrapRef}><GPXMap pts={route.gpxPts} waypoints={route.waypoints} derivedTrailhead={(()=>{const _t=trailheadPoint(route);return _t&&_t.derived?_t:null;})()} peakCoord={mtn.lat!=null?{lat:mtn.lat,lng:mtn.lng,name:mtn.name}:null} endpointLabels={["alpine","mountaineering"].includes(catOf(route))?{startLabel:"Trailhead",startColor:C.green,finishLabel:"Summit",finishColor:C.orange}:undefined} focusWp={wpFocus}/></div>{((route.gpxPts&&route.gpxPts.length)||(route.waypoints||[]).some(wpPlaced))?<button onClick={()=>gpxDownload(route)} style={{marginTop:9,width:"100%",padding:"9px",background:C.blueBg,color:C.blue,border:`1px solid ${C.blueDim}`,borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>{(route.gpxPts&&route.gpxPts.length)?"Download GPX":"Download GPX (waypoints only)"}</button>:null}{gapTrack(route)?<GapNote mt={10} what="No recorded GPS track" why="There is no line on this map to follow — just the waypoints, if any were added. Recorded a GPX up here?" cta="Submit a track" onFix={()=>setShowGpsModal(true)}/>:null}<div style={{marginTop:14}}><SL>Recent recorded tracks</SL><div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 9px",lineHeight:1.5}}>Recorded lines other parties walked, plus recent trip reports — conditions and detours shift with the season, so check a recent one.</div>{(function(){var ctSeed=(route.communityTracks||[]);var actTracks=((route.activity)||[]).filter(function(a){return a&&a.date;}).map(function(a){return {who:a.user,avatar:a.avatar,date:a.date,note:"Trip report — no recorded track.",report:a.text};});var seenT={},ct=[];ctSeed.concat(actTracks).forEach(function(t){var kk=(t.who||"")+"|"+(t.date||"");if(!seenT[kk]){seenT[kk]=1;ct.push(t);}});ct.sort(function(a,b){return (b.date||"").localeCompare(a.date||"");});if(!ct.length)return <div style={{fontSize:12.5,color:C.textSub,background:C.card,border:`1px solid ${C.border}`,borderRadius:11,padding:"11px 13px"}}>No recent tracks yet — be the first to share one after you climb it.</div>;var shown=trackHistOpen?ct:ct.slice(0,2);var older=ct.length-2;return <div>{shown.map(function(t,i){var op=trackOpen===i;var season=t.season||seasonName(t.date);var sc=({Winter:C.blue,Spring:C.green,Summer:C.amber,Fall:C.orange})[season]||C.textSub;return <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:11,marginBottom:8,overflow:"hidden"}}><div {...clickable(function(){setTrackOpen(op?null:i);})} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer"}}><Av src={t.avatar} size={30}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(t.who||"A climber")+(t.date?" · "+shortDate(t.date):"")}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{t.note}</div></div><span style={{flexShrink:0,fontSize:11,fontWeight:700,color:sc,background:sc+"22",border:`1px solid ${sc}55`,borderRadius:20,padding:"2px 8px"}}>{season}</span><span style={{fontSize:13,color:C.textMuted,marginLeft:6}}>{op?"▾":"▸"}</span></div>{op?<div style={{borderTop:`1px solid ${C.borderLight}`,padding:"9px 12px"}}>{t.report?<div style={{fontSize:12.5,color:C.text,lineHeight:1.55,fontStyle:"italic",marginBottom:9}}>{"“"+t.report+"”"}</div>:null}<button onClick={function(){var hasOwn=t.gpxPts&&t.gpxPts.length;gpxDownload(route,hasOwn?t.gpxPts:null,route.name+(t.who?" — "+t.who:"")+(t.date?" "+t.date:""));}} style={{width:"100%",padding:"8px",borderRadius:9,border:`1px solid ${C.blueDim}`,background:C.blueBg,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{(t.gpxPts&&t.gpxPts.length)?"Download this track (GPX)":"Download standard route line (GPX)"}</button>{!(t.gpxPts&&t.gpxPts.length)?<div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>{"No recorded path from "+(t.who||"this climber")+" — this downloads the route’s standard line, not their exact track."}</div>:null}</div>:null}</div>;})}{older>0?<button onClick={function(){setTrackHistOpen(function(v){return !v;});}} style={{width:"100%",marginTop:2,padding:"9px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{trackHistOpen?"Show fewer":"See "+older+" older track"+(older!==1?"s":"")+" from past trips ▾"}</button>:null}</div>;})()}</div><div style={{marginTop:12,background:C.card,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:6}}>OPEN IN NAVIGATION APP</div>{[{n:"Gaia GPS",u:"https://www.gaiagps.com"},{n:"CalTopo",u:(mtn&&mtn.lat!=null)?`https://caltopo.com/map.html#ll=${mtn.lat},${mtn.lng}&z=14`:"https://caltopo.com"},{n:"USGS National Map",u:"https://apps.nationalmap.gov/viewer/"},{n:"AllTrails",u:"https://www.alltrails.com"}].map((a,i)=><a key={i} href={a.u} target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.borderLight}`,textDecoration:"none"}}><span style={{fontSize:13,color:C.textSub}}>{a.n}</span><span style={{fontSize:12,color:C.blue,fontWeight:600}}>Open →</span></a>)}</div><div style={{marginTop:12,background:offlineSaved?C.greenBg:C.card,border:"1px solid "+(offlineSaved?C.greenDim:C.border),borderRadius:12,padding:"12px 13px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:offlineSaved?10:0}}><div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:offlineSaved?C.green:C.text}}>{offlineSaved?"✓ In your trip pack":"Trip pack"}</div><div style={{fontSize:11.5,color:C.textSub,marginTop:1}}>{offlineSaved?"Flagged for this trip. Download the GPX below so the track is on your phone.":"Flag this objective for your trip, then download the GPX so the track is on your phone."}</div></div><button onClick={onToggleOffline} aria-label={offlineSaved?"Remove from trip pack":"Add to trip pack"} style={{flexShrink:0,padding:"8px 14px",borderRadius:9,border:"none",background:offlineSaved?C.surface:C.blueSolid,color:offlineSaved?C.textSub:"#fff",fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{offlineSaved?"Remove":"Save"}</button></div>{offlineSaved?<><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["Description","Topo"+(route.pitchDetail?" · "+route.pitchDetail.length+"p":""),"Gear list","GPX track","Conditions snapshot"].map(x=><span key={x} style={{fontSize:12,fontWeight:600,color:C.green,background:C.surface,border:"1px solid "+C.greenDim,borderRadius:7,padding:"3px 8px"}}>{x}</span>)}</div><div style={{fontSize:11,color:C.textSub,marginTop:9,lineHeight:1.5}}>Nothing here is cached on your device yet — the app still needs a signal. Capture what you need before you go: tap <b style={{color:C.text}}>Download GPX</b> and open it in a dedicated GPS/mapping app.</div></>:null}</div></div></>}{<div style={{marginTop:12}}><SL action={<EditIconButton onClick={()=>{setFixOpenSection("waypoints");setFixOpen(true);}} title="Edit waypoints"/>} prov={sectionProvenance(route,"waypoints")}>WAYPOINTS</SL>{(function(){var _wpCav=waypointCaveat(route.id,route.waypoints);return _wpCav?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:8}}>{_wpCav}</div>:null;})()}{<WaypointList waypoints={route.waypoints} onFocus={focusWaypoint} emptyCopy={cragOnly?"No named waypoints yet — add the parking/approach point (and anchor, if useful) to help other climbers find this crag.":"No named waypoints yet — the track above is a raw GPS line with no key points marked. Add the trailhead, camps, junctions and summit to unlock a turn-by-turn list here and per-point weather forecasts on the Safety tab."} onAdd={function(){setFixOpenSection("waypoints");setFixOpen(true);}}/>}</div>}{catOf(route)!=="bouldering"?<RouteGearCheck route={route} rack={routeRackFor(route)||DISC_RACK[catOf(route)]||[]} rackGeneric={!routeRackFor(route)} essentials={route.whatToBring} onEditEssentials={function(){setFixOpenSection("whatToBring");setFixOpen(true);}} onEditRopeNote={function(){setFixOpenSection("ropeNote");setFixOpen(true);}} onEditRack={cur=>{setFixOpenSection("rack");setFixPrefill(cur?{rack:{note:cur}}:null);setFixOpen(true);}} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){var el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}}/>:null}{catOf(route)!=="bouldering"?<div {...clickable(()=>{setFixOpenSection("rack");setFixOpen(true);})} style={{marginTop:9,padding:"9px 12px",borderRadius:10,border:"1px dashed "+C.border,background:C.surface,fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><Lbl s={"✏️ Brought different gear? Suggest a gear update for this route"}/></div>:null}</div>:null}
      {tab==="safety"?<div>{fireEl}{/* CAMPING & BIVY used to mount HERE, and moved to the Planner tab: where you sleep is a
    planning decision, not a hazard, and on Safety it sat behind a tab nobody opens for
    logistics. Its mount was silently lost once already — it lived on this exact dense line,
    main changed the same line, and the merge kept main's copy, leaving the panel defined and
    rendered NOWHERE. No guard catches that: check:dead-props sees props, not unmounted
    components, and the column was populated so a data check would have looked healthy too.
    The mount is now on the planner line beside <Calculator/>; if you touch either line,
    confirm CAMPING & BIVY still reaches the screen. */}{(["alpine","mountaineering","ice","mixed"].includes(route.discipline)||(route.gainFt||0)>=3000||(route.routeFt||0)>=1000)?<div style={{marginBottom:14}}><div style={{background:C.amberBg,border:`1px solid ${C.amber}55`,borderRadius:12,padding:"11px 13px",marginBottom:10,fontSize:12.5,color:C.text,lineHeight:1.5}}><b style={{color:C.amber}}>Committing objective.</b> {(rxOf(route.id).comms||{}).coverage==="good"?"File a float plan below in case something still goes wrong.":"File a float plan below before you lose cell service."}</div><FloatPlan defaults={{route:route.name}} coords={(mtn&&mtn.lat!=null&&mtn.lng!=null)?{lat:mtn.lat,lng:mtn.lng,name:mtn.name}:null}/></div>:null}<WeatherPanel waypoints={route.waypoints}/><div style={{marginTop:14,marginBottom:14}}><SL>Weather & mountain forecasts</SL><div style={{fontSize:12,color:C.textMuted,margin:"-4px 0 9px",lineHeight:1.5}}>Cross-check several forecasts before committing — mountain weather turns fast.</div><div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>{(mtn.lat!=null&&mtn.lng!=null?[{n:"NWS point forecast",u:"https://forecast.weather.gov/MapClick.php?lon="+mtn.lng+"&lat="+mtn.lat},{n:"NWS hourly graph",u:"https://forecast.weather.gov/MapClick.php?lon="+mtn.lng+"&lat="+mtn.lat+"&FcstType=graphical"}]:[]).concat([{n:"Mountain-Forecast.com",u:"https://www.google.com/search?q="+encodeURIComponent("site:mountain-forecast.com "+mtn.name)},{n:"OpenSnow forecast",u:"https://opensnow.com/"},{n:"Fire & smoke — AirNow",u:"https://www.airnow.gov/"},{n:"Active fires — InciWeb",u:"https://inciweb.wildfire.gov/"}]).concat(mtn.avyZone?[{n:"Avalanche forecast ("+mtn.avyZone+")",u:avyCenterFor(mtn)[2]}]:[]).map(function(a,i,arr){return <a key={i} href={a.u} target="_blank" rel="noreferrer" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 13px",borderBottom:i<arr.length-1?`1px solid ${C.borderLight}`:"none",textDecoration:"none"}}><span style={{fontSize:13,color:C.text}}>{a.n}</span><span style={{fontSize:12,color:C.blue,fontWeight:700}}>Open →</span></a>;})}</div></div><SafetyMatrix route={route} mountain={mtn} hzVotes={hzVotes} onVote={onVoteHazard} onOpenContribute={()=>{setFixOpenSection("bailout");setFixOpen(true);}} onOpenStartLoc={()=>{setFixOpenSection("startLocation");setFixOpen(true);}} onOpenHazards={(seed)=>{setFixOpenSection("haz");setFixPrefill(seed?{haz:seed}:null);setFixOpen(true);}} onOpenTurnaround={()=>{setFixOpenSection("turn");setFixOpen(true);}}/>{(()=>{const cm=rxOf(route.id).comms;/* Cell coverage is contributable (the `comms` field) and this was the only panel on the Safety tab with no way to correct what it says — every neighbour here has an EditIconButton. Coverage is also the one fact on this screen that changes with a carrier and a new tower rather than with the rock, so it is exactly the kind of thing the last party knows better than the catalog. */
        if(!cm)return route.comms?<div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5}}><div style={{fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:0.4}}>Cell / sat coverage</div><EditIconButton onClick={()=>{setFixOpenSection("comms");setFixOpen(true);}} title="Edit cell / satellite coverage"/></div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{route.comms}</div></div>:null;const COV={none:{t:"No service",c:C.red,bg:C.redBg},spotty:{t:"Spotty signal",c:C.amber,bg:C.amberBg},good:{t:"Good signal",c:C.green,bg:C.greenBg}};return <div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:cm.note?5:0}}><span style={{fontSize:12,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:0.4}}>Cell coverage</span><span style={{fontSize:11.5,fontWeight:700,color:(COV[cm.coverage]||COV.none).c,background:(COV[cm.coverage]||COV.none).bg,padding:"2px 8px",borderRadius:10}}>{(COV[cm.coverage]||COV.none).t}</span></div>{cm.note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{cm.note}</div>:null}</div>;})()}</div>:null}
      {/* On Overview this prompt is rendered UP beside the BETA box instead — see `betaCta`.
    It asks "got beta?", so it belongs where the route's beta is, not stranded past the
    end of every other section. The other tabs have no beta block to sit beside, so
    there it stays a footer. */}
      {(tab!=="photos"&&tab!=="partners"&&tab!=="safety"&&tab!=="overview")?betaCta:null}{photoLightbox?createPortal(<div onClick={function(){setPhotoLightbox(null);}} role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"flex-end",justifyContent:"center",overflowY:"auto",overscrollBehavior:"contain"}}><div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,width:"100%",maxWidth:520,borderRadius:"16px 16px 0 0",border:"1px solid "+C.border,borderBottom:"none",maxHeight:"92vh",overflowY:"auto",overscrollBehavior:"contain"}}><div style={{position:"sticky",top:0,background:C.bg,zIndex:1,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:"1px solid "+C.border}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{"Photo"}</div><button aria-label="Close photo" onClick={function(){setPhotoLightbox(null);}} style={{background:C.borderLight,border:"none",color:C.textSub,borderRadius:8,width:32,height:32,fontSize:17,cursor:"pointer"}}>{"✕"}</button></div><div style={{position:"relative"}}><img loading="lazy" decoding="async" src={photoLightbox.ph.url} alt="" style={{width:"100%",maxHeight:"50vh",objectFit:"contain",background:"#000"}} onError={onImgErr(FALLBACK_COVER)}/></div><div style={{padding:"12px 16px 20px"}}>{photoLightbox.ph.by?<div style={{fontSize:12.5,color:C.textMuted,marginBottom:8}}>{"Photo by "+photoLightbox.ph.by}</div>:null}<div style={{display:"flex",gap:16,alignItems:"center",marginBottom:6}}><span {...clickable(function(){setPhotoLikes(function(p){var cur=p[photoLightbox.key]||{likedByMe:false,likes:0};var o={};Object.assign(o,p);o[photoLightbox.key]={likedByMe:!cur.likedByMe,likes:cur.likes+(cur.likedByMe?-1:1)};return o;});})} style={{fontSize:13,fontWeight:700,color:(photoLikes[photoLightbox.key]||{}).likedByMe?C.blue:C.textMuted,cursor:"pointer"}}>{(photoLikes[photoLightbox.key]||{}).likedByMe?"Liked":"Like"}</span>{(photoLikes[photoLightbox.key]||{}).likes?<span style={{fontSize:13,color:C.textMuted}}>{<Lbl s={"👍 "+(photoLikes[photoLightbox.key]||{}).likes}/>}</span>:null}{photoLightbox.ph.ascent&&onOpenReport?<span {...clickable(function(){onOpenReport(Object.assign({},photoLightbox.ph.ascent,{route:route,mtn:mtn}));setPhotoLightbox(null);})} style={{fontSize:13,fontWeight:700,color:C.blue,cursor:"pointer",marginLeft:"auto"}}>{"View full trip report →"}</span>:null}{(onRemovePhoto&&photoLightbox.ph._rowId&&(photoLightbox.ph._mine||canModeratePhotos))?<span {...clickable(function(){if(photoRemoving)return;if(!photoLightbox.ph._mine&&!window.confirm("Take down this photo"+(photoLightbox.ph.by?(" by "+photoLightbox.ph.by):"")+"? It is removed for everyone and cannot be undone."))return;setPhotoRemoving(true);Promise.resolve(onRemovePhoto(photoLightbox.ph)).then(function(){setPhotoLightbox(null);}).finally(function(){setPhotoRemoving(false);});})} style={{fontSize:13,fontWeight:700,color:C.red,cursor:"pointer",marginLeft:"auto"}}>{photoRemoving?"Removing…":(photoLightbox.ph._mine?"Remove":"Take down")}</span>:null}{(onReportPhoto&&photoLightbox.ph._rowId&&!photoLightbox.ph._mine)?<span {...clickable(function(){setPhotoReporting(function(v){return !v;});})} style={{fontSize:13,fontWeight:700,color:C.textMuted,cursor:"pointer",marginLeft:photoLightbox.ph._mine?"auto":10}}>{photoReporting?"Cancel":"Report"}</span>:null}</div>{photoReporting?<div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>{[["not_this_route","Not this route"],["inappropriate","Inappropriate"],["not_their_photo","Not their photo"],["other","Something else"]].map(function(r){return <button key={r[0]} onClick={function(){setPhotoReporting(false);onReportPhoto(photoLightbox.ph,r[0]);}} style={{padding:"7px 11px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{r[1]}</button>;})}</div>:null}<Comments targetId={photoLightbox.key} comments={comments||[]} onAdd={onCommentAdd} onViewProfile={onViewProfile} onEdit={onCommentEdit} onDelete={onCommentDelete} onLike={onCommentLike} onReply={onCommentReply} mentionCandidates={connections}/></div></div></div>,document.body):null}{quickPhotoOpen?createPortal(<div onClick={function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}} role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:410,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={function(e){e.stopPropagation();}} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",border:"1px solid "+C.border,borderBottom:"none",padding:18,maxHeight:"88vh",overflowY:"auto",overscrollBehavior:"contain"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{fontSize:16,fontWeight:700,color:C.text}}>Add a photo</div><button aria-label="Close photo picker" onClick={function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}} style={{background:C.borderLight,border:"none",color:C.textSub,borderRadius:8,width:32,height:32,fontSize:17,cursor:"pointer"}}>{"✕"}</button></div><div style={{fontSize:12,color:C.textMuted,marginBottom:12,lineHeight:1.5}}>Just the photo — no need to log a climb for this.{onAddPhotos?" It's shared with everyone who opens this route.":" You're signed out, so this stays on your device for this visit only — sign in to share a photo with other climbers."}</div><label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,padding:"22px 12px",borderRadius:11,border:"1px dashed "+C.border,background:C.surface,color:C.blue,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:12}}>{<Lbl s={"📷 Choose from camera or library"}/>}<input type="file" accept="image/*" multiple style={{display:"none"}} onChange={function(e){var files=Array.from(e.target.files||[]);/* keep the File beside its preview URL: a blob: URL is enough to SHOW a photo and useless for uploading one, and discarding the File here is why this sheet could only ever be local. */setQuickPhotoPick(files.map(function(f){return {url:URL.createObjectURL(f),file:f};}));}}/></label>{quickPhotoPick.length?<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>{quickPhotoPick.map(function(u,i){return <img loading="lazy" decoding="async" key={i} src={u.url} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:8}}/>;})}</div>:null}{/* The confirm button exists ONLY once something has been picked. It used to render always, disabled, labelled "Choose photos to add" — a second button under the picker that instructed an action it could not perform, so the sheet read as two buttons with a broken one. Choosing is the label above; this is the confirm. */}{quickPhotoPick.length?<button disabled={photoBusy} onClick={function(){/* Two different promises, so two different code paths. With onAddPhotos the parent uploads and files a contributions row, and the photo comes BACK through the route's contributions — so it must NOT also be pushed into quickPhotos, or it renders twice. Without it we are signed out, the sheet has already said the photo stays on this device, and the local blob is all we can honestly offer. */if(onAddPhotos){setPhotoBusy(true);Promise.resolve(onAddPhotos(quickPhotoPick.map(function(u){return u.file;}))).then(function(){setQuickPhotoOpen(false);setQuickPhotoPick([]);}).finally(function(){setPhotoBusy(false);});return;}setQuickPhotos(function(p){return p.concat(quickPhotoPick.map(function(u){return {url:u.url,by:ME.name,avatar:ME.avatar,date:"just now"};}));});setQuickPhotoOpen(false);setQuickPhotoPick([]);}} style={{width:"100%",padding:12,background:photoBusy?C.surface:C.blueSolid,color:photoBusy?C.textMuted:"#fff",border:"none",borderRadius:11,fontSize:14.5,fontWeight:700,cursor:photoBusy?"default":"pointer"}}>{photoBusy?"Adding…":("Add "+quickPhotoPick.length+" photo"+(quickPhotoPick.length>1?"s":""))}</button>:null}</div></div>,document.body):null}{/* TOP CONTRIBUTORS used to render HERE, which put an area-level
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
function wxTempColor(f){return f>=85?C.red:f>=70?C.amber:f>=50?C.green:f>=32?C.teal:C.blue;}
function wxWindColor(mph){return mph>=30?C.red:mph>=15?C.amber:C.green;}
function wxCondColor(code){if(code==null)return C.blue;if(code>=95)return C.red;if(code===0||code===1)return C.green;if(code===2||code===3||code===45||code===48)return C.textSub;return C.blue;}
function wxUvColor(uv){return uv>=11?C.purple:uv>=8?C.red:uv>=6?C.amber:uv>=3?C.yellow||C.amber:C.green;}
function wxUvLabel(uv){return uv>=11?"Extreme":uv>=8?"Very High":uv>=6?"High":uv>=3?"Moderate":"Low";}
const FROSTBITE_WINDCHILL_F=-19;
function hourLabel(hr){const h12=hr%12===0?12:hr%12;return h12+(hr<12?" AM":" PM");}
function metWxLabel(code){
  if(!code)return null;
  const s=code.replace(/_(day|night|polartwilight)$/,"");
  const MAP={clearsky:"Clear",fair:"Fair",partlycloudy:"Partly cloudy",cloudy:"Cloudy",fog:"Fog",rain:"Rain",lightrain:"Light rain",heavyrain:"Heavy rain",rainshowers:"Rain showers",lightrainshowers:"Light rain showers",heavyrainshowers:"Heavy rain showers",sleet:"Sleet",lightsleet:"Light sleet",heavysleet:"Heavy sleet",sleetshowers:"Sleet showers",lightsleetshowers:"Light sleet showers",heavysleetshowers:"Heavy sleet showers",snow:"Snow",lightsnow:"Light snow",heavysnow:"Heavy snow",snowshowers:"Snow showers",lightsnowshowers:"Light snow showers",heavysnowshowers:"Heavy snow showers"};
  if(MAP[s])return MAP[s];
  if(s.indexOf("thunder")>=0)return "Thunderstorms";
  return s;
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
function WeatherPanel({waypoints}){
  const points=pickForecastWaypoints(waypoints);
  const [data,setData]=useState({});
  const [expandedDay,setExpandedDay]=useState({});
  const key=points.map(function(w){return w.type+"_"+w.name;}).join("|");
  useEffect(function(){
    if(!points.length)return;
    points.forEach(function(w){
      const k=w.type+"_"+w.name;
      // forecast_days=16 is Open-Meteo's max — pulls the full range it forecasts
      // out to, not just the next 24 hours, so the panel below can lay it out
      // day by day instead of a single next-day summary.
      // precipitation_unit=inch also switches freezing_level_height (and other
      // length fields) from meters to feet — do not re-convert freezeMax below.
      const omUrl="https://api.open-meteo.com/v1/forecast?latitude="+w.lat+"&longitude="+w.lng+(w.elev!=null?"&elevation="+Math.round(w.elev/3.28084):"")+"&hourly=temperature_2m,apparent_temperature,weather_code,wind_speed_80m,wind_direction_80m,wind_gusts_10m,precipitation_probability,precipitation,snowfall,freezing_level_height,uv_index&forecast_days=16&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto";
      // Open-Meteo, NWS, and MET Norway run different models from different
      // organizations and can legitimately disagree by several degrees over
      // complex mountain terrain — fetch both secondary sources' own series too
      // so the panel can flag divergence instead of presenting one number as
      // gospel. Both secondary sources are short-range (~4-7 days); Open-Meteo
      // alone still drives the full 16-day view and is the only one broken into
      // AM/PM/Night + hourly detail — the secondary sources stay lighter (a
      // high/low, wind, and one weather label) by design, not full parity.
      const nwsPromise=fetch("https://api.weather.gov/points/"+w.lat.toFixed(4)+","+w.lng.toFixed(4)).then(function(r){return r.ok?r.json():null;}).then(function(pj){return pj?fetch(pj.properties.forecastGridData).then(function(r){return r.ok?r.json():null;}):null;}).catch(function(){return null;});
      // MET Norway (api.met.no) — an independent forecast from a different
      // national weather service (ECMWF-derived outside the Nordics), not
      // affiliated with NOAA. Browsers won't let JS set a custom User-Agent
      // (a forbidden fetch header), so this relies on the browser's own UA —
      // fine at this request volume, but MET Norway's own guidance prefers an
      // identifying one for high-traffic server-side use.
      const metPromise=fetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat="+w.lat.toFixed(4)+"&lon="+w.lng.toFixed(4)+(w.elev!=null?"&altitude="+Math.round(w.elev/3.28084):"")).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
      Promise.all([fetch(omUrl).then(function(r){return r.json();}),nwsPromise,metPromise]).then(function(res){
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
          if(!byDay[date])byDay[date]={temps:[],feels:[],codes:[],winds:[],gusts:[],pops:[],precips:[],snows:[],fz:[],uvs:[],hours:[]};
          const dd=byDay[date];
          dd.temps.push(h.temperature_2m[i]);
          dd.feels.push(h.apparent_temperature[i]);
          dd.codes.push(h.weather_code[i]);
          dd.winds.push(h.wind_speed_80m[i]);
          dd.gusts.push(h.wind_gusts_10m[i]);
          dd.pops.push(h.precipitation_probability[i]);
          dd.precips.push(h.precipitation[i]);
          dd.snows.push(h.snowfall[i]);
          dd.fz.push(h.freezing_level_height[i]);
          dd.uvs.push(h.uv_index[i]);
          dd.hours.push({hr:hr,tempF:h.temperature_2m[i],code:h.weather_code[i],windMph:h.wind_speed_80m[i],dir:h.wind_direction_80m[i],pop:h.precipitation_probability[i]});
          const partKey=hr<6?"night":hr<12?"am":hr<18?"pm":"night";
          const partDate=hr<6?prevDayStr(date):date;
          const pk=partDate+"_"+partKey;
          if(!byPart[pk])byPart[pk]={temps:[],codes:[],winds:[],dirs:[]};
          byPart[pk].temps.push(h.temperature_2m[i]);
          byPart[pk].codes.push(h.weather_code[i]);
          byPart[pk].winds.push(h.wind_speed_80m[i]);
          byPart[pk].dirs.push(h.wind_direction_80m[i]);
        });
        const sum=function(arr){return arr.reduce(function(s,v){return s+(v||0);},0);};
        const avg=function(arr){return arr.length?sum(arr)/arr.length:0;};
        const buildPart=function(label,pk){const b=byPart[pk];if(!b||!b.temps.length)return null;const pCode=modeOf(b.codes);return {label:label,temp:Math.round(avg(b.temps)),wx:WX_CODE_LABEL[pCode]||null,wxCode:pCode,wind:Math.round(avg(b.winds)),dir:degToCompass(circMeanDeg(b.dirs))};};
        // Secondary-source extras (wind + one weather label per day) — a
        // lighter read than Open-Meteo's per-part/hourly breakdown, by design.
        const nwsByDay={},nwsWindByDay={},nwsWxByDay={};
        if(nwsJson&&nwsJson.properties){
          const tvals=nwsJson.properties.temperature&&nwsJson.properties.temperature.values;
          if(tvals)tvals.forEach(function(v){if(typeof v.value!=="number")return;const day=toLocalDay(v.validTime.split("/")[0]);if(!nwsByDay[day])nwsByDay[day]=[];nwsByDay[day].push(v.value*9/5+32);});
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
        const days=Object.keys(byDay).sort().map(function(date){
          const d=byDay[date];
          const parts=[buildPart("AM",date+"_am"),buildPart("PM",date+"_pm"),buildPart("Night",date+"_night")].filter(Boolean);
          const nd=nwsByDay[date];
          const nws=(nd&&nd.length>=3)?{lo:Math.round(Math.min.apply(null,nd)),hi:Math.round(Math.max.apply(null,nd)),wind:nwsWindByDay[date]?Math.round(Math.max.apply(null,nwsWindByDay[date])):null,wx:cap(modeOf(nwsWxByDay[date]))}:null;
          const md=metByDay[date];
          const met=(md&&md.length>=3)?{lo:Math.round(Math.min.apply(null,md)),hi:Math.round(Math.max.apply(null,md)),wind:metWindByDay[date]?Math.round(Math.max.apply(null,metWindByDay[date])):null,wx:metWxLabel(modeOf(metWxByDay[date]))}:null;
          const wxCode=modeOf(d.codes);
          return {date:date,tempLo:Math.round(Math.min.apply(null,d.temps)),tempHi:Math.round(Math.max.apply(null,d.temps)),feelsLo:Math.round(Math.min.apply(null,d.feels)),feelsHi:Math.round(Math.max.apply(null,d.feels)),wx:WX_CODE_LABEL[wxCode]||null,wxCode:wxCode,windMax:Math.round(Math.max.apply(null,d.winds)),gustMax:Math.round(Math.max.apply(null,d.gusts)),popMax:Math.round(Math.max.apply(null,d.pops)),precipIn:Math.round(sum(d.precips)*100)/100,snowIn:Math.round(sum(d.snows)*100)/100,freezeMax:Math.round(Math.max.apply(null,d.fz)),uvMax:Math.round(Math.max.apply(null,d.uvs)*10)/10,parts:parts,hours:d.hours,nws:nws,met:met};
        });
        setData(function(p){return Object.assign({},p,{[k]:{days:days}});});
      }).catch(function(){setData(function(p){return Object.assign({},p,{[k]:{error:true}});});});
    });
  },[key]);
  if(!points.length)return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px"}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:6}}>WEATHER FORECAST</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6}}>No forecast yet — this route has no named waypoints to forecast from. Add a trailhead and summit waypoint on the Plan tab to unlock AM/PM/Night forecasts here.</div></div>;
  /* A fourth copy of the waypoint colour/icon map lived here, under its own names, which is
     why the first sweep missed it: a grep for the other copies' variable name cannot find a
     synonym. It happened to agree with them today and would not have for long — that is the
     whole failure mode, three copies agreeing with each other while all three were wrong.
     Reads from the shared WP_STYLE now, like everything else. */
  return <div style={{marginBottom:14}}>
    <SL>Forecast at key points</SL>
    <div style={{fontSize:11.5,color:C.textMuted,margin:"-4px 0 9px",lineHeight:1.5}}>Elevation-aware via Open-Meteo, broken into AM/PM/Night with an hourly view on tap — cross-checked against NWS and MET Norway. Read it yourself: mountain terrain can differ sharply from the forecast, and sources can legitimately disagree.</div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>{points.map(function(w){const k=w.type+"_"+w.name;const d=data[k];const expDate=expandedDay[k];const _wty=wpType(w);const wCol=wpColor(_wty);return <div key={k} style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"13px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
        <div style={{width:28,height:28,borderRadius:"50%",background:wCol+"22",border:"1.5px solid "+wCol,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:wCol,flexShrink:0}}>{wpGlyph(_wty)}</div>
        <div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{w.name+(w.elev!=null?" · "+uElev(w.elev):"")}</div>
      </div>
      {!d?<div style={{fontSize:12,color:C.textMuted}}>Loading forecast…</div>:d.error?<div style={{fontSize:12,color:C.textMuted}}>Forecast unavailable — check your connection.</div>:<div style={{display:"flex",gap:9,overflowX:"auto",paddingBottom:3}}>{d.days.map(function(dy,di){
        const dt=new Date(dy.date+"T12:00:00");
        const lbl=di===0?"Today":dt.toLocaleDateString(DLOCALE,{weekday:"short"});
        const sub=dt.toLocaleDateString(DLOCALE,{month:"short",day:"numeric"});
        const chilly=dy.feelsLo<=dy.tempLo-5;
        const frostbite=dy.feelsLo<=FROSTBITE_WINDCHILL_F;
        const hasSnow=dy.snowIn>=0.05;
        const hasRain=!hasSnow&&dy.precipIn>=0.05;
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
          <div style={{fontSize:17,fontWeight:800,marginBottom:3}}><span style={{color:wxTempColor(dy.tempHi)}}>{"High "+dy.tempHi+"°"}</span><span style={{color:C.textMuted,fontWeight:600}}>{"  ·  "}</span><span style={{color:wxTempColor(dy.tempLo)}}>{"Low "+dy.tempLo+"°"}</span></div>
          <div style={{fontSize:11,fontWeight:frostbite?700:400,color:frostbite?C.red:chilly?C.blue:C.textMuted,marginBottom:10}}>{"Feels like: High "+dy.feelsHi+"° · Low "+dy.feelsLo+"°"+(chilly?" (wind chill)":"")+(frostbite?" — frostbite risk in 30 min":"")}</div>
          {dy.parts.length?<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>{dy.parts.map(function(p){return <div key={p.label} style={{background:C.card,borderRadius:9,padding:"7px 6px",border:"1px solid "+C.border}}>
            <div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:3}}>{p.label}</div>
            <div style={{display:"flex",alignItems:"center",gap:3,fontSize:9.5,color:C.textSub,marginBottom:5,minHeight:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><WeatherIcon code={p.wxCode} color={C.textMuted} size={11}/>{p.wx||"—"}</div>
            <div style={{fontSize:13.5,fontWeight:800,color:wxTempColor(p.temp)}}>{p.temp+"°"}</div>
            <div style={{fontSize:9,fontWeight:600,color:wxWindColor(p.wind),marginTop:2}}>{p.wind+" mph"+(p.dir?" "+p.dir:"")}</div>
          </div>;})}</div>:null}
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6,marginBottom:dy.nws||dy.met?10:0}}>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Wind</div><div style={{fontSize:13,fontWeight:800,color:wxWindColor(dy.windMax)}}>{dy.windMax+" mph"}</div>{dy.gustMax>dy.windMax?<div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{"gusts to "+dy.gustMax}</div>:null}</div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Precip</div><div style={{fontSize:13,fontWeight:800,color:dy.popMax>=50?C.blue:C.text}}>{dy.popMax+"%"}</div>{hasRain?<div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{dy.precipIn.toFixed(2)+`" expected`}</div>:null}</div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>UV index</div><div style={{fontSize:13,fontWeight:800,color:wxUvColor(dy.uvMax)}}>{dy.uvMax}</div><div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>{wxUvLabel(dy.uvMax)}</div></div>
            <div style={{background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,marginBottom:2}}>Freezing level</div><div style={{fontSize:13,fontWeight:800,color:C.text}}>{dy.freezeMax.toLocaleString()+" ft"}</div></div>
            {hasSnow?<div style={{gridColumn:"span 2",background:C.card,borderRadius:9,padding:"7px 9px",border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><div style={{fontSize:9,fontWeight:800,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4}}>Snow expected</div><div style={{fontSize:13,fontWeight:800,color:C.blue}}>{dy.snowIn.toFixed(1)+`"`}</div></div>:null}
          </div>
          {dy.nws||dy.met?<div style={{display:"flex",flexDirection:"column",gap:5}}>
            {dy.nws?<div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:10.5}}><span style={{flexShrink:0,fontSize:9,fontWeight:800,color:C.textMuted,background:C.card,border:"1px solid "+C.border,borderRadius:5,padding:"1.5px 5px",marginTop:1}}>NWS</span><span style={{color:diverges?C.amber:C.textSub,lineHeight:1.4}}>{"High "+dy.nws.hi+"° · Low "+dy.nws.lo+"°"+(dy.nws.wind!=null?" · Wind "+dy.nws.wind+" mph":"")+(dy.nws.wx?" · "+dy.nws.wx:"")+(diverges?" — differs "+Math.round(Math.abs(nwsMid-omMid))+"°":"")}</span></div>:null}
            {dy.met?<div style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:10.5}}><span style={{flexShrink:0,fontSize:9,fontWeight:800,color:C.textMuted,background:C.card,border:"1px solid "+C.border,borderRadius:5,padding:"1.5px 5px",marginTop:1}}>MET</span><span style={{color:metDiverges?C.amber:C.textSub,lineHeight:1.4}}>{"High "+dy.met.hi+"° · Low "+dy.met.lo+"°"+(dy.met.wind!=null?" · Wind "+dy.met.wind+" mph":"")+(dy.met.wx?" · "+dy.met.wx:"")+(metDiverges?" — differs "+Math.round(Math.abs(metMid-omMid))+"°":"")}</span></div>:null}
          </div>:null}
          </div>
          {dy.hours&&dy.hours.length?<div style={{marginTop:"auto",paddingTop:10}}>
          <button onClick={function(){setExpandedDay(function(p){const o=Object.assign({},p);o[k]=isExpanded?null:dy.date;return o;});}} style={{width:"100%",padding:"8px",borderRadius:9,border:"1px solid "+C.blueDim,background:isExpanded?C.blueBg:C.card,color:C.blue,fontSize:11,fontWeight:700,cursor:"pointer"}}>{isExpanded?"Hide hourly ▴":"Hourly forecast ▾"}</button>
          {isExpanded?<div style={{marginTop:8,maxHeight:230,overflowY:"auto",overscrollBehavior:"contain",border:"1px solid "+C.border,borderRadius:9}}>{dy.hours.map(function(hh,hi){const t=Math.round(hh.tempF),wm=Math.round(hh.windMph);return <div key={hi} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 9px",background:hi%2?"transparent":C.card,borderBottom:hi<dy.hours.length-1?"1px solid "+C.borderLight:"none",fontSize:10.5}}><span style={{width:46,flexShrink:0,color:C.textMuted,textAlign:"left"}}>{hourLabel(hh.hr)}</span><span style={{flex:1,display:"flex",alignItems:"center",gap:5,color:C.textSub,textAlign:"left",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><WeatherIcon code={hh.code} color={C.textMuted} size={12}/>{WX_CODE_LABEL[hh.code]||"—"}</span><span style={{fontWeight:700,color:wxTempColor(t),flexShrink:0}}>{t+"°"}</span><span style={{color:wxWindColor(wm),flexShrink:0,minWidth:64,textAlign:"right"}}>{wm+" mph "+(degToCompass(hh.dir)||"")}</span></div>;})}</div>:null}
          </div>:null}
        </div>;
      })}</div>}
    </div>;})}</div>
  </div>;
}
export default RouteDetail;
