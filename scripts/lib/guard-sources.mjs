// Every static guard has to answer one question before it prints "ok": did it actually
// read the app? None of them asked it, and this codebase has already been bitten by the
// answer being no.
//
// #547 is the case on record. The three-way split (#497/#508) moved most of the app out
// of ClimbMatch.jsx into ClimbMatchCore.jsx and RouteDetail.jsx, while check:refs and
// check:hooks still named only the entry files — so for a week the guard that exists to
// stop production blank screens was reading 24% of the app and reporting green on the
// other 76%.
//
// The fix for #547 added the missing names and then filtered the list with existsSync:
//
//     const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", ...]
//       .filter(f => fs.existsSync(path.join(ROOT, f)));
//
// which preserves the exact failure it documents. A renamed or moved file does not fail
// the guard; it silently drops out of the list and the guard reports green on whatever
// is left. That is the same shape as check:dead-flag-gates printing ok having loaded no
// files, and check:overlay-scroll's anchor-lost case exiting 0 having verified nothing:
// a guard you believe you have and do not.
//
// So: a missing required source is a HARD FAILURE here, never a quietly shorter list.
import fs from "node:fs";
import path from "node:path";

// The app source files that any whole-app guard must be reading. Deliberately not
// "every file" — these are the three that hold the app, so their absence from a scan
// means the scan covered a fraction of it. main.jsx is the entry shim and the component
// folders are enumerated dynamically, so neither belongs in a must-exist list.
export const REQUIRED = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

const bail = (guard, msg) => {
  console.error(`\n${guard} FAILED — ${msg}`);
  console.error("This is a coverage failure, not a code failure: the guard cannot report");
  console.error("green about source it never read. Update the guard to match the new layout.\n");
  process.exit(1);
};

// ── Where components live ───────────────────────────────────────────────────────────────────
// lib/ holds the DB, auth and area-browser modules plus the screens moved out of core in 2026-09;
// src/components/ holds the single-job TypeScript components being extracted from the three app
// files since 2026-10 (docs/refactor-progress.md). A guard that enumerates "the component files"
// must see BOTH, or a component in the new folder is invisible to it — the #547 shape again, one
// directory over. So the list is built here, once, and every guard takes it from here.
//
//   componentFiles(root)             → every .jsx/.tsx under lib/ (flat) and src/components/ (recursive)
//   componentFiles(root, { js: true }) → ...plus the .js/.ts modules beside them (db.js, auth.js, ...)
//
// Root-relative, sorted, so two guards agree on the order. lib/ missing or empty is a hard failure
// (it cannot be right); src/components/ may be absent until the first component lands, and the
// files KNOWN to have moved there are each asserted by name in readParentSource().
export const COMPONENT_DIRS = ["lib", "src/components"];
export function componentFiles(root, { js = false, guard = "a guard" } = {}) {
  const ext = js ? /\.[jt]sx?$/ : /\.[jt]sx$/;
  const libDir = path.join(root, "lib");
  if (!fs.existsSync(libDir)) {
    bail(guard, "there is no lib/ directory, so the DB, auth and area-browser modules went unscanned");
  }
  const out = fs.readdirSync(libDir).filter((f) => ext.test(f)).map((f) => "lib/" + f);
  if (!out.length) bail(guard, "lib/ contains no .js/.jsx files, which cannot be right");
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (ext.test(e.name) && !/\.d\.ts$/.test(e.name)) out.push(path.relative(root, p));
    }
  };
  const comp = path.join(root, "src/components");
  if (fs.existsSync(comp)) walk(comp);
  return out.sort();
}

// For guards that name their inputs (check:refs, check:hooks). Returns the app source
// list — the required files, main.jsx if present, and every component file — and exits
// naming any required file it could not find, rather than dropping it.
export function appSources(root, guard) {
  const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) {
    bail(guard, `${missing.length} required app source(s) are missing: ${missing.join(", ")}`);
  }
  const list = [...REQUIRED];
  if (fs.existsSync(path.join(root, "main.jsx"))) list.push("main.jsx");
  return list.concat(componentFiles(root, { js: true, guard }));
}

// For guards that discover their inputs by walking the tree. Walking is already the
// safer design — it picks up a new file the day it lands — but it fails open in the
// other direction: a SKIP list that grows, a renamed root, or an extension filter that
// stops matching yields [] and every "no findings" check then passes vacuously.
//
// Accepts absolute or root-relative paths.
export function assertCovered(files, root, guard, required = REQUIRED) {
  if (!files || !files.length) {
    bail(guard, "the source walk found no files at all, so every assertion below passed on an empty set");
  }
  const seen = new Set(files.map((f) => (path.isAbsolute(f) ? path.relative(root, f) : f)));
  const missing = required.filter((f) => !seen.has(f));
  if (missing.length) {
    bail(guard, `the source walk covered ${files.length} file(s) but not ${missing.join(", ")}`);
  }
  return files;
}

// ── Components moved OUT of an app file ─────────────────────────────────────────────────────
// Splitting the startup bundle (2026-09) moved whole components, verbatim, into lib/<Name>.jsx;
// the extraction into single-job components (2026-10) moves them into src/components/<Name>.tsx.
// Either way, the component is still the parent file's code as far as the guards are concerned.
// Most guards were written while the code was in the parent and read the parent by text — so
// after a move they do not fail, they go BLIND: every pattern that used to match inside the
// component matches nothing, and a rule that only ever forbids passes.
//
// readParentSource(root, parent) rebuilds the text the parent had before the moves: the parent,
// then each moved file with its import lines dropped and `export default function` turned back
// into `function`. That is a valid module (the moved imports were the parent's own bindings or
// the parent's own imports), so text scans, regexes and Babel parses all see the moved code as
// they did before — the parses must carry the "typescript" plugin, which every guard's does. A
// guard that reads a parent by text should read it through here (readAppFile does it for a file
// loop); one that BUNDLES core to execute it must import the moved component instead, since a
// bundle cannot be rebuilt this way — coreModuleEntry() below.
//
// Every extracted component is REGISTERED here under its parent, in the same PR as the move
// (docs/refactor-progress.md). A moved file that is missing is a HARD failure, for the reason at
// the top of this file. Each moved file must have exactly one `export default function` — the
// convention the stitch depends on, and the one the progress doc states.
export const MOVED = {
  "ClimbMatchCore.jsx": [
    "lib/PartnerSearch.jsx", "lib/Leaderboards.jsx", "lib/CrewFinder.jsx",
    "lib/CrewCard.jsx", "lib/AddRoute.jsx", "lib/LogAscent.jsx",
    "lib/ListsManager.jsx", "lib/TripReport.jsx", "lib/EditProfileScreen.jsx",
    "lib/Help.jsx", "lib/LegalView.jsx", "lib/Calendar.jsx", "lib/FriendsList.jsx", "lib/Inbox.jsx",
    "lib/GiveVouch.jsx", "lib/Onboarding.jsx", "lib/ShareCard.jsx", "lib/NotifPanel.jsx",
    "lib/MyAscents.jsx", "lib/SafetyTab.jsx",
    // Not moved OUT of core — born lazy (0300/0302) — but registered the same way so every guard that
    // reads "core" (overlay discovery, absence copy, real-profile rows, popup chrome) sees them.
    "lib/MyPartnerAreas.jsx", "lib/StartCrewSheet.jsx",
    "src/components/RiskBadge.tsx",
    "src/components/DiscBadge.tsx",
    "src/components/DiscBadges.tsx",
    "src/components/TrustBadge.tsx",
    "src/components/Lbl.tsx",
    "src/components/CountUp.tsx",
    "src/components/Pill.tsx",
    "src/components/ActionIcon.tsx",
    "src/components/ElevChart.tsx",
    "src/components/DiscIcon.tsx",
  ],
  "ClimbMatch.jsx": [],
  "RouteDetail.jsx": [],
};
// The pre-2026-10 name, kept because 21 guards import it. Same array, same meaning.
export const MOVED_FROM_CORE = MOVED["ClimbMatchCore.jsx"];

export function movedAsParentText(text, file = "a moved file") {
  const body = text.replace(/^import [^\n]*\n/gm, "");
  const n = (body.match(/^export default function /gm) || []).length;
  if (n !== 1) throw new Error(`${file}: expected exactly one "export default function", found ${n}`);
  return body.replace(/^export default function /m, "function ");
}
export const movedAsCoreText = movedAsParentText;

// For a guard that BUNDLES core to execute or render it: an entry file exporting everything core
// exports PLUS each moved component under its old name (they are default exports now), so the
// bundle has the module shape it had before the moves and `mod.Inbox` still resolves. Written
// inside the checkout (react must resolve from its node_modules), pid-scoped; call cleanup().
export function coreModuleEntry(root = OWN_ROOT) {
  const p = path.join(root, `.core-entry-${process.pid}-${Math.random().toString(36).slice(2, 8)}.jsx`);
  const lines = [`export * from "./ClimbMatchCore.jsx";`];
  for (const f of MOVED["ClimbMatchCore.jsx"]) {
    if (!fs.existsSync(path.join(root, f))) throw new Error(`${f} is missing — it cannot be re-exported`);
    lines.push(`export { default as ${path.parse(f).name} } from "./${f}";`);
  }
  fs.writeFileSync(p, lines.join("\n") + "\n");
  return { path: p, cleanup: () => fs.rmSync(p, { force: true }) };
}

// For a guard that loops over a fixed list of app files which does NOT include the component
// folders: reading a parent through here keeps its moved components in view without scanning
// anything twice. (A guard that already walks lib/ and src/components/ sees them as component
// files and must keep reading the parent raw.)
export function readAppFile(abs) {
  const name = path.basename(abs);
  if (MOVED[name] && MOVED[name].length) return readParentSource(path.dirname(abs), name);
  return fs.readFileSync(abs, "utf8");
}

// The checkout this module lives in — never another worktree's (check:script-roots).
const OWN_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
export function readParentSource(root = OWN_ROOT, parent = "ClimbMatchCore.jsx", guard = "a guard") {
  const parentP = path.join(root, parent);
  if (!fs.existsSync(parentP)) bail(guard, `${parent} is missing`);
  if (!MOVED[parent]) bail(guard, `${parent} is not a file components are registered as moved from`);
  let out = fs.readFileSync(parentP, "utf8");
  for (const f of MOVED[parent]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) bail(guard, `${f} (a component moved out of ${parent}) is missing, so it would go unscanned`);
    // A parent that still USES what it extracted imports it back (core imports DiscBadge for
    // DiscBadges). Stitched verbatim, that import plus the moved body is a duplicate declaration
    // and Babel refuses the whole file — so the parent's own import of each moved file is dropped.
    out = out.replace(new RegExp(`^import [^\\n]* from "[^"\\n]*/${path.basename(f).replace(/\./g, "\\.")}";?\\n`, "m"), "");
    out += "\n" + movedAsParentText(fs.readFileSync(p, "utf8"), f);
  }
  return out;
}
export function readCoreSource(root = OWN_ROOT, guard = "a guard") {
  return readParentSource(root, "ClimbMatchCore.jsx", guard);
}
