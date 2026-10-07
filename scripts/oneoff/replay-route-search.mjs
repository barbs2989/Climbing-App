// REPLAY THE ROUTE SEARCH AS THE APP RUNS IT, and count what it costs.
//
// `useRouteSearch` is twelve measured legs (lib/db.js, searchRoutesFor), and every one of them
// carries a note about the defect an "obvious" change reintroduced. The notes were written from
// one-off probes that each REPLICATED part of the function — and a copy is a fossil the moment
// the real function is edited (see measure-route-search-dilution.mjs, which says so of itself).
// This probe replicates nothing: it bundles lib/db.js with esbuild, exactly as check:units does,
// and calls the real `searchRoutesFor` with a client whose fetch is counted. So it measures the
// function that ships, and it stops compiling — rather than printing stale numbers — if the
// function moves.
//
// What it prints, per query: how many PostgREST requests the search issued, how long it took,
// and the top rows (id, name, area). `--json FILE` writes the same so two runs can be diffed:
// a round-trip reduction is only safe where the rows come back the SAME, and this is the tool
// that says whether they did. `--runs N` repeats each query N times and reports whether the
// top rows were stable between runs — the capped legs are unordered by design, so some
// instability is the function's own and not a change's.
//
//   node scripts/oneoff/replay-route-search.mjs                       # the built-in corpus
//   node scripts/oneoff/replay-route-search.mjs "stuart west ridge"   # your own queries
//   node scripts/oneoff/replay-route-search.mjs --json before.json    # keep a baseline
//   node scripts/oneoff/replay-route-search.mjs --home=none           # a climber with no home state
//   node scripts/oneoff/replay-route-search.mjs --lim=30              # ROUTE_PICK_LIM callers
//
// Anon key, read-only. Needs the worktree's .env symlinks like every DB probe.
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
const RUNS = Number(arg("runs", 1));
const JSON_OUT = arg("json", "");
const HOME = arg("home", "washington");
const QUERIES = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// The corpus is every query the function's own notes name as a measured case, plus the shapes
// a climber types: one word, two, a peak + route, a place under a place, a typo, one letter.
const CORPUS = QUERIES.length ? QUERIES : [
  "north ridge", "north face", "mount", "west ridge",
  "washington pass", "leavenworth", "index", "smith rock", "stuart", "liberty bell", "rainier",
  "stuart west ridge", "west ridge stuart", "mount stuart west ridge",
  "erie main wall", "main wall", "the tooth", "the fin", "baldy",
  "chimney rock", "cathedral rock", "pinnacle peak", "eagle peak", "grotto",
  "mt baker", "baker mt", "bobs wall", "goode", "mt goode",
  "mount shuksan", "sulphide glacier", "half moon", "sundial",
  "d", "st", "mt rainer", "shucksan", "forbiden",
];

// --- bundle the real function ---------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cm-search-"));
const out = path.join(tmp, "bundle.cjs");
await build({
  stdin: {
    contents: `export { searchRoutesFor } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};\nexport { createClient } from "@supabase/supabase-js";`,
    resolveDir: ROOT, loader: "js",
  },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const M = require_(out);
if (typeof M.searchRoutesFor !== "function") throw new Error("ANCHOR LOST: lib/db.js no longer exports searchRoutesFor — this probe measures nothing.");

// --- a counted client ------------------------------------------------------------------------
let log = [];
const counting = (url, init) => {
  const u = new URL(String(url));
  log.push(u.pathname.replace(/^\/rest\/v1\//, "") + "?" + decodeURIComponent(u.search.slice(1)).slice(0, 110));
  return fetch(url, { ...init, signal: AbortSignal.timeout(60000) });
};
// supabase-js builds its realtime client eagerly and refuses a Node without WebSocket; the
// search never subscribes, so a constructor that only throws if called is all it needs.
if (!globalThis.WebSocket) globalThis.WebSocket = class { constructor() { throw new Error("the replay never opens a realtime channel"); } };
const db = M.createClient(SUPABASE_URL, anonKey(), { auth: { persistSession: false }, global: { fetch: counting } });

// --- the climber's home state(s), as useMyHomeStatePaths would hand them -----------------------
let homeStates = [];
if (HOME !== "none") {
  const { data, error } = await db.from("areas").select("id,name,path,area_type").ilike("name", HOME).order("path").limit(5);
  if (error) throw error;
  const st = (data || []).sort((a, b) => String(a.path).split(".").length - String(b.path).split(".").length)[0];
  if (!st) throw new Error(`no area named "${HOME}" — pass --home=<state name> or --home=none`);
  homeStates = [st.path];
  console.log(`home: ${st.name} (${st.area_type}, ${st.path})`);
}
log = [];

// --- replay ------------------------------------------------------------------------------------
// A leg that fails while another is in flight must not abort the corpus: record it against the
// query and go on, so one busy-database timeout costs one row of the report, not the report.
let stray = null;
process.on("unhandledRejection", (e) => { stray = e; });
const describe = (e) => (e && (e.message || e.code)) ? `${e.code ? e.code + " " : ""}${e.message || ""}`.trim() : String(e);
const results = [];
let totalReq = 0, totalMs = 0;
for (const q of CORPUS) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    log = [];
    const t0 = Date.now();
    let rows, err = null;
    try { rows = await M.searchRoutesFor(q, LIM, homeStates, db); } catch (e) { err = e; rows = []; }
    if (!err && stray) err = stray;
    stray = null;
    runs.push({ ms: Date.now() - t0, requests: log.length, legs: log.slice(), err: err ? describe(err) : null,
      top: rows.map((r) => ({ id: r.id, name: r.name, area: r._dbArea && r._dbArea.name, hint: r._placeHint || undefined })) });
  }
  const first = runs[0];
  const stable = runs.every((r) => JSON.stringify(r.top.map((x) => x.id)) === JSON.stringify(first.top.map((x) => x.id)));
  const sameSet = runs.every((r) => JSON.stringify(r.top.map((x) => x.id).sort()) === JSON.stringify(first.top.map((x) => x.id).sort()));
  totalReq += first.requests; totalMs += first.ms;
  results.push({ q, lim: LIM, home: homeStates, requests: first.requests, ms: first.ms, stableOrder: stable, stableSet: sameSet, err: first.err, legs: first.legs, top: first.top });
  const flag = first.err ? "  ERROR " + first.err : RUNS > 1 ? (stable ? "  stable" : sameSet ? "  SAME SET, order moved" : "  SET CHANGED between runs") : "";
  console.log(`\n"${q}"  ${first.requests} requests  ${first.ms} ms${flag}`);
  first.top.forEach((r, i) => console.log(`   ${String(i + 1).padStart(2)}. ${r.name}  ·  ${r.area || "?"}${r.hint ? "  (via " + r.hint + ")" : ""}`));
  if (!first.top.length && !first.err) console.log("   (no rows)");
}
console.log(`\n${CORPUS.length} queries: ${totalReq} requests (${(totalReq / CORPUS.length).toFixed(1)} per query), ${totalMs} ms (${Math.round(totalMs / CORPUS.length)} per query)`);
if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ lim: LIM, home: homeStates, results }, null, 1)); console.log(`wrote ${JSON_OUT}`); }
fs.rmSync(tmp, { recursive: true, force: true });
