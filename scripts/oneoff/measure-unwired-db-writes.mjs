// A WRITE NOTHING CALLS IS A CAPABILITY NOBODY HAS.
//
// The exact mirror of measure-unwired-db-reads.mjs, which is what found `useCrewListings` -- a
// read built deliberately for "Join a crew" that nothing called, so a crew a real climber opened
// could be found by nobody (#1554). The read side has now been asked twice; the WRITE side has
// been asked about FEEDBACK (probe-writes-outside-db, audit-write-feedback-gaps) and never about
// whether the write is wired at all.
//
// The failure mode is identical and just as quiet: an unwired write renders nothing, breaks
// nothing, and every guard stays green. check:writes derives its vocabulary from these same
// exports and only asks whether a success message sits in front of one -- a write with NO call
// site has no message to be wrong about, so it passes.
//
// SCOPE IS THE APP, NOT THE REPO, and that is a correction rather than a preference: a first pass
// at the read census searched every .mjs in the tree, and its OWN header comment naming a hook
// made that hook look called. Scripts mention these names constantly; only the app can call one.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const lib = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const writes = [...lib.matchAll(/export async function ([A-Za-z0-9_]+)/g)].map((m) => m[1]);
if (writes.length < 20) { console.error(`FAIL-CLOSED: ${writes.length} writes parsed — the scan is broken.`); process.exit(1); }

// The app, and the lazy-loaded lib components it mounts. Discovered, not hand-listed.
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
for (const e of fs.readdirSync(path.join(ROOT, "lib"))) if (/\.(jsx|js)$/.test(e) && e !== "db.js") FILES.push("lib/" + e);
if (FILES.length < 8) { console.error(`FAIL-CLOSED: ${FILES.length} app files.`); process.exit(1); }
const corpus = FILES.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");

// IMPORTS ARE ALIASED -- `addCrewMember as dbAddCrewMember` -- so a scan for the raw name finds
// only the import line and calls every aliased write dead. audit-write-feedback-gaps records this
// as one of two bugs that made its own first draft report far too little. Resolve the alias.
const aliases = {};
for (const m of corpus.matchAll(/([A-Za-z0-9_]+)\s+as\s+([A-Za-z0-9_]+)/g)) aliases[m[1]] = m[2];

const rows = [];
for (const w of writes) {
  const names = [w, aliases[w]].filter(Boolean);
  const calls = names.reduce((n, x) => n + (corpus.match(new RegExp(`\\b${x}\\s*\\(`, "g")) || []).length, 0);
  if (!calls) rows.push({ name: w, alias: aliases[w] || null });
}

const tableOf = (w) => {
  const i = lib.indexOf("export async function " + w);
  const seg = lib.slice(i, i + 1400);
  const m = seg.match(/\.from\("([a-z_]+)"\)/) || seg.match(/\.rpc\("([a-z_]+)"/);
  return m ? m[1] : "(none)";
};

console.log(`write functions exported by lib/db.js: ${writes.length}`);
console.log(`app files searched for call sites:     ${FILES.length}`);
console.log(`aliased imports resolved:              ${Object.keys(aliases).length}`);
console.log(`\nCALLED BY NOTHING IN THE APP: ${rows.length}\n`);
for (const r of rows) console.log(`  ${r.name.padEnd(30)} writes ${tableOf(r.name)}${r.alias ? `   (alias ${r.alias})` : ""}`);
if (!rows.length) console.log("  (none)");
// FIRST RUN, 2026-09-03: 95 writes, 10 unwired, ONE real. Reasons rather than passes, and a stale
// entry fails -- the standard check:field-renders' KNOWN map is held to.
//
// THE ONE THAT MATTERED, and it is fixed: `removeConnection`. "Remove friend" in FriendsList
// filtered local state and toasted `"<Name> removed from friends"` with NO WRITE BEHIND IT, so a
// climber removed somebody, was told it worked, and was still connected to them on reload. Worse
// than the usual swallowed write, because there is no write to swallow -- check:writes forbids a
// success message in front of an unobservable FAILURE and check:claims one for a write that only
// runs signed-in, and neither can see a toast in front of NO WRITE AT ALL.
//
// THE QUESTION THAT SEPARATES THE OTHER NINE is not "is this wired" but "IS THERE A CONTROL THAT
// CLAIMS TO DO IT". Built ahead of a screen is fine. A button that lies is not.
const KNOWN = {
  deleteGuideDocument: "no control. lib/GuideApplications.jsx already documents it as exported and called from nowhere; getSignedDocUrl beside it IS called.",
  updateTopoLine: "no control — the app has no edit-a-topo-line UI at all (searched for Edit/Delete topo).",
  deleteTopoLine: "no control, same as updateTopoLine.",
  deleteTopoPhoto: "no control, same as updateTopoLine.",
  addVerification: "no control. verifyMyEmail is the wired one, on the Profile trust card; this is for verification kinds no screen offers yet.",
  fetchCrewMessages: "superseded, not missing. fetchOlderCrewMessages(id, MSG_PAGE, null) serves both the first page and paging — a null cursor means most recent. Called twice.",
  fetchComments: "superseded by the useComments hook, which is called.",
  markMessageAsRead: "superseded by markDmThreadRead / markCrewRead, both called twice.",
  myOpenDataRequests: "a READ with no screen, and the policy promise is kept anyway: the Privacy Policy says requests are RECORDED against your account, and raiseDataRequest IS wired at both call sites with three honest outcomes. Nothing yet SHOWS you your open requests.",
};
console.log("\nWHY EACH IS UNWIRED (reasons, not passes — a stale entry fails):");
let stale = 0;
for (const k of Object.keys(KNOWN)) {
  if (!rows.some((r) => r.name === k)) { console.log(`  STALE  ${k} — declared here and now wired. Drop the entry.`); stale++; }
  else console.log(`  ${k}: ${KNOWN[k]}`);
}
for (const r of rows) if (!KNOWN[r.name]) { console.log(`  UNDECLARED  ${r.name} — is there a control that claims to do this?`); stale++; }
console.log("\nAn unwired write is not automatically a defect. It IS a question: what could a climber");
console.log("do with this, and can they do it today?");
process.exit(stale ? 1 : 0);
