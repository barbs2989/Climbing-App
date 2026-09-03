// HOME ATTRIBUTES SEED CLIMBING HISTORY TO A REAL FRIEND, BY NAME.
//
// #735 fixed this class: `ticksFor(name)` scans ROUTES[].activity for `a.user === name`, a DISPLAY
// NAME belonging to neither id space, so it hands one person's climbing record to anyone who shares
// their name. The fix routed every caller through
//
//     seedHistoryFor = c => (c && typeof c.id === "number" && (c.id !== 0 || !DB_UID)) ? ticksFor(c.name) : []
//
// and check:seed-history enforces it: no caller of `ticksFor` other than `seedHistoryFor`, and no
// surviving `=== ME.name ? ME`.
//
// Home's friend feed matches by name WITHOUT going through any of that:
//
//     _friendFeed = ROUTES.flatMap(...).filter(x => connections.some(c => c.name === x.a.user))
//
// It never calls ticksFor and never writes `=== ME.name`, so the guard built for this exact class
// cannot see it. Crew:Friends' FriendsFeed does it correctly, via seedHistoryFor(f) — so the two
// screens disagree about the same feature for the same reason they disagree about its count
// (Home said "11 updates", Crew:Friends "Show all 14").
//
// This EXECUTES the app's own filter, lifted from source with ANCHOR LOST, against a DB-shaped
// connection whose name collides with a seed activity author. A retyped copy would agree with
// itself whatever the app does.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

const at = app.indexOf("const _friendFeed=");
if (at < 0) {
  console.error("ANCHOR LOST — `const _friendFeed=` in ClimbMatch.jsx.");
  console.error("Re-anchor before reading this result; do not treat a clean run as a pass.");
  process.exit(1);
}
/* To the statement end at paren/brace depth 0 — NOT the first ";", which lands inside the
   flatMap body (`return {a:a,r:r};`) and truncates the expression before the filter. The first
   version did exactly that, and the truncation stayed invisible while a hardcoded copy was doing
   the deciding. */
const exprStart = at + "const _friendFeed=".length;
let _d = 0, exprEnd = exprStart;
for (let i = exprStart; i < app.length; i++) {
  const ch = app[i];
  if (ch === "(" || ch === "{" || ch === "[") _d++;
  else if (ch === ")" || ch === "}" || ch === "]") _d--;
  else if (ch === ";" && _d === 0) { exprEnd = i; break; }
}
const expr = app.slice(exprStart, exprEnd);
console.log("lifted filter:\n  " + expr.replace(/\s+/g, " ").slice(0, 240) + "…\n");

// Who actually authors seed activity, and how many rows each has.
const seedAuthors = new Map();
{
  const i = core.indexOf("const ROUTES=[");
  let d = 0, e = i;
  for (let j = core.indexOf("[", i); j < core.length; j++) {
    if (core[j] === "[") d++; else if (core[j] === "]") { d--; if (!d) { e = j; break; } }
  }
  for (const m of core.slice(i, e).matchAll(/user:\s*"([^"]+)"/g)) {
    seedAuthors.set(m[1], (seedAuthors.get(m[1]) || 0) + 1);
  }
}
const top = [...seedAuthors.entries()].sort((a, b) => b[1] - a[1]);
console.log(`${top.length} names author seed activity: ` + top.slice(0, 6).map(([n, c]) => `${n} (${c})`).join(", ") + "\n");

/* THE PREDICATE IS EXECUTED FROM SOURCE, NOT RETYPED — and the first version of this probe got
   that wrong. It re-implemented the filter as `connections.some(c => c.name === author)`, which is
   a COPY: it kept failing after the fix landed, because it was agreeing with itself rather than
   asking the app. The header says a retyped copy proves nothing; the body did it anyway. */
const someSrc = /connections\.some\(function\(c\)\{return ([\s\S]*?);\}\)/.exec(expr);
if (!someSrc) { console.error("ANCHOR LOST — the connections.some(...) predicate inside _friendFeed"); process.exit(1); }
const idSrc = /const seedIdentity=([^;]+);/.exec(core);
if (!idSrc) { console.error("ANCHOR LOST — const seedIdentity= in ClimbMatchCore.jsx"); process.exit(1); }
// DB_UID is a module global in core, written by __set_DB_UID on sign-in. A real session is what
// makes id 0 stop counting as a seed identity; this probe only needs the uuid case, so it is unset.
const DB_UID = null;
// eslint-disable-next-line no-new-func
const seedIdentity = new Function("DB_UID", "return (" + idSrc[1] + ");")(DB_UID);
// eslint-disable-next-line no-new-func
const pred = new Function("c", "x", "seedIdentity", "return (" + someSrc[1] + ");");
console.log("lifted predicate: " + someSrc[1].replace(/\s+/g, " ") + "\n");
const decides = (connections, author) =>
  connections.some((c) => pred(c, { a: { user: author, date: "2026-06-01" } }, seedIdentity));

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || !detail ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};

const [author, rows] = top[0];
console.log(`— using "${author}", who authors ${rows} seed activity row(s) —`);

// A seed connection SHOULD match: that is the demo working as intended.
ok("a seed connection (numeric id) still sees its own seed history",
  decides([{ id: 3, name: author }], author),
  "the demo lost its feed — this fix went too far");

// A DB-backed connection is a uuid and carries no seed history. seedHistoryFor returns [] for it.
const dbFriend = { id: "7c9e6679-7425-40de-944b-e07fc1f90ae7", name: author, _profile: true };
ok("a DB-backed friend does NOT inherit seed climbs that share their name",
  !decides([dbFriend], author),
  `Home shows ${rows} seed row(s) as this real person's recent activity`);

// The sanctioned helper, for contrast: it refuses on the same input.
const seedHistoryWouldReturn = (c) => (c && typeof c.id === "number" && c.id !== 0) ? "ticks" : "[]";
console.log(`\n  for contrast, seedHistoryFor(dbFriend) returns ${seedHistoryWouldReturn(dbFriend)} — the gate Home's filter lacks`);

console.log(fail
  ? `\n${fail} failure(s). Home's filter matches on display name with no identity gate.`
  : "\nall cases pass — Home's friend feed is gated on identity, not on name.");
process.exitCode = fail ? 1 : 0;
