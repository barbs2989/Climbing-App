#!/usr/bin/env node
/* Injection suite for check:offline-claims.
 *
 * Rewritten twice. The first suite reproduced the twelve claims #1585 removed; the second took the
 * TRIP PACK apart link by link once packing became a real download. #2368 removed the pack and cut
 * this suite to five state-download cases, which also dropped the cases proving the readers the
 * state download still shares with the old pack (offlinePackReports / Contribs / Profiles and the
 * `_packedAt` stamp) and the "say what is NOT saved" copy rules. Those are back (§4, §5, §10),
 * pointed at the screens that describe the state download: Manage areas, Home's Pinned states card
 * and the Help FAQ and tour.
 *
 * The cases take the chain apart one link at a time, because the guard must not be able to pass on
 * the strength of its neighbours. `read-gone` is the most important: it removes only the fallback,
 * which is the shape that fails SILENTLY — the rows sit in IndexedDB, correctly written, and every
 * list by id still empties at the trailhead with every copy assertion green.
 *
 * Two cases MUST STAY SILENT: `disclaimer-reworded` (§4 asks whether the fact is stated, not for one
 * wording of it, and a negated "not saved to this device" must not trip §5) and `honest-claim` (a
 * true claim about the catalog, phrased with the no-signal idiom that once excused every sentence).
 *
 * Each case names the text ITS OWN failure must carry. A case judged on the exit code alone is
 * satisfied by a run that died for an unrelated reason, and this repo has read one as the other
 * twice. Expectations are matched against FAIL lines only, never against the text an assertion
 * prints when it passes — a case written against the healthy wording reports MISSED while the
 * guard is firing correctly.
 *
 * Every case proves its edit landed by CHECKSUM and restores the file byte-identically.
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const P = (f) => path.join(ROOT, f);
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(P(f))).digest("hex");

/* TWO RUNS OF THIS SUITE MUST NEVER OVERLAP, and one line of CLAUDE.md was not enough to stop it.
 * That file already warns not to COMMIT while an injection is in flight, because the harness edits
 * the app in place; a second HARNESS is the same hazard and strictly worse. Both snapshot, edit and
 * restore the same files, so run B's snapshot can capture run A's injected text and then "restore"
 * it permanently — which is what happened here: a rename case's edit was written back to
 * ClimbMatch.jsx as though it were the original, and the working tree ended up holding
 * `setTripPack`, `tripPack`, `dlPending` and a gutted saveAreaIds call.
 *
 * The results are worthless either way — cases reported HARNESS BUG and MISSED against a guard that
 * was fine — but a corrupt WORKING TREE is the part that outlives the run. An exclusive lock costs
 * nothing and makes the overlap impossible rather than merely discouraged. `wx` is atomic, so two
 * simultaneous starts cannot both win. */
const LOCK = P("scripts/oneoff/.inject-offline-claims.lock");
try {
  fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" });
} catch (e) {
  console.error("REFUSING TO RUN: another injection run holds " + path.relative(ROOT, LOCK) + "\n"
    + "  (pid " + (fs.existsSync(LOCK) ? fs.readFileSync(LOCK, "utf8") : "?") + "). Two runs edit the same\n"
    + "  files in place, so overlapping them corrupts BOTH results and can leave an injected edit in\n"
    + "  the working tree. Wait for it, or delete the lock if that process is gone.");
  process.exit(1);
}
/* Released on every exit path, including a throw or a Ctrl-C — a lock a crash leaves behind is a
 * lock the next person deletes without reading, which is the same as having none. */
const unlock = () => { try { fs.unlinkSync(LOCK); } catch (e) { /* already gone */ } };
process.on("exit", unlock);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { unlock(); process.exit(130); });

const TODAY = "src/components/TodayTab.tsx"; // Home's Pinned states card, lifted out of App in PR61
const CM = "ClimbMatch.jsx", RD = "RouteDetail.jsx", CORE = "ClimbMatchCore.jsx", HELP = "lib/Help.jsx", DB = "lib/db.js", OFF = "lib/offline.js";

const TRIGGER_FILES = ["src/components/ManageAreasSheet.tsx", "src/components/TodayTab.tsx", "src/components/LogbookTab.tsx"];
const CASES = [
  /* THE SILENT HALF. Write, copy and hydration all stay; only the fallback goes. Nothing renders
   * differently, no name moves, and the pack empties the moment there is no signal. */
  { name: "read-gone", file: DB, must: "fail", expect: "fallback is not offlineRoutesByIds",
    why: "§2 — the row is written and never read back; the defect no render assertion can see",
    find: "}, () => offlineRoutesByIds(ids)),", repl: "}, () => []),"  },

  { name: "reader-gone", file: OFF, must: "fail", expect: "no longer defines offlineRoutesByIds",
    why: "§2 — the reader itself is renamed out from under lib/db.js",
    find: "export async function offlineRoutesByIds(", repl: "export async function offlineRoutesById2(" },

  /* §8's silent half, and the reason that section is in the GUARD rather than only in
   * probe-offline-subtree-search: the reader stays correct, the probe stays green at 29/29, and
   * the in-area finder throws again the moment there is no signal. */
  { name: "search-fallback-gone", file: DB, must: "fail", expect: "is NOT wrapped in orOfflineExact",
    why: "§8 — the downloaded catalog can be browsed and no longer searched",
    find: "() => orOfflineExact(async () => {\n      const { data, error } = await supabase.rpc(\"routes_in_subtree\",",
    repl: "() => (async () => {\n      const { data, error } = await supabase.rpc(\"routes_in_subtree\"," },

  { name: "killreal", file: "src/components/ManageAreasSheet.tsx", must: "fail", expect: "is gone. A downloaded state IS on the device",
    why: "§6 — deleting the state download's TRUE claim to satisfy a rule about routes",
    find: "is saved on this device and keeps working with no signal", repl: "is downloaded" },

  { name: "bookmarks-gone", file: CM, must: "fail", expect: "nothing calls saveAreaIds",
    why: "§7 — saved areas go back to being lost on every reload",
    // App writes saved areas at two sites (the toggle and the account hydrate): both must go
    rx: [[/(?<![A-Za-z0-9_$])saveAreaIds\(/g, "Promise.resolve("]] },

  /* §10 — the readers a downloaded state's reports, corrections and names come back through. Each
   * edit leaves every render and every name intact online; the loss shows only with no signal. */
  { name: "reports-fallback-gone", file: DB, must: "fail", expect: "useRouteTripReports lost its device fallback",
    why: "§10 — a state's reports are downloaded and never read back",
    find: "() => offlinePackReports(routeId)", repl: "() => undefined" },
  { name: "stamp-lost", file: DB, must: "fail", expect: "useRouteContributions lost its device fallback or its structuralSharing",
    why: "§10 — structural sharing strips `_packedAt`, so saved corrections render undated",
    find: "    queryKey: [\"contributions\", routeId],\n    enabled: !!supabase && !!routeId,\n    structuralSharing: false,",
    repl: "    queryKey: [\"contributions\", routeId],\n    enabled: !!supabase && !!routeId," },
  { name: "names-fallback-gone", file: DB, must: "fail", expect: "useProfilesByIds has no device fallback",
    why: "§10 — every saved report reads as an anonymous climber offline",
    find: "() => offlinePackProfiles(ids)", repl: "() => undefined" },
  { name: "plan-mirror-gone", file: DB, must: "fail", expect: "useMyItineraries no longer mirrors",
    why: "§10 — the climber's own plan is not on the device at the trailhead",
    find: "cacheItineraries(userId, out).catch(() => {});", repl: "" },
  { name: "undated-reports", file: "src/components/RouteReportsTab.tsx", must: "fail", expect: "stopped dating the saved reports",
    why: "§10 — a saved copy of the reports reads as live",
    find: "savedAgo(reportsPackedAt)", repl: "\"\"" },
  { name: "photos-ignore-stamp", file: CM, must: "fail", expect: "photosUnavailable ignores the `_packedAt` stamp",
    why: "§10 — a route served from the device claims it has no photos",
    find: "(dbContribs.data&&dbContribs.data._packedAt)", repl: "false" },
  { name: "state-saves-photo-rows", file: OFF, must: "fail", expect: "the state download now stores photo rows",
    why: "§10 — photo rows are stored without their images",
    find: ".filter((c) => inPage.has(c.route_id) && c.kind !== \"photo\");", repl: ".filter((c) => inPage.has(c.route_id));" },

  /* §4 — both Help surfaces keep naming what a download does NOT save. */
  { name: "disclaimer-gone", file: HELP, must: "fail", expect: "the Help FAQ no longer says photos and map tiles are NOT saved",
    why: "§4 — the FAQ lists what a download saves and stops naming what it does not",
    find: "Photos and map tiles aren’t saved. ", repl: "" },
  { name: "tour-disclaimer-gone", file: CORE, must: "fail", expect: "the Help tour (HELP_FEATS) no longer says",
    why: "§4 — the Help tour stops naming what a download does not save",
    find: "Only climbs work offline — photos and map tiles aren’t saved.", repl: "Only climbs work offline." },
  /* MUST STAY SILENT, twice over: §4 is about the FACT, so a rewording passes; and the reworded
   * sentence says "to this device" in the negative, which §5 must read as the denial it is. */
  { name: "disclaimer-reworded", file: HELP, must: "pass",
    why: "MUST PASS — §4 is about the fact, and a negated device claim is not a claim",
    find: "Photos and map tiles aren’t saved. ", repl: "Photos and map tiles are not saved to this device. " },

  /* §5 — one live claim per scanned surface. */
  { name: "claims-photos-manage", file: "src/components/ManageAreasSheet.tsx", must: "fail", expect: "claims something is on the device",
    why: "§5 — Manage areas promises photos and map tiles the download never stores",
    find: "\" downloads it: the full catalog — areas,", repl: "\" downloads it with every photo and map tile to this device: the full catalog — areas," },
  { name: "claims-photos-home", file: TODAY, must: "fail", expect: "claims something is on the device",
    why: "§5 — Home's Pinned states card promises photos",
    find: "\" downloads its climbs to this device so they open with no signal", repl: "\" downloads its climbs and their photos to this device so they open with no signal" },
  { name: "claims-topos-help", file: HELP, must: "fail", expect: "claims something is on the device",
    why: "§5 — the Help FAQ promises topos",
    find: "its climbs, areas, gear and beta.", repl: "its climbs, areas, gear, beta and topos, all saved to your phone." },
  /* MUST STAY SILENT: a true claim about the CATALOG, in the no-signal idiom. */
  { name: "honest-claim", file: TODAY, must: "pass",
    why: "MUST PASS — the catalog really is on the device and opens with no signal",
    find: "\" downloads its climbs to this device so they open with no signal", repl: "\" saves its climbs on this device, so they open with no signal" },

  /* Fail closed — a rename blinds a surface. The Manage areas dialog is found by its aria-label,
   * and the trigger regions alone would keep ClimbMatch's floor satisfied without it. */
  { name: "manage-areas-renamed", file: "src/components/ManageAreasSheet.tsx", must: "fail", expect: "state-download dialog(s) by aria-label",
    why: "fail closed — Manage areas' own copy would drop out of the scan",
    find: "aria-label=\"Manage areas\"", repl: "aria-label=\"Your areas\"" },
  // since PR62 the state-download triggers also live in the lifted sheets/tabs: `moreFiles` lists the extra files the same rename is applied to
  { name: "download-state-renamed", file: CM, moreFiles: TRIGGER_FILES, must: "fail", expect: "region(s) and",
    why: "fail closed — ClimbMatch's state-download triggers renamed, so Home's card goes unscanned",
    rx: [[/(?<![A-Za-z0-9_$])downloadedStates(?![A-Za-z0-9_$])/g, "dlStates"],
         [/(?<![A-Za-z0-9_$])setDownloadedStates(?![A-Za-z0-9_$])/g, "setDlStates"],
         [/(?<![A-Za-z0-9_$])myPins(?![A-Za-z0-9_$])/g, "pinsMine"],
         [/(?<![A-Za-z0-9_$])dlBusy(?![A-Za-z0-9_$])/g, "dlPending"],
         [/(?<![A-Za-z0-9_$])downloadState(?![A-Za-z0-9_$])/g, "fetchState"],
         [/(?<![A-Za-z0-9_$])removeState(?![A-Za-z0-9_$])/g, "dropState"],
         [/(?<![A-Za-z0-9_$])pinState(?![A-Za-z0-9_$])/g, "togglePin"]] },
  { name: "help-tour-renamed", file: CORE, must: "fail", expect: "ANCHOR LOST: HELP_FEATS",
    why: "fail closed — the Help tour drops out of §4 and §5",
    find: "HELP_FEATS", repl: "HELP_TOUR", all: true },
];

/* stdio MUST name stderr explicitly. execFileSync defaults to ["pipe","pipe","INHERIT"], so a
 * guard's fatal messages — every ANCHOR LOST and every fail-closed floor here writes with
 * console.error — went straight to this process's own stderr and never reached `e.stderr`. Three
 * cases reported "did not name its own defect" against a guard that had named it perfectly, in
 * text the harness structurally could not see. An expectation is only as good as the stream it
 * is matched against. */
function runGuard() {
  try {
    const out = execFileSync("node", [P("scripts/check-offline-claims.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out, err: "" };
  } catch (e) {
    return { ok: false, out: e.stdout || "", err: e.stderr || "" };
  }
}

/* Expectations are matched against the FAIL lines and the fatal message only. A case written
 * against the text an assertion prints when it PASSES reports MISSED while the guard is firing
 * correctly — a mistake worth making structural rather than remembering. */
const failText = (r) => r.out.split("\n").filter((l) => /^\s*FAIL/.test(l)).join("\n") + "\n" + r.err;

/* A DIRTY TREE MAKES EVERY CASE MEANINGLESS, and it fails in the confusing direction: cases report
 * HARNESS BUG or MISSED and the guard looks broken when the guard is fine. So the suite refuses to
 * start unless the guard is GREEN on the tree as it stands — which is also the only baseline a
 * "must stay silent" case can mean anything against. */
{
  const base = runGuard();
  if (!base.ok) {
    console.error("REFUSING TO RUN: check:offline-claims does not pass on the tree as it stands, so\n"
      + "  no case below could be attributed. Fix the tree first (or an earlier run left an edit in\n"
      + "  it — see the lock note above).\n" + (base.err || base.out).trim().split("\n").slice(0, 6).join("\n"));
    process.exit(1);
  }
}

/* Every file the suite may touch, checksummed BEFORE anything runs and re-checked at the end. A
 * per-case restore already runs, but a crash between write and restore leaves the tree edited and
 * nothing would say so — the failure this suite has already caused once. */
const TOUCHED = [...new Set(CASES.flatMap((c) => [c.file, ...(c.moreFiles || [])]))];
const BASELINE = new Map(TOUCHED.map((f) => [f, sum(f)]));

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = sum(c.file);
  const orig = fs.readFileSync(P(c.file), "utf8");
  let next;
  if (c.move) {
    next = c.move(orig);
    if (!next || next === orig) { console.log("  " + c.name.padEnd(24) + "HARNESS BUG — the move did not apply"); fail++; continue; }
  } else if (c.rx) {
    next = c.rx.reduce((s, [re, r]) => s.replace(re, r), orig);
    if (next === orig) { console.log("  " + c.name.padEnd(24) + "HARNESS BUG — no regex matched"); fail++; continue; }
  } else {
    const n = orig.split(c.find).length - 1;
    if (n === 0 || (!c.all && n !== 1)) {
      console.log("  " + c.name.padEnd(24) + "HARNESS BUG — " + n + " matches for its find string");
      fail++; continue;
    }
    next = c.all ? orig.split(c.find).join(c.repl) : orig.replace(c.find, c.repl);
  }
  fs.writeFileSync(P(c.file), next);
  const extra = (c.moreFiles || []).map((f) => ({ f, orig: fs.readFileSync(P(f), "utf8"), before: sum(f) }));
  for (const x of extra) fs.writeFileSync(P(x.f), c.rx.reduce((t, [re, r]) => t.replace(re, r), x.orig));
  const landed = sum(c.file) !== before;

  const r = runGuard();
  fs.writeFileSync(P(c.file), orig);
  for (const x of extra) fs.writeFileSync(P(x.f), x.orig);
  const restored = sum(c.file) === before && extra.every((x) => sum(x.f) === x.before);

  const wanted = c.must === "fail" ? !r.ok : r.ok;
  const named = c.must !== "fail" || !c.expect || failText(r).includes(c.expect);
  const good = landed && restored && wanted && named;
  console.log("  " + c.name.padEnd(24) + (good ? "OK   " : "BAD  ")
    + "(landed: " + landed + ", restored: " + restored + ", guard " + (r.ok ? "passed" : "failed")
    + ", wanted " + c.must + (c.expect ? ", named its own defect: " + named : "") + ")\n"
    + "        " + c.why);
  if (!good && r.out) console.log("      | " + (failText(r).trim() || r.out).trim().split("\n").slice(0, 4).join("\n      | "));
  good ? pass++ : fail++;
}

const drifted = TOUCHED.filter((f) => sum(f) !== BASELINE.get(f));
if (drifted.length) {
  console.error("\nTREE NOT RESTORED: " + drifted.join(", ") + " differ(s) from the pre-run checksum.\n"
    + "  An injected edit is still in the working tree. Do not commit — restore those files first.");
  process.exit(1);
}
console.log("\n" + pass + "/" + CASES.length + " cases behaved as specified (tree restored byte-identically)");
process.exit(fail ? 1 : 0);
