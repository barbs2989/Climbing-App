#!/usr/bin/env node
/* Does "⤓ Save map offline" on the route map (lib/SaveMapOffline.jsx) put a real route's map on the
 * device, and does Remove take it off again — against the LIVE catalog and the live USGS tiles?
 *
 * It runs the SHIPPED code the button calls — lib/db.js packRouteWithSnapshot, lib/offline.js
 * unpackRouteOffline / packedRouteIds / packMeta / offlineRoutesByIds, lib/offlineTiles.js
 * routeMapInfo / offlineTileUrl — with only IndexedDB replaced by scripts/lib/idb-shim.mjs. Then it
 * reads everything back through the readers the screen uses: the button's own state, the Manage
 * areas list (packMeta), the route page with no signal (offlineRoutesByIds), and the map's
 * fallback tile (offlineTileUrl).
 *
 *   node scripts/oneoff/probe-live-route-map-save.mjs [--route <id>]
 *
 * READ-ONLY on the database. Anon key only. Downloads a few hundred public-domain USGS tiles.
 */

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installIdbShim } from "../lib/idb-shim.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARG = process.argv.find((a, i, all) => all[i - 1] === "--route");

let ran = 0, bad = 0;
const ok = (m) => { ran++; console.log("  ok   " + m); };
const no = (m) => { ran++; bad++; console.log("  FAIL " + m); };
const check = (c, m) => (c ? ok(m) : no(m));

if (!SUPABASE_URL || !anonKey()) { console.error("FAIL: no VITE_SUPABASE_URL / anon key — nothing was checked."); process.exit(1); }
installIdbShim();
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() {} close() {} };

const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-route-map-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
const entry = path.join(tmp, "entry.js");
fs.writeFileSync(entry, [
  `export { packRouteWithSnapshot } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};`,
  `export { unpackRouteOffline, packedRouteIds, packMeta, offlineRoutesByIds } from ${JSON.stringify(path.join(ROOT, "lib/offline.js"))};`,
  `export { routeMapInfo, offlineTileUrl, routeTileKeys } from ${JSON.stringify(path.join(ROOT, "lib/offlineTiles.js"))};`,
].join("\n"));
let mod;
try {
  const out = path.join(tmp, "bundle.mjs");
  await build({
    entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    loader: { ".js": "jsx" }, jsx: "automatic",
    define: { "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: anonKey(), VITE_USE_DB: "true" }) },
  });
  mod = await import(out);
} catch (e) { console.error("FAIL: could not bundle the save path — nothing was checked. " + (e.stack || e.message)); process.exit(1); }

const H = { apikey: anonKey(), Authorization: "Bearer " + anonKey() };
async function rest(q) {
  for (let a = 0; a < 5; a++) { const r = await fetch(SUPABASE_URL + "/rest/v1/" + q, { headers: H }); if (r.ok) return r.json(); await new Promise((res) => setTimeout(res, 1000 * 2 ** a)); }
  throw new Error("live read failed: " + q);
}

// A Washington route with a stored GPS track, unless one is named.
let id = ARG;
if (!id) {
  const rows = await rest("routes?select=id,name&id=like.wa_*&gpx=not.is.null&limit=1");
  id = rows[0] && rows[0].id;
}
if (!id) { console.error("FAIL: found no route to save — nothing was checked."); process.exit(1); }
const [live] = await rest("routes?select=id,name&id=eq." + encodeURIComponent(id));
console.log(`\nroute: ${id} (${live && live.name})`);

console.log("\n1. Save map offline (the button's packRouteWithSnapshot)");
let prog = 0;
const t0 = Date.now();
const res = await mod.packRouteWithSnapshot(id, { onMapProgress: () => { prog++; } });
const m = res && res.map;
check(m && m.total > 0, `the map has tiles to save (${m && m.total})`);
check(m && m.ok, `the save reports success (${m && m.saved} of ${m && m.total} tiles, ${(((m && m.bytes) || 0) / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
check(m && m.missing / m.total < 0.05, `fewer than 5% of tiles missing (${m && m.missing})`);
check(prog > 0, "progress was reported while it ran (the button's percentage)");
check(res && res.snapshot === true, "the latest reports and corrections were saved with it");

console.log("\n2. what the screens read back");
const info = (await mod.routeMapInfo())[id];
const packed = await mod.packedRouteIds();
check(info && info.tiles === m.saved, `the button's state: ${info && info.tiles} tiles on the device`);
check(packed.includes(id), "the route counts as saved (packedRouteIds) — the button shows '✓ Map saved offline'");
const meta = (await mod.packMeta()).find((x) => x.id === id);
check(meta && meta.mapTiles > 0 && meta.mapAt, "Manage areas › Saved route maps lists it (packMeta.mapTiles, mapAt)");
const rows = await mod.offlineRoutesByIds([id]);
check(rows && rows[0] && rows[0].name === (live && live.name), "with no signal the route page still has its row (offlineRoutesByIds)");
const z16 = mod.routeTileKeys(rows[0]).find((k) => k.startsWith("16/"));
const [z, x, y] = (z16 || "").split("/").map(Number);
const url = z16 ? await mod.offlineTileUrl("topo", z, x, y) : null;
check(typeof url === "string" && url.startsWith("blob:"), `the map's no-signal fallback serves a saved tile (topo ${z16})`);

console.log("\n3. Remove");
await mod.unpackRouteOffline(id);
check(!(await mod.routeMapInfo())[id], "the map's tiles record is gone");
check(!(await mod.packedRouteIds()).includes(id), "the route no longer counts as saved");
check(!(await mod.packMeta()).some((x) => x.id === id), "Manage areas no longer lists it");
const after = z16 ? await mod.offlineTileUrl("topo", z, x, y) : null;
check(after === null, "its tiles were deleted (no other saved map needed them)");

console.log(`\n${bad ? bad + " FAIL" : "ok"} — ${ran - bad} of ${ran} assertions against the live catalog`);
process.exit(bad ? 1 : 0);
