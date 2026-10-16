#!/usr/bin/env node
// What changes on the Plan tab's TRAILHEAD card if it resolves through trailheadPoint()?
//
// The card is not just a label: its coordinate feeds the Google Maps DIRECTIONS link, the
// copy-to-clipboard value, and the bearing/distance "To the peak" tile. So a precedence split is
// four wrong things, not one.
//
// Measured before changing anything, because "which record is right" varies per route and
// CLAUDE.md is explicit that swapping a priority to fix the DATA would only move the error. The
// defect being fixed here is different and narrower: two surfaces on ONE page disagreeing with
// each other. Consistency is the fix; the underlying disagreement stays a data question.
import { selectAll } from "../lib/supabase-env.mjs";

const wpIs = (w, t) => w && String(w.type || "").toLowerCase() === String(t).toLowerCase();
const wpPlaced = (w) => {
  if (!w) return false;
  const { lat: a, lng: b } = w;
  if (a == null || b == null || a === "" || b === "") return false;
  return Number.isFinite(Number(a)) && Number.isFinite(Number(b));
};
function trailheadPoint(route) {
  const wps = route.waypoints || [], al = route.approachLogistics || {};
  const pin = wps.find((w) => wpIs(w, "Trailhead") && wpPlaced(w));
  if (pin) return { lat: Number(pin.lat), lng: Number(pin.lng), name: pin.name || pin.label || "Trailhead", via: "pin" };
  if (wpPlaced({ lat: al.trailheadLat, lng: al.trailheadLng })) return { lat: Number(al.trailheadLat), lng: Number(al.trailheadLng), name: al.trailhead || "Trailhead", via: "logistics" };
  const named = wps.find((w) => wpPlaced(w) && /trailhead|parking|\bth\b/i.test(String(w.name || w.label || "")));
  return named ? { lat: Number(named.lat), lng: Number(named.lng), name: named.name || named.label || "Trailhead", via: "named" } : null;
}

const m = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const rows = await selectAll("routes", "id,waypoints,approach_logistics", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

let cards = 0, coordMoved = 0, nameChanged = 0, elevDropped = 0, vanished = 0, appeared = 0;
const dists = [], nameEx = [], bigMoves = [];
for (const r of rows) {
  const route = { waypoints: r.waypoints, approachLogistics: r.approach_logistics };
  const wps = route.waypoints;
  if (!Array.isArray(wps) || !wps.length) continue;
  const al = route.approachLogistics || {};
  const wp = wps.find((w) => wpIs(w, "Trailhead")) || null;

  // BEFORE — TrailheadCard as shipped.
  const bName = al.trailhead || (wp && wp.name) || null;
  const bLat = al.trailheadLat != null ? al.trailheadLat : (wp && wp.lat != null ? Number(wp.lat) : null);
  const bLng = al.trailheadLng != null ? al.trailheadLng : (wp && wp.lng != null ? Number(wp.lng) : null);
  const bHas = bLat != null && bLng != null && !isNaN(bLat) && !isNaN(bLng);
  const bElev = (wp && wp.elev != null) ? wp.elev : null;
  const bRenders = !!(bName || bHas);

  // AFTER — resolved through trailheadPoint(); elevation only when the PIN is the source, since a
  // pin's height beside a logistics coordinate is two records welded together.
  const tp = trailheadPoint(route);
  /* THE NAME DOES NOT SIMPLY FOLLOW THE COORDINATE, and measuring showed why: taking the pin's
     name wholesale changed 530 cards and most were DOWNGRADES — "Killen Creek Trailhead (Trail
     #113, FR-2329)" losing its road and trail number to a bare "Killen Creek Trailhead". The
     logistics field is the curated one and on the routes where both records mean the same place
     it is strictly better copy.
     It is only wrong when the two records mean DIFFERENT places. So: keep al.trailhead, unless the
     coordinate now comes from the pin and the logistics coordinate is far enough away that its
     name is describing somewhere else — measured, that boundary is a KILOMETRE, not a hundred
     metres: the split's p50 is 46 m and its p90 is 290 m, which is records being imprecise about
     one trailhead, while the four cases over 1 km are peaks with two GENUINE approaches. */
  const logi = wpPlaced({ lat: al.trailheadLat, lng: al.trailheadLng })
    ? { lat: Number(al.trailheadLat), lng: Number(al.trailheadLng) } : null;
  const farApart = !!(tp && tp.via === "pin" && logi && m(tp, logi) > 1000);
  const aName = (farApart && tp.name) ? tp.name : (al.trailhead || (wp && wp.name) || (tp && tp.name) || null);
  const aHas = !!tp;
  const aElev = (tp && tp.via === "pin" && wp && wp.elev != null) ? wp.elev : null;
  const aRenders = !!(aName || aHas);

  if (bRenders) cards++;
  if (bRenders && !aRenders) vanished++;
  if (!bRenders && aRenders) appeared++;
  if (bHas && aHas) {
    const d = m({ lat: Number(bLat), lng: Number(bLng) }, tp);
    if (d >= 1) { coordMoved++; dists.push(d); if (d > 1000) bigMoves.push({ id: r.id, d, via: tp.via }); }
  }
  if (bName !== aName) { nameChanged++; if (nameEx.length < 12) nameEx.push({ id: r.id, before: bName, after: aName }); }
  if (bElev != null && aElev == null) elevDropped++;
}

dists.sort((a, b) => a - b);
const pct = (p) => dists.length ? dists[Math.min(dists.length - 1, Math.floor(dists.length * p))] : 0;
console.log(`${cards} routes render a TRAILHEAD card.\n`);
console.log(`coordinate MOVES        : ${coordMoved}   p50 ${Math.round(pct(0.5))} m   p90 ${Math.round(pct(0.9))} m   max ${Math.round(dists[dists.length - 1] || 0)} m`);
console.log(`  ...of those, >1 km    : ${bigMoves.length}`);
console.log(`displayed NAME changes  : ${nameChanged}`);
console.log(`elevation tile dropped  : ${elevDropped}   (pin height beside a logistics coordinate)`);
console.log(`card VANISHES           : ${vanished}   (must be 0 — losing a surface is not a fix)`);
console.log(`card APPEARS            : ${appeared}\n`);
for (const b of bigMoves.sort((x, y) => y.d - x.d)) console.log(`  >1km  ${(b.d / 1000).toFixed(2)} km  ${b.id}  (now via ${b.via})`);
console.log("");
for (const n of nameEx) console.log(`  name  ${n.id}\n          before ${JSON.stringify(n.before)}\n          after  ${JSON.stringify(n.after)}`);
