// check:edit-removes — self-test for lib/editRemoves.js — the JS copy of the database's _edit_removes (0351), which the
// Review desk and the review autopilot use to re-ask "does approving this take something off the
// page?" against the page as it is NOW. No DB. `node scripts/check-edit-removes.mjs`
import fs from "fs";
import { editRemoves } from "../lib/editRemoves.js";

const wp = (n, pinned = n) => Array.from({ length: n }, (_, i) => (i < pinned ? { name: "w" + i, lat: 47 + i, lng: -121 } : { name: "w" + i }));
const cases = [
  ["fewer waypoints", wp(3), wp(2), true],
  ["a pin taken off", wp(3), wp(3, 2), true],
  ["field cleared", "Walk up the gully.", "", true],
  ["list emptied", wp(2), [], true],
  ["number cleared", 1200, null, true],
  ["STALE: page grew from 2 to 4 since a 3-waypoint edit was sent", wp(4), wp(3), true],
  ["one added", wp(2), wp(3), false],
  ["moved, same count", wp(2), [{ name: "a", lat: 1, lng: 2 }, { name: "b", lat: 3, lng: 4 }], false],
  ["empty page", null, wp(1), false],
  ["text changed", "old", "new", false],
];
let bad = 0;
for (const [name, cur, nxt, want] of cases) {
  const got = editRemoves(cur, nxt);
  if (got !== want) { bad++; console.log("FAIL", name, "got", got, "want", want); }
}

// The wiring: every place that APPROVES a route edit re-asks the question against the page now.
const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const wiring = [
  ["review/ReviewDesk.jsx", /removes:[^\n]*editRemoves\(cur,/, "the desk's red 'Removes something' banner re-asks editRemoves(cur, …) against the page now"],
  ["scripts/review-queue-export.mjs", /removes_something:[^\n]*editRemoves\(pageNow,/, "the autopilot's export re-asks editRemoves(pageNow, …)"],
  ["scripts/lib/review-ai.mjs", /if \(it\.removes_something\) return owner\(/, "decide() leaves every removal to the owner"],
];
for (const [file, re, what] of wiring) {
  if (!re.test(read(file))) { bad++; console.log(`FAIL ${file}: ${what} — not found`); }
}
// The database backstop: the LATEST migration that defines guard_contribution_status must still run _edit_removes.
const migDir = new URL("../supabase/migrations/", import.meta.url);
const defs = fs.readdirSync(migDir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort()
  .filter((f) => /function public\.guard_contribution_status\(\)/.test(fs.readFileSync(new URL(f, migDir), "utf8")));
const last = defs[defs.length - 1];
if (!last || !/_edit_removes\(/.test(fs.readFileSync(new URL(last, migDir), "utf8"))) {
  bad++; console.log(`FAIL supabase/migrations/${last}: the latest guard_contribution_status no longer re-checks a removal at approval (0553)`);
}
console.log(bad ? `check-edit-removes: ${bad} problem(s)` : `check-edit-removes: all ${cases.length} cases pass; desk, autopilot and ${last} re-check a removal at approval`);
process.exit(bad ? 1 : 0);
