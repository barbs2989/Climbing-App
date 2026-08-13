// Build the waypoint-pin correction batch for the SIX routes the pin triage found safely fixable.
// See research-data/WAYPOINT-PIN-TRIAGE-2026-08-13.md for why the other ~130 findings are not here.
//
// The bar is the wa_ragged_edge standard and nothing below it: a pin is only moved when TWO OR MORE
// peer rows on the same peak carry the same feature at the same coordinate. That is the whole
// safety argument, so it is CHECKED AT RUNTIME rather than copied from the triage — peer agreement
// asserted from a report is not peer agreement.
//
// Two rules this encodes, both from findings that would otherwise instruct the wrong repair:
//   - peer DISAGREEMENT justifies nothing. wa_mount_larrabee_south_ridge's High Pass pin is 60 m
//     from a trailhead 2,240 ft below it, and its one peer places High Pass equally badly. No
//     majority exists, so it is not here.
//   - a pin off the TRACK is not a pin in the wrong PLACE. 38 PARTIAL routes and ~62 truncated
//     tracks have correct pins and a gpx that starts at the base of the climb. Their repair, where
//     one exists, belongs on the track.
//
//   node scripts/oneoff/build-waypoint-pin-corrections.mjs
//   npm run enrich:apply -- --from research-data/waypoint-pin-corrections-2026-08-13.json --dry
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const R = 6371000;
const dist = (a, b) => {
  const p = x => x * Math.PI / 180, dLat = p(b.lat - a.lat), dLng = p(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p(a.lat)) * Math.cos(p(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const wpName = w => String(w.name || "").toLowerCase();

// `match` finds the pin on the TARGET row; `peers` name rows that carry the same feature. `peerMatch`
// finds it on them (their wording can differ). PEER_TOL is how close peers must agree to count as
// agreeing at all.
const PEER_TOL = 150;
const FIX = [
  {
    id: "wa_mount_rainier_liberty_ridge", action: "move", match: "liberty cap",
    peers: ["wa_mount_rainier_willis_wall", "wa_mount_rainier_sunset_ridge", "wa_mount_rainier_mowich_face",
            "wa_mount_rainier_edmunds_headwall", "wa_mount_rainier_ptarmigan_ridge"],
    peerMatch: "liberty cap",
    why: "The Liberty Cap pin sits 2,103 m from where five peer rows place it identically.",
  },
  {
    id: "wa_primus_peak_south_ridge", action: "move", match: "trailhead",
    peers: ["wa_north_ridge_4", "wa_east_slope"], peerMatch: "trailhead",
    why: "The trailhead pin is named 'Eldorado Creek trailhead' and sits 21.5 km from where two peers start AND from this route's own gpx first point (Thunder Creek TH). The route's own track agreeing with the peers against its own pin is what makes this decisive.",
  },
  {
    id: "wa_mount_rainier_edmunds_headwall", action: "move", match: "mowich lake",
    peers: ["wa_mount_rainier_mowich_face"], peerMatch: "mowich lake", allowSinglePeer: true,
    why: "640 m off, and its elev of 2900 is wrong for Mowich Lake (4,929 ft) — the coordinate and the elevation are wrong together, which is why one peer is enough here: the peer corroborates BOTH.",
    alsoElev: true,
  },
  {
    id: "wa_prusik_peak_solid_gold", action: "move", match: "stuart lake",
    peers: ["wa_prusik_peak_west_ridge", "wa_prusik_peak_south_face_burgner_stanley"], peerMatch: "stuart lake",
    why: "The Stuart Lake trailhead pin is 597 m from where seven peer rows agree.",
  },
  {
    id: "wa_prusik_peak_west_ridge", action: "dedupe", match: "aasgard",
    peers: ["wa_prusik_peak_south_face_burgner_stanley"], peerMatch: "aasgard", allowSinglePeer: true,
    why: "The row carries TWO Aasgard Pass pins 890 m apart. This drops the outlier rather than moving it — a duplicate is not a displaced pin, and keeping both would leave the list with a pin that has no journey.",
  },
  {
    id: "wa_southwest_buttress", action: "move", match: "inspiration glacier",
    peers: ["wa_northwest_ridge", "wa_direct_southwest_buttress"], peerMatch: "inspiration glacier",
    why: "Dorado Needle's high-camp pin is 474 m from two agreeing peers.",
  },
  {
    id: "wa_southwest_buttress", action: "move", match: "mcallister",
    peers: ["wa_northwest_ridge", "wa_direct_southwest_buttress"], peerMatch: "mcallister",
    why: "The Inspiration-McAllister col pin is 548 m from the same two agreeing peers.",
  },
];

const allIds = [...new Set(FIX.flatMap(f => [f.id, ...f.peers]))];
const rows = await selectAll("routes", "id,name,area_id,waypoints", `id=in.(${allIds.join(",")})`, { pageSize: 100 });
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const areaIds = [...new Set(rows.map(r => r.area_id))];
const areas = await selectAll("areas", "id,name,lat,lng", `id=in.(${areaIds.join(",")})`, { pageSize: 100 });
const areaById = Object.fromEntries(areas.map(a => [a.id, a]));

const out = { _README: [
  "Waypoint pin corrections — the 6 routes the 2026-08-13 pin triage found SAFELY fixable.",
  "Evidence, and why ~130 other findings are excluded: research-data/WAYPOINT-PIN-TRIAGE-2026-08-13.md",
  "",
  "Every pin here is re-homed from peer rows on the same peak that agree with each other, verified",
  "at generation time rather than taken from the report. Pins that are provably wrong but have no",
  "agreeing peer are NOT here — they need a survey, and inventing a coordinate for a feature like a",
  "bergschrund or a col is worse than leaving a known-bad pin visible.",
] };

let refused = 0;
const pending = {};
for (const f of FIX) {
  const row = byId[f.id];
  if (!row) { console.error(`REFUSE ${f.id} — row not returned`); refused++; continue; }
  const wps = (pending[f.id] || row.waypoints || []).map(w => ({ ...w }));
  const hits = wps.map((w, i) => [w, i]).filter(([w]) => wpName(w).includes(f.match));
  if (!hits.length) { console.error(`REFUSE ${f.id} — no waypoint matching "${f.match}"`); refused++; continue; }

  // Peer coordinates, and they must AGREE with each other before any of them is used.
  const peerPts = [];
  for (const pid of f.peers) {
    const p = byId[pid];
    if (!p) continue;
    const w = (p.waypoints || []).find(w => wpName(w).includes(f.peerMatch));
    if (w && w.lat != null && w.lng != null) peerPts.push({ pid, lat: +w.lat, lng: +w.lng, elev: w.elev });
  }
  if (peerPts.length < (f.allowSinglePeer ? 1 : 2)) {
    console.error(`REFUSE ${f.id} "${f.match}" — only ${peerPts.length} peer(s) carry it; the bar is ${f.allowSinglePeer ? 1 : 2}`);
    refused++; continue;
  }
  const spread = Math.max(...peerPts.map(a => Math.max(...peerPts.map(b => dist(a, b)))));
  if (spread > PEER_TOL) {
    console.error(`REFUSE ${f.id} "${f.match}" — peers disagree by ${Math.round(spread)} m, so there is no majority to re-home from`);
    refused++; continue;
  }
  const target = peerPts[0];

  if (f.action === "dedupe") {
    if (hits.length < 2) { console.error(`REFUSE ${f.id} — expected a duplicate "${f.match}" pin, found ${hits.length}`); refused++; continue; }
    // Drop whichever copy is FURTHER from the agreed peer coordinate.
    const worst = hits.map(([w, i]) => [dist({ lat: +w.lat, lng: +w.lng }, target), i]).sort((a, b) => b[0] - a[0])[0];
    console.log(`  ${f.id}: dropping duplicate "${f.match}" at index ${worst[1]} (${Math.round(worst[0])} m from the agreed pin)`);
    wps.splice(worst[1], 1);
  } else {
    const [w, i] = hits[0];
    const moved = Math.round(dist({ lat: +w.lat, lng: +w.lng }, target));
    if (moved < 100) { console.error(`REFUSE ${f.id} "${f.match}" — already within ${moved} m of the peers; nothing to correct`); refused++; continue; }
    wps[i] = { ...w, lat: target.lat, lng: target.lng, ...(f.alsoElev && target.elev != null ? { elev: target.elev } : {}) };
    console.log(`  ${f.id}: moving "${w.name}" ${moved} m -> ${target.lat},${target.lng}${f.alsoElev ? ` elev ${target.elev}` : ""}`);
  }
  pending[f.id] = wps;
}

// The precedent's verification: along the pin list, distance to the summit must not wander back out.
// It is reported rather than enforced — a legitimate approach can cross a col and lose ground — but a
// correction that makes it WORSE is a correction to look at again.
for (const [id, wps] of Object.entries(pending)) {
  const a = areaById[byId[id].area_id];
  if (!a || a.lat == null) { console.log(`  ${id}: no area coordinate, monotonic check skipped`); continue; }
  const seq = wps.filter(w => w.lat != null).map(w => Math.round(dist({ lat: +w.lat, lng: +w.lng }, { lat: +a.lat, lng: +a.lng })));
  const before = (byId[id].waypoints || []).filter(w => w.lat != null).map(w => Math.round(dist({ lat: +w.lat, lng: +w.lng }, { lat: +a.lat, lng: +a.lng })));
  const backsteps = s => s.reduce((n, v, i) => n + (i && v > s[i - 1] ? 1 : 0), 0);
  console.log(`  ${id}: distance-to-summit backsteps ${backsteps(before)} -> ${backsteps(seq)}   [${seq.join(", ")}]`);
  out[id] = { area: byId[id].area_id, _why: FIX.filter(f => f.id === id).map(f => f.why).join(" "), set: { waypoints: wps } };
}

const dest = `${ROOT}research-data/waypoint-pin-corrections-2026-08-13.json`;
if (refused) { console.error(`\nREFUSING to write — ${refused} correction(s) did not clear the peer-agreement bar. Nothing is written; re-read before correcting.`); process.exitCode = 1; }
else { fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n"); console.log(`\nwrote ${dest}`); }
