// DOES THE "ADD AN AREA" BOX FIND EVERYTHING A CLIMBER TYPES? (Partners › My areas, 2026-11-14)
//
// Replays the real `searchCatalogAreas` (lib/db.js, bundled with esbuild like
// replay-route-search.mjs) over a corpus of what climbers actually type — full names, half
// names, "mt"/"mount", apostrophes, a crag under its region, a state — and checks that the place
// the climber meant is in the top LIM rows. Beside it, the box's OLD search (areas_in_subtree
// under the climber's home state) so the difference is measured, not claimed.
//
//   node scripts/oneoff/audit-area-search.mjs                 # the built-in corpus
//   node scripts/oneoff/audit-area-search.mjs "smith"         # your own queries (no expectation)
//   node scripts/oneoff/audit-area-search.mjs --home=none     # skip the old-search comparison
//   node scripts/oneoff/audit-area-search.mjs --skip=40       # resume after the first 40 queries
//
// Anon key, read-only. Take a DB slot first (~/dev/db-throttle/dbslot.mjs).
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const LIM = Number(arg("lim", 8));
const HOME = arg("home", "washington");
const ASK = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// [what the climber types, a word the meant place's name must contain (lowercase)]
const CORPUS = ASK.length ? ASK.map((q) => [q, ""]) : [
  // Whole names, across the country — the old box searched one state, so these were invisible from Washington.
  ["smith rock", "smith rock"], ["red river gorge", "red river gorge"], ["joshua tree", "joshua tree"],
  ["yosemite", "yosemite"], ["red rock", "red rock"], ["eldorado canyon", "eldorado"],
  ["indian creek", "indian creek"], ["new river gorge", "new river gorge"], ["hueco tanks", "hueco"],
  ["bishop", "bishop"], ["rifle", "rifle"], ["ten sleep", "ten sleep"], ["city of rocks", "city of rocks"],
  ["devils tower", "devils tower"], ["seneca rocks", "seneca"], ["rumney", "rumney"],
  ["lumpy ridge", "lumpy"], ["tahquitz", "tahquitz"], ["vedauwoo", "vedauwoo"], ["the needles", "needles"],
  ["tuolumne", "tuolumne"], ["muir valley", "muir valley"], ["maple canyon", "maple"],
  ["little cottonwood", "little cottonwood"], ["american fork", "american fork"], ["shawangunks", "gunks"],
  ["horseshoe canyon ranch", "horseshoe canyon"], ["owens river gorge", "owens river"], ["pinnacles", "pinnacles"],
  // Washington, the home state.
  ["index", "index"], ["leavenworth", "leavenworth"], ["vantage", "vantage"], ["frenchman coulee", "frenchman"],
  ["darrington", "darrington"], ["washington pass", "washington pass"], ["mount erie", "erie"], ["exit 38", "exit 38"],
  // Half-typed and one word — what a climber types first.
  ["smith", "smith rock"], ["red river", "red river gorge"], ["josh", "joshua tree"], ["eldo", "eldorado"],
  ["hueco", "hueco"], ["gunks", "gunks"], ["leaven", "leavenworth"], ["squam", "squamish"],
  // Spellings: apostrophes, mt/mount, accents, case.
  ["devil's tower", "devils tower"], ["moes valley", "moe"], ["mt erie", "erie"], ["MOUNT LEMMON", "lemmon"],
  ["mt lemmon", "lemmon"], ["st george", "george"],
  // A place under a place — namesakes.
  ["castle rock", "castle rock"], ["main wall", "main wall"],
  // Climber shorthand the catalog has no row for (expected to MISS unless an alias exists).
  ["rrg", "red river"], ["jtree", "joshua"], ["nrg", "new river"], ["hcr", "horseshoe"],
  ["lcc", "little cottonwood"], ["bcc", "big cottonwood"], ["shawangunk", "shawangunk"], ["red rocks", "red rock"],
  // Typos.
  ["yosemitie", "yosemite"], ["joshau tree", "joshua"], ["squamsih", "squamish"],
  // A state is a listable place too.
  ["utah", "utah"], ["colorado", "colorado"],
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cm-areasearch-"));
const out = path.join(tmp, "bundle.cjs");
await build({
  stdin: {
    contents: `export { searchCatalogAreas } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};\nexport { createClient } from "@supabase/supabase-js";`,
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);
if (typeof M.searchCatalogAreas !== "function") throw new Error("ANCHOR LOST: lib/db.js no longer exports searchCatalogAreas");
if (!globalThis.WebSocket) globalThis.WebSocket = class { constructor() { throw new Error("no realtime"); } };
let nReq = 0;
const db = M.createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false }, global: { fetch: (u, i) => { nReq++; return fetch(u, { ...i, signal: AbortSignal.timeout(60000) }); } } });

let home = null;
if (HOME !== "none") {
  const { data, error } = await db.from("areas").select("id,name,path,area_type").ilike("name", HOME).eq("area_type", "state").limit(1);
  if (error) throw error;
  home = (data || [])[0] || null;
  console.log(home ? `old box searched: ${home.name} (${home.id})` : "no home state found");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let hitN = 0, oldHitN = 0, expN = 0;
const misses = [];
const SKIP = Number(arg("skip", 0)); // resume a run the DB cut short
for (const [q, want] of CORPUS.slice(SKIP)) {
  let rows = [], err = "", total = 0;
  const t0 = Date.now(); nReq = 0;
  try { const r = await M.searchCatalogAreas(q, LIM, db); rows = r.rows; total = r.total; } catch (e) { err = (e && (e.code || "") + " " + (e.message || "")) || String(e); }
  const ms = Date.now() - t0, req = nReq;
  const label = (a) => `${a.name} [${a.area_type}${a.route_count ? " " + a.route_count : ""}]${a.trail && a.trail.length ? " · " + a.trail.slice(-2).join(" › ") : ""}`;
  const pos = want ? rows.findIndex((a) => a.name.toLowerCase().replace(/['’]/g, "").includes(want)) : -1;
  let oldPos = -2;
  if (home && want) {
    const { data, error } = await db.rpc("areas_in_subtree", { root_id: home.id, q, lim: 30 });
    oldPos = error ? -3 : (data || []).findIndex((a) => a.name.toLowerCase().replace(/['’]/g, "").includes(want));
  }
  if (want) { expN++; if (pos >= 0) hitN++; else misses.push(q); if (oldPos >= 0) oldHitN++; }
  const mark = !want ? "" : pos >= 0 ? `  OK #${pos + 1}` : "  MISS";
  const oldMark = oldPos >= 0 ? `  (old: #${oldPos + 1})` : oldPos === -1 ? "  (old: miss)" : oldPos === -3 ? "  (old: error)" : "";
  console.log(`\n"${q}"${mark}${oldMark}  ${total} matched · ${req} req · ${ms} ms${err ? "  ERROR " + err : ""}`);
  rows.slice(0, 5).forEach((a, i) => console.log(`   ${i + 1}. ${label(a)}`));
  await sleep(400); // the owner's throttle rule: never fast
}
if (expN) console.log(`\nNEW: ${hitN}/${expN} found in the top ${LIM}.  OLD (${home ? home.name + " only" : "skipped"}): ${oldHitN}/${expN}.\nMissed: ${misses.join(", ") || "none"}`);
fs.rmSync(tmp, { recursive: true, force: true });
