// Mount Crowder's area blurb ("About this peak") placed it "on the eastern crest of the Picket Range". The peak is the
// high point of a ridge running south from Phantom Peak, between upper Goodell Creek and Picket Creek — the same
// correction multi-approach-leftovers set 11 made to the Southwest Route's overview.
//
//   node scripts/oneoff/crowder-area-blurb.mjs [--write | --rollback]
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const ID = "wa_mount_crowder";
const OLD = "on the eastern crest of the Picket Range in North Cascades National Park, near the Goodell Creek / Picket Creek drainage divide just south of its parent, Phantom Peak.";
const NEW = "at the high point of a ridge running south from its parent, Phantom Peak, in the Picket Range of North Cascades National Park, between upper Goodell Creek and Picket Creek.";
const [a] = await selectAll("areas", "id,blurb", `id=eq.${ID}`, { key });
if (process.argv.includes("--rollback")) {
  if (!a.blurb.includes(NEW)) { console.log("nothing to roll back"); process.exit(0); }
  await patchRow("areas", ID, { blurb: a.blurb.replace(NEW, OLD) }); console.log("rolled back"); process.exit(0);
}
if (a.blurb.includes(NEW)) { console.log("SPENT (already written)"); process.exit(0); }
if (!a.blurb.includes(OLD)) { console.log("PROBLEM: the blurb changed since this script was written"); process.exit(1); }
const next = a.blurb.replace(OLD, NEW);
if (!process.argv.includes("--write")) { console.log("dry run →", next); process.exit(0); }
await patchRow("areas", ID, { blurb: next });
const [after] = await selectAll("areas", "id,blurb", `id=eq.${ID}`, { key });
console.log(after.blurb === next ? "written, re-read matches" : "RE-READ MISMATCH");
process.exit(after.blurb === next ? 0 : 1);
