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
// means the scan covered a fraction of it. main.jsx is the entry shim and lib/ is
// enumerated dynamically, so neither belongs in a must-exist list.
export const REQUIRED = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

const bail = (guard, msg) => {
  console.error(`\n${guard} FAILED — ${msg}`);
  console.error("This is a coverage failure, not a code failure: the guard cannot report");
  console.error("green about source it never read. Update the guard to match the new layout.\n");
  process.exit(1);
};

// For guards that name their inputs (check:refs, check:hooks). Returns the app source
// list — the required files, main.jsx if present, and every lib/*.js(x) — and exits
// naming any required file it could not find, rather than dropping it.
export function appSources(root, guard) {
  const missing = REQUIRED.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) {
    bail(guard, `${missing.length} required app source(s) are missing: ${missing.join(", ")}`);
  }
  const list = [...REQUIRED];
  if (fs.existsSync(path.join(root, "main.jsx"))) list.push("main.jsx");
  const libDir = path.join(root, "lib");
  if (!fs.existsSync(libDir)) {
    bail(guard, "there is no lib/ directory, so the DB, auth and area-browser modules went unscanned");
  }
  const lib = fs.readdirSync(libDir).filter((f) => /\.jsx?$/.test(f));
  if (!lib.length) bail(guard, "lib/ contains no .js/.jsx files, which cannot be right");
  return list.concat(lib.map((f) => "lib/" + f));
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

// ── Components moved OUT of ClimbMatchCore.jsx so they load lazily ─────────────────────────
// Splitting the startup bundle moved these whole components, verbatim, into lib/<Name>.jsx
// (each one's default export). Most guards were written while they were core source and read
// core by text — so after a move they do not fail, they go BLIND: every pattern that used to
// match inside the component matches nothing, and a rule that only ever forbids passes.
//
// readCoreSource() rebuilds the text core had before the moves: core, then each moved file
// with its import lines dropped and `export default function` turned back into `function`.
// That is a valid module (the moved imports were core's own bindings or core's own imports),
// so text scans, regexes and Babel parses all see the moved code as they did before. A guard
// that reads core by text should read it through here; one that BUNDLES core to execute it
// must import the moved component from lib/ instead, since a bundle cannot be rebuilt this way.
//
// A moved file that is missing is a HARD failure, for the reason at the top of this file.
export const MOVED_FROM_CORE = [
  "lib/PartnerSearch.jsx", "lib/Leaderboards.jsx", "lib/CrewFinder.jsx",
  "lib/CrewCard.jsx", "lib/AddRoute.jsx", "lib/LogAscent.jsx",
  "lib/ListsManager.jsx", "lib/TripReport.jsx", "lib/EditProfileScreen.jsx",
  "lib/Help.jsx", "lib/LegalView.jsx", "lib/Calendar.jsx", "lib/FriendsList.jsx", "lib/Inbox.jsx",
  "lib/GiveVouch.jsx", "lib/Onboarding.jsx", "lib/ShareCard.jsx", "lib/NotifPanel.jsx",
  "lib/MyAscents.jsx", "lib/SafetyTab.jsx",
];
export function movedAsCoreText(text, file = "a moved file") {
  const body = text.replace(/^import [^\n]*\n/gm, "");
  const n = (body.match(/^export default function /gm) || []).length;
  if (n !== 1) throw new Error(`${file}: expected exactly one "export default function", found ${n}`);
  return body.replace(/^export default function /m, "function ");
}
// For a guard that BUNDLES core to execute or render it: an entry file exporting everything core
// exports PLUS each moved component under its old name (they are lib/ default exports now), so the
// bundle has the module shape it had before the moves and `mod.Inbox` still resolves. Written
// inside the checkout (react must resolve from its node_modules), pid-scoped; call cleanup().
export function coreModuleEntry(root = OWN_ROOT) {
  const p = path.join(root, `.core-entry-${process.pid}-${Math.random().toString(36).slice(2, 8)}.jsx`);
  const lines = [`export * from "./ClimbMatchCore.jsx";`];
  for (const f of MOVED_FROM_CORE) {
    if (!fs.existsSync(path.join(root, f))) throw new Error(`${f} is missing — it cannot be re-exported`);
    lines.push(`export { default as ${path.basename(f, ".jsx")} } from "./${f}";`);
  }
  fs.writeFileSync(p, lines.join("\n") + "\n");
  return { path: p, cleanup: () => fs.rmSync(p, { force: true }) };
}

// For a guard that loops over a fixed list of app files which does NOT include lib/: reading
// core through here keeps the moved components in view without scanning anything twice.
// (A guard that already walks lib/ sees them as lib files and must keep reading core raw.)
export function readAppFile(abs) {
  if (path.basename(abs) === "ClimbMatchCore.jsx") return readCoreSource(path.dirname(abs));
  return fs.readFileSync(abs, "utf8");
}

// The checkout this module lives in — never another worktree's (check:script-roots).
const OWN_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
export function readCoreSource(root = OWN_ROOT, guard = "a guard") {
  const coreP = path.join(root, "ClimbMatchCore.jsx");
  if (!fs.existsSync(coreP)) bail(guard, "ClimbMatchCore.jsx is missing");
  let out = fs.readFileSync(coreP, "utf8");
  for (const f of MOVED_FROM_CORE) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) bail(guard, `${f} (a component moved out of ClimbMatchCore.jsx) is missing, so it would go unscanned`);
    out += "\n" + movedAsCoreText(fs.readFileSync(p, "utf8"), f);
  }
  return out;
}
