import { C, ROUTE_GAP, uImp, DLOCALE, uTemp, uTempDelta, uSnowfall, uWind, uElev, uPrecip, uDistMi, wpPlaced, wpIs, summitedLog } from "../ClimbMatchCore.jsx";
import { localAt, aqiWord } from "./alpineConditions.js";
import { faceBearing } from "./terrainShade.js";

export const BOX = { background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "12px 14px", marginBottom: ROUTE_GAP };
export const MUTED = { fontSize: 12.5, color: C.textSub, lineHeight: 1.55 };
export const RETRY = { marginTop: 6, background: C.surface, color: C.blue, border: "1px solid " + C.border, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
export const KIND_LABEL = { glacier: "Glacier & snow", alpineice: "Alpine ice & mixed", waterfall: "Waterfall ice", cragmixed: "Mixed", scramble: "Scrambling", alpinerock: "Alpine rock" };
// "6:51 AM" at the forecast point, in its own zone on THAT date (a clock change mid-series moves it, lib/alpineConditions.js localAt).
export function clockOf(fc, unixS) {
  const l = localAt(fc, unixS), hr = l.hr, h12 = hr % 12 || 12;
  return h12 + ":" + String(l.min).padStart(2, "0") + (hr < 12 ? " AM" : " PM");
}
// Visibility in the climber's units: miles to a tenth, or kilometres to a tenth.
// Capped at 10 mi / 16 km: the model can return 200 km, and a number that precise says nothing a climber can use.
export function visText(m) { return m >= 16093 ? (uImp() ? "10+ mi" : "16+ km") : uImp() ? (m / 1609.344).toFixed(1) + " mi" : (m / 1000).toFixed(1) + " km"; }
// "until Thu 4:00 PM" / "from Thu 12:00 PM until Thu 7:00 PM": an alert's own event window, in the route's local time.
export function windowLabel(fc, a) {
  const st = function (ms) { return new Date(localAt(fc, ms / 1000).date + "T12:00:00Z").toLocaleDateString(DLOCALE, { weekday: "short", timeZone: "UTC" }) + " " + clockOf(fc, ms / 1000); };
  const now = Date.now();
  if (a.end == null) return a.start != null && a.start > now ? "from " + st(a.start) : "in effect";
  return (a.start != null && a.start > now ? "from " + st(a.start) + " " : "") + "until " + st(a.end);
}
// "1 PM–4 PM": a rain window at whole hours, in the forecast point's own clock.
export const hrSpan = (fc, from, to) => clockOf(fc, from).replace(":00", "") + "–" + clockOf(fc, to).replace(":00", "");
/* THE HEIGHT WHEN THE ROUTE STATES NONE (census 2026-10-29: 4,903 of 6,208 alpine, mountaineering and scrambling routes
   have no summit pin, no high point and no area elevation). Asked without one, Open-Meteo reads the ground at the
   coordinate from its own terrain model and returns that height as `elevation` (metres): the height the forecast IS
   for. Without it every flag that compares the freezing level with the summit stayed silent on four routes in five. */
export const groundFt = (fc) => (fc && typeof fc.elevation === "number" && isFinite(fc.elevation) ? Math.round(fc.elevation * 3.28084) : null);
// Round a start DOWN to the quarter hour: rounding up would start later than the arithmetic says.
export const floorQ = (s) => Math.floor(s / 900) * 900;
export function flagText(f, fc) {
  const v = f.v || {};
  switch (f.key) {
    case "ice-warm-night": return "No freeze last night (low " + uTemp(v.low) + ") — warm nights destabilise ice most";
    case "ice-warm-run": return v.days + " days in a row above freezing — a pillar can be undercut and still look solid";
    case "ice-rise": return "Temperature up " + uTempDelta(v.delta) + "° in 48 hours";
    case "ice-drop": return "Temperature falls " + uTempDelta(v.delta) + "° in 6 hours — a sudden cold snap can fracture hanging ice";
    case "ice-rain": return "Rain on the ice — it saturates and delaminates";
    case "ice-not-in": return "Only " + v.cold + " day" + (v.cold === 1 ? "" : "s") + " below freezing in the past week — the ice may not be in";
    case "ice-snow": return uSnowfall(v.inch) + " of new snow — check what is loaded above the gully";
    case "ice-wind": return "Gusts to " + uWind(v.gust) + " — wind loading the slopes above";
    case "mixed-not-frozen": return "Only " + v.frozen + " of the last " + v.of + " days stayed below freezing — loose blocks and turf need weeks of cold to freeze in";
    case "thunder": return v.likely ? "Thunderstorms forecast" : "Thunderstorms possible";
    case "no-refreeze": return "No overnight freeze at " + uElev(v.ft) + " — the snow starts soft" + (v.glacier ? " and bridges are weak" : "");
    case "fl-above-night": return "Freezing level above the summit all night";
    case "fl-above": return "Freezing level " + uElev(Math.round(v.above / 100) * 100) + " above the summit by afternoon — expect rock and ice fall";
    case "verglas": return "Wet, then below freezing on the route — ice or snow on the holds";
    case "wet-rock": return uPrecip(v.inch) + " of rain in the last two days — wet rock climbs harder than its grade";
    case "showers": return v.pct + "% chance of rain" + (v.inch == null ? "" : v.hrs ? ", about " + uPrecip(v.inch) + " over " + v.hrs + " h" + (fc && v.from != null ? " (" + hrSpan(fc, v.from, v.to) + ")" : "") : ", though no measurable rain is forecast in daylight") + " — retreating or rappelling wet is where things go wrong";
    case "new-snow": return uSnowfall(v.inch) + " of new snow at the summit" + (v.scramble ? " — a snowed-up scramble is a winter climb" : "");
    case "wind": return "Summit gusts to " + uWind(v.gust) + " in daylight";
    case "alert": return "Weather alert: " + v.event + " (" + String(v.severity).toLowerCase() + " severity), " + v.when + " — covers a whole forecast zone, not just this route";
    case "fog": return "Fog in the forecast: visibility under " + uDistMi(0.621371) + " for " + v.hours + " daylight hour" + (v.hours === 1 ? "" : "s") + " from " + v.from + " — a model estimate whose accuracy in the mountains is unchecked; no fog hour is not a clear day";
    case "smoke": return "Smoke and air quality: US AQI up to " + Math.round(v.aqi) + " (" + aqiWord(v.aqi).toLowerCase() + ") — a forecast for the area, not a reading at the route; smoke aloft or pooled in a valley is not seen";
    case "models-disagree": return "Forecast models disagree on this day (" + [v.over.indexOf("gust") >= 0 ? "gusts " + uWind(v.gust[0]) + "–" + uWind(v.gust[1]) : null, v.over.indexOf("high") >= 0 ? "highs " + uTemp(v.high[0]) + "–" + uTemp(v.high[1]) : null, v.over.indexOf("fl") >= 0 ? "freezing level " + uElev(Math.round(v.fl[0] / 100) * 100) + "–" + uElev(Math.round(v.fl[1] / 100) * 100) : null, v.over.indexOf("rain") >= 0 ? "rain " + uPrecip(v.rain[0]) + "–" + uPrecip(v.rain[1]) : null].filter(Boolean).join(", ") + ") — read its flags as low confidence";
    case "wind-chill": return "Wind chill " + uTemp(v.chill) + " — frostbite on exposed skin in about 30 minutes";
    default: return f.key;
  }
}
/* REPORT FRESHNESS: how recent the newest trip report here is. Conditions change, so the age of the latest word
   is itself a fact worth stating. A failed read of the reports is not "no reports". */
export function reportFreshness(activity, nowMs) {
  /* Counted between CALENDAR dates -- the report's own date and today's on this device -- never from noon UTC of
     the report's date to this instant, which called a report dated today "yesterday" from 5 PM on in the Pacific. */
  const t = new Date(nowMs != null ? nowMs : Date.now()), today = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate(), 12);
  const ds = (activity || []).map(function (a) { return a && a.date ? Date.parse(String(a.date).slice(0, 10) + "T12:00:00Z") : NaN; }).filter(function (x) { return isFinite(x); }).sort(function (a, b) { return b - a; });
  if (!ds.length) return null;
  return { newest: ds[0], daysAgo: Math.max(0, Math.round((today - ds[0]) / 864e5)), last14: ds.filter(function (x) { return x > today - 14 * 864e5; }).length, total: ds.length };
}
/* SUN AND SHADE — when the sun reaches the route's own pins, from the terrain (lib/terrainShade.js).
   Research, 2026-10-08: rockfall, icefall and wet slides start when the sun reaches the slopes ABOVE
   a party, so the advice everywhere is to work back from sun arrival (Torreys Peak couloir accident,
   AAC; Mont Blanc's Goûter couloir monitoring, where the safe hour is specific to each couloir;
   Portland Mountain Rescue; a Devil's Kitchen report where rime let go as the sun hit the walls).
   Wet loose snow follows the sun round the aspects — east first, west in the warm afternoon — and
   centres put the slope that lets go at about 35° (STEEP_DEG). Not scored, and it moves no start time:
   the start stays the Planner's, counted back from the snow and the storms. */
export const SUN_PINS = [["Summit", "Summit"], ["Topout", "Top"], ["Base", "Base"], ["Campsite", "High camp"]];
export function sunPins(route) {
  const wps = (route.waypoints || []).filter(wpPlaced), out = [];
  SUN_PINS.forEach(function (sp) {
    let ws = wps.filter(function (w) { return wpIs(w, sp[0]); });
    if (!ws.length) return;
    // The highest camp is the one a summit day leaves from.
    if (sp[0] === "Campsite") ws = ws.slice().sort(function (a, b) { return (+b.elev || 0) - (+a.elev || 0); });
    if (sp[0] === "Topout" && out.some(function (p) { return p.key === "Summit"; })) return;
    // A summit is read at the terrain's own high point beside the pin (lib/terrainShade.js highestNear).
    out.push({ key: sp[0], label: sp[1], lat: +ws[0].lat, lng: +ws[0].lng, top: sp[0] === "Summit" });
  });
  return out;
}
/* What the start needs to count in sun on the face: the summit (or top-out) pin, the way the face
   looks (`aspect`, one direction), and the height the push starts from (the highest camp on a
   multi-day route, else the trailhead's, which errs early). `missing` names what isn't on file — measured 2026-10-08,
   1 of ~935 snow/ice routes has a base pin, so the face is read from the top. Glacier and alpine ice
   only; null for every other kind. */
export const SUN_FACE = /\b(face|couloir|gully|chute|glacier|headwall|wall|bowl|icefall|ice ?fall|gulch|chimney|slabs?)\b/i, SUN_RIDGE = /\b(ridge|ar[eê]te|buttress|spur|cleaver|traverse)\b/i;
export function sunFace(route, kind, pt, fromCamp) {
  if (kind !== "glacier" && kind !== "alpineice") return null;
  const pins = sunPins(route), top = pins.find(function (p) { return p.key === "Summit" || p.key === "Topout"; });
  const deg = faceBearing(route.aspect);
  const ht = function (t) { return (route.waypoints || []).filter(function (w) { return wpIs(w, t) && w.elev != null && w.elev !== "" && isFinite(+w.elev); }).map(function (w) { return +w.elev; }); };
  const thFt = ht("Trailhead").length ? ht("Trailhead")[0] : null, camps = ht("Campsite");
  // A camp's height, placed or not; with none on file, the trailhead's: LOWER, so the start errs early.
  const fromFt = fromCamp && camps.length ? Math.max.apply(null, camps) : thFt;
  if (!top) return { missing: "summit" };
  // A RIDGE has almost nothing draining onto its crest: what sheds off either flank falls away from
  // it, so the fall line down one side is not the route (78 of the 325 routes with a summit pin and
  // an aspect, 2026-10-08). A name that also says face, couloir, gully or glacier is read as that.
  if (SUN_RIDGE.test(route.name || "") && !SUN_FACE.test(route.name || "")) return { missing: "ridge" };
  if (deg == null) return { missing: "aspect" };
  if (fromFt == null) return { missing: "from" };
  return { top: top, deg: deg, fromFt: fromFt, ctr: pins.find(function (p) { return p.key === "Base"; }) || top };
}
export const HEAD = { marginBottom: 6 };
/* RECENT OUTCOMES: what parties who reported here in the last 60 days did -- summited, attempted or
   turned around, and why, read straight from their reports (tick type, outcome reasons, note).
   Nothing is inferred, and with no such report the section is absent rather than "no one summited". */
export function recentOutcomes(activity, nowMs) {
  const cut = (nowMs != null ? nowMs : Date.now()) - 60 * 864e5;
  return (activity || []).filter(function (a) { return a && (summitedLog(a) || /^(Summit|Attempt|Turned around)$/.test(a.tickType || "")) && a.date && Date.parse(String(a.date).slice(0, 10) + "T12:00:00Z") >= cut; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
}
