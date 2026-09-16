// A mutual friend must be REAL, NAMED THE WAY THEY ASKED, and COUNTED AS THE LIST THAT RENDERS.
//
// `mutualIds()` took no arguments and returned a literal `[]`, so `mutualCount()` was 0 for
// every climber, always. Every consumer renders as `mutualCount(...) ? control : null`, so the
// row never drew and the Mutual friends sheet had NO reachable entry point in the app — only
// `?z=mutualModal`, the overlay guards' own opener, could mount it. The feature was ABSENT
// rather than lying, which is why no honesty guard ever saw it, and why a session spent a PR
// polishing the copy of a sheet nobody could open.
//
// WHY THIS IS A BUILD GATE RATHER THAN A PROBE. Three of the things it checks change strings and
// conditions and NO identifier — the ask-set filter, the block clause, the pubFirst call — and
// audit:silent-reverts says in its own closing caveat that it cannot see a change of that shape.
// A stale-base squash could put the seed-id resolution back with every other guard green.
//
// IT PARSES RATHER THAN STRIPS, AND THAT IS NOT A STYLE CHOICE — IT IS A DEFECT THIS GUARD
// SHIPPED WITH FOR ONE ITERATION. The first version blanked comments with the obvious
// `/\/\*[\s\S]*?\*\//g` and then scanned the result. A comment-opening sequence inside a STRING
// LITERAL starts a phantom comment that runs to the next real terminator, so that strip removed
// **23.7% of ClimbMatch.jsx and 49.1% of lib/db.js**, took `<FullProfile` from 2 occurrences to
// 0, and reported a correctly-wired call site as MISSING — the direction that sends an author to
// "fix" working code. CLAUDE.md records the identical strip eating 21% of RouteDetail.jsx and
// calling a live flag dead. An AST does not see comments at all, so it has neither failure mode.
//
// WHAT IT DELIBERATELY DOES NOT DO: reach the database. Whether the RPC returns the right rows
// is a question about three real accounts and lives in
// scripts/oneoff/probe-mutual-connections-with-three-real-accounts.mjs, which creates them.
// This guard is static and executes only the pure helpers, so it runs in the build chain.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0, ran = 0;
const ok = (m) => { pass++; ran++; console.log("  ok   " + m); };
const bad = (m, d) => { fail++; ran++; console.log("  FAIL " + m + (d ? "  -- " + d : "")); };
class Dead extends Error {}
const dead = (m) => { console.error("\ncheck:mutual-friends: " + m + "\nThis run proved nothing.\n"); throw new Dead(m); };

const read = (rel) => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) dead("missing " + rel);
  const s = fs.readFileSync(p, "utf8");
  if (s.length < 400) dead(rel + " read short (" + s.length + " chars) — a truncated source makes every assertion vacuous");
  return s;
};
const ast = (src, file) => {
  try { return parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { return dead("could not parse " + file + ": " + e.message); }
};

const MUTUAL_FN = /^mutual(Count|Label|FirstNames|Ids|sFor)$/;

try {

const appSrc = read("ClimbMatch.jsx");
const coreSrc = read("ClimbMatchCore.jsx");
const dbSrc = read("lib/db.js");

// ── 1. THE HELPERS, EXECUTED ───────────────────────────────────────────────────────────────
console.log("\n1. the pure helpers, run rather than read\n");

const out = path.join(ROOT, `.mutual-probe-${process.pid}.mjs`);
try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic", "--loader:.jsx=jsx",
    `--define:import.meta.env=${JSON.stringify({ VITE_USE_DB: "true", VITE_SUPABASE_URL: "https://probe.invalid", VITE_SUPABASE_ANON_KEY: "probe" })}`,
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  fs.rmSync(out, { force: true });
  dead("esbuild could not bundle ClimbMatchCore.jsx");
}

// createClient builds a RealtimeClient AT CONSTRUCTION, which wants a WebSocket constructor:
// native on node 22, absent on 20. Without this stub the guard passes in CI and dies on a
// contributor's machine — the asymmetry check:topo-outage-copy records.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}

let M;
try { M = await import("file://" + out); } finally { fs.rmSync(out, { force: true }); }

for (const n of ["mutualsFor", "mutualIds", "mutualCount", "mutualLabel", "mutualFirstNames"]) {
  if (typeof M[n] !== "function") dead("core does not export " + n + " — ANCHOR LOST");
}

// Two friends: one who asked to be shown by name, one who did not. That difference is the whole
// point of routing through pubFirst.
const named = { id: "u-named", name: "Ada Lovelace", username: "adal", showName: true };
const handled = { id: "u-handle", name: "Bo Peep", username: "bopeep", showName: false };
const mutuals = { "other-1": [named, handled], "other-2": [named] };

if (M.mutualCount("other-1", mutuals) === 2) ok("the count is the length of the list that renders");
else bad("the count is the length of the list that renders", String(M.mutualCount("other-1", mutuals)));

// THE COUNT AND THE LIST MUST AGREE — check:count-matches-its-list' subject applied here: the
// label states a number and the row beside it names people, and those are one fact derived
// twice unless they come from one array.
const names1 = M.mutualFirstNames("other-1", mutuals);
if (names1.length === M.mutualCount("other-1", mutuals)) ok("...and the names rendered are that same list, not a second derivation");
else bad("...and the names rendered are that same list", names1.length + " names vs count " + M.mutualCount("other-1", mutuals));

if (/2 mutual friends/.test(M.mutualLabel("other-1", mutuals))) ok("the label pluralises on the real count");
else bad("the label pluralises on the real count", M.mutualLabel("other-1", mutuals));
if (/1 mutual friend$/.test(M.mutualLabel("other-2", mutuals))) ok("...and says 'friend' for one");
else bad("...and says 'friend' for one", M.mutualLabel("other-2", mutuals));

// A climber nobody is shared with stays silent. Every consumer renders `count ? control : null`,
// so an empty answer must produce an empty label rather than "0 mutual friends".
if (M.mutualLabel("nobody", mutuals) === "" && M.mutualCount("nobody", mutuals) === 0) ok("a climber with none is silent, not '0 mutual friends'");
else bad("a climber with none is silent", JSON.stringify(M.mutualLabel("nobody", mutuals)));
if (M.mutualCount("other-1", null) === 0 && M.mutualCount("other-1", undefined) === 0) ok("...and an unresolved map reads as none rather than throwing");
else bad("...and an unresolved map reads as none rather than throwing");

// NAMED THE WAY THEY ASKED. This is the assertion that would have caught the old resolution:
// `CLIMBERS.find(...).name.split(" ")[0]` publishes a real name whatever the climber set, and
// matches an INTEGER seed id, so on a real account it returned nothing at all.
if (names1.includes("Ada")) ok("a climber who shows their name is named");
else bad("a climber who shows their name is named", JSON.stringify(names1));
if (names1.includes("@bopeep")) ok("...and one who asked for a handle gets the handle, not their real name");
else bad("...and one who asked for a handle gets the handle", JSON.stringify(names1));
if (!names1.some((n) => /Bo\b/.test(n))) ok("...with the real name absent entirely");
else bad("...with the real name absent entirely", JSON.stringify(names1));

if (JSON.stringify(M.mutualIds("other-1", mutuals)) === JSON.stringify(["u-named", "u-handle"])) ok("mutualIds still yields ids for callers that want them");
else bad("mutualIds still yields ids", JSON.stringify(M.mutualIds("other-1", mutuals)));

// ── 2. THE WIRING ──────────────────────────────────────────────────────────────────────────
console.log("\n2. the wiring, which no execution can prove\n");

const appAst = ast(appSrc, "ClimbMatch.jsx");
const coreAst = ast(coreSrc, "ClimbMatchCore.jsx");
const dbAst = ast(dbSrc, "lib/db.js");

let rpcCall = false, hookRange = null, askRange = null;
traverse(dbAst, {
  CallExpression(p) {
    const c = p.node.callee;
    if (c.type === "MemberExpression" && c.property && c.property.name === "rpc") {
      const a0 = p.node.arguments[0];
      if (a0 && a0.type === "StringLiteral" && a0.value === "mutual_connections") rpcCall = true;
    }
  },
  FunctionDeclaration(p) {
    if (p.node.id && p.node.id.name === "useMutualConnections") hookRange = [p.node.start, p.node.end];
  },
});
if (rpcCall) ok("lib/db.js calls the mutual_connections RPC");
else bad("lib/db.js calls the mutual_connections RPC");
if (!hookRange) dead("useMutualConnections not found in lib/db.js — ANCHOR LOST");
// Sliced by NODE RANGE, so this reads the function and nothing around it.
const hookText = dbSrc.slice(hookRange[0], hookRange[1]);
if (/if\s*\(\s*error\s*\)\s*throw\s+error/.test(hookText)) ok("...and a failed read throws rather than resolving empty");
else bad("...and a failed read throws rather than resolving empty");

// SEED IDS MUST NEVER REACH A uuid[] RPC. PostgREST answers a type mismatch with a 400, so an
// unfiltered ask set does not degrade quietly — it takes the feature down for everyone.
traverse(appAst, {
  VariableDeclarator(p) {
    if (p.node.id && p.node.id.name === "_mutualAsk") askRange = [p.node.start, p.node.end];
  },
});
if (!askRange) dead("_mutualAsk not found in ClimbMatch.jsx — ANCHOR LOST");
const askText = appSrc.slice(askRange[0], askRange[1]);
const adds = (askText.match(/s\[[^\]]+\]\s*=\s*1/g) || []).length;
const guards = (askText.match(/typeof\s+[A-Za-z0-9_.]+\s*===\s*"string"/g) || []).length;
// A COUNT EQUALITY rather than a presence test: with four sources feeding the ask set,
// "at least one is guarded" is satisfied while three of them are not. The injection case
// ask-set-unfiltered reported MISSED against the presence version.
if (adds > 0 && adds === guards) ok("App asks only about uuids — all " + adds + " id source(s) string-checked, so a seed id cannot 400 the call");
else bad("App asks only about uuids", adds + " id(s) added to the ask set but " + guards + " string-checked");

// Every consumer takes the resolved map. Counted rather than spot-checked: a rename landing on
// some call sites and not others leaves one screen quietly reporting nobody. The REVERT SHAPE
// is the same test read the other way — an argument still derived from `connections.map` at the
// call site is the stub's behaviour restored.
let good = 0; const stale = [];
for (const [tree, file] of [[appAst, "ClimbMatch.jsx"], [coreAst, "ClimbMatchCore.jsx"]]) {
  traverse(tree, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "Identifier" || !MUTUAL_FN.test(c.name)) return;
      const a1 = p.node.arguments[1];
      if (a1 && a1.type === "Identifier" && a1.name === "mutuals") good++;
      else stale.push(file + ":" + c.name);
    },
  });
}
if (!stale.length) ok("no consumer still derives its argument at the call site");
else bad("no consumer still derives its argument at the call site", [...new Set(stale)].join(" "));
if (good >= 12) ok("all " + good + " consumer call sites take the resolved map");
else bad("consumer call sites take the resolved map", "only " + good + " do");

// The seed resolution, read off the function's own node range.
let fnRange = null;
traverse(coreAst, {
  FunctionDeclaration(p) { if (p.node.id && p.node.id.name === "mutualFirstNames") fnRange = [p.node.start, p.node.end]; },
});
if (!fnRange) dead("mutualFirstNames not found in core — ANCHOR LOST");
const fnText = coreSrc.slice(fnRange[0], fnRange[1]);
if (!/CLIMBERS\.find/.test(fnText)) ok("...and the names are not resolved against the seed CLIMBERS array");
else bad("...and the names are not resolved against the seed CLIMBERS array");
if (/pubFirst/.test(fnText)) ok("...they go through pubFirst, which honours the climber's own show-name choice");
else bad("...they go through pubFirst");

// The three components App hands the map to. A JSX attribute is a node, so a tag quoted inside
// a comment cannot satisfy this and a real one cannot be missed.
const got = new Set();
traverse(appAst, {
  JSXOpeningElement(p) {
    const n = p.node.name;
    if (n.type !== "JSXIdentifier") return;
    if (!["FullProfile", "FriendsList", "PartnerSearch"].includes(n.name)) return;
    const has = p.node.attributes.some((a) => a.type === "JSXAttribute" && a.name && a.name.name === "mutuals");
    if (has) got.add(n.name);
  },
});
for (const name of ["FullProfile", "FriendsList", "PartnerSearch"]) {
  if (got.has(name)) ok("App hands " + name + " the map");
  else bad("App hands " + name + " the map");
}

// ── 3. THE DEFINER FUNCTION ────────────────────────────────────────────────────────────────
console.log("\n3. the definer function, as written\n");

const migName = fs.readdirSync(path.join(ROOT, "supabase/migrations")).find((f) => /mutual/.test(f));
if (!migName) dead("no migration defining mutual_connections — ANCHOR LOST");
// SQL line comments only. This migration's header QUOTES the forbidden `= public` spelling while
// explaining why it is wrong, so an unstripped scan would pass on the documentation. No string
// literal in this file contains `--`, which is what makes the line strip safe here.
const migRaw = read("supabase/migrations/" + migName);
const mig = migRaw.split(String.fromCharCode(10)).map((l) => l.replace(/--.*$/, "")).join(String.fromCharCode(10));
if (mig.length < 200) dead("the migration stripped to nothing — every assertion below would be vacuous");

if (/security\s+definer/i.test(mig)) ok("the function is SECURITY DEFINER, the only way to read the other side's edges");
else bad("the function is SECURITY DEFINER");
// `set search_path = public` READS AS PINNED AND IS NOT: Postgres searches pg_temp first unless
// pg_temp is itself named, so a caller could shadow `connections` with a temp table.
if (/set\s+search_path\s*=\s*public\s*,\s*pg_temp/i.test(mig)) ok("...with pg_temp named in search_path, not merely `= public`");
else bad("...with pg_temp named in search_path");
if (/profile_owner_blocked_me/.test(mig)) ok("a climber who blocked you is not readable through this side door");
else bad("a climber who blocked you is not readable through this side door");
if (/revoke[\s\S]{0,80}from\s+anon/i.test(mig)) ok("execute is revoked from anon rather than left to the body to refuse");
else bad("execute is revoked from anon");
if (/array_length\s*\(\s*others/i.test(mig)) ok("the array is capped, so a friend list cannot be swept in one call");
else bad("the array is capped");

// 0182 EXISTS BECAUSE 0087 IS PARTY-ONLY, so that premise is asserted rather than assumed.
// Carried from the probe this change deletes: a parallel session (#1747) reached the same
// conclusion independently and asserted the blocker FROM the migration so it fails as STALE
// the day the policy is widened. It means more here than it did there -- widen that select and
// the definer stops being necessary AND the disclosure written into the privacy documents has
// to be re-derived, because the intersection would no longer need anyone's elevated rights.
const pol = read("supabase/migrations/0087_connections.sql");
const sel = pol.match(/create policy "connections read own"[\s\S]*?;/);
if (!sel) dead('0087 no longer declares a "connections read own" select policy — ANCHOR LOST');
if (/auth\.uid\(\)\s*=\s*requester\s+or\s+auth\.uid\(\)\s*=\s*addressee/.test(sel[0])) {
  ok("`connections` is still readable by the two parties only, which is why this RPC has to exist");
} else {
  bad("0087's select policy is no longer party-only", "the definer's rationale AND the privacy documents both need re-deriving");
}

} catch (e) {
  if (e instanceof Dead) process.exit(1);
  throw e;
}

// A floor two below a clean run, the convention this repo holds: a floor set to the exact total
// cannot see its own newest section stop asking.
const FLOOR = 24;
if (ran < FLOOR) {
  console.error("\ncheck:mutual-friends: only " + ran + " assertions ran (floor " + FLOOR + ") — this run proved less than it claims.\n");
  process.exit(1);
}

console.log("\n" + (fail
  ? "check:mutual-friends: " + fail + " failed of " + ran + "."
  : "check:mutual-friends: ok — mutual friends are real, named as asked, and counted as the list that renders (" + ran + " assertions)."));
process.exit(fail ? 1 : 0);
