// Are the Colorado fourteeners we are about to CREATE genuinely absent?
//
// This runs before any insert, because the two failure modes are wildly asymmetric. A missed peak
// is a gap somebody notices and fixes. A DUPLICATE peak is a second row for a mountain that
// already exists, splitting its routes across two areas forever — the shape 0106/0107/0112 each
// had to repair by hand, and which [[colocated-duplicate-areas-swept]] says never to resolve on
// coordinates afterwards.
//
// The roster matcher is EXACT on the name, which is right for building a tick list and wrong for
// proving absence: "Kit Carson Mountain" and "Kit Carson Peak" are the same summit, and an exact
// matcher reports the second as missing. So this probes LOOSELY — a distinctive token, anywhere
// in a Colorado area name — and prints every near miss for a human to read. It deliberately does
// not decide; it hands back candidates.
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { CO_14ERS } from "./roster-data.mjs";

const KEY = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const H = headers(KEY);
const get = async (url, tries = 3) => {
  for (let i = 1; i <= tries; i++) {
    try { const r = await fetch(url, { headers: H }); if (r.ok) return JSON.parse(await r.text()); if (i === tries) throw new Error(String(r.status)); }
    catch (e) { if (i === tries) throw e; }
    await new Promise(r => setTimeout(r, 700 * i));
  }
};
await get(`${SUPABASE_URL}/rest/v1/areas?select=id&limit=1`);   // warm the connection

// The distinctive word: drop Mount/Peak/Mountain and the compass words, keep the rest.
const token = nm => nm.toLowerCase()
  .replace(/[^a-z0-9 ]+/g, " ")
  .replace(/\b(mount|mt|peak|mountain|the|of|point|north|south|east|west|middle)\b/g, " ")
  .trim().split(/\s+/).filter(Boolean)[0] || nm.toLowerCase();

console.log(`\nprobing ${CO_14ERS.length} Colorado fourteeners for ANY existing area\n`);
const absent = [], present = [];
for (const e of CO_14ERS) {
  const t = token(e.name);
  const rows = await get(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,route_count,path&name=ilike.*${encodeURIComponent(t)}*&limit=40`);
  const co = (rows || []).filter(a => String(a.path || "").split(".")[1] === "colorado");
  if (!co.length) { absent.push(e); continue; }
  present.push({ e, co });
}

console.log(`=== ${present.length} have SOMETHING in Colorado matching their distinctive word ===`);
console.log(`(read these — an exact-name miss here means a NAME VARIANT, not an absence)\n`);
for (const { e, co } of present) {
  console.log(`${e.name} (${e.ft} ft)`);
  for (const a of co.slice(0, 4)) console.log(`    ${a.id.padEnd(38)} ${a.area_type.padEnd(7)} rc=${String(a.route_count).padStart(4)}  ${a.name}`);
}
console.log(`\n=== ${absent.length} have NOTHING in Colorado on that word — safe to create ===`);
for (const e of absent) console.log(`  ${String(e.ft).padStart(6)} ft  ${e.name}`);
// Fails closed: an empty read would put every peak in `absent` and authorise 53 duplicates.
if (!present.length && !absent.length) { console.error("FAIL: nothing read at all."); process.exit(1); }
if (absent.length === CO_14ERS.length) { console.error("\nFAIL: every peak reported absent — that is what a broken read looks like, not a real catalog."); process.exit(1); }
