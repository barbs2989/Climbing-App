// The Conditions tab for alpine, mountaineering, scrambling, ice and mixed routes: route-aware FLAGS
// and a start time, never a score (owner decision 2026-10-07). The judgement lives in
// lib/alpineConditions.js; this file only fetches, picks the day and words the flags in the
// climber's own units. The crag score (ConditionsScoreCard) is a different card for different
// disciplines -- the two never render on one route.
import { useMemo } from "react";
import { ROUTE_GAP, wpIs, wpPlaced, catOf } from "../ClimbMatchCore.jsx";
import { condKind } from "./alpineConditions.js";
import { routeTerrain } from "./terrain.js";
import { reportFreshness, recentOutcomes, BOX, clockOf, sunPins, groundFt, KIND_LABEL, flagText, sunFace } from "./alpineConditionsShared.js";
import ReportFreshness from "../src/components/ReportFreshness.tsx";
import OutcomesSection from "../src/components/OutcomesSection.tsx";
import SeasonSection from "../src/components/SeasonSection.tsx";
import SnowSection from "../src/components/SnowSection.tsx";
import AvalancheSection from "../src/components/AvalancheSection.tsx";
import StreamsSection from "../src/components/StreamsSection.tsx";
import ForecastBox from "../src/components/ForecastBox.tsx";
export { reportFreshness, recentOutcomes, clockOf, sunPins, groundFt, KIND_LABEL, flagText, sunFace };

/* The forecast point: the route's own summit/top-out pin, else its area's coordinate at the route's
   high point (high_point_ft agrees with the summit pin exactly on 83.5% of rows). */
export function forecastPoint(route, mtn) {
  const wps = (route.waypoints || []).filter(wpPlaced);
  const top = wps.find(function (w) { return wpIs(w, "Summit") || wpIs(w, "Topout"); });
  const area = route._dbArea || mtn || {};
  const camps = wps.filter(function (w) { return wpIs(w, "Campsite") && w.elev != null; });
  const campFt = camps.length ? Math.max.apply(null, camps.map(function (w) { return +w.elev; })) : null;
  const elev = top && top.elev != null ? +top.elev : route.highPointFt != null ? +route.highPointFt : area.elevation != null ? +area.elevation : null;
  const lat = top ? +top.lat : area.lat != null ? +area.lat : mtn && mtn.lat != null ? +mtn.lat : null;
  const lng = top ? +top.lng : area.lng != null ? +area.lng : mtn && mtn.lng != null ? +mtn.lng : null;
  if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
  return { lat, lng, elevFt: elev != null && isFinite(elev) ? elev : null, campFt, name: top ? (top.name || "the summit") : (area.name || "the area"), pinned: !!top };
}

export default function AlpineConditionsCard({ route, mtn, calc, activity, reportsUnavailable }) {
  const terrain = useMemo(function () { return routeTerrain(route); }, [route]);
  const kind = condKind(route, terrain, catOf(route));
  const pt = useMemo(function () { return forecastPoint(route, mtn); }, [route, mtn]);
  if (!kind) return null;
  /* Avalanche danger unless the route's own data rules avalanche terrain out (terrain.avalanche
     "no": a dry rock scramble). "unknown" still shows it -- suppression needs evidence. */
  const avyOn = terrain.avalanche !== "no";
  const th = pt ? (route.waypoints || []).filter(wpPlaced).find(function (w) { return wpIs(w, "Trailhead"); }) : null;
  const trailhead = th ? { lat: +th.lat, lng: +th.lng, name: th.name || "the trailhead" } : pt ? { lat: pt.lat, lng: pt.lng, name: null } : null;
  return <div>
    <ForecastBox route={route} calc={calc} kind={kind} terrain={terrain} pt={pt} />
    {pt ? <div style={BOX}>
      {avyOn ? <AvalancheSection pt={pt} /> : null}
      <div style={{ marginTop: avyOn ? ROUTE_GAP : 0 }}><SnowSection pt={pt} /></div>
      {kind !== "waterfall" && kind !== "cragmixed" ? <div style={{ marginBottom: ROUTE_GAP }}><StreamsSection pt={pt} base={trailhead} /></div> : null}
      <OutcomesSection activity={activity} />
      <ReportFreshness activity={activity} unavailable={reportsUnavailable} />
      <div style={{ marginTop: 14 }}><SeasonSection pt={pt} /></div>
    </div> : null}
  </div>;
}

