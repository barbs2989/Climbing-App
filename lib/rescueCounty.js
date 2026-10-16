// Which county a climb sits in, and that county's own rescue dispatch line.
//
// In the US, search and rescue is run by the county sheriff of the county the climber is IN.
// The EMERGENCY & RESCUE card used to key its dispatch list by STATE, so every Utah climb —
// Castleton Tower above Moab included — listed Utah County, Salt Lake County, Grand County and
// Washington County side by side, and the one that would actually come for you was third.
// Now the card asks which county the climb's own coordinate falls in and shows that county
// only. A route's stored `emergency.county` (researched, or a climber's edit) wins over the
// lookup; the lookup is the default for the ~all routes that have none.
//
// The lookup is the FCC Census Area API: free, keyless, CORS-open, and it answers a point with
// the 2020 census county. Answers are cached per ~100 m cell in memory and localStorage, so a
// pinned route already looked up still names its county with no signal. A FAILED lookup is
// reported as failed, not as "no county" — the card then says only what it knows (dial 911).

import { useEffect, useState } from "react";

const KEY = "climbmatch-county-cache";
const mem = new Map();

const cell = (lat, lng) => lat.toFixed(3) + "," + lng.toFixed(3);

function loadCache() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function remember(k, v) {
  mem.set(k, v);
  try {
    const all = loadCache();
    all[k] = v;
    // A few hundred cells is far past what one climber opens; cap it so the key cannot grow
    // without bound across months of browsing.
    const keys = Object.keys(all);
    if (keys.length > 400) for (const old of keys.slice(0, keys.length - 400)) delete all[old];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* a cache; never take the card down */ }
}

// { county:"Grand County", state:"Utah" } | null (the point is outside any US county) — throws
// on a network or service failure so the caller can tell the two apart.
export async function countyAt(lat, lng) {
  const k = cell(lat, lng);
  if (mem.has(k)) return mem.get(k);
  const cached = loadCache()[k];
  if (cached !== undefined) { mem.set(k, cached); return cached; }
  const r = await fetch("https://geo.fcc.gov/api/census/area?format=json&lat=" + lat + "&lon=" + lng);
  if (!r.ok) throw new Error("county lookup " + r.status);
  const j = await r.json();
  const hit = j && Array.isArray(j.results) && j.results[0];
  const v = hit && hit.county_name ? { county: hit.county_name, state: hit.state_name || null } : null;
  remember(k, v);
  return v;
}

// status: "none" (no coordinate to ask about) | "loading" | "ok" | "failed"
export function useCountyAt(lat, lng) {
  const ok = Number.isFinite(lat) && Number.isFinite(lng);
  const [st, setSt] = useState({ status: ok ? "loading" : "none", value: null });
  useEffect(() => {
    if (!ok) { setSt({ status: "none", value: null }); return; }
    let live = true;
    setSt({ status: "loading", value: null });
    countyAt(lat, lng).then(
      (value) => { if (live) setSt({ status: "ok", value }); },
      () => { if (live) setSt({ status: "failed", value: null }); }
    );
    return () => { live = false; };
  }, [ok, lat, lng]);
  return st;
}

// The coordinate that places a climb: its own, then its area's, then the area's parking, then
// the first waypoint that carries one. Any of them sits in the right county for every climb
// whose approach does not cross a county line, which is the case the card can speak to.
export function climbPoint(route, area) {
  const pts = [
    [route && route.lat, route && route.lng],
    [area && area.lat, area && area.lng],
    [area && area.parkingLat, area && area.parkingLng],
  ];
  const wp = route && Array.isArray(route.waypoints) ? route.waypoints.find((w) => w && Number.isFinite(+w.lat) && Number.isFinite(+w.lng)) : null;
  if (wp) pts.push([+wp.lat, +wp.lng]);
  for (const [a, b] of pts) if (Number.isFinite(a) && Number.isFinite(b) && !(a === 0 && b === 0)) return [a, b];
  return [null, null];
}

// A county's own published non-emergency dispatch, keyed "State|County". ONLY numbers the
// agency itself publishes for that purpose (checked 2026-10-15). An unlisted county shows no
// number at all, never a neighbour's — a plausible wrong dispatch line is worse than none.
//   Grand County, UT — grandcountyutah.net staff directory, Search & Rescue: 435-259-8115.
//   Utah County, UT  — utahcounty.gov/Safety.html, "Non Emergency Dispatch" and "Sheriff
//                      Search and Rescue": 801-794-3970.
//   Salt Lake County — unifiedpoliceut.gov/contact-us, "Dispatch Center ... Non-Emergency":
//                      801-840-4000. (The 801-743-7100 this card used to print is published
//                      nowhere; the department's main line is 743-7000.)
// Washington County's old (435) 634-5730 was dropped: Washington CITY publishes it as its own
// police and fire line, and no county page confirms it for the sheriff.
export const SAR_BY_COUNTY = {
  "Utah|Grand County": ["Grand County Sheriff (Moab)", "(435) 259-8115"],
  "Utah|Utah County": ["Utah County Sheriff dispatch", "(801) 794-3970"],
  "Utah|Salt Lake County": ["Salt Lake County · Unified Police dispatch", "(801) 840-4000"],
};

// "Grand County" and "Grand" and "grand county" are one county.
export function sarFor(state, county) {
  if (!state || !county) return null;
  const c = String(county).trim().replace(/\s+county$/i, "").toLowerCase();
  for (const k of Object.keys(SAR_BY_COUNTY)) {
    const [s, n] = k.split("|");
    if (s.toLowerCase() === String(state).trim().toLowerCase() && n.replace(/\s+county$/i, "").toLowerCase() === c) return SAR_BY_COUNTY[k];
  }
  return null;
}
