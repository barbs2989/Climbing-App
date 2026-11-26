#!/usr/bin/env node
import { fileHref } from "../lib/file-href.mjs";
/* Does UPDATING a downloaded state keep the copy the climber already has, whatever happens?
 *
 * Owner note, 2026-11-25: "it says I have Colorado saved on my device but it still says download on
 * the homepage." A refresh used to mark the state INCOMPLETE and delete its rows before writing the
 * new ones, so a refresh that died partway (the app closed during a minutes-long live refresh of
 * Colorado's 40,118 climbs, a dropped connection) left nothing: the next launch read the state as
 * never downloaded and Home offered "Download" again. lib/offline.js now writes the new rows OVER
 * the old and prunes leftovers at the end, keeping the state complete throughout.
 *
 * Runs the SHIPPED lib/offline.js against a FIXTURE nightly file (fetch is stubbed) with IndexedDB
 * replaced by scripts/lib/idb-shim.mjs. No database, no network.
 *
 *   node scripts/oneoff/probe-state-refresh-keeps-copy.mjs
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { installIdbShim } from "../lib/idb-shim.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let ran = 0, bad = 0;
const check = (c, m) => { ran++; if (!c) bad++; console.log((c ? "  ok   " : "  FAIL ") + m); };

installIdbShim();
const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-refresh-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
const out = path.join(tmp, "offline.mjs");
await build({ entryPoints: [path.join(ROOT, "lib/offline.js")], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/x/" }) } });
const mod = await import(fileHref(out));

// ── the fixture nightly file ──
const NAME = "Testland", ID = "testland";
let files = {}, failPart = null, generatedAt = 0;
function publish(routes, at) {
  generatedAt = at;
  const areas = [{ id: ID, name: NAME, area_type: "state", path: "usa.testland", parent_id: "usa", route_count: routes.length }, { id: "t_crag", name: "Crag", parent_id: ID, path: "usa.testland.crag", route_count: routes.length }];
  const half = Math.ceil(routes.length / 2);
  const parts = [routes.slice(0, half), routes.slice(half)].map((rs, n) => {
    const file = ID + "-" + n + ".json.gz";
    files[file] = gzipSync(Buffer.from(JSON.stringify({ v: 1, part: n, ...(n === 0 ? { areas } : {}), routes: rs, contribs: [], reports: rs.slice(0, 1).map((r) => ({ id: "rep_" + r.id, route_id: r.id })), people: [] })));
    return { file, routes: rs.length };
  });
  files["index.json"] = Buffer.from(JSON.stringify({ v: 1, generatedAt: at, states: { [NAME]: { id: ID, path: "usa.testland", areaCount: 2, routeCount: routes.length, parts } } }));
}
globalThis.fetch = async (url) => {
  const name = String(url).replace("/x/states/", "");
  if (name === failPart || !files[name]) return { ok: false, status: 503, json: async () => null, arrayBuffer: async () => new ArrayBuffer(0) };
  const b = files[name];
  return { ok: true, status: 200, json: async () => JSON.parse(b.toString()), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
};
const R = (id, name) => ({ id, name, area_id: "t_crag" });
const DAY = 24 * 3600 * 1000;
const states = async () => (await mod.offlineDownloads()).map((m) => m.name);

console.log("\n1. first download from the nightly file");
publish([R("r1", "One"), R("r2", "Two"), R("r3", "Three"), R("r4", "Four")], Date.now() - 2 * DAY);
const first = await mod.downloadStateOffline(NAME);
check(first && first.routeCount === 4, "4 climbs saved");
check((await states()).includes(NAME), "listed as downloaded");

console.log("\n2. a refresh whose file cannot be fetched keeps the copy");
publish([R("r1", "One v2"), R("r2", "Two"), R("r3", "Three"), R("r5", "Five")], Date.now());
failPart = ID + "-1.json.gz";
let threw = false;
try { await mod.downloadStateOffline(NAME); } catch (e) { threw = true; }
check(threw, "the refresh reports that it failed (no live path in this probe)");
check((await states()).includes(NAME), "the state is STILL listed as downloaded — Home does not offer Download");
check((await mod.offlineAreaRoutes("t_crag")).length === 4, "its 4 climbs still read back offline");

console.log("\n3. the quiet once-a-session refresh, file reachable again");
failPart = null;
const rows = await mod.refreshDownloadedStates();
check(rows.length === 1 && rows[0].name === NAME && !rows[0].removed, "Testland refreshed, not removed");
check((await states()).includes(NAME), "still listed as downloaded");
const meta = (await mod.offlineDownloads()).find((m) => m.name === NAME);
check(meta && meta.routeCount === 4 && meta.savedAt === generatedAt, "the meta row is the new file's: 4 climbs, its date");

console.log("\n4. the refresh replaced changed climbs and pruned the one the catalog dropped");
const got = await mod.offlineAreaRoutes("t_crag");
const byId = Object.fromEntries(got.map((r) => [r.id, r]));
check(got.length === 4, "4 climbs read back offline (" + got.map((r) => r.id).join(", ") + ")");
check(byId.r1 && byId.r1.name === "One v2", "r1 carries the new name");
check(!byId.r4, "r4 (gone from the catalog) is pruned");
check(!!byId.r5, "r5 (new) is there");

console.log(`\n${bad ? bad + " FAIL" : "PASS"} — ${ran} checks`);
process.exit(bad ? 1 : 0);
