#!/usr/bin/env node
// Verify the NEARBY PEAKS selection without a browser, a render or the DB — the Supabase
// database was down when this shipped (PostgREST answering PGRST002), so the live query could
// not be exercised and the logic had to be provable some other way.
//
// It drives the exported pure halves of lib/DbAreaBrowser.jsx directly. Fixtures use real
// Washington coordinates so the distances mean something and a sign error shows up as a
// number a human can recognise as wrong.

import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-np-")), "b.cjs");
await build({
  stdin: {
    contents: `export { nearbyPeaksLive, nearbyPeaksBounds, nearbyPeaksRows } from ${JSON.stringify(path.join(ROOT, "lib/DbAreaBrowser.jsx"))};`,
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { nearbyPeaksLive, nearbyPeaksBounds, nearbyPeaksRows } = require_(out);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// Real WA summits. Stuart->Sherpa is ~1.3 mi, Stuart->Colchuck ~5 mi, Stuart->Baker ~85 mi.
const STUART = { id: "wa_mount_stuart", name: "Mount Stuart", area_type: "peak", lat: 47.4751, lng: -120.9026, route_count: 24 };
const SHERPA = { id: "wa_sherpa_peak", name: "Sherpa Peak", area_type: "peak", lat: 47.4783, lng: -120.8790, route_count: 6 };
const COLCHUCK = { id: "wa_colchuck_peak", name: "Colchuck Peak", area_type: "peak", lat: 47.4930, lng: -120.8210, route_count: 9 };
const BAKER = { id: "wa_mount_baker", name: "Mount Baker", area_type: "peak", lat: 48.7768, lng: -121.8145, route_count: 18 };
const HOLLOW = { id: "wa_stuart_stub", name: "Stuart (stub)", area_type: "peak", lat: 47.4752, lng: -120.9027, route_count: 0 };
const CRAG = { id: "wa_icicle_crag", name: "Icicle Crag", area_type: "crag", lat: 47.5400, lng: -120.7000, route_count: 40 };
const NOCOORD = { id: "wa_ghost", name: "Ghost Peak", area_type: "peak", lat: null, lng: null, route_count: 5 };

// ── 1. Gate: only a PEAK with coordinates is live.
if (nearbyPeaksLive(STUART)) ok("a peak with coordinates is live");
else fail("a peak with coordinates was rejected");
for (const [label, a] of [["a crag", CRAG], ["a peak with no coords", NOCOORD], ["null", null]]) {
  if (!nearbyPeaksLive(a)) ok(`${label} is correctly not live`);
  else fail(`${label} was treated as live`);
}

// ── 2. Longitude box is WIDER than the latitude box, and that asymmetry is the point.
{
  const b = nearbyPeaksBounds(STUART, 0.5);
  const latSpan = b.maxLat - b.minLat, lngSpan = b.maxLng - b.minLng;
  if (near(latSpan, 1.0, 1e-9)) ok("latitude span is 2x the radius");
  else fail(`latitude span ${latSpan} (want 1.0)`);
  if (lngSpan > latSpan * 1.3) ok(`longitude span widens with latitude (${lngSpan.toFixed(3)} vs ${latSpan.toFixed(3)})`);
  else fail(`longitude span ${lngSpan} did not widen — the cos(lat) correction is missing`);
  if (nearbyPeaksBounds(CRAG) === null) ok("bounds are null for a non-peak (query stays disabled)");
  else fail("bounds were produced for a non-peak");
}

// ── 3. Sorted by DISTANCE, not by route_count. Colchuck has more routes than Sherpa and is
//    further away; if it sorts first, the sort key regressed to the cached aggregate.
{
  const rows = nearbyPeaksRows(STUART, [BAKER, COLCHUCK, SHERPA], 6);
  const names = rows.map(r => r.a.name);
  if (names[0] === "Sherpa Peak") ok("nearest peak sorts first (distance, not route_count)");
  else fail(`sorted ${JSON.stringify(names)} — expected Sherpa Peak first`);
  if (names.join(",") === "Sherpa Peak,Colchuck Peak,Mount Baker") ok("full ordering is by ascending distance");
  else fail(`ordering was ${JSON.stringify(names)}`);
  if (near(rows[0].mi, 1.2, 0.4)) ok(`Stuart->Sherpa measured ${rows[0].mi.toFixed(2)} mi (~1.2 expected)`);
  else fail(`Stuart->Sherpa measured ${rows[0].mi.toFixed(2)} mi — expected ~1.2`);
}

// ── 4. Exclusions: self, hollow 0-route stubs, crags, and rows with no coordinates.
{
  const rows = nearbyPeaksRows(STUART, [STUART, HOLLOW, CRAG, NOCOORD, SHERPA], 6);
  const ids = rows.map(r => r.a.id);
  if (!ids.includes("wa_mount_stuart")) ok("the peak itself is excluded");
  else fail("the peak listed itself as nearby");
  if (!ids.includes("wa_stuart_stub")) ok("a 0-route co-located stub is excluded");
  else fail("a hollow import stub was listed — the route_count>0 filter is gone");
  if (!ids.includes("wa_icicle_crag")) ok("a crag is excluded from NEARBY PEAKS");
  else fail("a crag was listed as a peak");
  if (!ids.includes("wa_ghost")) ok("a peak with no coordinates is excluded");
  else fail("a coordinate-less peak was listed (its distance would be NaN)");
  if (ids.length === 1 && ids[0] === "wa_sherpa_peak") ok("only the one legitimate neighbour survives");
  else fail(`survivors were ${JSON.stringify(ids)}`);
}

// ── 5. Limit is honoured, and an empty/absent result is empty rather than a throw.
{
  const many = Array.from({ length: 20 }, (_, i) => ({ id: "p" + i, name: "P" + i, area_type: "peak", lat: 47.5 + i * 0.001, lng: -120.9, route_count: 1 }));
  if (nearbyPeaksRows(STUART, many, 6).length === 6) ok("limit of 6 is honoured");
  else fail("limit was not applied");
  for (const [label, v] of [["undefined", undefined], ["null", null], ["empty", []]]) {
    try {
      if (nearbyPeaksRows(STUART, v, 6).length === 0) ok(`${label} rows -> empty list, no throw`);
      else fail(`${label} rows produced something`);
    } catch (e) { fail(`${label} rows threw: ${e.message}`); }
  }
}

// ── 6. Where a peak has no PEAK-TYPED neighbour, the section must produce nothing rather than
//    an empty panel that reads as a claim about the mountains rather than about our data.
//    This used to be captioned "outside Washington", which is no longer true: measured
//    2026-08-19, 39 Colorado peaks are typed and the panel is live on 37 of them. What the
//    case actually pins is that CRAG-typed neighbours never produce rows — the fixture below
//    is crags only, whatever state it sits in.
{
  const utahCrags = [{ id: "ut_a", name: "A", area_type: "crag", lat: 40.6, lng: -111.7, route_count: 30 }];
  if (nearbyPeaksRows({ ...STUART, id: "ut_peak", lat: 40.6, lng: -111.7 }, utahCrags, 6).length === 0)
    ok("no peak-typed neighbours -> empty (crag-typed areas never produce rows)");
  else fail("produced rows from crag-typed areas");
}

console.log(failures ? `\nverify-nearby-peaks: ${failures} failure(s).` : "\nverify-nearby-peaks: ok — selection is by distance, excludes stubs, crags and self; no state gate.");
process.exit(failures ? 1 : 0);
