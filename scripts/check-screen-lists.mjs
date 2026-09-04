// check:screen-lists — a guard's list of screens must match the app's own.
//
// THE APP HAS SEVEN TABS AND FIVE BROWSER GUARDS WALKED SIX. `NAV` is
// today/routes/discover/crew/logbook/RANKS/me, and check:a11y-badges, check:overflow,
// check:overlay-scroll, check:signed-in and check:zero each hard-coded the same six, omitting
// `ranks`. Not drift: `ranks` has been in NAV since the first commit and every one of those
// guards was written years after it, so the wrong list was copied five times from a sibling.
//
// The Leaderboards screen was therefore never walked by any of them, and it was not empty --
// its "YOU" badge is a separate <span> held off the climber's name by `marginLeft`, so Chrome
// announced "@quinnfixtureYOU". That is precisely the defect check:a11y-badges exists for
// (#740), on a screen it could not see. A coverage hole is invisible by construction: a screen
// nobody opens is not a screen with no findings, it is not a screen.
//
// check:outage had this exact hole and it was fixed by hand (its own header records walking
// "five tabs and a duplicate"). Nothing carried the fix across, and nothing could -- which is
// the argument for a script over a note, the same one check:crew-member-readers makes.
//
// It also caught a foreign entry the other way round: check:token-boxes walked a ROUTE sub-tab
// called "ranks", which does not exist (the bar is overview/planner/conditions/safety/partners/
// photos). So it spent a walk on a tab id the route page has no branch for and never inspected
// Partners at all, while its own header claimed six sub-tabs.
//
// HOW IT DECIDES. Both vocabularies are read from the app, never restated here: NAV from
// ClimbMatch.jsx, the sub-tab bar from RouteDetail.jsx. Any array of string literals in
// scripts/ with at least three members of one vocabulary is a list OF that vocabulary, and must
// then hold all of it and nothing foreign. Three is the threshold because a list that names
// three of these ids is not doing so by accident; below it, a lone "today" or "photos" is more
// likely a different concept.
//
// PARTIAL ON PURPOSE. A subset is sometimes right -- check:anniversary names the tabs its two
// notification surfaces can appear on, check:camping names the tabs its heading could render
// on, check:ui's second sweep is the tabs that have an interactive pass. Those are declared with
// a reason and a STALE entry fails, so the list cannot rot into a description of code that has
// moved on.
//
// Static -- no browser, no dev server, no DB -- so it runs inside `npm run build`.
//
//   node scripts/check-screen-lists.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rel = (f) => path.relative(ROOT, f);

// A subset that is CORRECT, each with the reason it is a subset. Keyed by file, vocabulary and
// the exact values in source order: an exemption is a claim about one particular list, so a
// list that changes stops matching and has to be re-justified rather than silently inheriting
// somebody else's reasoning.
const PARTIAL_ON_PURPOSE = [
  {
    file: "scripts/check-anniversary.mjs", kind: "nav-id", values: "me,today,crew,logbook",
    why: "the tabs the notifications PANEL can be opened from; Climbs and Partners host no notification surface, and Ranks none either",
  },
  {
    file: "scripts/check-camping-section.mjs", kind: "subtab-id", values: "overview,planner,safety,conditions",
    why: "the can-this-probe-fail list: the sub-tabs CAMPING & BIVY could plausibly render on. Photos and Partners host no route prose at all",
  },
  {
    file: "scripts/check-ui.mjs", kind: "nav-label", values: "Home,Crew,Logbook,Ranks,Profile",
    why: "the second, INTERACTIVE sweep. Climbs and Partners are walked in the full pass above; neither has a one-interaction-deep state this sweep knows how to drive",
  },
];

const fails = [];
const fail = (m) => fails.push(m);

// ── The app's own vocabularies. Read, never restated.
const app = readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const navM = /NAV\s*=\s*\[([\s\S]*?)\];/.exec(app);
if (!navM) {
  console.error("check:screen-lists: ANCHOR LOST — no `NAV = [...]` in ClimbMatch.jsx. Nothing below was checked.");
  process.exit(1);
}
const navIds = [...navM[1].matchAll(/id:"([a-z]+)"/g)].map((m) => m[1]);
const navLabels = [...navM[1].matchAll(/label:"([^"]+)"/g)].map((m) => m[1]);

const rd = readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const barM = /\[\["overview","Overview"\][\s\S]{0,400}?\]\]/.exec(rd);
if (!barM) {
  console.error("check:screen-lists: ANCHOR LOST — the route sub-tab bar `[[\"overview\",\"Overview\"],…]` is not in RouteDetail.jsx. Nothing below was checked.");
  process.exit(1);
}
const subIds = [...barM[0].matchAll(/\["([a-z]+)",/g)].map((m) => m[1]);

// Fail closed on a vocabulary that parsed but came back short: a two-entry NAV would make every
// list below look complete.
if (navIds.length < 5 || navLabels.length !== navIds.length || subIds.length < 5) {
  console.error(`check:screen-lists: the app's own screen lists did not parse sensibly — ${navIds.length} nav ids, ${navLabels.length} nav labels, ${subIds.length} sub-tab ids. Refusing to report on them.`);
  process.exit(1);
}

const VOCAB = [
  ["nav-id", navIds, "the app's main tabs (NAV in ClimbMatch.jsx)"],
  ["nav-label", navLabels, "the app's main tabs, by label (NAV in ClimbMatch.jsx)"],
  ["subtab-id", subIds, "the route page's sub-tabs (the bar in RouteDetail.jsx)"],
];

// ── Every guard under scripts/, excluding scripts/oneoff/ (a one-off probe is scoped to
//    whatever it was written to measure and has no business being held to full coverage).
const files = [];
const walk = (d) => {
  for (const e of readdirSync(d).sort()) {
    if (e.startsWith(".")) continue; // never a guard; and a temp file that vanishes
    // between this readdir and the stat below would otherwise kill the walk.
    const p = path.join(d, e);
    if (statSync(p).isDirectory()) { if (e !== "oneoff" && e !== "node_modules") walk(p); }
    else if (e.endsWith(".mjs")) files.push(p);
  }
};
walk(path.join(ROOT, "scripts"));

if (files.length < 20) {
  console.error(`check:screen-lists: found only ${files.length} scripts — the walk is broken, not the tree. Nothing was checked.`);
  process.exit(1);
}

const seen = [];   // every classified list, for the stale-exemption test
let classified = 0;

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); } catch (e) {
    fail(`${rel(f)} did not parse (${e.message.slice(0, 80)}) — it was NOT checked`);
    continue;
  }
  // A list of screens is not always an ARRAY. check:selected-state wrote its tab list as a
  // COMMA-JOINED STRING -- arg("tabs", "Home,Climbs,Discover,...").split(",") -- so it was
  // invisible to this guard by construction, and duly shipped tapping "Discover", a label the
  // nav does not carry (it is "Partners"), while omitting "Ranks" entirely. A tap that matches
  // nothing leaves the previous screen up, so that guard measured FIVE TABS AND A DUPLICATE for
  // as long as it existed: exactly the defect check:outage's header already records, in a
  // different guard, evading the gate written to prevent it.
  //
  // A delimited string is checked only when it is SPLIT on that delimiter -- a prose sentence
  // that happens to contain commas is not a list, and the .split() is what says the author meant
  // one. The vocabulary test below is unchanged, so the >= 3 threshold still does the deciding.
  const stringLists = [];
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "MemberExpression" || !c.property || c.property.name !== "split") return;
      const arg0 = p.node.arguments[0];
      if (!arg0 || arg0.type !== "StringLiteral" || !arg0.value) return;
      // The receiver may be the literal itself, or a call that defaults to one (arg("tabs", "...")).
      const lits = [];
      const grab = (n, d) => {
        if (!n || d > 3) return;
        if (n.type === "StringLiteral") { lits.push(n); return; }
        if (n.type === "CallExpression") n.arguments.forEach((a) => grab(a, d + 1));
        if (n.type === "LogicalExpression") { grab(n.left, d + 1); grab(n.right, d + 1); }
      };
      grab(c.object, 0);
      for (const lit of lits) {
        const vals = lit.value.split(arg0.value).map((x) => x.trim()).filter(Boolean);
        if (vals.length >= 3) stringLists.push({ vals, line: lit.loc.start.line });
      }
    },
  });

  const classify = (vals, line) => {
      for (const [kind, members, human] of VOCAB) {
        if (vals.filter((v) => members.includes(v)).length < 3) continue;
        classified++;
        const missing = members.filter((m) => !vals.includes(m));
        const foreign = vals.filter((v) => !members.includes(v));
        const entry = { file: rel(f), kind, values: vals.join(","), line, missing, foreign };
        seen.push(entry);
        if (!missing.length && !foreign.length) return;
        const declared = PARTIAL_ON_PURPOSE.find((d) => d.file === entry.file && d.kind === kind && d.values === entry.values);
        if (declared) return;
        const parts = [];
        if (missing.length) parts.push(`never walks ${missing.join(", ")}`);
        if (foreign.length) parts.push(`walks ${foreign.join(", ")}, which is not one of ${human}`);
        fail(`${entry.file}:${entry.line} is a list of ${human} and ${parts.join("; ")}\n      it holds [${vals.join(", ")}]\n      A screen nobody opens is not a screen with no findings. Add the missing one, or declare the subset in PARTIAL_ON_PURPOSE with the reason it is correct.`);
        return;
      }
  };

  traverse(ast, {
    ArrayExpression(p) {
      const els = p.node.elements;
      if (els.length < 3 || !els.every((e) => e && e.type === "StringLiteral")) return;
      classify(els.map((e) => e.value), p.node.loc.start.line);
    },
  });
  for (const sl of stringLists) classify(sl.vals, sl.line);
}

if (!classified) {
  console.error("check:screen-lists: no script names three or more of the app's screens — the scan matched nothing, which is not the same as a clean tree.");
  process.exit(1);
}

// A declaration that no longer describes a real list is bookkeeping that has rotted: either the
// list was completed (so the exemption should go) or it was edited (so the reason needs re-stating).
// Keying on the exact VALUES is deliberate: an exemption is a claim about one particular list,
// so any edit to that list has to be re-justified rather than inheriting somebody else's
// reasoning. It does mean a completed list stops MATCHING rather than matching-and-passing, so
// the diagnosis is made from whatever list of that kind the file has now -- "you finished it,
// drop the exemption" and "you changed it, say why" need different answers, and an earlier
// version had the COMPLETE branch behind the values key where nothing could ever reach it.
for (const d of PARTIAL_ON_PURPOSE) {
  if (seen.some((s) => s.file === d.file && s.kind === d.kind && s.values === d.values)) continue;
  const nowAll = seen.filter((s) => s.file === d.file && s.kind === d.kind);
  const complete = nowAll.find((s) => !s.missing.length && !s.foreign.length);
  if (complete) fail(`STALE PARTIAL_ON_PURPOSE: ${d.file}'s ${d.kind} list is now COMPLETE ([${complete.values}]), so the exemption excuses nothing. Remove it.`);
  else if (nowAll.length) fail(`STALE PARTIAL_ON_PURPOSE: ${d.file}'s ${d.kind} list has CHANGED — declared [${d.values}], found [${nowAll.map((s) => s.values).join("] [")}]. Re-check whether the subset is still correct, then update the entry and its reason.`);
  else fail(`STALE PARTIAL_ON_PURPOSE: ${d.file} has no ${d.kind} list at all any more. Remove the entry.`);
}

console.log(`check:screen-lists: ${files.length} scripts, ${classified} screen list(s) classified against ${navIds.length} tabs and ${subIds.length} route sub-tabs, ${PARTIAL_ON_PURPOSE.length} declared subset(s).`);
// ---- CLAUDE.md's Architecture section names these vocabularies too ---------------
//
// The rule above is scoped to `scripts/`, so a hand-copy of the same vocabulary in the
// DOCS is invisible to it — and that is not hypothetical. CLAUDE.md's Architecture
// bullet listed the route sub-tabs as overview/conditions/planner/safety/photos/`ranks`:
// `ranks` is a top-level NAV tab and has never been a route sub-tab, and `partners` was
// missing. That is the EXACT wrong list this guard's own header records as having cost
// check:token-boxes a walk. The guard was fixed at the time; the sentence that seeded it
// was not, so a reader starting from Architecture would reintroduce it.
//
// Scoped to the one bullet, deliberately. CLAUDE.md discusses these ids in prose
// throughout (this file's own entry lists them), so a document-wide scan would fire on
// every correct mention.
const claude = readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
const archLine = claude.split("\n").find((l) => l.startsWith("- `routes` —") && l.includes("sub-`tab` state"));
if (!archLine) {
  console.error("check:screen-lists: ANCHOR LOST — CLAUDE.md's Architecture bullet for `routes` was renamed or removed.");
  console.error("  It is the sentence beginning \"- `routes` —\" that names the route sub-tab state. Re-point this check at it.");
  process.exit(1);
}
// Strip the bullet's SUBJECT ("- `routes` — …") before extracting, rather than putting
// `routes` on an ignore list: an ignore list is how this check goes vacuous. A first
// version also ignored `ranks`, which is precisely the id the defect consisted of — it
// would have passed the original wrong bullet. Only genuine app-state names are excused.
const body = archLine.replace(/^- `routes` —/, "");
const IGNORE = new Set(["selRoute", "tab"]);            // app state, not sub-tab ids
const named = [...body.matchAll(/`([a-z][a-z_]{2,20})`/g)].map((m) => m[1]).filter((x) => !IGNORE.has(x));
const foreign = named.filter((x) => !subIds.includes(x));
const missing = subIds.filter((x) => !named.includes(x));
if (foreign.length || missing.length) {
  fails.push("CLAUDE.md's Architecture bullet for `routes` does not match the real sub-tab bar."
    + "\n      the app's bar : " + subIds.join(", ")
    + "\n      the bullet    : " + (named.join(", ") || "(none parsed)")
    + (foreign.length ? "\n      NOT a sub-tab : " + foreign.join(", ") : "")
    + (missing.length ? "\n      MISSING       : " + missing.join(", ") : "")
    + "\n      A reader starts from Architecture, so a wrong list here is copied into the next guard.");
}

if (fails.length) {
  console.error(`\ncheck:screen-lists: ${fails.length} screen list(s) do not match the app:\n`);
  for (const m of fails) console.error("  - " + m + "\n");
  process.exit(1);
}
console.log("check:screen-lists: ok — every guard's screen list matches the app's own.\n");
