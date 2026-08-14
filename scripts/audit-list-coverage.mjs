// How full is each named tick-list, against the total it advertises?
//
// The Challenges screen declares ~25 lists and prints "N of TOTAL" for each. TOTAL is a
// hardcoded constant (Colorado 14ers: 53, Bulgers: 100); N comes from the catalog. Nothing
// compared the two, so a list can advertise 100 objectives and hold one.
//
// Read-only. Resolves membership through lib/lists.js, the same resolver the screen uses, so a
// number here and a number on screen cannot disagree — and prose spellings ("Washington Bulger
// List (100 Highest Peaks in Washington)") count exactly as slugs do.
//
// IT READS THE CARD LIST FROM THE APP, NOT `LIST_ALIASES`, and that is the whole point of the
// rewrite. Iterating LIST_ALIASES measured 15 keys and MISSED SEVEN CARDS the user can see —
// eldo, rrg, yose_floor, id12, ne4k, co_cent, wasatch11 — because a card needs no alias entry:
// `routeInList` falls back to an exact literal tag match when there is no spec. Every one of
// those seven matches nothing in the catalog, so they render "0" forever, and the audit whose
// job is to find exactly that could not see them. A coverage tool that takes its subject list
// from the wrong end reports confidently about the wrong set — the same shape as
// check:overlay-discovery finding 22 modals no guard could open.
import fs from "node:fs";
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { LIST_ALIASES, routeInList, listPeaks } from "../lib/lists.js";

// ---- Parse the cards the screen actually renders ------------------------------------------
// Scoped to the `lists=[...]` array by balancing brackets over RAW source. Not a whole-file
// scan for `{key:"`: that also matches an itinerary accumulator elsewhere in the file, which
// would invent two cards that do not exist.
const SRC = "ClimbMatchCore.jsx";
const src = fs.readFileSync(SRC, "utf8");
const start = src.indexOf("lists=[");
if (start < 0) { console.error(`ANCHOR LOST: no \`lists=[\` in ${SRC} — refusing to report on a card list I could not find.`); process.exit(1); }
const open = src.indexOf("[", start);
let depth = 0, end = -1;
for (let i = open; i < src.length; i++) {
  const c = src[i];
  if (c === "[") depth++;
  else if (c === "]") { depth--; if (!depth) { end = i; break; } }
}
if (end < 0) { console.error("FAIL: could not balance the lists array."); process.exit(1); }
const arr = src.slice(open, end + 1);

// Cards gated to demo mode. They exist in the array but `DEMO_FILLERS` is false in production, so
// a real account never sees them — reporting them as live lists would overstate what the screen
// offers, which is the same overstatement this audit exists to catch. Read from the app rather
// than restated here, so the two cannot drift.
const gateM = src.match(/const SEED_ONLY_CARDS=new Set\(\[([^\]]*)\]\)/);
const DEMO_ONLY = new Set(gateM ? [...gateM[1].matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1]) : []);

const cards = [];
const re = /\{key:"([a-z0-9_]+)"/g;
let m;
while ((m = re.exec(arr))) {
  // A card's body runs to the start of the NEXT card, or to the end of the array for the last
  // one. `search` returns -1 when there is no next card, and adding lastIndex to that yields an
  // offset just PAST this card's key — which truncated the final card's body to `{key:"desert`
  // and reported a complete 27/27 roster list as "CANNOT FILL". It only appeared once removals
  // changed which card sits last, so test this against the last card, not the first.
  const rel = arr.slice(re.lastIndex).search(/\{key:"[a-z0-9_]+"/);
  const next = rel < 0 ? arr.length : rel + re.lastIndex;
  const body = arr.slice(m.index, next);
  const t = body.match(/\btotal:(\d+)/);
  cards.push({
    k: m[1],
    want: t ? Number(t[1]) : null,
    // How does this card get its objectives? A peak list reads a ROSTER; a tag list asks
    // routeInList; anything else builds its rows from seed ROUTES or the user's own logs.
    roster: body.includes(`peakObjectives("${m[1]}")`),
    tag: body.includes(`inList("${m[1]}")`),
    derived: /\bquiver:true|routes:(?!peakObjectives|inList)/.test(body),
  });
}
// Fails closed on a broken parse: the regex returning nothing would otherwise read as "no cards
// have problems". The floor sits below the real count (11 after the dead lists were removed) and
// well above what a broken scan yields, which is 0. Raise it only alongside a measured count —
// setting it AT the current number turns every legitimate removal into a spurious failure, which
// is how a floor like this gets deleted rather than fixed.
if (cards.length < 8) { console.error(`FAIL: parsed only ${cards.length} cards — the scan broke, refusing to report.`); process.exit(1); }

// ---- Read the catalog ---------------------------------------------------------------------
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,lists,classic&lists=not.is.null&limit=2000`, { headers: headers(key) });
if (!res.ok) { console.error(`FAIL: ${res.status} ${(await res.text()).slice(0, 160)}`); process.exit(1); }
const rows = JSON.parse(await res.text());
// Fails closed: an empty read would make every list look equally (and falsely) empty.
if (!rows.length) { console.error("FAIL: no routes carry a lists value — refusing to report 0 for everything."); process.exit(1); }

console.log(`\n=== named list coverage ===`);
console.log(`${cards.length} cards on the Challenges screen; ${rows.length} routes carry any list tag\n`);

// A PEAK list is defined by its roster, not by `routes.lists` — see the note in lib/lists.js.
// Counting its tags would report the Bulgers as 11 of 100 while the app shows 100 objectives,
// i.e. this audit would disagree with the screen it exists to measure.
const out = cards.map(c => {
  const roster = c.roster ? listPeaks(c.k) : null;
  const tagged = rows.filter(r => routeInList(r, c.k)).length;
  const have = roster ? roster.length : tagged;
  const demoOnly = DEMO_ONLY.has(c.k);
  const via = demoOnly ? "demo" : roster ? "roster" : c.derived ? "seed" : "tags";
  // A card that can NEVER fill: its objectives come only from a tag no route in the catalog
  // carries. Not "short" — structurally empty, the shape that got Triple Crown and Seven
  // Summits removed. `seed` cards are excluded: they build from seed ROUTES and the user's own
  // logs, so this catalog read says nothing about them either way.
  const dead = via === "tags" && have === 0;
  return { ...c, have, via, dead, gap: c.want != null ? c.want - have : null };
}).sort((a, b) => Number(b.dead) - Number(a.dead) || (b.gap ?? -1) - (a.gap ?? -1));

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("list", 14) + pad("members", 9) + pad("advertised", 12) + pad("via", 8) + "state");
for (const r of out) {
  const state = r.dead ? "CANNOT FILL — no route carries this tag"
    : r.via === "demo" ? "demo mode only — a real account never sees this card"
    : r.via === "seed" ? "seed/derived — not measurable from the catalog"
    : r.gap == null ? "no advertised total"
    : r.gap > 0 ? `${r.gap} missing` : "complete";
  console.log(pad(r.k, 14) + pad(r.have, 9) + pad(r.want ?? "—", 12) + pad(r.via, 8) + state);
}

const demo = out.filter(r => r.via === "demo");
if (demo.length) console.log(`\na real account sees ${cards.length - demo.length} of ${cards.length} cards — ${demo.length} are demo-only: ${demo.map(r => r.k).join(", ")}`);
const dead = out.filter(r => r.dead);
console.log(`\ncards that CANNOT FILL: ${dead.length} of ${cards.length} — ${dead.map(r => r.k).join(", ") || "none"}`);
if (dead.length) console.log(`  (each renders "0" forever: its objectives come only from a routes.lists tag no route carries)`);
const totalGap = out.reduce((n, r) => n + (r.gap > 0 ? r.gap : 0), 0);
console.log(`total advertised objectives not yet in the catalog: ${totalGap}`);

// Keys that exist as per-route CHIP vocabulary but are no longer a card — state_hp, np_hp,
// seven and triple were removed as tick lists and kept as chips, because "this route is a state
// highpoint" stays true whether or not the app offers a list for it. Reported separately so
// they are never counted as broken lists.
const cardKeys = new Set(cards.map(c => c.k));
const chipOnly = Object.keys(LIST_ALIASES).filter(k => !cardKeys.has(k));
if (chipOnly.length) console.log(`\n${chipOnly.length} key(s) are per-route chip vocabulary with no list card, so they are not lists: ${chipOnly.join(", ")}`);
process.exit(0);
