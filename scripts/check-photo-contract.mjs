#!/usr/bin/env node
// check:photo-contract — the route-photo feature keeps the promises it makes.
//
// WHY THIS EXISTS, and it is the reason rather than the rules that matters. #971/#987/#1003/#1022
// built photo upload, self-removal, admin takedown and reporting in four days, and every one of
// them was proven by a one-off probe in a temp directory that no longer exists. That is precisely
// what CLAUDE.md says of the check:field-renders one-off it absorbed: **a verification nobody runs
// is not a verification**. Five invariants were load-bearing and guarded by nothing.
//
// The rules below are the ones that fail SILENTLY — no crash, no blank screen, a plausible result.
// Each is a defect somebody would have to notice by using the app as two different people.
//
// WHAT THIS CANNOT COVER, said plainly rather than left to be discovered: the RLS scoping itself.
// "a non-admin cannot delete another climber's photo" is a property of the DATABASE, provable only
// by two real accounts with real JWTs, and CI must never hold the service key (the constraint that
// kept check:signed-in out of CI for ~40 commits). Those live in the migration headers of 0151,
// 0152 and 0156, each recording the negative it was proven against. This guard covers the CLIENT
// contract — which is where a refactor will break things, because the SQL is not something anyone
// edits by accident.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fails = [];
const fail = (m) => { console.log("  FAIL  " + m); fails.push(m); };
const ok = (m) => console.log("  ok    " + m);

// Fail CLOSED on a source this guard cannot read, rather than reporting green about a file it
// never opened — the #547 shape guard-sources.mjs exists for. A renamed file must be a loud
// failure here, not a quietly shorter list of things checked.
function mustRead(rel) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) {
    console.error(`\ncheck:photo-contract FAILED — ${rel} is missing, so nothing could be checked.`);
    console.error("This is a coverage failure, not a code failure. Update the guard to the new layout.\n");
    process.exit(1);
  }
  const body = fs.readFileSync(f, "utf8");
  if (body.length < 500) {
    console.error(`\ncheck:photo-contract FAILED — ${rel} is only ${body.length} chars; that cannot be right.`);
    process.exit(1);
  }
  return body;
}
const db = mustRead("lib/db.js"), rd = mustRead("RouteDetail.jsx"), cm = mustRead("ClimbMatch.jsx");
mustRead("lib/PhotoReports.jsx");

// Bodies come from balancing braces over RAW source. The comment/string blanker other guards use
// desynchronises on JSX apostrophes (check:overlay-discovery records this), and these functions
// contain prose full of them.
function fnBody(src, decl, label) {
  const i = src.indexOf(decl);
  if (i < 0) { fail(`ANCHOR LOST: ${label} — "${decl}" is not in the file, so nothing below was checked`); return null; }
  let d = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") { d++; started = true; }
    else if (src[j] === "}") { d--; if (started && d === 0) return src.slice(i, j + 1); }
  }
  fail(`ANCHOR LOST: ${label} — braces never balanced`);
  return null;
}

console.log("--- writes are ordered so a failure cannot leave a visible lie ---");

// 1. Upload THEN insert. Insert-first publishes a row pointing at a file that may never arrive:
//    a broken image on everybody's screen. This order can only orphan an invisible object.
const submit = fnBody(db, "export async function submitRoutePhoto", "submitRoutePhoto");
if (submit) {
  const up = submit.indexOf(".upload(");
  const ins = submit.indexOf("submitContribution(");
  if (up < 0 || ins < 0) fail("submitRoutePhoto no longer both uploads and files a contribution");
  else if (up < ins) ok("submitRoutePhoto uploads before it inserts");
  else fail("submitRoutePhoto INSERTS BEFORE IT UPLOADS — a row can point at a file that never arrived");
}

// 2. Delete the row THEN the object — the exact mirror, for the mirrored reason.
const del = fnBody(db, "export async function deleteRoutePhoto", "deleteRoutePhoto");
if (del) {
  const row = del.indexOf('.from("contributions")');
  const obj = del.indexOf('.storage');
  if (row < 0 || obj < 0) fail("deleteRoutePhoto no longer removes both the row and the object");
  else if (row < obj) ok("deleteRoutePhoto removes the row before the object");
  else fail("deleteRoutePhoto REMOVES THE OBJECT FIRST — a surviving row would show a broken image");
}

console.log("\n--- an RLS refusal must not read as success ---");

// RLS rejects by matching ZERO ROWS, not by erroring. A helper that returns normally on an empty
// result tells the climber their photo was removed when the database refused. This is the
// swallowed-write-failure shape check:writes exists for, one layer down.
for (const [decl, label] of [
  ["export async function deleteRoutePhoto", "deleteRoutePhoto"],
  ["export async function dismissPhotoReport", "dismissPhotoReport"],
]) {
  const body = fnBody(db, decl, label);
  if (!body) continue;
  const guards = /if\s*\(\s*!\s*data\s*\|\|\s*!\s*data\.length\s*\)\s*throw/.test(body);
  if (guards) ok(`${label} throws when the database matched no rows`);
  else fail(`${label} does not throw on an empty result — an RLS refusal would report success`);
}

// The reporter is stamped from the session, never taken from an argument: the INSERT policy
// requires reporter = auth.uid(), so a caller-supplied value is a rejection rather than a
// mislabelled report — but stamping centrally means a new call site cannot get it wrong.
const rep = fnBody(db, "export async function reportPhoto", "reportPhoto");
if (rep) {
  if (/auth\.getSession\(\)/.test(rep) && /reporter:\s*uid/.test(rep)) ok("reportPhoto stamps the reporter from the session");
  else fail("reportPhoto no longer stamps the reporter from the session — a report could be filed under another name");
}

console.log("\n--- the controls are offered to the right person ---");

// Remove/Take down: your own photo, or a moderator. Losing either half is invisible in the demo,
// where isAdmin is false and every photo is somebody else's.
if (/onRemovePhoto&&photoLightbox\.ph\._rowId&&\(photoLightbox\.ph\._mine\|\|canModeratePhotos\)/.test(rd))
  ok("the removal control is gated on your own photo OR moderator rights");
else fail("the removal gate changed — check nobody can remove a photo that is not theirs");

// Report: only on somebody ELSE'S. Reporting your own is meaningless (you can remove it) and an
// offer to report yourself reads as a bug.
if (/onReportPhoto&&photoLightbox\.ph\._rowId&&!photoLightbox\.ph\._mine/.test(rd))
  ok("the report control is offered only on another climber's photo");
else fail("the report gate changed — it may now be offered on your own photo");

// Reporting must NOT hide the photo. If it did, one person could remove anything by reporting it.
const reportHandler = fnBody(cm, "const reportRoutePhoto=", "reportRoutePhoto");
if (reportHandler) {
  if (/refetch\(\)/.test(reportHandler)) fail("reporting refetches — if it now hides the photo, one report removes anything");
  else ok("reporting does not remove the photo from view");
}

console.log("\n--- the UI cannot offer a reason the database will reject ---");

// The reason list in the sheet and the CHECK constraint in the migration are the same fact written
// twice, ~two files apart. A new reason added to one and not the other is a write that fails at
// submit time with a constraint error the climber cannot act on.
const migDir = path.join(ROOT, "supabase/migrations");
const migFile = fs.readdirSync(migDir).find((f) => /photo_reports_a_queue/.test(f));
if (!migFile) fail("ANCHOR LOST: the photo-reports migration is not in supabase/migrations");
else {
  const mig = fs.readFileSync(path.join(migDir, migFile), "utf8");
  const allowed = (mig.match(/reason in \(([^)]*)\)/) || [, ""])[1]
    .split(",").map((s) => s.trim().replace(/^'|'$/g, "")).filter(Boolean);
  // Anchored on the array literal, NOT on "any two-string pair": this file is 400k chars of
  // dense JSX and a loose pattern collects chalk, crevasse, the sub-tab names and the seasons.
  const at = rd.indexOf('[["not_this_route"');
  if (at < 0) { fail("ANCHOR LOST: the reason list in the report sheet — it moved or was renamed"); }
  const reasonsSrc = at < 0 ? "" : rd.slice(at, rd.indexOf("]]", at) + 2);
  const offered = [...reasonsSrc.matchAll(/\["([a-z_]+)","[^"]+"\]/g)].map((m) => m[1]);
  const uiOnly = offered.filter((r) => !allowed.includes(r));
  if (!allowed.length) fail(`could not read the reason CHECK constraint out of ${migFile}`);
  else if (!offered.length) fail("the sheet offers no reasons — the reason list moved or was removed");
  else if (uiOnly.length) fail(`the sheet offers reason(s) the database refuses: ${uiOnly.join(", ")}`);
  else ok(`all ${offered.length} reason(s) the sheet offers are accepted by the constraint`);
}

console.log("\n--- a photo is never credited to a raw id ---");

// The crag page printed `c.contributor` — an auth uid — as a person's name (#945). The byline
// falls back to null so an unresolved profile renders WITHOUT a credit, which is honest; falling
// back to the id would be that bug again, and it only appears once a real contributor exists.
const deriv = cm.slice(cm.indexOf("const dbRoutePhotos=useMemo"), cm.indexOf("const dbRoutePhotos=useMemo") + 900);
if (cm.indexOf("const dbRoutePhotos=useMemo") < 0) fail("ANCHOR LOST: dbRoutePhotos");
else if (/by:\(pr&&pr\.name\)\|\|null/.test(deriv)) ok("the byline resolves through profiles and falls back to null, not to the id");
else fail("the photo byline no longer falls back to null — check it cannot render a uuid as a name");

console.log("");
if (fails.length) {
  console.log(`check:photo-contract FAILED — ${fails.length} broken promise(s).`);
  process.exit(1);
}
console.log("check:photo-contract: ok — the photo feature keeps its ordering, refusal and gating promises.");
